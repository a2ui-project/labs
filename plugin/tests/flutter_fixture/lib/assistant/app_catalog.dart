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

import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:json_schema_builder/json_schema_builder.dart';

const String appInstructions = r'''
You are the assistant of a task app. Show the status of a task with a
StatusBadge. Call listTasks for the user's tasks. On the side panel, when
items are selected, give a button "Pin selection" with the action
Event("pin", {count: $/context/selected_count}).

In the conversation, answer in a sentence or two, then show one surface for
the request. Give the surface one job and a few components.
''';

String sidebarRequest(String selection, String surfaceId) =>
    'Show one surface for the side panel, in a block that starts with '
    'surface("$surfaceId"). Write no text outside the block. Screen: list. '
    'Selection: $selection. Bind \$/context/selected_count and show each '
    'value. Offer only the controls for this task. If nothing is selected, '
    'say what to select.';

String homeRequest(String today, String surfaceId) =>
    'Show one surface for the top of the home screen, in a block that starts '
    'with surface("$surfaceId"). Write no text outside the block. Today is '
    '$today. Bind \$/today and \$/selected_count and show each value. Lead '
    'with what matters most on this date, then what needs a decision. If '
    'there is no data, show one short line and one action.';

final CatalogImplementation appCatalog = CatalogImplementation(
  id: 'https://example.com/my_app/catalog.json',
  protocolVersion: A2uiProtocolVersion.v1_0,
  components: [
    ComponentImplementation(
      name: 'StatusBadge',
      schema: Schema.object(
        properties: {
          'label': Schema.fromMap({
            r'$ref': r'common_types.json#/$defs/DynamicString',
          }),
          'status': Schema.string(enumValues: ['open', 'done']),
        },
        required: ['label', 'status'],
      ),
      builder: (context, node, props, buildChild) => Chip(
        avatar: Icon(
          props.string('status') == 'done' ? Icons.check : Icons.schedule,
        ),
        label: Text(props.string('label') ?? ''),
      ),
    ),
  ],
);
