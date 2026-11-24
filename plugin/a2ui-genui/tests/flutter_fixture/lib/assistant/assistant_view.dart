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

import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/material.dart';

import '../settings.dart';
import 'chat_session.dart';

class AssistantView extends StatefulWidget {
  const AssistantView({super.key, required this.session, required this.apiKey});

  final ChatSession session;
  final ValueNotifier<String?> apiKey;

  @override
  State<AssistantView> createState() => _AssistantViewState();
}

class _AssistantViewState extends State<AssistantView> {
  final TextEditingController _input = TextEditingController();

  void _send() {
    final String text = _input.text.trim();
    if (text.isEmpty) return;
    _input.clear();
    unawaited(widget.session.send(text));
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: Listenable.merge([widget.session, widget.apiKey]),
    builder: (context, _) {
      final bool canSend = widget.apiKey.value != null && !widget.session.busy;
      return Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final ChatEntry entry in widget.session.entries)
                  _entry(context, entry),
              ],
            ),
          ),
          if (widget.session.busy) const LinearProgressIndicator(),
          if (widget.apiKey.value == null) KeyButton(apiKey: widget.apiKey),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _input,
                  decoration: const InputDecoration(
                    hintText: 'Ask for some UI',
                  ),
                  onEditingComplete: canSend ? _send : null,
                ),
              ),
              IconButton(
                tooltip: 'Send',
                icon: const Icon(Icons.send),
                onPressed: canSend ? _send : null,
              ),
            ],
          ),
        ],
      );
    },
  );
}

Widget _entry(BuildContext context, ChatEntry entry) {
  if (entry.surface case final surface?) {
    return A2uiSurface(key: ObjectKey(surface), surface: surface);
  }
  final ColorScheme colors = Theme.of(context).colorScheme;
  return Text(
    switch (entry.kind) {
      ChatEntryKind.user => 'You: ${entry.text}',
      ChatEntryKind.sent => 'Sent: ${entry.text}',
      _ => entry.text,
    },
    style: entry.kind == ChatEntryKind.error
        ? TextStyle(color: colors.error)
        : null,
  );
}
