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

import 'fake_client.dart';

void main() {
  test(
    'a recording of a replayed run equals the recording it replays',
    () async {
      const path = 'test/fixtures/recorded_turn.json';
      final recording = readRecording(path);
      final recorder = RecordingClient(FakeClient(recording.replies));
      for (final List<String> reply in recording.replies) {
        final List<String> chunks = await recorder.generate('', [
          (fromUser: true, text: recording.request),
        ]).toList();
        expect(chunks, reply);
      }
      expect(recorder.replies, recording.replies);
      expect(
        jsonDecode(jsonEncode(recorder)),
        jsonDecode(File(path).readAsStringSync()),
      );
    },
  );

  test(
    'a failed turn fails the recording, so no recording is written',
    () async {
      final recorder = RecordingClient(FakeClient([]));
      await expectLater(
        recorder.generate('', [(fromUser: true, text: 'Hello')]).toList(),
        throwsRangeError,
      );
      expect(
        () => jsonEncode(recorder),
        throwsA(
          isA<JsonUnsupportedObjectError>().having(
            (error) => '${error.cause}',
            'cause',
            startsWith(
              'Bad state: A recorded turn failed, so there is no recording: '
              'RangeError',
            ),
          ),
        ),
      );
    },
  );
}
