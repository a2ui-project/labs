#!/usr/bin/env node
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

const BLUEPRINT = 'a2ui.blueprint.json';
const RUNS = 3;
const schema = JSON.parse(
  fs.readFileSync(new URL('./blueprint.schema.json', import.meta.url), 'utf8'),
);

function stop(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function check(value, rule, at, errors) {
  if (rule.$ref) rule = schema.$defs[rule.$ref.split('/').pop()];
  const name = at || BLUEPRINT;
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${name} is ${JSON.stringify(value)}. Use one of: ${rule.enum.join(', ')}.`);
    return;
  }
  const type = typeOf(value);
  if (rule.type && rule.type !== type) {
    errors.push(`${name} must be of type ${rule.type}, not ${type}.`);
    return;
  }
  if (type === 'string') {
    if (value.length < (rule.minLength ?? 0)) errors.push(`${name} is empty.`);
    else if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
      errors.push(`${name} is ${JSON.stringify(value)}, which does not match ${rule.pattern}.`);
    }
  }
  if (
    type === 'integer' &&
    (value < (rule.minimum ?? -Infinity) || value > (rule.maximum ?? Infinity))
  ) {
    errors.push(`${name} is ${value}. It must be from ${rule.minimum} to ${rule.maximum}.`);
  }
  if (type === 'array') {
    if (value.length < (rule.minItems ?? 0) || value.length > (rule.maxItems ?? Infinity)) {
      errors.push(
        `${name} has ${value.length} items. It must have ${rule.minItems ?? 0} to ${rule.maxItems ?? 'any number of'}.`,
      );
    }
    if (rule.items) value.forEach((item, i) => check(item, rule.items, `${name}[${i}]`, errors));
  }
  if (type === 'object') {
    for (const key of rule.required ?? []) {
      if (!(key in value)) errors.push(`${name} has no "${key}".`);
    }
    if (Object.keys(value).length < (rule.minProperties ?? 0)) errors.push(`${name} is empty.`);
    for (const [key, item] of Object.entries(value)) {
      const path = at ? `${at}.${key}` : key;
      if (rule.properties?.[key]) check(item, rule.properties[key], path, errors);
      else if (rule.additionalProperties === false)
        errors.push(`${name} has an unknown field "${key}".`);
      else if (rule.additionalProperties) check(item, rule.additionalProperties, path, errors);
    }
  }
}

function load() {
  if (!fs.existsSync(BLUEPRINT))
    stop(`No ${BLUEPRINT} in this folder. Run this from the app root.`);
  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(BLUEPRINT, 'utf8'));
  } catch (error) {
    stop(`${BLUEPRINT} is not valid JSON: ${error.message}`);
  }
  const errors = [];
  check(blueprint, schema, '', errors);
  if (errors.length === 0) {
    const ids = blueprint.flows.map(flow => flow.id);
    for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i)))
      errors.push(`The flow id ${id} is used twice.`);
  }
  if (errors.length > 0) stop(`${BLUEPRINT} is not valid:\n- ${errors.join('\n- ')}`);
  return blueprint;
}

function tailOf(output) {
  return output
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .split('\n')
    .filter(line => line.trim())
    .slice(-30)
    .join('\n');
}

// The status that the agent wrote does not count. Each flow passes only when its test passes three runs in a row here.
function run() {
  const blueprint = load();
  // A test run must never reach a model with the user's key.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.endsWith('_KEY')),
  );
  const timeout = Number(process.env.A2UI_EVAL_FLOW_TIMEOUT_MIN ?? 30) * 60_000;
  let failed = 0;
  for (const flow of blueprint.flows) {
    for (let i = 1; i <= RUNS; i++) {
      const result = spawnSync(flow.test_command, {
        shell: true,
        env,
        encoding: 'utf8',
        maxBuffer: 1 << 28,
        timeout,
      });
      const exitCode = result.status ?? 1;
      console.log(`${flow.id} run ${i} of ${RUNS}: exit ${exitCode}`);
      if (exitCode !== 0) {
        console.log(
          tailOf(`${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error?.message ?? ''}`),
        );
        failed++;
        break;
      }
    }
  }
  process.exit(failed === 0 ? 0 : 1);
}

const [command, ...args] = process.argv.slice(2);
const placements = schema.$defs.flow.properties.placement.enum;
if (command === 'placements') {
  if (args.length !== 3 || !args.every(p => placements.includes(p)))
    stop(
      `Usage: node check-blueprint.mjs placements <p1> <p2> <p3>\nUse: ${placements.join(', ')}.`,
      2,
    );
  const found = load()
    .flows.map(flow => flow.placement)
    .sort();
  if (found.join() !== [...args].sort().join())
    stop(`The flows must have the placements ${args.join(', ')}. They have ${found.join(', ')}.`);
  console.log(`The placements match: ${found.join(', ')}.`);
} else if (command === 'validate') {
  load();
  console.log(`${BLUEPRINT} is valid.`);
} else if (command === 'run') {
  run();
} else {
  stop(
    'Usage: node check-blueprint.mjs validate | run | placements <p1> <p2> <p3>\nRun it from the app root.',
    2,
  );
}
