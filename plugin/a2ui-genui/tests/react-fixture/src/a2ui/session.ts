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

import {
  A2uiGenerator,
  CatalogConfig,
  ExpressFormatFactory,
  StreamedAnswer,
  type AnswerPart,
} from '@a2ui/agent';
import {
  MessageProcessor,
  mapErrorToRendererMessage,
  type ActionMessage,
  type ActionPayload,
  type Catalog,
  type ComponentApi,
  type RendererCapabilities,
  type RendererErrorMessage,
  type SurfaceModel,
} from '@a2ui/web_core/v1_0';

export interface ChatTurn {
  fromUser: boolean;
  text: string;
}

export interface ChatClient {
  // `turns` ends with a user turn. Yields the reply text as it streams.
  generate(systemPrompt: string, turns: readonly ChatTurn[]): AsyncIterable<string>;
}

// The turn rules of references/model-client.md of the skill, as they are.
export const turnInstructions = `
Show forms, choices, lists and cards as A2UI surfaces.

- Start each <a2ui> block with a surface line. Give each new surface a new
  id: surface("a-new-id"). For a surface with inputs, write
  surface("a-new-id", sendDataModel=true).
- Bind each input to a data path, such as $/form/name. Give a submit button
  an Event action whose context reads those paths.
- When the user acts on a surface, the next user turn is JSON whose "a2ui"
  holds the renderer's v1.0 messages, {"messages": [...]}. A message is an
  action, with its name, surfaceId and resolved context, or an error that
  the renderer met.
- Once a surface is created with sendDataModel, a user turn carries
  "metadata": {"a2uiRendererDataModel": ...}, which holds the data model of
  each such surface.
- Answer an action by updating its surface: write
  surface("its-id", update=true), then the components that change. Or show
  a new surface. Answer an error by correcting the surface that it names.
- In an update block, assign again every variable that the block references.
  To change one component, assign only its variable again.
- In an update block, assign root a component call, such as
  root = Card(body). Never write root = otherVariable.
- A data path segment holds only letters, digits and _, such as
  $/form/first_name. For records whose ids hold other characters, such as -,
  write a list, $/items = [{id: "a-1", name: "One"}], and show it with
  List(_template($/items, item)).
`;

export interface ChatSessionOptions<T extends ComponentApi> {
  client: ChatClient;
  // The app's own role text. It goes ahead of turnInstructions in the system prompt.
  instructions: string;
  catalogs: Catalog<T>[];
  // The app's write handler. It runs once for each action, before the action goes to the model.
  // If it throws, the error shows and the action does not go to the model.
  onAction?: (action: ActionPayload) => void | Promise<void>;
  // A reply that sends no chunk for this long ends as an error. Keep it longer than the client's 3 timeouts and 2 waits together.
  replyTimeoutMs?: number;
}

export type ChatEntryKind = 'user' | 'model' | 'surface' | 'sent' | 'error';

export interface ChatEntry<T extends ComponentApi> {
  kind: ChatEntryKind;
  text: string;
  surface?: SurfaceModel<T>;
}

export interface Slot<T extends ComponentApi> {
  surface?: SurfaceModel<T>;
  busy: boolean;
  error?: string;
}

interface Target<T extends ComponentApi> {
  // Also the prefix of each surface id: reply-1, sidebar-1, home-1.
  name: string;
  // A standing target keeps the newest complete surface. The conversation shows each answer.
  standing: boolean;
  turns: ChatTurn[];
  replies: number;
  errorTurns: number;
  unsent: RendererErrorMessage[];
  pending: number;
  key?: string;
  request?: (surfaceId: string) => string;
  // The id that the current generation of a standing target must create.
  surfaceId?: string;
  surface?: SurfaceModel<T>;
  data: Map<string, unknown>;
  error?: string;
  view: Slot<T>;
}

type OutboundMessage = ActionMessage | RendererErrorMessage;

const shownError = ({error}: RendererErrorMessage) =>
  `${error.code} on "${error.surfaceId ?? ''}": ${error.message}`;

export class GenerationSession<T extends ComponentApi> {
  static readonly maxErrorTurns = 2;

  readonly renderer: MessageProcessor<T>;
  readonly systemPrompt: string;
  readonly client: ChatClient;

