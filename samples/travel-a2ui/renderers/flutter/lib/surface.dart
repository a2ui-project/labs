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

// The widget that draws one surface with the travel catalog's look: the SDK's
// `A2uiSurface`, with the Markdown in the basic `Text` rendered.

import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:a2ui_flutter/basic_catalog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// A surface, with the Markdown in its `Text` rendered, as the web client does.
///
/// The basic `Text` hands its Markdown to the nearest `A2uiMarkdown`; without
/// one, headings and emphasis show as plain text.
class TravelSurface extends StatelessWidget {
  const TravelSurface({super.key, required this.surface});

  final SurfaceModel<ComponentImplementation> surface;

  static Widget _markdown(
    BuildContext context,
    String markdown,
    TextStyle style,
  ) => MarkdownBody(
    data: markdown,
    onTapLink: (_, href, _) {
      final uri = href == null ? null : Uri.tryParse(href);
      if (uri != null) launchUrl(uri).ignore();
    },
    styleSheet: MarkdownStyleSheet.fromTheme(
      Theme.of(context),
    ).copyWith(p: style),
  );

  @override
  Widget build(BuildContext context) => A2uiMarkdown(
    builder: _markdown,
    child: A2uiSurface(surface: surface),
  );
}
