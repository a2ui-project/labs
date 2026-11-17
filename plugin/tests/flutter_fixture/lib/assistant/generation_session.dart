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

import 'dart:async';
import 'dart:convert';

import 'package:a2ui_agent/a2ui_agent.dart';
import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:a2ui_flutter/basic_catalog.dart';
import 'package:flutter/foundation.dart';

import 'llm_client.dart';

/// What every app tells the model between its own instructions and the agent
/// SDK's prompt snippet: the surface lines the snippet leaves out, and how
/// this session writes turns.
const String turnInstructions = r'''
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
''';

class Target {
  Target._(this.name, {required this.standing});

  final String name;

  final bool standing;

  SurfaceModel<ComponentImplementation>? surface;

  String? error;

  bool get busy => _pending > 0;

  final List<ChatTurn> _turns = [];
  final List<A2uiRendererError> _unsent = [];
  final Map<String, Object?> _data = {};
  int _pending = 0;
  int _errorTurns = 0;
  int _generations = 0;
  String? _key;
  String Function(String surfaceId)? _request;
  String? _surfaceId;
}

/// Generations of A2UI surfaces from one model, into the conversation or into
/// standing slots.
///
/// The model is prompted for the catalogs the renderer supports. Its
/// reply is parsed and rendered as it streams. Actions on its surfaces, and
/// errors the renderer meets, go back to it as the next user turn of the
/// target whose surface it is.
class GenerationSession extends ChangeNotifier {
  /// [catalogs] are the app's own catalogs, which the model is prompted for
  /// and the renderer renders beside the basic catalog. [openUrl] opens the
  /// URL of the basic catalog's `openUrl` action, such as url_launcher's
  /// `launchUrl`; without it that action fails.
  GenerationSession({
    required this.client,
    required this.instructions,
    List<CatalogImplementation> catalogs = const [],
    OpenUrlCallback? openUrl,
    this.onAction,
    this.replyTimeout = const Duration(minutes: 5),
  }) {
    final List<CatalogImplementation> all = [
      basicCatalog(openUrl: openUrl),
      ...catalogs,
    ];
    _agent =
        A2uiGenerator(
          catalogs: [
            for (final CatalogImplementation c in all) CatalogConfig(c),
          ],
        ).createProcessor(
          A2uiRendererCapabilities.forCatalogIds([
            for (final CatalogImplementation c in all) c.id,
          ], version: A2uiProtocolVersion.v1_0),
        );
    processor = MessageProcessor(
      catalogs: all,
      defaultVersion: A2uiProtocolVersion.v1_0,
      validationConfig: ValidationConfig.relaxed,
      outboundListener: _sendOutbound,
    );
    processor.model.onSurfaceCreated.subscribe(_addSurface);
    processor.model.onAction.subscribe(_sendAction);
  }

  final LlmClient client;

  /// What the app tells the model, ahead of [turnInstructions].
  final String instructions;

  /// The app's write handler. It runs once for each action, before the action
  /// goes to the model. If it throws, the error shows and the action does not
  /// go to the model.
  final FutureOr<void> Function(A2uiRendererAction action)? onAction;

  /// A reply that sends no chunk for this long ends as an error. Keep it
  /// longer than the client's 3 timeouts and 2 waits together.
  final Duration replyTimeout;

  /// The renderer's message processor, with the checks that a half-streamed
  /// surface would fail turned off. Its calls of the model's functions, and
  /// its responses to the model's calls, go to the model as the next turn.
  late final MessageProcessor<ComponentImplementation> processor;

  static final String _version = A2uiProtocolVersion.v1_0.jsonValue;

  late final A2uiRequestProcessor _agent;

  /// The surfaces the model's replies have created, as the agent SDK checks
  /// each reply against them.
  late final RendererState _state = _agent.createState();

  /// [instructions], [turnInstructions] and the agent SDK's prompt snippet
  /// for the catalogs the renderer supports.
  late final String systemPrompt =
      '$instructions\n$turnInstructions\n${_agent.promptSnippet}';

  final List<String> errors = [];

