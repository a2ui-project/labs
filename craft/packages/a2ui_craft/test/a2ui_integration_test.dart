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

// What the craft_a2ui_integration conformance cases cannot express (see the
// Test Cases section of its blueprint).

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

void main() {
  const TemplateInterface interface = TemplateInterface(<String, ArgKind>{
    'title': ArgKind.string,
    'name': ArgKind.string,
    'onGo': ArgKind.action,
  }, checkable: false);

  test('a resolved value that is not JSON gives no argument', () {
    final TemplateArgs args = TemplateArgs.from(interface, <String, Object?>{
      'title': BoundValue(Object()),
      'name': BoundValue(<Object?>[Object()], path: '/n'),
    });
    expect(args.args, <String, Object>{
      'setName': const HostHandler('setName'),
    });
  });

  test('a host handler that stands for nothing gives no effect', () {
    final TemplateArgs args = TemplateArgs.from(
      interface,
      const <String, Object?>{},
    );
    expect(
      args.effects(
        const HostHandlerEvent(HostHandler('onGo'), <String, Object>{}),
      ),
      isEmpty,
    );
  });

  test('a setter fired with an absent value writes nothing', () {
    final TemplateArgs args = TemplateArgs.from(interface, <String, Object?>{
      'name': const BoundValue('a', path: '/n'),
    });
    expect(
      args.effects(
        const HostHandlerEvent(HostHandler('setName'), <String, Object>{
          'value': missing,
        }),
      ),
      isEmpty,
    );
    expect(
      args.effects(
        const HostHandlerEvent(HostHandler('setName'), <String, Object>{
          'value': 'b',
        }),
      ),
      hasLength(1),
      reason: 'control',
    );
  });

  test('effects carry the renderer objects', () {
    final Object action = Object();
    final Object binding = Object();
    final TemplateArgs args = TemplateArgs.from(interface, <String, Object?>{
      'onGo': ActionProp(action),
      'name': BoundValue('a', path: '/n', host: binding),
    });
    final RunAction run =
        args
                .effects(
                  const HostHandlerEvent(
                    HostHandler('onGo'),
                    <String, Object>{},
                  ),
                )
                .single
            as RunAction;
    expect(run.host, same(action));
    expect(run.property, 'onGo');
    final WriteData write =
        args
                .effects(
                  const HostHandlerEvent(
                    HostHandler('setName'),
                    <String, Object>{'value': 'b'},
                  ),
                )
                .single
            as WriteData;
    expect(write.host, same(binding));
    expect(write.property, 'name');
    final DispatchAction dispatch =
        args.effects(const TemplateEvent('e', <String, Object>{})).single
            as DispatchAction;
    expect(dispatch.payload, <String, Object?>{
      'event': <String, Object?>{'name': 'e', 'context': <String, Object?>{}},
    });
  });
}
