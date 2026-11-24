// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillSource = path.join(here, '../skills/a2ui-genui');

// The agent runs with a file sandbox where the CLI has one. These folders are the caches that installs and tests write.
const cacheRoots = () =>
  (
    process.env.A2UI_EVAL_WRITABLE?.split(':') ??
    ['.pub-cache', '.npm', '.yarn', '.dart-tool', '.dartServer', '.config', 'Library/Caches'].map(
      d => path.join(os.homedir(), d),
    )
  ).filter(d => fs.existsSync(d));

// Chromium cannot start in the macOS sandbox of Codex, so a case with Playwright tests needs this on a Mac without a container.
const unsandboxed = () => process.env.A2UI_EVAL_CODEX_NO_SANDBOX === '1';

export const agents = {
  codex: {
    skillDir: '.agents/skills/a2ui-genui',
    version: ['codex', ['--version']],
    command: (prompt, out) => [
      'codex',
      [
        'exec',
        ...(unsandboxed()
          ? ['--dangerously-bypass-approvals-and-sandbox']
          : [
              '--sandbox',
              'workspace-write',
              // The managed proxy has a domain allow list, and Dart's HTTP client does not use a proxy from the environment.
              '--disable',
              'network_proxy',
              '-c',
              'sandbox_workspace_write.network_access=true',
              '-c',
              `sandbox_workspace_write.writable_roots=${JSON.stringify(cacheRoots())}`,
            ]),
        ...(process.env.A2UI_EVAL_MODEL ? ['-m', process.env.A2UI_EVAL_MODEL] : []),
        '-o',
        path.join(out, 'last-message.md'),
        prompt,
      ],
    ],
  },
  claude: {
    skillDir: '.claude/skills/a2ui-genui',
    version: ['claude', ['--version']],
    command: prompt => [
      'claude',
      [
        '-p',
        prompt,
        '--permission-mode',
        'auto',
        '--model',
        process.env.A2UI_EVAL_MODEL ?? 'opus',
        '--output-format',
        'json',
      ],
    ],
  },
};

export function trialPrompt(testCase) {
  const answers = testCase.standing_answers.map(a => `- ${a.asks}: "${a.answer}"`).join('\n');
  return `${testCase.prompt}

Nobody can answer questions in this session. At each point where you would wait for the user, use the user's answer from this list, and go on:
${answers}`;
}

function sh(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 1 << 28, ...options});
  // A timeout is a result of the trial, not a failure of the runner.
  if (result.error && result.error.code !== 'ETIMEDOUT') throw result.error;
  return result;
}

