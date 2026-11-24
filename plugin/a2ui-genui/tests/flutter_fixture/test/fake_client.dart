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

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/assistant/chat_session.dart';
import 'package:my_app/assistant/llm_client.dart';

// A test that names ChatTurn gets it from here, so no import looks unused.
export 'package:my_app/assistant/llm_client.dart' show ChatTurn;

/// Replies to each request with the next of [replies], chunk by chunk, and
/// keeps the requests.
class FakeClient implements LlmClient {
  FakeClient(this.replies, {this.holds = const {}, this.cuts = const {}});

  /// The chunks of each reply, in order.
  final List<List<String>> replies;

  // The reply with each index here starts once its future completes.
  final Map<int, Future<void>> holds;

  // The reply with each index here throws after its first chunk.
  final Set<int> cuts;

  /// The system prompt of each request, in order.
  final List<String> systemPrompts = [];

  /// The turns of each request, in order.
  final List<List<ChatTurn>> requests = [];

  @override
  Stream<String> generate(String systemPrompt, List<ChatTurn> turns) async* {
    systemPrompts.add(systemPrompt);
    requests.add(turns);
    final int index = requests.length - 1;
    if (holds[index] case final Future<void> hold) await hold;
    if (cuts.contains(index)) {
      yield replies[index].first;
      throw StateError('The reply was cut off.');
    }
    yield* Stream.fromIterable(replies[index]);
  }
}

/// The text of [session]'s error entries.
List<String> errorsOf(ChatSession session) => [
  for (final ChatEntry entry in session.entries)
    if (entry.kind == ChatEntryKind.error) entry.text,
];

/// Taps [finder] after it scrolls it into view: a surface taller than the
/// test window puts the widget out of view, and a plain tap misses it.
Future<void> tapOn(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pump();
}

/// The recording at [path], from the package root, in the form
/// `{"request": "...", "replies": [["chunk", ...], ...]}`.
({String request, List<List<String>> replies}) readRecording(String path) {
  final json =
      jsonDecode(File(path).readAsStringSync()) as Map<String, Object?>;
  return (
    request: json['request']! as String,
    replies: [
      for (final Object? reply in json['replies']! as List<Object?>)
        (reply! as List<Object?>).cast<String>(),
    ],
  );
}

/// Passes the replies of [client] through and keeps them, so that
/// `jsonEncode(recorder)` writes a recording that [readRecording] reads.
class RecordingClient implements LlmClient {
  RecordingClient(this.client);

  final LlmClient client;

  String? _request;

  /// The text chunks of each reply so far. A failed record run prints them
  /// to show a rejected block.
  final List<List<String>> replies = [];
  final List<String> _failures = [];

  @override
  Stream<String> generate(String systemPrompt, List<ChatTurn> turns) async* {
    _request ??= turns.first.text;
    final reply = <String>[];
    replies.add(reply);
    try {
      await for (final String chunk in client.generate(systemPrompt, turns)) {
        reply.add(chunk);
        yield chunk;
      }
    } catch (error) {
      _failures.add('$error');
      rethrow;
    }
  }

  Map<String, Object?> toJson() {
    // A failed turn leaves a reply that no model gave, so it must not become
    // a recording.
    if (_failures.isNotEmpty) {
      throw StateError(
        'A recorded turn failed, so there is no recording: '
        '${_failures.join('; ')}',
      );
    }
    return {'request': _request ?? '', 'replies': replies};
  }
}
