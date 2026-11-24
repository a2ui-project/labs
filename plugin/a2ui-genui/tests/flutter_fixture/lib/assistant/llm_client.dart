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

import 'package:dartantic_ai/dartantic_ai.dart' as dartantic;

/// One turn of a conversation with a model.
typedef ChatTurn = ({bool fromUser, String text});

/// A language model that streams its replies.
abstract interface class LlmClient {
  /// Yields the model's reply to [turns], which end with a user turn, under
  /// [systemPrompt], as the model streams it.
  Stream<String> generate(String systemPrompt, List<ChatTurn> turns);
}

/// The text of [results], from `Agent.sendStream`. It fails with a
/// `TimeoutException` when no text comes for [limit].
Stream<String> textOf(
  Stream<dartantic.ChatResult<String>> results,
  Duration limit,
) => results
    .map((result) => result.output)
    // sendStream also yields results with no text, and each event restarts
    // a stream timeout, so the timeout must come after this filter.
    .where((text) => text.isNotEmpty)
    .timeout(limit);