  private readonly generator: A2uiGenerator;
  private readonly capabilities: RendererCapabilities;
  private readonly listeners = new Set<() => void>();
  private readonly targets = new Map<string, Target<T>>();
  private queue: Promise<void> = Promise.resolve();
  private queued = 0;
  private running?: Target<T>;
  private disposed = false;
  private readonly reported = new Set<string>();
  private readonly answerErrors = new WeakMap<StreamedAnswer<T>, number>();
  private readonly onAction?: (action: ActionPayload) => void | Promise<void>;
  private readonly replyTimeoutMs: number;

  constructor({
    client,
    instructions,
    catalogs,
    onAction,
    replyTimeoutMs = 300_000,
  }: ChatSessionOptions<T>) {
    this.client = client;
    this.onAction = onAction;
    this.replyTimeoutMs = replyTimeoutMs;
    this.renderer = new MessageProcessor<T>(catalogs, action => this.sendAction(action));
    this.generator = new A2uiGenerator(catalogs.map(catalog => new CatalogConfig(catalog)));
    this.capabilities = this.renderer.getRendererCapabilities({versions: ['1.0']});
    this.systemPrompt = `${instructions}\n${turnInstructions}\n${this.generator.createProcessor(this.capabilities).promptSnippet}`;
    this.renderer.model.onError.subscribe(error =>
      this.report(this.owner(error.surfaceId), {
        version: '1.0',
        error: {code: error.code, surfaceId: error.surfaceId ?? '', message: error.message},
      }),
    );
  }

  get busy(): boolean {
    return this.queued > 0;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  slot(name: string): Slot<T> {
    return this.target(name, true).view;
  }

  // Starts one generation when the key differs from the last one shown. The request is the whole user turn, with the surface id it must name.
  show(name: string, key: string, request: (surfaceId: string) => string): void {
    const target = this.target(name, true);
    if (target.key === key) return;
    target.key = key;
    target.request = request;
    this.generate(target);
  }

  retry(name: string): void {
    this.generate(this.target(name, true));
  }

  // A host write to a bound path of the standing surface. It makes no model request.
  setData(name: string, path: string, value: unknown): void {
    const target = this.target(name, true);
    target.data.set(path, value);
    target.surface?.dataModel.set(path, value);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.renderer.dispose();
  }

  protected target(name: string, standing: boolean): Target<T> {
    let target = this.targets.get(name);
    if (!target) {
      target = {
        name,
        standing,
        turns: [],
        replies: 0,
        errorTurns: 0,
        unsent: [],
        pending: 0,
        data: new Map(),
        view: {busy: false},
      };
      this.targets.set(name, target);
    }
    return target;
  }

  // The conversation's hooks. A standing target shows only its slot.
  protected showParts(_parts: readonly AnswerPart<T>[]): void {}
  protected answerEnded(): void {}
  protected showEntry(_kind: ChatEntryKind, _text: string): void {}

  private fail(target: Target<T>, text: string): void {
    if (target.standing) target.error = text;
    else this.showEntry('error', text);
    this.notify();
  }

  private generate(target: Target<T>): void {
    const key = target.key;
    const surfaceId = `${target.name}-${++target.replies}`;
    const request = target.request!(surfaceId);
    target.error = undefined;
    target.errorTurns = 0;
    void this.enqueue(target, async () => {
      // A generation queued for a key that is no longer shown never starts.
      if (target.key !== key) return;
      target.surfaceId = surfaceId;
      target.turns = [];
      await this.runTurn(target, request);
    });
  }

  protected enqueue(target: Target<T>, turn: () => Promise<void>): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.queued++;
    target.pending++;
    this.notify();
    return (this.queue = this.queue
      .then(turn)
      .catch(error => this.fail(target, `The turn failed: ${error}`))
      .finally(() => {
        this.queued--;
        target.pending--;
        this.notify();
      }));
  }

