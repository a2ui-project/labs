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

import 'package:dartantic_ai/dartantic_ai.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/assistant/llm_client.dart';

void main() {
  testWidgets('textOf fails when results with no text come for longer than '
      'its limit', (tester) async {
    // sendStream yields results like these while the model has sent no text.
    Stream<ChatResult<String>> results() => Stream.periodic(
      const Duration(seconds: 10),
      (_) => ChatResult<String>(output: '', metadata: {'safety_ratings': []}),
    );
    final List<Object> plain = [];
    final List<Object> filtered = [];
    final StreamSubscription<ChatResult<String>> raw = results()
        .timeout(const Duration(seconds: 30))
        .listen((_) {}, onError: plain.add);
    final StreamSubscription<String> text = textOf(
      results(),
      const Duration(seconds: 90),
    ).listen((_) {}, onError: filtered.add);

    await tester.pump(const Duration(seconds: 89));
    expect(filtered, isEmpty);
    await tester.pump(const Duration(seconds: 2));
    expect(filtered, [isA<TimeoutException>()]);
    await tester.pump(const Duration(minutes: 3));
    expect(plain, isEmpty);

    // An awaited cancel of these streams does not complete in fake time.
    unawaited(raw.cancel());
    unawaited(text.cancel());
  });
}