  final Map<String, Target> _targets = {};
  late final Target _conversation = _target('reply', standing: false);
  Target? _running;
  final List<SurfaceModel<ComponentImplementation>> _created = [];
  Future<void> _queue = Future.value();
  int _queued = 0;
  StreamIterator<String>? _reading;
  bool _disposed = false;

  /// Whether a turn is waiting for, or reading, the model's reply.
  bool get busy => _queued > 0;

  Target slot(String name) => _target(name, standing: true);

  // request gets the id of the surface that the generation must create, so
  // that two generations never share one.
  void show(
    String name,
    String key,
    String Function(String surfaceId) request,
  ) {
    final Target target = slot(name);
    if (target._key == key) return;
    target._key = key;
    target._request = request;
    _generate(target);
  }

  void retry(String name) => _generate(slot(name));

  // Makes no model request; later surfaces of the target get the value too.
  void setData(String name, String path, Object? value) {
    final Target target = slot(name);
    target._data[path] = value;
    target.surface?.dataModel.set(path, value);
  }

  @protected
  Future<void> converse(String Function() turn) {
    _conversation._errorTurns = 0;
    return _enqueue(_conversation, () => _runTurn(_conversation, turn()));
  }

  // The conversation's view; a standing target shows only its slot.
  @protected
  void showText(String text) {}

  @protected
  void showSurface(SurfaceModel<ComponentImplementation> surface) {}

  @protected
  void showError(String text) {}

  @protected
  void showSent(String text) {}

  @protected
  void breakText() {}

  Target _target(String name, {required bool standing}) =>
      _targets[name] ??= Target._(name, standing: standing);

  void _generate(Target target) {
    final String? key = target._key;
    final String surfaceId = '${target.name}-${++target._generations}';
    final String request = target._request!(surfaceId);
    target.error = null;
    target._errorTurns = 0;
    unawaited(
      _enqueue(target, () async {
        // A generation queued for a key that is no longer shown never starts.
        if (target._key != key) return;
        target._surfaceId = surfaceId;
        target._turns.clear();
        await _runTurn(target, request);
      }),
    );
  }

  void _fail(Target target, String text) {
    errors.add(text);
    if (target.standing) {
      target.error = text;
    } else {
      showError(text);
    }
    notify();
  }

  /// Runs [turn] once the turns queued before it end, and shows what it
  /// throws as an error. Does nothing once the session is disposed.
  Future<void> _enqueue(Target target, Future<void> Function() turn) {
    if (_disposed) return Future.value();
    _queued++;
    target._pending++;
    notify();
    return _queue = _queue
        .then((_) => turn())
        .catchError((Object error) {
          _fail(target, 'The turn failed: $error');
        })
        .whenComplete(() {
          _queued--;
          target._pending--;
          notify();
        });
  }

  Future<void> _runTurn(Target target, String userTurn) async {
    if (_disposed) return;
    final String? key = target._key;
    _running = target;
    _created.clear();
    target._turns.add((fromUser: true, text: userTurn));
    _reported.clear();
    ContinuingResponseStream? stream = _agent.openContinuingStream(
      state: _state,
    );
    final reply = StringBuffer();
    var complete = true;
    if (!target.standing) breakText();
    final StreamIterator<String> chunks = _reading = StreamIterator(
      client.generate(systemPrompt, List.of(target._turns)),
    );
    try {
      while (await chunks.moveNext().timeout(replyTimeout)) {
        if (_disposed) break;
        reply.write(chunks.current);
        stream = _read(target, stream, (s) => s.feed(chunks.current));
        notify();
      }
    } on Object catch (error) {
      complete = false;
      // A held request stays open until it is cancelled.
      unawaited(chunks.cancel());
      _fail(target, 'The request failed: $error');
    }
    _reading = null;
    if (_disposed) return;
    if (complete) {
      _read(target, stream, (s) {
        final List<StreamPart> parts = s.close();
        // A standing answer that ends inside its block is cut off: it fails
        // like a broken stream, and no error turn asks the model to fix it.
        complete =
            !target.standing ||
            !parts.any((p) => p is ErrorPart && p.error is A2uiParseError);
        return complete ? parts : [];
      });
      if (!complete) _fail(target, 'The reply ended inside its block.');
    } else {
      // What closing the cut-off reply throws adds nothing to the failure
      // already shown.
      try {
        stream?.close();
      } on Object catch (_) {}
    }
    if (reply.isEmpty) {
      target._turns.removeLast();
      if (complete) _fail(target, 'The model gave no reply.');
    } else {
      target._turns.add((fromUser: false, text: '$reply'));
    }
    _running = null;
    if (target.standing) {
      _settle(target, current: complete && target._key == key);
    }
  }

