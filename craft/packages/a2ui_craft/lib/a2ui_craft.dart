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

/// The framework-independent core of Craft: the template language, its data
/// model, its formats and the runtime that expands templates. It has no
/// UI-framework dependency, so any framework adapter can build on it.
///
/// Of the library model it exports a library's structure (imports and
/// declarations) and the types that its other declarations name; the nodes
/// of a declaration's body (`Switch`, `Loop`, `ConstructorCall`, ...) are in
/// `package:a2ui_craft/model.dart`, so that hosts can import this library
/// next to Flutter's without hiding names.
library;

export 'src/a2ui_catalog.dart';
export 'src/a2ui_props.dart';
export 'src/canonical_json.dart';
export 'src/dependencies.dart';
export 'src/evaluator.dart' hide checkCallArguments;
export 'src/expansion.dart';
export 'src/functions.dart';
export 'src/limits.dart';
export 'src/media_context.dart';
export 'src/name_resolution.dart';
export 'src/rfw/binary.dart';
export 'src/rfw/model.dart'
    show
        BlobNode,
        DynamicList,
        DynamicMap,
        FullyQualifiedWidgetName,
        Import,
        LibraryName,
        Missing,
        RemoteWidgetLibrary,
        SourceLocation,
        SourceRange,
        SymbolReference,
        WidgetDeclaration,
        WidgetLibrary,
        missing;
export 'src/rfw/text.dart';
export 'src/runtime.dart';
export 'src/standard_functions.dart';
export 'src/template_registry.dart';