function must(command, args, options) {
  const result = sh(command, args, options);
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function agentMs(stdout) {
  try {
    const {duration_ms, duration_api_ms} = JSON.parse(stdout);
    // After a wait on a background task, duration_ms covers only the last turn. The API time is then the better lower limit.
    return Math.max(duration_ms, duration_api_ms ?? 0);
  } catch {
    return undefined;
  }
}

export function runConditions(testCase, appRoot, out) {
  const env = {...process.env, EVALS_DIR: here};
  // Only the key check gets the key, so a flow test that calls the live model fails.
  const noKeys = Object.fromEntries(Object.entries(env).filter(([name]) => !name.endsWith('_KEY')));
  return testCase.pass_conditions.map(({id, command}) => {
    const {status, stdout, stderr} = sh(testCase.shell, ['-c', command], {
      cwd: appRoot,
      env: id === 'key_check' ? env : noKeys,
    });
    if (status === 0) return {id, exit: status};
    // The tail of a build log hides the cause, so the full output of a failed condition stays in the out-dir.
    fs.writeFileSync(path.join(out, `${id}.log`), stdout + stderr);
    return {id, exit: status, tail: (stdout + stderr).slice(-600)};
  });
}

function main() {
  const [caseFile, agentName, outArg, ...flags] = process.argv.slice(2);
  const agent = agents[agentName];
  if (!caseFile || !agent || !outArg) {
    console.error(
      `Usage: node run-trial.mjs <case.json> <${Object.keys(agents).join('|')}> <out-dir> [--grade-only]`,
    );
    process.exit(2);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      'Set GEMINI_API_KEY in the environment. The key check and the recordings need it.',
    );
    process.exit(2);
  }
  const testCase = JSON.parse(fs.readFileSync(caseFile, 'utf8'));
  const out = path.resolve(outArg);
  const clone = path.join(out, 'clone');
  const skillDir = path.join(clone, agent.skillDir);
  const appRoot = path.join(clone, testCase.app.root);
  const resultFile = path.join(out, 'result.json');
  let result = {};

  if (flags.includes('--grade-only')) {
    result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  } else {
    if (fs.existsSync(clone)) throw new Error(`${clone} exists. Use a new out-dir for each trial.`);
    fs.mkdirSync(clone, {recursive: true});
    must('git', ['init', '-q'], {cwd: clone});
    must('git', ['fetch', '-q', '--depth', '1', testCase.app.repository, testCase.app.commit], {
      cwd: clone,
    });
    must('git', ['checkout', '-q', 'FETCH_HEAD'], {cwd: clone});
    fs.cpSync(skillSource, skillDir, {recursive: true});
    // Step 0 of the skill stops on a dirty tree, so git must not see the installed skill.
    fs.appendFileSync(path.join(clone, '.git/info/exclude'), `/${agent.skillDir.split('/')[0]}/\n`);

    const [command, args] = agent.command(trialPrompt(testCase), out);
    const started = Date.now();
    // The output goes to files, not pipes. A process that the agent leaves behind keeps a pipe open, and the runner then waits for hours.
    const [outFile, errFile] = ['agent.stdout.log', 'agent.stderr.log'].map(name =>
      path.join(out, name),
    );
    const run = sh(command, args, {
      cwd: clone,
      timeout: Number(process.env.A2UI_EVAL_TIMEOUT_MIN ?? 120) * 60_000,
      stdio: ['ignore', fs.openSync(outFile, 'w'), fs.openSync(errFile, 'w')],
    });
    run.stdout = fs.readFileSync(outFile, 'utf8');
    run.stderr = fs.readFileSync(errFile, 'utf8');
    fs.rmSync(outFile);
    fs.rmSync(errFile);
    fs.writeFileSync(path.join(out, 'agent.log'), `${run.stdout}\n--- stderr ---\n${run.stderr}`);
    result = {
      case: testCase.id,
      agent: agentName,
      agent_version: must(...agent.version),
      // Codex prints the model that it used in the header of its output.
      model:
        process.env.A2UI_EVAL_MODEL ??
        (agentName === 'claude'
          ? 'opus'
          : (`${run.stdout}${run.stderr}`.match(/^model: (.+)$/m)?.[1] ?? 'default')),
      sandbox:
        agentName === 'codex'
          ? unsandboxed()
            ? 'none'
            : 'workspace-write'
          : 'permission-mode auto',
      // The source can change during a long trial, so the version comes from the copy that the agent used.
      skill_version: fs
        .readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8')
        .match(/version: "([^"]+)"/)?.[1],
      started: new Date(started).toISOString(),
      // Claude Code reports its own time. For Codex the wall-clock time counts.
      minutes: Math.round((agentMs(run.stdout) ?? Date.now() - started) / 6000) / 10,
      agent_exit: run.status,
      timed_out: run.signal === 'SIGTERM',
      // A usage limit, a failed login or a full disk says nothing about the skill, so the report does not count the trial.
      invalid:
        run.signal !== 'SIGTERM' && run.status !== 0
          ? `the agent exited with code ${run.status}`
          : /ENOSPC/.test(`${run.stdout}${run.stderr}`)
            ? 'the disk was full'
            : undefined,
    };
  }

  const conditions = fs.existsSync(path.join(appRoot, 'a2ui.blueprint.json'))
    ? runConditions(testCase, appRoot, out)
    : testCase.pass_conditions.map(({id}) => ({
        id,
        exit: 1,
        tail: 'The agent wrote no blueprint.',
      }));
  const logHoldsKey = fs.readdirSync(out).some(name => {
    const file = path.join(out, name);
    return (
      fs.statSync(file).isFile() &&
      fs.readFileSync(file, 'utf8').includes(process.env.GEMINI_API_KEY)
    );
  });
  conditions.push({id: 'agent_output_has_no_key', exit: logHoldsKey ? 1 : 0});

  result = {...result, conditions, pass: conditions.every(c => c.exit === 0)};
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2) + '\n');
  console.log(
    `${result.case} ${result.agent}: ${result.invalid ? `INVALID (${result.invalid})` : result.pass ? 'PASS' : 'FAIL'} in ${result.minutes} min`,
  );
  for (const c of conditions) if (c.exit !== 0) console.log(`  failed: ${c.id}`);
  process.exit(result.pass && !result.invalid ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
