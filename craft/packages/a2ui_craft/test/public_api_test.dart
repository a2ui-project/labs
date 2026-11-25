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

// The main library exports every library model type that its API names, so a
// host can name them without package:a2ui_craft/model.dart. This file only
// compiles while that holds.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

void main() {
  test('the types the API names are exported', () {
    final RemoteWidgetLibrary library = parseLibraryFile(
      'import core; widget root { n: 0 } = Text(text: Logo.version);',
    );
    final List<Import> imports = library.imports;
    final List<WidgetDeclaration> widgets = library.widgets;
    final BlobNode node = widgets.single;
    final TemplateRegistry registry = TemplateRegistry()
      ..setTemplateLibrary(const LibraryName(<String>['main']), library);
    final SymbolReader reader = registry.readSymbol;
    const SymbolReference symbol = SymbolReference('Logo', <Object>['version']);
    final Object value = reader(const LibraryName(<String>['main']), symbol);
    final CraftRuntime runtime = CraftRuntime(
      registry,
      library: const LibraryName(<String>['main']),
      widget: 'root',
    );
    final WidgetDeclaration declaration = runtime
        .expand()
        .states
        .single
        .instance
        .declaration;
    final WidgetDeclaration? resolved =
        (registry.resolver.resolve(const LibraryName(<String>['main']), 'root')
                as ResolvedName)
            .declaration;
    expect(imports.single.name, coreLibrary);
    expect(node.source, isNull);
    expect(value, missing);
    expect(identical(declaration, widgets.single), isTrue);
    expect(identical(resolved, widgets.single), isTrue);
  });
}