  protected async runTurn(target: Target<T>, userTurn: string): Promise<void> {
    if (this.disposed) return;
    const key = target.key;
    this.running = target;
    target.turns.push({fromUser: true, text: userTurn});
    this.reported.clear();
    // The SDK names a surface "main" when the model names none, so a second
    // answer would collide with the first. Each answer gets its own default.
    const format = new ExpressFormatFactory({
      surfaceId: target.standing ? target.surfaceId : `${target.name}-${++target.replies}`,
    });
    const streamed = new StreamedAnswer<T>(
      this.generator.createProcessor(this.capabilities, format),
      {renderer: this.renderer},
    );
    let answer: StreamedAnswer<T> | undefined = streamed;
    let reply = '';
    let complete = true;
    try {
      for await (const chunk of this.withTimeout(
        this.client.generate(this.systemPrompt, [...target.turns]),
      )) {
        if (this.disposed) break;
        reply += chunk;
        answer = this.read(target, answer, a => a.feed(chunk));
      }
    } catch (error) {
      complete = false;
      this.fail(target, `The request failed: ${error}`);
    }
    if (this.disposed) return;
    // A standing answer whose stream ends inside a block is cut off: the old surface stays, and no error turn goes out.
    if (complete && target.standing && answer?.isInBlock) {
      complete = false;
      this.fail(target, 'The answer was cut off.');
    }
    if (complete) {
      this.read(target, answer, a => a.close());
    } else {
      // What closing the cut-off reply throws adds nothing to the failure already shown.
      try {
        answer?.close();
      } catch {}
    }
    if (!target.standing) this.answerEnded();
    if (!reply) {
      target.turns.pop();
      if (complete) this.fail(target, 'The model gave no reply.');
    } else {
      target.turns.push({fromUser: false, text: reply});
    }
    if (target.standing) {
      const current = complete && target.key === key;
      for (const part of streamed.parts) {
        if (part.type !== 'surface') continue;
        if (current && part.surface.id === target.surfaceId) {
          this.swap(target, part.surface);
          continue;
        }
        // A cut-off answer, or one for a key no longer shown, leaves the old surface.
        this.renderer.model.deleteSurface(part.surface.id);
        // Two generations must never share a surface id, so a surface under another id goes back to the model.
        if (current)
          this.report(
            target,
            mapErrorToRendererMessage(
              new Error(
                `Draw into the surface "${target.surfaceId}": start the block with surface("${target.surfaceId}").`,
              ),
              {version: '1.0', surfaceId: part.surface.id},
            ),
          );
      }
    }
    this.running = undefined;
    this.notify();
  }

  private swap(target: Target<T>, surface: SurfaceModel<T>): void {
    const old = target.surface;
    target.surface = surface;
    for (const [path, value] of target.data) surface.dataModel.set(path, value);
    this.notify();
    if (old) this.renderer.model.deleteSurface(old.id);
  }

  private async *withTimeout(chunks: AsyncIterable<string>): AsyncIterable<string> {
    const iterator = chunks[Symbol.asyncIterator]();
    try {
      for (;;) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`The model sent nothing for ${this.replyTimeoutMs / 1000} s.`)),
            this.replyTimeoutMs,
          );
        });
        const next = await Promise.race([iterator.next(), timeout]).finally(() =>
          clearTimeout(timer),
        );
        if (next.done) return;
        yield next.value;
      }
    } finally {
      // A held request never settles, so its end is not awaited.
      void iterator.return?.();
    }
  }

  // Reads more of the answer, and returns the answer, or undefined once its stream fails.
  private read(
    target: Target<T>,
    answer: StreamedAnswer<T> | undefined,
    read: (answer: StreamedAnswer<T>) => void,
  ): StreamedAnswer<T> | undefined {
    if (!answer) return undefined;
    let failure: unknown;
    try {
      read(answer);
    } catch (error) {
      failure = error;
    }
    if (!target.standing) this.showParts(answer.parts);
    const errors = answer.parts.filter(part => part.type === 'error');
    for (const part of errors.slice(this.answerErrors.get(answer) ?? 0))
      this.report(target, mapErrorToRendererMessage(part.error, {version: '1.0'}), false);
    this.answerErrors.set(answer, errors.length);
    if (failure !== undefined)
      this.report(target, mapErrorToRendererMessage(failure, {version: '1.0'}));
    this.notify();
    return failure === undefined ? answer : undefined;
  }

  // The target whose surface it is; a surface of the answer being read belongs to its target.
  private owner(surfaceId?: string): Target<T> {
    for (const target of this.targets.values())
      if (surfaceId && target.surface?.id === surfaceId) return target;
    return this.running ?? this.target('reply', false);
  }

  private sendAction(action: ActionPayload): void {
    const target = this.owner(action.surfaceId);
    target.errorTurns = 0;
    const turn = this.clientTurn(target, [{version: '1.0', action}]);
    void this.enqueue(target, async () => {
      try {
        await this.onAction?.(action);
      } catch (error) {
        this.fail(target, `The action failed: ${error}`);
        return;
      }
      await this.runTurn(target, turn);
    });
  }

  private clientTurn(target: Target<T>, messages: OutboundMessage[]): string {
    const turn = JSON.stringify({a2ui: {messages}, ...this.metadata()});
    if (!target.standing)
      this.showEntry(
        'sent',
        messages
          .map(m => ('action' in m ? `action ${m.action.name}` : `error ${m.error.code}`))
          .join(', '),
      );
    return turn;
  }

  protected metadata(): {metadata?: {a2uiRendererDataModel: Record<string, unknown>}} {
    const dataModel = this.renderer.getRendererDataModel();
    return dataModel ? {metadata: {a2uiRendererDataModel: dataModel}} : {};
  }

  // `show` is false for an error that the answer already shows among its parts.
  private report(target: Target<T>, message: RendererErrorMessage, show = true): void {
    const shown = shownError(message);
    // The renderer and the stream can both report one rejected message.
    if (this.reported.has(shown)) return;
    this.reported.add(shown);
    if (show && !target.standing) this.showEntry('error', shown);
    target.unsent.push(message);
    void this.enqueue(target, () => this.sendErrors(target));
  }

  private async sendErrors(target: Target<T>): Promise<void> {
    if (this.disposed || target.unsent.length === 0) return;
    const errors = target.unsent;
    target.unsent = [];
    if (target.errorTurns >= GenerationSession.maxErrorTurns) {
      if (target.standing)
        this.fail(
          target,
          `The model did not correct the surface after ${GenerationSession.maxErrorTurns} error turns.`,
        );
      return;
    }
    target.errorTurns++;
    await this.runTurn(target, this.clientTurn(target, errors));
  }

  protected notify(): void {
    if (this.disposed) return;
    for (const target of this.targets.values())
      target.view = {surface: target.surface, busy: target.pending > 0, error: target.error};
    for (const listener of this.listeners) listener();
  }
}

