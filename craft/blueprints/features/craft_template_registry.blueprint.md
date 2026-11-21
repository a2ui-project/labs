---
feature_name: craft_template_registry
module_blueprints:
  - craft_engine
dependencies:
  - craft_libraries_and_names
  - craft_functions
date_added: 2026-11-20
---

# **Template Registry Feature Blueprint**

This document specifies the template registry: the set of libraries and host functions that an engine offers templates, and what follows from it. The registry owns name resolution (`craft_libraries_and_names`) over its libraries and the function table (`craft_functions`) over its functions. On top of them it adds introspection, the functions and symbol references with which a template adapts to the host it runs on, and dependency gating, which decides which components of a template library can be offered to the agent on this host.

Introspection always answers from the calling library's point of view, and only about what the host and other libraries provide: names resolve among the library's imports, as imported-only resolution does (`craft_libraries_and_names`, requirement 8), never to the library's own declarations, which are what a template uses as stand-ins when the host lacks something.

---

## **Requirements**

### **1. Registration**

- A host MUST be able to register a template library or a primitive library under a library name, replacing whatever library was registered under that name (of either kind), and to remove the library registered under a name.
- A primitive library has primitive names, and each primitive has **metadata**: a map value (see `craft_functions`, requirement 1; no metadata is the empty map). In metadata, no value (null) MUST be the absent value. Registration MUST be rejected when some metadata is not a value. The registry MUST use the names and metadata as they were when the library was registered.
- A host MUST be able to register a set of host functions under a library name `lib`, each under a bare name `name`, which registers it under the key `lib::name` (`craft_functions`, requirement 5), replacing every function previously registered under `lib`; and to remove the functions of `lib`. Registration MUST be rejected when a key would be rejected by `craft_functions`, requirement 5 (so `lib` is not `core`, and every part of `lib` and of each name is an identifier allowed in a qualified name).
- A rejected registration MUST leave the registry unchanged.
- Every result in this document (resolution, evaluation, introspection, availability, offered components) MUST reflect the registrations as they are when it is asked for: nothing derived from earlier registrations is kept.

### **2. Evaluation**

- The registry MUST classify calls and evaluate values written in a registered template library as `craft_functions` specifies, with name resolution over the registered libraries, and with a function table holding the standard functions, the introspection functions of requirements 3, 4 and 6 and the registered host functions.
- The introspection functions are standard functions: they are registered under their bare names, so they are called as `hasWidget` or `core::hasWidget` from any library, listed by `hasFunction`, and classified like any other call (a visible widget of the same name wins, `craft_functions`, requirement 3). A host function such as `fmt::hasWidget` is a different function.
- Their parameters all have the kind `string`, so the argument rules of `craft_functions` apply: an unknown argument name fails with `invalidArgument`, and a present argument of another kind makes the call absent. Below, "absent" for an argument means not passed or passed as absent.
- A symbol reference MUST evaluate as requirement 5 specifies.

**Reading a path.** Requirements 3 to 5 read a value along parts: a string part reads the key of a map, an integer part the index of a list. The result is absent when a part reads a key the map does not have, an index outside the list, or a value that is not a map (for a string part) or a list (for an integer part). No parts read the whole value. A **path string** is split at every `.` into segments; a segment reads the key of a map, or the index of a list when the segment is a decimal number without leading zeros (`0`, `1`, `12`, not `01` or `-1`), however large (an index outside the list reads nothing); otherwise it reads nothing. An absent or empty path string reads the whole value.

### **3. Widget introspection**

From a library `L`, a name **denotes a provided widget** when it resolves among `L`'s imports (imported-only resolution) to a primitive, or to a declaration of an imported template library that is an available component of that library (requirement 8). The **metadata of a widget name** is the metadata of the primitive it resolves to among `L`'s imports; a name that resolves to a template, or does not resolve, has none.

- `hasWidget(name)` MUST be true when `name` denotes a provided widget from `L`, and false otherwise (also when `name` is absent). So core's names count bare and qualified, other imports only qualified (`maps::Map`), and `L`'s own declarations never count, bare or as `L::Name`, even one that shadows core's name.
- `hasWidgetArg(widget, arg)` MUST be true when the metadata of `widget` read at the parts `args`, `arg` is neither absent nor `false`, and false otherwise (also when an argument is absent, or `widget` has no metadata). A host lists each argument a primitive accepts under `args`, and may list one as `false` to say it is not supported.
- `meta(w, f, path)` MUST give, when `w` is present, the metadata of `w` read along `path`, or absent when `w` has no metadata; when `w` is absent and `f` is present, the metadata of the function `f` (requirement 4) read along `path`; when both are absent, absent.