  void _settle(Target target, {required bool current}) {
    final String expected = target._surfaceId!;
    for (final SurfaceModel<ComponentImplementation> surface in List.of(
      _created,
    )) {
      if (current && surface.id == expected) {
        final SurfaceModel<ComponentImplementation>? old = target.surface;
        target.surface = surface;
        // Host values win over the values that the model wrote.
        target._data.forEach(surface.dataModel.set);
        notify();
        if (old != null) processor.model.deleteSurface(old.id);
        continue;
      }
      // A cut-off answer, or one for an old key, leaves the old surface.
      processor.model.deleteSurface(surface.id);
      if (current) {
        // Two generations must never share a surface id, so a surface under
        // another id is not shown and goes back to the model.
        _report(
          target,
          A2uiRendererError(
            code: 'UNKNOWN_ERROR',
            surfaceId: surface.id,
            message:
                'Draw into the surface "$expected": start the block with '
                'surface("$expected").',
          ),
        );
      }
    }
    _created.clear();
  }

  /// Shows the text and processes the messages that [read] gets from
  /// [stream], and returns [stream], or null once it throws. A block it
  /// rejects is reported, and the text and blocks after it are still read.
  ContinuingResponseStream? _read(
    Target target,
    ContinuingResponseStream? stream,
    List<StreamPart> Function(ContinuingResponseStream stream) read,
  ) {
    if (stream == null) return null;
    try {
      for (final StreamPart part in read(stream)) {
        switch (part) {
          case TextPart(:final String text):
            if (!target.standing) showText(text);
          case A2uiPart(:final List<AgentToRendererMessage> a2ui):
            for (final AgentToRendererMessage message in a2ui) {
              _process(target, message);
            }
          case ErrorPart(:final A2uiError error):
            _reportFailure(target, error, '');
        }
      }
      return stream;
    } on Object catch (error) {
      _reportFailure(target, error, '');
      return null;
    }
  }

  void _process(Target target, AgentToRendererMessage message) {
    if (!target.standing) breakText();
    try {
      processor.processMessages(AgentToRendererMessagePayload.of(message));
    } on Object catch (error) {
      final String surfaceId = switch (message) {
        CreateSurfaceMessage(:final String surfaceId) ||
        UpdateComponentsMessage(:final String surfaceId) ||
        UpdateDataModelMessage(:final String surfaceId) ||
        DeleteSurfaceMessage(:final String surfaceId) => surfaceId,
        _ => '',
      };
      _reportFailure(target, error, surfaceId);
    }
  }

  void _addSurface(SurfaceModel<ComponentImplementation> surface) {
    surface.onError.subscribe(
      (error) => _report(_owner(error.surfaceId), error),
    );
    final Target target = _running ?? _conversation;
    if (target.standing) {
      _created.add(surface);
    } else {
      showSurface(surface);
    }
    notify();
  }

  /// The target whose surface [surfaceId] is; a surface of the answer being
  /// read belongs to its target.
  Target _owner(String? surfaceId) {
    for (final Target target in _targets.values) {
      if (surfaceId != null && target.surface?.id == surfaceId) return target;
    }
    return _running ?? _conversation;
  }

  void _sendAction(A2uiRendererAction action) {
    final Target target = _owner(action.surfaceId);
    target._errorTurns = 0;
    final String turn = _clientTurn(target, [
      ActionMessage(version: _version, action: action),
    ]);
    unawaited(
      _enqueue(target, () async {
        try {
          await onAction?.call(action);
        } on Object catch (error) {
          _fail(target, 'The action failed: $error');
          return;
        }
        await _runTurn(target, turn);
      }),
    );
  }

