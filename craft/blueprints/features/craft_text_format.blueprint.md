---
feature_name: craft_text_format
module_blueprints:
  - craft_engine
dependencies: []
date_added: 2026-11-20
---

# **Text Format Feature Blueprint**

This document specifies the Craft text format: the source form in which developers write template libraries and data files, and the library that parsing produces. It also specifies the canonical JSON form of a library, which conformance cases use to compare libraries across engines.

The format is the RFW 2.0.0 text format plus three kinds of reference: theme references, media references and symbol references. This blueprint specifies only how they parse; how they evaluate belongs to the features that use them.

---

## **Requirements**

### **1. Base format**

- Library files and data files MUST parse as in the RFW 2.0.0 text format, except where this blueprint says otherwise. This covers imports, widget declarations, initial state, literals, lists, maps, widget calls, `args`, `data` and `state` references, loops, switches, event handlers, state setters and widget builders.
- A source that RFW 2.0.0 rejects MUST be rejected, unless it is valid under requirements 2–4 or under a feature that extends the format (`craft_libraries_and_names` adds qualified names and the `export` keyword, and `craft_language_extensions` adds `absent`, `call`, `...if` and `let`, which RFW 2.0.0 rejects). A source that is valid in RFW 2.0.0 MUST parse to the same library, unless requirements 2–4 or `craft_language_extensions` change its meaning (requirements 2–4 only affect names spelled `theme` or `media`, and an identifier followed by `.` in a value position; `craft_language_extensions` lists the sources it changes).
- A rejection MUST report the source position (line and column) where it was detected.

### **2. Theme references**

- `theme` followed by one or more `.part` segments MUST parse to a theme reference holding those parts. A part is an identifier, an integer or a string, as in other references.
- `theme` MUST be a reserved word in the places where RFW reserves `args`, `data` and `state`: a loop variable or a widget builder argument named `theme` MUST be rejected. (As in RFW, widget declaration names are not checked.)
- In a value position, `theme` always starts a theme reference, so a widget named `theme` cannot be called there, just as RFW treats `args`, `data` and `state`.

### **3. Media references**

- `media` followed by one or more `.part` segments MUST parse to a media reference holding those parts.
- `media` MUST be a reserved word and MUST start a reference in a value position, exactly like `theme`.

### **4. Symbol references**

- In a value position, an identifier that is not a reserved word, a loop variable, a builder argument or a `let` binding (see `craft_language_extensions`), and is followed by `.`, MUST parse to a symbol reference: the identifier as the symbol and the following segments as its parts. For example, `Location.args.latLong` has the symbol `Location` and the parts `args`, `latLong`. A symbol reference names a host symbol's static metadata.
- A builder argument or loop variable followed by `.` MUST still parse to a builder argument reference or loop reference, even when it is spelled like a symbol.
- The words `default`, `for`, `import`, `in`, `null` and `widget` MUST NOT name a symbol: an engine MUST reject them followed by `.` in a value position.
- An identifier followed by `(` MUST still parse to a widget call, as in RFW, except the words `absent` and `call` and the names of `let` bindings in a value position (see `craft_language_extensions`).

### **5. Canonical JSON form**

The canonical JSON form of a library is how conformance cases state an expected library. Two libraries that mean the same thing MUST have equal canonical forms, wherever they came from and whatever their source locations.

- A library is `{"imports": [<library name>, ...], "widgets": [<declaration>, ...]}`. A library name is its parts joined with `.`.
- A data file's canonical form is the canonical value of its map.
- A declaration is `{"name": ..., "exported": true, "state": <value>, "root": <value>}`, with `exported` omitted when the declaration is not exported (see `craft_libraries_and_names`) and `state` omitted when there is no initial state.
- `null`, booleans and strings are themselves. A list is a list of canonical values. A map is a map of canonical values.
- Every other node is a map whose `"$"` key names its kind:

