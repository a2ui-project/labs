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

import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/material.dart';

import 'assistant/app_catalog.dart';
import 'assistant/assistant_view.dart';
import 'assistant/chat_session.dart';
import 'settings.dart';
import 'tasks.dart';

class FixtureApp extends StatelessWidget {
  const FixtureApp({
    super.key,
    required this.session,
    required this.store,
    required this.apiKey,
    this.now = DateTime.now,
  });

  final ChatSession session;
  final TaskStore store;
  final ValueNotifier<String?> apiKey;
  final DateTime Function() now;

  @override
  Widget build(BuildContext context) => MaterialApp(
    home: HomeScreen(session: session, store: store, apiKey: apiKey, now: now),
  );
}

class Standing extends StatelessWidget {
  const Standing({
    super.key,
    required this.session,
    required this.apiKey,
    required this.name,
    required this.label,
    required this.child,
  });

  final GenerationSession session;
  final ValueNotifier<String?> apiKey;
  final String name;
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: Listenable.merge([session, apiKey]),
    builder: (context, _) {
      final Target slot = session.slot(name);
      return Semantics(
        container: true,
        explicitChildNodes: true,
        label: label,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (slot.busy) const LinearProgressIndicator(),
            if (slot.surface case final surface?)
              A2uiSurface(key: ObjectKey(surface), surface: surface)
            else
              child,
            if (apiKey.value == null) KeyButton(apiKey: apiKey),
            if (slot.error case final error?)
              Row(
                children: [
                  Expanded(child: Text(error)),
                  TextButton(
                    onPressed: () => session.retry(name),
                    child: const Text('Retry'),
                  ),
                ],
              ),
          ],
        ),
      );
    },
  );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.session,
    required this.store,
    required this.apiKey,
    required this.now,
  });

  final ChatSession session;
  final TaskStore store;
  final ValueNotifier<String?> apiKey;
  final DateTime Function() now;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    _setCount();
    widget.store.selected.addListener(_setCount);
    widget.apiKey.addListener(_showToday);
    _lifecycle = AppLifecycleListener(onResume: _showToday);
    // show notifies the session's listeners, which must not happen in a
    // build.
    WidgetsBinding.instance.addPostFrameCallback((_) => _showToday());
  }

  // The date is the context key, so a new date starts one generation.
  void _showToday() {
    final String today = widget.now().toIso8601String().substring(0, 10);
    widget.session.setData('home', '/today', today);
    if (widget.apiKey.value == null) return;
    widget.session.show('home', today, (id) => homeRequest(today, id));
  }

  void _setCount() => widget.session.setData(
    'home',
    '/selected_count',
    widget.store.selected.value.length,
  );

  @override
  void dispose() {
    widget.store.selected.removeListener(_setCount);
    widget.apiKey.removeListener(_showToday);
    _lifecycle.dispose();
    super.dispose();
  }

  // The region shows again when the pushed screen pops.
  void _open(Widget screen) => Navigator.of(context)
      .push(
        MaterialPageRoute<void>(
          builder: (_) => Scaffold(appBar: AppBar(), body: screen),
        ),
      )
      .then((_) => _showToday());

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Home')),
    body: Column(
      children: [
        Standing(
          session: widget.session,
          apiKey: widget.apiKey,
          name: 'home',
          label: 'Today',
          child: ValueListenableBuilder(
            valueListenable: widget.store.selected,
            builder: (context, selected, _) =>
                Text('Welcome back. ${selected.length} selected.'),
          ),
        ),
        TextButton(
          onPressed: () => _open(
            ListScreen(
              session: widget.session,
              store: widget.store,
              apiKey: widget.apiKey,
            ),
          ),
          child: const Text('Tasks'),
        ),
        TextButton(
          onPressed: () => _open(
            AssistantView(session: widget.session, apiKey: widget.apiKey),
          ),
          child: const Text('Chat'),
        ),
      ],
    ),
  );
}

class ListScreen extends StatelessWidget {
  const ListScreen({
    super.key,
    required this.session,
    required this.store,
    required this.apiKey,
  });

  final ChatSession session;
  final TaskStore store;
  final ValueNotifier<String?> apiKey;

  @override
  Widget build(BuildContext context) => ValueListenableBuilder(
    valueListenable: store.selected,
    builder: (context, selected, _) => Column(
      children: [
        for (final Task task in store.tasks)
          CheckboxListTile(
            title: Text(task.title),
            value: selected.contains(task.title),
            onChanged: (checked) => store.selected.value = checked!
                ? {...selected, task.title}
                : ({...selected}..remove(task.title)),
          ),
        ValueListenableBuilder(
          valueListenable: store.pins,
          builder: (context, pins, _) => Text('Pins: $pins'),
        ),
        TextButton(
          // On a phone the panel is a sheet over the current screen.
          onPressed: () => showModalBottomSheet<void>(
            context: context,
            builder: (_) =>
                Sidebar(session: session, store: store, apiKey: apiKey),
          ),
          child: const Text('Assistant'),
        ),
      ],
    ),
  );
}

class Sidebar extends StatefulWidget {
  const Sidebar({
    super.key,
    required this.session,
    required this.store,
    required this.apiKey,
  });

  final ChatSession session;
  final TaskStore store;
  final ValueNotifier<String?> apiKey;

  @override
  State<Sidebar> createState() => _SidebarState();
}

class _SidebarState extends State<Sidebar> {
  @override
  void initState() {
    super.initState();
    // show notifies the session's listeners, which must not happen in a
    // build.
    WidgetsBinding.instance.addPostFrameCallback((_) => _showContext());
    widget.store.selected.addListener(_showContext);
    widget.apiKey.addListener(_showContext);
  }

  // A change inside the context key is data only; a new key starts one
  // generation.
  void _showContext() {
    final int count = widget.store.selected.value.length;
    final String selection = count == 0 ? 'none' : 'some';
    widget.session.setData('sidebar', '/context/selected_count', count);
    if (widget.apiKey.value == null) return;
    widget.session.show(
      'sidebar',
      'list:$selection',
      (id) => sidebarRequest(selection, id),
    );
  }

  @override
  void dispose() {
    widget.store.selected.removeListener(_showContext);
    widget.apiKey.removeListener(_showContext);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Standing(
    session: widget.session,
    apiKey: widget.apiKey,
    name: 'sidebar',
    label: 'Assistant panel',
    child: const Text('The assistant is getting ready.'),
  );
}
