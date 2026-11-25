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

/// The library model of Craft: the nodes of a parsed template library, which
/// tools that inspect or build libraries use. Its types that the API of
/// `package:a2ui_craft/a2ui_craft.dart` names (`LibraryName`,
/// `RemoteWidgetLibrary`, `WidgetDeclaration`, `Missing`, ...) are exported
/// there too.
library;

export 'src/rfw/model.dart';