| Node                                                    | Canonical form                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| integer                                                 | `{"$": "int", "value": n}`                                                                                                                  |
| double                                                  | `{"$": "double", "value": x}`                                                                                                               |
| missing value                                           | `{"$": "missing"}` (the text format never produces it, because RFW drops `null` map entries; other sources, such as the binary format, can) |
| widget call                                             | `{"$": "call", "name": ..., "args": {...}}`                                                                                                 |
| switch                                                  | `{"$": "switch", "input": ..., "cases": [{"key": ..., "value": ...}, {"default": true, "value": ...}]}`, cases in source order              |
| loop                                                    | `{"$": "loop", "input": ..., "output": ...}`                                                                                                |
| widget builder                                          | `{"$": "builder", "arg": ..., "widget": ...}`                                                                                               |
| event handler                                           | `{"$": "event", "name": ..., "args": {...}}`                                                                                                |
| state setter                                            | `{"$": "setState", "target": <state reference>, "value": ...}`                                                                              |
| `args` / `data` / `state` / `theme` / `media` reference | `{"$": "argsRef" \| "dataRef" \| "stateRef" \| "themeRef" \| "mediaRef", "parts": [...]}`                                                   |
| loop reference                                          | `{"$": "loopRef", "loop": <index>, "parts": [...]}`; the index counts enclosing loops from the innermost, starting at 0                     |
| builder argument reference                              | `{"$": "builderArgRef", "arg": ..., "parts": [...]}`                                                                                        |
| symbol reference                                        | `{"$": "symbolRef", "symbol": ..., "parts": [...]}`                                                                                         |

---

## **Detailed Description of Changes**

The three new references give templates access to values that RFW had no way to name:

```craft
import core;

widget Badge = Box(
  color: theme.color.primary,
  padding: switch media.width { "compact": 4.0, default: 8.0 },
  child: Text(text: args.label),
);
```

- `theme.color.primary` reads the host's theme.
- `media.width` reads a property of the surface the template renders on (here, its width class).
- A symbol reference such as `Location.args.latLong` reads static metadata that the host registered for a widget or function named `Location`.

Each parses to its own node, so later stages can tell them apart without looking at names. Because `theme` and `media` become reserved words, a library that used either as a loop variable or builder argument name no longer parses. Libraries that use `Name.part` in a value position, which RFW rejected, now parse to symbol references.

---

## **Links**

- RFW 2.0.0 text format: `third_party/rfw/lib/src/dart/text.dart`.
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `conformance/craft/craft_text_format.yaml`. Each case is tagged with `F-CRAFT-TEXT-<n>`, `n` being the requirement it tests (`conformance/features.yaml`). Each case gives a source and either the expected canonical JSON form or the expected error position. An engine MUST pass every case:

- **Base format**: a minimal library; a library that uses every RFW node kind; a data file; an unterminated string is rejected; a missing semicolon is rejected on the line of the next token.
- **Theme references**: a theme reference with integer parts; string parts; a loop variable and a builder argument named `theme` are rejected, and a control case with a similar name parses; `theme(...)` in a value position is rejected.
- **Media references**: a media reference inside a switch; a builder argument and a loop variable named `media` are rejected, and a control case with a similar name parses.
- **Symbol references**: a symbol reference with several parts; a widget call is still a call; a loop variable or builder argument followed by `.` keeps its meaning; `default.x`, `for.x`, `import.x`, `in.x`, `null.x` and `widget.x` are rejected.
- **Canonical form**: a declaration with initial state; integers and doubles stay distinct; nested loops count from the innermost.

Error cases check that the source is rejected and, where the position is meaningful, the reported line. In addition, the engine's tests include RFW 2.0.0's own text and model tests, adapted only to run outside Flutter (imports, and `testWidgets` replaced by `test`); they MUST pass.

---

## **Implementation Steps**

1. Add the theme, media and symbol reference nodes to the library model.
2. Reserve `theme` and `media`, parse the three references in value positions, and reject keywords as symbol names.
3. Implement the canonical JSON form and run the conformance cases against it.