export class ChatSession<T extends ComponentApi> extends GenerationSession<T> {
  entries: readonly ChatEntry<T>[] = [];

  private readonly list: ChatEntry<T>[] = [];
  private answerAt = 0;
  private answerLength = 0;
  private readonly conversation = this.target('reply', false);

  constructor(options: ChatSessionOptions<T>) {
    super(options);
    this.renderer.onSurfaceDeleted(id => this.removeSurface(id));
  }

  send(text: string): Promise<void> {
    this.showEntry('user', text);
    this.conversation.errorTurns = 0;
    return this.enqueue(this.conversation, () => {
      const metadata = this.metadata();
      return this.runTurn(
        this.conversation,
        metadata.metadata ? `${text}\n\n${JSON.stringify(metadata)}` : text,
      );
    });
  }

  protected override async runTurn(target: Target<T>, userTurn: string): Promise<void> {
    if (!target.standing) {
      this.answerAt = this.list.length;
      this.answerLength = 0;
    }
    return super.runTurn(target, userTurn);
  }

  // The answer keeps its parts in the order the model wrote them, so its entries replace those of the last read.
  protected override showParts(parts: readonly AnswerPart<T>[]): void {
    const entries = parts.map((part): ChatEntry<T> => {
      if (part.type === 'text') return {kind: 'model', text: part.text};
      if (part.type === 'surface') return {kind: 'surface', text: '', surface: part.surface};
      return {
        kind: 'error',
        text: shownError(mapErrorToRendererMessage(part.error, {version: '1.0'})),
      };
    });
    this.list.splice(this.answerAt, this.answerLength, ...entries);
    this.answerLength = entries.length;
  }

  protected override answerEnded(): void {
    this.answerAt = this.list.length;
    this.answerLength = 0;
  }

  protected override showEntry(kind: ChatEntryKind, text: string): void {
    this.list.push({kind, text});
    this.notify();
  }

  protected override notify(): void {
    this.entries = [...this.list];
    super.notify();
  }

  private removeSurface(surfaceId: string): void {
    const index = this.list.findIndex(entry => entry.surface?.id === surfaceId);
    // The answer that is read now removes its own surfaces from its parts.
    if (index < 0 || index >= this.answerAt) return;
    this.list.splice(index, 1);
    this.answerAt--;
    this.notify();
  }
}
