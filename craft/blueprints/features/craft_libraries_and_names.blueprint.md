---
feature_name: craft_libraries_and_names
module_blueprints:
  - craft_engine
dependencies:
  - craft_text_format
date_added: 2026-11-20
---

# **Libraries and Names Feature Blueprint**

This document specifies how a name written in a template denotes exactly one widget or function: the syntax for qualified names and exported declarations, and the rules that resolve a name against a set of registered libraries.

Two kinds of library take part. A **template library** is a parsed library (see `craft_text_format`): imports and widget declarations. A **primitive library** is provided by the host: a set of primitive names (with static metadata that later features use), rendered natively. Every library is registered under a library name, written as its parts joined with `.`. The library named `core` is special: its names are the only imported names a template uses without a qualifier.

---

## **Requirements**

### **1. Qualified names**

- A widget call MAY name its widget with a qualifier: `lib::Name`, or `a.b::Name` for a dotted library name. The two colons of `::` MUST be adjacent; whitespace around `::` is allowed, as around other symbols.
- Each part of a qualifier, and the name after `::`, MUST be an identifier that is not one of the reserved words `absent`, `args`, `call`, `data`, `event`, `false`, `media`, `set`, `state`, `theme`, `true` (`absent` and `call` are reserved by `craft_language_extensions`), the keywords `default`, `for`, `import`, `in`, `null`, `widget` (see `craft_text_format`, requirement 4), or `switch`. An integer, a string or one of these words before or after `::` MUST be rejected. (A library may still declare a widget with such a name, as RFW does not check declaration names, but it cannot be called by a qualified name.) In a value position, a loop variable or builder argument in scope reads as a reference (as in `craft_text_format`), and a `let` binding as its value (see `craft_language_extensions`), so a qualifier starting with one MUST be rejected too.
- A qualified call MUST parse to a widget call whose name is the qualified string with the parts joined by `.` and no whitespace (`acme.ui::Card`), both as a declaration's root and inside values. The canonical JSON form is unchanged.
- A qualified name followed by `.` in a value position MUST parse to a symbol reference whose symbol is the qualified string (`scan::Scanner.version` has the symbol `scan::Scanner` and the parts `version`).
- A single `:` MUST still separate a key from its value, and an unqualified `Name.part` MUST still parse to a symbol reference as in `craft_text_format`.
- As a declaration's root, a dotted name followed by `(` without `::` MUST be rejected, reporting the first `.`, as RFW does. In a value position such a name is a symbol reference (see `craft_text_format`), and the `(` that follows it MUST be rejected.

### **2. Export keyword**

- `export widget Name ... = ...;` MUST parse to a declaration marked exported. A declaration without `export` is private.
- `export` MUST be followed by `widget`; anything else (including a second `export`) MUST be rejected.
- `export` is not a reserved word: a declaration can be named `export` and called by that name.
- In the canonical JSON form, an exported declaration MUST carry `"exported": true`; a private declaration MUST omit the key (see `craft_text_format`, canonical JSON form).

### **3. Own declarations**

Resolution takes a name as written, the library `L` it is written in, and optionally the declaration of `L` being bound (the one whose body contains the name). The names `absent` and `call` are an exception to every rule below, including catalog components: they never resolve to a widget (see `craft_language_extensions`).

- An unqualified name MUST first resolve to `L`'s own declaration of that name, exported or not, ahead of any import.
- A declaration MUST never resolve to itself: the declaration being bound is skipped, so `widget Button = Button(...)` wraps core's `Button`, while other declarations of `L` that use `Button` get the wrapper. The same holds for the qualified form `L::Button`. The name then resolves as if `L` did not declare it (so a bare name that nothing else defines is not found).
- `L::Name` MUST resolve to `L`'s own declaration as well.

### **4. Core library**

- When `L` imports `core`, an unqualified name that `L` does not declare MUST resolve to core's name, if core defines it. `core::Name` MUST resolve to it too.
- When `L` does not import `core`, core's names MUST NOT be visible: an unqualified name resolves as if core did not define it, and `core::Name` fails with `notImported`.
- If `core` is a template library, only its exported declarations are core names.

