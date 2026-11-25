---
feature_name: craft_a2ui_integration
module_blueprints:
  - craft_engine
dependencies:
  - craft_runtime
  - craft_template_registry
date_added: 2026-11-21
---

# **A2UI Integration Feature Blueprint**

This document specifies how Craft templates become ordinary catalog components of an A2UI renderer, so that an agent uses them with regular A2UI messages (`createSurface`, `updateComponents`, `updateDataModel`) and receives their events as regular A2UI actions. The renderer owns everything A2UI: messages, the data model, binding resolution, checks, actions, child references and the surface. The engine owns the template: its expansion, local state and events (`craft_runtime`).

Three parts are framework-independent and checked as JSON: the schema each template offers the agent (requirements 1 to 4), the arguments a template receives from its component's resolved properties (requirement 5), and what the renderer does when the template fires a handler (requirement 6). Requirement 7 says how a renderer puts them together.

The A2UI terms (catalog, component schema, common types, dynamic values, `Child`, `ChildList`, `Action`, `Checkable`, resolved properties, `WritableBinding`, `NodeAction`) are those of the A2UI core and framework adapter module blueprints (see Links). Schemas follow the A2UI v1.0 catalog conventions.

---

## **Requirements**

### **1. Catalog components**

- A **template catalog** for a template library `L` registered in a template registry MUST have one component for each component the registry offers for `L` (`craft_template_registry`, requirement 9), in that order, named like its declaration, and no other. A name with no registered template library has no components.
- Each component's schema MUST be derived from its declaration as requirements 2 to 4 specify.

### **2. Argument kinds**

The **kind** of an argument says how a template uses it: `action`, `children`, `child`, `string`, `number`, `boolean` or `value`. `action`, `children` and `child` are its **widget kinds**, the others its **value kinds**. An engine derives the kind of each argument a declaration `D` reads from the **positions** of the references `args.a...` in `D`'s root. A position has a kind too; walking `D`'s root:

- `D`'s root is in a `child` position.
- An argument `p` of a call that names a primitive (classified as `craft_functions`, requirement 3 does, in `D`'s library with `D` as the declaration being bound) is in the position that the primitive's metadata gives under `args`, `p`: the string `"widget"` gives `child`, `"widgets"` gives `children`, `"handler"` gives `action`, and `"string"`, `"number"` and `"boolean"` give those kinds; any other entry, no entry and no metadata give `value`.
- An argument `p` of a call that names a template declaration `E` is in a position of the kind `E` gives its argument `p` (computed by these rules over `E`'s root, in `E`'s library), or `value` when `E` does not read `p`. When that call is reached while the kinds of `E` are being derived in the chain of template calls that led to it (as for `D` calling `E` calling `D`), its arguments are in `value` positions; the kinds of each declaration MUST follow from its own chain, whatever order the declarations are analyzed in.
- The handler `H` of a handler application (`call H {M}`, or a root call named `call` with `handler`) is in an `action` position. Every other argument of any other call (functions, `M`, unknown names) is in a `value` position.
- The cases of a switch are in the switch's position; its input and its keys are in `value` positions.
- The elements of a list in a `children` position are in `child` positions, those of a list in an `action` position in `action` positions, and those of any other list in `value` positions. A loop in a list whose input is a whole argument `args.a` and whose output is exactly its loop variable (`...for x in args.a: x`) uses `a` in the list form of its element position: `children` for `child`, `action` for `action`, otherwise `value`. Any other loop has its input in a `value` position and its output in its element position (so `...if C: E` reads `C` as a value and places `E` as an element). A loop whose output is a loop (`craft_language_extensions`, requirement 7) applies these rules to the inner loop as an element of the same list, so `...if C: ...for x in args.a: x` among widgets uses `a` as a child list. A filtering loop such as `...for x in args.a: ...if x.on: x` uses `a` as a value, since its output is not exactly the loop variable.
- Map values, the arguments of an event and the value of a state setter are in `value` positions. A widget builder's output is in a `child` position.
- A reference to a whole argument (`args.a`) uses `a` in the kind of its position; a reference with more parts (`args.a.b`) uses `a` as a `value`. A reference whose first part is an index (`args.0`) reads no argument.

### **3. Joining uses**

- An argument used in several positions MUST take the first of `action`, `children` and `child` among its uses.
- Otherwise it MUST take the value kind that all its `string`, `number` and `boolean` uses agree on, ignoring `value` uses; when they disagree, or there is none, it takes `value`.

### **4. Component schema**

The **properties** of a component are the arguments its declaration reads, except:

- `id`, `component` and `validationResults`, which are A2UI envelope keys or check results that are no values;
- `isValid` and `validationErrors`, the check results that A2UI supplies (requirement 5); a declaration that reads one of them is **checkable**;
- the **setter** of a property `p` of a value kind: the argument named `set` followed by `p` with its first character in upper case (`value` gives `setValue`, `_v` gives `set_v`), when its kind is `action`; A2UI's two-way binding supplies it. An argument with that name of another kind (read as a value, say) is no setter, and neither is a setter of a property of a widget kind or one whose property is not read, nor a name that only looks like a setter (`setvalue`, `setup` next to `up`): they remain properties.

The schema of a component `N` MUST be the JSON object `{"type": "object", "allOf": [C..., P]}`, where `C` is `{"$ref": "common_types.json#/$defs/Checkable"}` when the declaration is checkable and absent otherwise, and `P` is `{"type": "object", "properties": {...}, "required": ["component"]}` whose properties are `"component": {"const": N}` and, for each property `p`, `p: {"$ref": "common_types.json#/$defs/T"}` with `T` given by `p`'s kind:

| Kind       | `T`              |
| ---------- | ---------------- |
| `action`   | `Action`         |
| `children` | `ChildList`      |
| `child`    | `Child`          |
| `string`   | `DynamicString`  |
| `number`   | `DynamicNumber`  |
| `boolean`  | `DynamicBoolean` |
| `value`    | `DynamicValue`   |

The order of the keys of a JSON object is not significant.

### **5. Props to arguments**

An A2UI renderer resolves a component node's properties before its implementation sees them: a dynamic value to its value, with the data path it is bound to when it is bound to one; an action to something that runs it; a child reference to a child node; a child list to a list of child nodes; and, for a checkable component, the check results `isValid` and `validationErrors`. The template's arguments MUST be, for each property `p` of the component:

- for a value kind, when the prop is a resolved dynamic value: its value as the argument `p`, null being absent also inside lists and maps (as host data, `craft_runtime`, requirement 1), and no argument when the value is null or not JSON. A value beyond the engine's limits, checked as an entry of the arguments without converting the whole value, MUST stop the expansion as host input beyond the limits does (`craft_limits`, requirement 8). When the value is bound to a data path and `setP` (named as requirement 4 names setters) is no property of the component, also, even when the path holds no value, the host handler `setP`, with that name as its identifier, as the argument `setP`;
- for `action`, when the prop is an action: the host handler `p` as the argument `p`;
- for `child`, when the prop is a child node: the host widget `p` (`craft_runtime`, requirement 3) as the argument `p`, standing for that node;
- for `children`, when the prop is a list of child nodes: the list of host widgets `p.0`, `p.1`, ... as the argument `p`, standing for those nodes in order;
- otherwise (no prop, or one of another shape) no argument.

And, for a checkable component, `isValid` when the props hold a boolean as `isValid`, and `validationErrors`, the list of the strings in the list the props hold as `validationErrors`. Props that are no property of the component give no argument. The data is absent: a template sees only its arguments.

### **6. Firing to A2UI**

Firing a handler of the expansion gives events (`craft_runtime`, requirement 9). For each event, in order, the renderer MUST:

- for an event `E` with arguments `M`: dispatch, from the template's component, the A2UI action `{"event": {"name": E, "context": J}}`, where `J` is `M` as JSON (absent map entries left out, absent list elements as null, integers and doubles as JSON numbers);
- for the host handler `p` of an action property: run that action (event arguments do not reach it; A2UI resolves the action's context when it runs);
- for the setter `setP` of a property bound to a data path: write the event argument `value`, as JSON, to that path, through the renderer's binding; when there is no `value` event argument, or it is absent, write nothing;
- for any other host handler, nothing.

Setters of local state give no event, so they give nothing here.

### **7. Rendering**

A renderer MUST render a node of a template component as the expansion of the root (`L`, `N`) with the arguments of requirement 5, by the framework adapter of the engine, and MUST:

- keep one runtime per node, so the template's local state lives as long as the node and survives updates of its properties; when its properties change, the runtime's arguments MUST be replaced (which keeps the state);
- render each host widget node as the renderer renders the child node it stands for;
- apply the effects of requirement 6 with the renderer's own mechanisms: dispatch an action from the node's component on the node's surface, invoke the action synchronously in the gesture that fired it, write through the property's binding;
- report the expansion's errors to the host.

---

## **Detailed Description of Changes**

```craft
import core;

export widget NameField = Column(children: [
  Field(label: args.label, value: args.value, onChanged: args.setValue),
  ...if switch args.isValid { false: true, default: false }: Text(text: args.validationErrors.0),
  Button(child: args.icon, onPressed: [args.onSave, event "saved" { name: args.value }]),
]);
```

With `core`'s `Field` declaring `label` and `value` as `"string"` and `onChanged` as `"handler"`, `Text` declaring `text` as `"string"` and `Button` declaring `child` as `"widget"` and `onPressed` as `"handler"`, the catalog component `NameField` takes `@checks` (it is checkable), `label` and `value` as `DynamicString`, `icon` as `Child` and `onSave` as `Action`; `setValue` is no property. An agent sends:

```json
{
  "id": "f",
  "component": "NameField",
  "label": "Name",
  "value": {"@path": "/user/name"},
  "icon": "i",
  "onSave": {"event": {"name": "save"}}
}
```

The template receives `label`, the current value of `/user/name` as `value`, the host handler `setValue`, the host widget `icon` (the renderer's node `i`) and the host handler `onSave`. Typing fires `setValue` with `{value: "Ann"}`, which writes `"Ann"` to `/user/name`; every component bound to that path follows. Pressing the button runs the agent's `save` action and dispatches `{"event": {"name": "saved", "context": {"name": "Ann"}}}` from component `f`.

The metadata vocabulary of requirement 2 is a convention between a host's primitives and this feature: `craft_template_registry` reads `args` entries only for being present and not `false`, so they keep their meaning there.

Left out of this feature: v0.9 catalogs (the schemas are v1.0); templates calling components of other catalogs from inside a template (an agent can still pass any catalog's component as a child); `default` values and descriptions in schemas; mapping the surface theme to templates; forwarding expansion errors, including those of `craft_limits`, to the agent (they reach the host's error callback only); and rebuilding a catalog when the registry changes (a host makes a new catalog).

---

## **Links**

- Expansion, host handlers, host widgets and firing: [runtime](craft_runtime.blueprint.md).
- Offered components and primitive metadata: [craft_template_registry](craft_template_registry.blueprint.md).
- Call classification: [functions](craft_functions.blueprint.md).
- A2UI catalogs, common types, resolution and the binder: [a2ui_core](../../../third_party/a2ui/blueprints/modules/a2ui_core.blueprint.md).
- A2UI component implementations, resolved properties, actions and child nodes: [a2ui_framework_adapter](../../../third_party/a2ui/blueprints/modules/a2ui_framework_adapter.blueprint.md).
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `conformance/craft/craft_a2ui_integration.yaml`. Each case is tagged with `F-CRAFT-A2UI-<n>`, `n` being the requirement it tests (`conformance/features.yaml`). Each case registers primitive libraries with metadata and template libraries by source, then either checks the schemas of a catalog, or maps a component's resolved props (written as JSON) to arguments, checks them, expands the template and fires values of the expansion, checking the effects as JSON. The YAML header documents the format. An engine MUST pass every case:

- **Catalog components**: private declarations and unavailable components left out; a component that reads no argument, with an index as an argument reference; an unavailable library; a primitive library.
- **Argument kinds**: each metadata kind, untyped entries, no entry and no metadata; arguments read with parts; value positions (function arguments, map values, switch inputs and keys, event arguments, setter values, handler application arguments); widget positions (a root, switch cases, a builder's output); list elements in widgets, handler and value positions; loops over an argument with the loop variable as output, other loops and `...if`; loops nested as a loop's output; kinds passed through templates of this and an imported library, an argument the template does not read; calls back into a template under analysis; unknown calls and functions.
- **Joining uses**: action, child list and child winning; typed uses that agree, ignoring untyped ones, and that disagree.
- **Component schema**: the whole schema, with and without the Checkable mixin; setters left out, and setters and look-alikes that remain, including a setter name read as a value; reserved arguments; check results making a component checkable.
- **Props to arguments**: values with nulls inside, a null value and no prop; a path-bound value and its setter, also without a value, and an unbound value without one; a path-bound value whose setter name is a property of its own, with and without its own prop; actions, a child and a child list as host values; props of another shape and props that are no property; check results of a checkable component, of other shapes, and of a component that is not checkable.
- **Firing to A2UI**: an event's context as JSON, merged with the event arguments; an action run with and without a handler application; setters writing values, structured values, and nothing without a value; a handler list in order.

The engine's unit tests additionally cover what the YAML cannot express: a resolved value that is not JSON, a host handler that stands for nothing, a setter fired with an absent value, the renderer's objects carried by the effects, and resolved values beyond the limits (100,000 deep, and 100 deep as an entry of the arguments, with a control just within). Requirement 7 is covered by widget tests of the Flutter template catalog: an A2UI surface rendering a template from `createSurface`, `updateComponents` and `updateDataModel` messages, data and property updates keeping local state, a two-way write seen by another component, an agent action, a template event, a child of another catalog, check results, a bound value beyond the limits (reported, shown as the placeholder, and recovered from with local state kept), and the schemas of the catalog.

---

## **Implementation Steps**

1. Let the runtime carry host widgets.
2. Derive argument kinds, the interface and the schema of each offered component.
3. Map resolved props to arguments, and events to effects.
4. Implement a catalog for the framework's A2UI renderer whose components expand templates with the framework adapter, and apply the effects.
5. Run the conformance cases and the widget tests.