### **4. Function introspection**

From a library `L`, a name **denotes a function** when it maps to a registered function key from `L` (`craft_libraries_and_names`, requirement 11), whether or not a widget of that name exists. The **metadata of a function** is a map with one key, `args`, mapping each parameter name of the function to `true`.

- `hasFunction(name)` MUST be true when `name` denotes a function from `L`, and false otherwise (also when `name` is absent). So `absent` and `call`, which are not functions, give false, and a host function counts only by its qualified name from a library that is or imports its library.
- `hasFunctionArg(function, arg)` MUST be true when `function` denotes a function from `L` that has a parameter named `arg`, and false otherwise (also when an argument is absent).
- `hasArg(widget, function, name, arg)` MUST give: false when `arg` is absent; otherwise `hasWidgetArg(widget, arg)` when `widget` is present; otherwise `hasFunctionArg(function, arg)` when `function` is present; otherwise `hasWidgetArg(name, arg)` or `hasFunctionArg(name, arg)` when `name` is present; otherwise false.
- `meta(f: name, path)` without `w` reads the metadata of the function `name` denotes (requirement 3), absent when it denotes none.

### **5. Symbol references**

A symbol reference `S.p1.p2...` (see `craft_text_format`) written in `L` names host metadata.

- When `S` resolves among `L`'s imports to a primitive, the reference MUST give that primitive's metadata read at the parts. When it resolves among the imports to a template, the reference MUST be absent, even if a function has the same name: as for calls, a widget wins over a function.
- Otherwise, when `S` denotes a function from `L`, the reference MUST give the function's metadata read at the parts (so `fmt::price.args.amount` is true when `fmt::price` has the parameter `amount`).
- Otherwise the reference MUST be absent.

### **6. Versions**

- `runtimeVersion()` MUST give the integer `1`, the runtime version this document defines.
- `appVersion()` MUST give the application version string the host set, initially the empty string.

### **7. Dependency declarations**

When it registers a template library, the host MAY declare the library's dependencies, which requirement 8 checks. A **requirement** is one of: a widget `N` (met when `hasWidget(name: N)` from the library is true), a widget argument `N`, `A` (`hasWidgetArg(widget: N, arg: A)`), a function `N` (`hasFunction(name: N)`), or a function argument `N`, `A` (`hasFunctionArg(function: N, arg: A)`). The declaration lists:

- **optional imports**: imports the library can do without (it feature-detects them, typically with `hasWidget`). Every other import is required.
- requirements of the whole library, in order;
- requirements of single components, by component name, in order.

