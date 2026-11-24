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

import 'package:flutter/material.dart';

/// The one control that opens the key entry of the app's settings.
class KeyButton extends StatelessWidget {
  const KeyButton({super.key, required this.apiKey});

  final ValueNotifier<String?> apiKey;

  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: () => Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => SettingsScreen(apiKey: apiKey)),
    ),
    child: const Text('Add a key'),
  );
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.apiKey});

  // In memory only: the app keeps no store for the key.
  final ValueNotifier<String?> apiKey;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _key = TextEditingController();

  @override
  void dispose() {
    _key.dispose();
    super.dispose();
  }

  void _save() {
    final String key = _key.text.trim();
    widget.apiKey.value = key.isEmpty ? null : key;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Settings')),
    body: Column(
      children: [
        TextField(
          controller: _key,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'API key'),
        ),
        FilledButton(onPressed: _save, child: const Text('Save')),
      ],
    ),
  );
}