### **5. Qualified imports**

Names from imports other than `core` MUST be qualified, so that adding a name to a library can never change or break an existing template: a bare name always means the library's own declaration or core's name, never something that a newly added declaration in another import could take over.

- An unqualified name that neither `L` nor core defines, but that one or more other imports define, MUST fail with the reason `notQualified`, whether one import or several define it (two imports defining the same name is the ambiguity case). An engine SHOULD list the defining imports in import order, each once and never `L` itself, and suggest the qualified form.
- A qualified name `lib::Name` MUST look only in `lib`. `lib` MUST be `L` itself or a direct import of `L`; otherwise it MUST fail with `notImported`, even when `lib` is registered.
- If `lib` does not define `Name`, or is not registered, it MUST fail with `notFound`. A name that nothing visible defines MUST fail with `notFound`.

### **6. Non-transitive imports**

- A library MUST NOT see the names of its imports' imports, qualified or not. Each library imports what it uses.

### **7. Private declarations**

- Another library's private declaration MUST be invisible to `L`: qualified (`cards::Secret`) it MUST fail with `notExported`; unqualified it MUST be treated as absent.
- A library MUST be able to use its own private declarations, bare or qualified.

### **8. Imported-only resolution**

Introspection asks what the host and other libraries provide, not what a template stands in for.

- Resolving among imports only MUST follow the rules above as if `L` declared nothing: `L`'s own declarations are skipped, bare or qualified (`L::Name` is not found).

### **9. Primitive libraries**

- A name defined by a primitive library MUST resolve to that library with the kind `primitive`; a name declared by a template library resolves with the kind `template`.
- Resolving from a primitive library (which has no imports) MUST look only among its own primitives, bare or qualified with its own name, both for ordinary and imported-only resolution. Any other qualifier is not imported.

### **10. Catalog components**

A catalog is the library whose widgets an agent may name as components.

- For a template library used as a catalog, a component name MUST resolve only to an exported declaration of that library. A private declaration MUST fail with `notExported`; a name the library does not declare (including anything it imports) MUST fail with `notFound`.
- A primitive library used as a catalog MUST expose all its primitives.
- An unregistered catalog has no components (`notFound`).

### **11. Function keys**

Functions share the call syntax with widgets and follow the same naming rule. The host registers each function under a key: a standard function under its bare name (`add`), a function of a host library `fmt` under its qualified name (`fmt::price`).

- A standard function MUST be callable from any library as `add`, and also as `core::add` unless its name is one of the words that requirement 1 excludes after `::`; both forms MUST map to the key `add`. A standard function named by such a word (`absent`, `call`) is callable only bare: `core::absent` MUST NOT map to it.
- A host function MUST be callable only by its qualified key (`fmt::price`), and only from a library that is `fmt` or imports `fmt`. The bare name `price` and the form `core::price` MUST NOT map to it.
- A key qualified with `core` (`core::x`) MUST NOT be callable by any name, since `core::x` always means the standard function `x`.
- An engine MUST be able to list every function name callable from `L`, each mapped to its registered key. The list MUST NOT contain `core::` followed by a word that requirement 1 excludes after `::`.

### **12. Visible names**

- An engine MUST be able to list, for `L`, every widget name that `L` and each of its direct imports define, both bare and qualified as `lib::Name`, each mapped to its resolution from `L` under exactly the rules above (including failures, such as a bare name that only a non-core import defines). Later stages use this to precompute per-library facts that agree with resolution.

### **Resolution results**

A resolution either succeeds with a library name, a bare name and a kind (`template` or `primitive`), or fails with one of the reasons `notFound`, `notQualified`, `notImported` or `notExported`. An engine SHOULD attach a message for authors that suggests a fix (an import to add, a qualifier, an `export`); messages are not part of conformance.

---

## **Detailed Description of Changes**