  /// Sends [message], which [processor] sends to the agent, to the model as
  /// the next turn. An [ErrorMessage] is dropped, as [processor] also throws
  /// that error and the session reports it.
  void _sendOutbound(RendererToAgentMessage message) {
    if (message is ErrorMessage) return;
    final Target target = _owner(null);
    target._errorTurns = 0;
    final String turn = _clientTurn(target, [message]);
    unawaited(_enqueue(target, () => _runTurn(target, turn)));
  }

  /// [messages] as a v1.0 payload under `a2ui`, with [metadata] beside it,
  /// written as a user turn.
  String _clientTurn(Target target, List<RendererToAgentMessage> messages) {
    final String turn = jsonEncode({
      'a2ui': RendererToAgentMessagePayload(messages).toJson(),
      ...metadata(),
    });
    if (!target.standing) {
      showSent(
        [
          for (final RendererToAgentMessage message in messages)
            switch (message) {
              ActionMessage(:final A2uiRendererAction action) =>
                'action ${action.name}',
              ErrorMessage(:final A2uiRendererError error) =>
                'error ${error.code}',
              CallAgentFunctionMessage(:final String functionCallId) =>
                'function call $functionCallId',
              RendererFunctionResponseMessage(:final response) =>
                'function response ${response.functionCallId}',
              _ => message.runtimeType.toString(),
            },
        ].join(', '),
      );
    }
    return turn;
  }

  /// The renderer data model as transport metadata, or nothing when no surface
  /// was created with `sendDataModel`.
  @protected
  Map<String, Object?> metadata() {
    final Map<String, dynamic>? dataModel = processor.getRendererDataModel();
    return {
      if (dataModel != null) 'metadata': {'a2uiRendererDataModel': dataModel},
    };
  }

  final Set<String> _reported = {};

  /// How many turns of errors in a row go to the model before the user's
  /// next turn.
  static const int maxErrorTurns = 2;

  /// Reports [error], thrown reading or processing a message of the surface
  /// [surfaceId], under its code and with its path, or as `UNKNOWN_ERROR` if
  /// it is not an [A2uiError] or is a validation failure with no path.
  ///
  /// [surfaceId] is empty for an error thrown reading the reply, which comes
  /// with no message to take the id from.
  void _reportFailure(Target target, Object error, String surfaceId) {
    final A2uiError failure = error is A2uiError ? error : A2uiError('$error');
    final String? path = failure is A2uiValidationError ? failure.path : null;
    final bool pathless =
        failure.code == A2uiRendererError.validationFailedCode &&
        (path == null || path.isEmpty);
    _report(
      target,
      A2uiRendererError(
        code: pathless ? 'UNKNOWN_ERROR' : failure.code,
        surfaceId: surfaceId,
        message: failure.message,
        path: pathless ? null : path,
      ),
    );
  }

  /// Shows [error] and sends it to the model as a turn of [target] once the
  /// current turn ends.
  ///
  /// An error already reported since the current turn started is ignored.
  void _report(Target target, A2uiRendererError error) {
    if (!_reported.add(jsonEncode(error))) return;
    final String text =
        '${error.code} on "${error.surfaceId}": ${error.message}';
    errors.add(text);
    if (!target.standing) showError(text);
    target._unsent.add(error);
    notify();
    unawaited(_enqueue(target, () => _sendErrors(target)));
  }

  Future<void> _sendErrors(Target target) async {
    if (_disposed || target._unsent.isEmpty) return;
    final List<RendererToAgentMessage> errors = [
      for (final A2uiRendererError error in target._unsent)
        ErrorMessage(version: _version, error: error),
    ];
    target._unsent.clear();
    if (target._errorTurns >= maxErrorTurns) {
      // The conversation already shows each error; a slot needs its retry.
      if (target.standing) {
        _fail(target, 'The model did not correct the surface.');
      }
      return;
    }
    target._errorTurns++;
    await _runTurn(target, _clientTurn(target, errors));
  }

  @protected
  void notify() {
    if (!_disposed) notifyListeners();
  }

  /// Stops reading the current reply and runs no turn after it.
  @override
  void dispose() {
    _disposed = true;
    unawaited(_reading?.cancel());
    processor.dispose();
    _state.dispose();
    super.dispose();
  }
}