Registration MUST be rejected when an optional import is not an import of the library, when component requirements name something other than an exported declaration of the library, or when a widget requirement (of the library or of a component) is qualified with the library's own name: the library's own declarations never meet a requirement (requirement 3), so it could never be met. A bare widget name is not rejected, since it can denote an imported widget (a library that declares `Card` can require core's `Card`). The registry MUST use the declaration as it was when the library was registered. A library registered without a declaration has no optional imports and no requirements.

### **8. Availability**

The **components** of a template library are its exported declarations, in declaration order. The host **provides** a library name when a primitive library is registered under it, an available template library is registered under it, or host functions are registered under it (possibly none). Host functions provide the name even while a template library of that name is unavailable; that library's components still do not count for `hasWidget`.

- A template library MUST be available exactly when every required import is provided and every requirement of the whole library is met. A component MUST be available exactly when its library is available and each of its own requirements is met.
- Availability and `hasWidget` depend on each other (a requirement may name another library's component). The available libraries and components MUST be the largest sets for which these rules hold when every requirement and every import is checked against those same sets. So libraries that import each other are available together unless something else is unmet, and an unmet requirement anywhere carries over to everything that requires it.
- An engine MUST report, for a registered template library: whether it is available; its unmet dependencies (each required import not provided, once, in import order, then each unmet requirement of the whole library, in declared order); and, for each component, whether it is available and its own unmet requirements in declared order.
- For a primitive library the report MUST be available, with no unmet dependencies and every primitive as an available component. For a name with no registered library there is no report.

### **9. Offered components**

- The components offered to the agent for a library MUST be its available components, in declaration order: for a primitive library, all its primitives; for an unavailable template library or a name with no registered library, none. Components that are not offered MUST NOT be presented to the agent.

---

## **Detailed Description of Changes**

```craft
import core;
import maps;   // declared optional

export widget StoreCard = Column(children: [
  Text(text: args.name),
  switch hasWidget(name: "maps::Map") {
    true: maps::Map(markers: [args.location], zoom: switch maps::Map.args.zoom { true: 15, default: absent }),
    default: Text(text: args.address),
  },
]);

export widget StoreMap = maps::Map(markers: [args.location]);
```

Registered with `maps` optional and the component requirement `StoreMap: [widget maps::Map]`:

- On a host without `maps`, the library is available. `StoreCard` is offered and shows the address; `StoreMap` is not offered, and its report lists the unmet `widget maps::Map`.
- On a host with `maps`, both are offered. `StoreCard` passes `zoom` only when the host's `Map` metadata lists it under `args`.
- Had `maps` not been declared optional, a host without it would offer neither component.

The dependency declaration is registration input, not Craft syntax, so the text and binary formats are unchanged; a host typically reads it from a manifest that ships with the library.

Left out of this feature, and not part of the registry: the template libraries that every host installs (component libraries are specified with the components), replacing a template component with a native one, load-time specialization (constant folding against host facts, a pure optimization that must not change any result), stable sizes, and host-supplied metadata for functions. Deriving each component's JSON schema from how its declaration uses `args` belongs to `craft_a2ui_integration`, because the schema shapes (dynamic values, child references, actions) and the setters supplied by A2UI's two-way binding are defined by A2UI.

---

## **Links**

- Name resolution, imported-only resolution and function keys: [craft_libraries_and_names](craft_libraries_and_names.blueprint.md).
- Values, call classification and argument rules: [functions](craft_functions.blueprint.md).
- Symbol references: [craft_text_format](craft_text_format.blueprint.md).
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `conformance/craft/craft_template_registry.yaml`. Each case is tagged with `F-CRAFT-REG-<n>`, `n` being the requirement it tests (`conformance/features.yaml`). Each case registers template libraries by source, primitive libraries with their metadata, host functions by their parameters only, and dependency declarations, possibly in several steps applied to one registry, and checks evaluated values in canonical JSON form, availability reports and offered components after each step. An engine MUST pass every case:

- **Registration**: registered libraries and functions are used; replacing a library, of either kind; removing libraries and functions; setting a function library replaces its functions; invalid function names (rejecting the whole set, valid names included), the library `core` and a library name with a reserved word rejected, each followed by a query showing the registry unchanged, with a control step.
- **Evaluation**: introspection functions bare and as `core::`, listed by `hasFunction`, distinct from a host function of the same bare name; a call `meta(...)` classified as a widget call when a widget named `meta` is visible, with a control classified and evaluated as the function; argument rules (unknown name, wrong kind, missing argument).
- **Widget introspection**: `hasWidget` bare, qualified, from a non-core import, a library not imported, an unregistered import and a construct name; own declarations ignored; exported and private templates of an imported library; `hasWidgetArg` on true, false, no-value, map, zero, missing and list entries, without visible primitive and on a template; `meta(w:)` on paths (keys, indexes, leading zeros, out of range, too large for an integer, negative, digit keys, through a non-container, empty and absent paths) and without a visible primitive; `w` winning over `f`.
- **Function introspection**: `hasFunction` on standard, `core::`, host, bare host, `absent`, `call` and unknown names, from importing and non-importing libraries; `hasFunction` ignores widgets; `hasFunctionArg`; `hasArg` dispatch; `meta(f:)`.
- **Symbol references**: primitive metadata, not shadowed by an own declaration; string and integer parts; function metadata; a widget winning over a function; unknown, not imported, bare non-core and bare host symbols.
- **Versions**: `runtimeVersion()` and `appVersion()`, before and after a change.
- **Dependency declarations**: an optional library that is not an import, requirements for a private or unknown declaration, and widget requirements qualified with the library's own name, rejected, each with a different source than the registered one and a query showing the registry unchanged; control steps.
- **Availability**: all imports provided; missing imports (once, in import order), then provided; optional imports; a function library as an import; an unavailable imported template library, then available; host functions providing the name of an unavailable template library, then removed; libraries importing each other; library requirements of each kind, met and unmet, in order; requirements seen from the library; component requirements; `hasWidget` and requirements seeing only available components; primitive and unregistered libraries.
- **Offered components**: declaration order, private and unavailable components left out, an unavailable library, a primitive library and an unregistered name.

The engine's unit tests additionally cover what the YAML cannot express: metadata that is not a value, null in metadata, the copies of a primitive library and of a dependency declaration taken at registration, the per-library function table, and, for `craft_functions`, that the evaluator leaves symbol references unevaluated when no registry reads them.

---

## **Implementation Steps**

1. Let the evaluator read symbol references through a reader the caller supplies.
2. Implement the registry: registration with its rejections, the per-library function table with the introspection functions, symbol references and the application version, dropping derived results on every change.
3. Implement dependency declarations, the availability fixed point, the reports and the offered components.
4. Run the conformance cases.