```craft
import core;
import maps;

// Wraps core's Button: a declaration never resolves to itself.
widget Button = Button(child: Text(text: args.label));

// Private helper, usable only inside this library.
widget Pin = maps::Marker(position: args.at);

export widget StoreCard = Column(children: [
  Button(label: "Directions"),
  maps::Map(markers: [Pin(at: args.location)]),
]);
```

- `Button` and `Text` come from this library and `core` without a qualifier. `Map` and `Marker` come from `maps`, so they are written `maps::Map` and `maps::Marker`; a bare `Map` is an error even though only `maps` defines it today. If `core` later gains a `Map`, this template keeps meaning `maps::Map`, and if `maps` later gains a `Text`, the bare `Text` keeps meaning core's.
- Another library that imports this one can use `StoreCard` as `store::StoreCard` (if this library is registered as `store`), but not `Pin`. Nor does it see `maps` through this library: it imports `maps` itself if it needs it.
- Used as a catalog, this library offers the agent one component, `StoreCard`.

Qualified names live in the call's name string, so libraries that use them need no new node kind. RFW's runtime used the first library that defined a name, searching the library's own declarations and then its imports depth-first, through imports of imports; this feature replaces that with the rules above, under which the order of imports never changes what a name resolves to.

---

## **Links**

- Text format and canonical JSON form: [craft_text_format](craft_text_format.blueprint.md).
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `conformance/craft/craft_libraries_and_names.yaml`, including the parse cases for qualified names and the `export` keyword (stated, like `craft_text_format` cases, as a source and its canonical JSON form, or as an error with the line it is reported on; columns are not checked). Each case is tagged with `F-CRAFT-NAMES-<n>`, `n` being the requirement it tests (`conformance/features.yaml`). Resolution cases give template libraries by source, primitive libraries by their names, and queries with their expected results; failures are pinned by reason only. An engine MUST pass every case:

- **Qualified names**: qualified calls in a root and in values; control cases for the rejections (a dotted qualifier in a value, in a root, inside a loop and in a widget builder); whitespace around `::`; separated colons, integer, string, keyword, reserved-word and `switch` qualifier parts, a reserved word, `switch` or keyword after `::` (in a call and in a symbol reference), and a loop variable or builder argument starting a qualifier, all rejected; a qualified symbol reference; single colons and unqualified symbol references unchanged; a dotted name without `::` rejected, in a root and in a value.
- **Export keyword**: exported and private declarations in the canonical form; `export` without `widget`, and a repeated `export`, rejected; a declaration named `export`.
- **Own declarations**: own declarations shadow core and resolve when self-qualified; a declaration never resolves to itself, bare or qualified.
- **Core library**: core names bare and qualified; core not imported; core as a template library with a private declaration.
- **Qualified imports**: a name from a non-core import must be qualified; core wins over another import; ambiguity between two imports; a qualifier that is not imported; a qualified name looks only in its library, including an unregistered one.
- **Non-transitive imports**: an import's import is invisible, bare and qualified.
- **Private declarations**: qualified, unqualified and from the declaring library.
- **Imported-only resolution**: own declarations skipped, bare and qualified.
- **Primitive libraries**: resolving from a primitive library.
- **Catalog components**: a template catalog's exported, private and imported names and an unregistered catalog; a primitive catalog.
- **Function keys**: standard and host functions, callable or not, from importing, non-importing and the function's own library, and `core::add` from a library that does not import core; a key qualified with core; `absent` and `call` callable bare but not as `core::absent` or `core::call`; the list of visible functions, which lists `absent` and `call` only bare.
- **Visible names**: bare and qualified names of a library and its imports.

Unit tests in the Dart engine additionally cover the candidates and messages of failures, the position RFW reports for a dotted root name, and the resolver's cache.

---

## **Implementation Steps**

1. Parse `::` as one token when its colons are adjacent; accept qualified names in calls and symbol references.
2. Parse `export` before `widget`, mark declarations exported and add `exported` to the canonical form.
3. Implement resolution from a library, imported-only resolution, catalog components, function keys and visible names over the registered libraries.
4. Run the conformance cases.
