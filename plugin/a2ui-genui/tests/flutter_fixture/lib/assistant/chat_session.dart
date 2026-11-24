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

import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';

import 'generation_session.dart';

export 'generation_session.dart';

/// What a [ChatEntry] shows.
enum ChatEntryKind {
  /// Text the user typed.
  user,

  /// Text the model wrote outside its A2UI payloads.
  model,

  /// A surface the model created.
  surface,

  /// A turn the app sent the model for the user, named by its actions and
  /// errors.
  sent,

  /// An error the renderer met, or a failed request to the model.
  error,
}

/// One entry of the conversation.
class ChatEntry {
  ChatEntry(this.kind, this.text) : surface = null;

  ChatEntry.surface(SurfaceModel<ComponentImplementation> this.surface)
    : kind = ChatEntryKind.surface,
      text = '';

  final ChatEntryKind kind;

  /// The entry's text, which grows while the model streams it.
  String text;

  final SurfaceModel<ComponentImplementation>? surface;
}

/// A conversation in which a model answers with text and A2UI surfaces.
class ChatSession extends GenerationSession {
  ChatSession({
    required super.client,
    required super.instructions,
    super.catalogs,
    super.openUrl,
    super.onAction,
    super.replyTimeout,
  }) {
    processor.model.onSurfaceDeleted.subscribe(_removeSurface);
  }

  /// The conversation as the user sees it.
  final List<ChatEntry> entries = [];

  ChatEntry? _modelText;

  /// Sends [text] to the model with the renderer data model as it is when the
  /// turn starts, and completes once its reply is applied.
  Future<void> send(String text) {
    _add(ChatEntryKind.user, text);
    return converse(() {
      final Map<String, Object?> metadata = this.metadata();
      return metadata.isEmpty ? text : '$text\n\n${jsonEncode(metadata)}';
    });
  }

  ChatEntry _add(ChatEntryKind kind, [String text = '']) {
    _modelText = null;
    final entry = ChatEntry(kind, text);
    entries.add(entry);
    return entry;
  }

  @override
  void showText(String text) {
    (_modelText ??= _add(ChatEntryKind.model)).text += text;
  }

  @override
  void showSurface(SurfaceModel<ComponentImplementation> surface) {
    _modelText = null;
    entries.add(ChatEntry.surface(surface));
  }

  @override
  void showError(String text) => _add(ChatEntryKind.error, text);

  @override
  void showSent(String text) => _add(ChatEntryKind.sent, text);

  @override
  void breakText() => _modelText = null;

  void _removeSurface(String surfaceId) {
    entries.removeWhere((entry) => entry.surface?.id == surfaceId);
    notify();
  }
}
