---
feature_name: craft_language_extensions
module_blueprints:
  - craft_engine
dependencies:
  - craft_text_format
  - craft_libraries_and_names
  - craft_binary_format
date_added: 2026-11-20
---

# **Language Extensions Feature Blueprint**

This document specifies four constructs that Craft adds to the text format: the `absent` value, handler application with `call`, conditional list elements with `...if`, and local values with `let`. It also lets a `...for` or `...if` element be the element of another one, as in `...for x in l: ...if c: e`. Each one is written with new syntax but parses to node kinds that `craft_text_format` already defines, so neither the canonical JSON form nor the binary format changes.

This blueprint specifies only what each construct parses to. How the resulting nodes evaluate (what the call `absent()` yields, what applying a handler does, how loops and switches expand) is specified by the features that evaluate libraries: `craft_functions` (the absent value) and the runtime.

In this blueprint, a **value position** is a place where `craft_text_format` allows references: the arguments of a widget call and everything nested in them, and the input and cases of a declaration's root switch. Initial state and data files are not value positions.

---

## **Requirements**

### **1. Absent value**

- In a value position, the word `absent`, alone or followed by `()`, MUST parse to a widget call named `absent` with no arguments, whose canonical form is `{"$": "call", "name": "absent", "args": {}}`. Whitespace between `absent`, `(` and `)` is allowed, as around other symbols.
- Unlike `null`, `absent` is a value everywhere a value can be: as a map value it MUST NOT be dropped, and it MAY be a list element, an argument or a switch case value.
- In a value position, after `absent(`, anything other than `)` MUST be rejected. `absent` followed by `.` or `::` MUST be rejected (in `craft_text_format`, `absent.x` was a symbol reference).
- `absent` MUST be a reserved word as `theme` is (`craft_text_format`, requirement 2): a loop variable or widget builder argument named `absent` MUST be rejected, and so MUST `absent` as a part of a library qualifier or as the name after `::` (`craft_libraries_and_names`, requirement 1).
- `absent` in initial state or in a data file MUST be rejected.
- A declaration's root is still read as a widget call, as in `craft_text_format`: `widget r = absent();` parses to the same call named `absent`, `widget r = absent(x: 1);` to a call named `absent` with that argument, and a bare `absent` as the root MUST be rejected.

### **2. Handler application**

- In a value position, `call` followed by a value `H` and a map `M` (`{` ... `}`) MUST parse to a widget call named `call` with exactly two arguments, `handler` (`H`) and `arguments` (`M`): `{"$": "call", "name": "call", "args": {"handler": H, "arguments": M}}`, with `H` and `M` in canonical form.
- `H` MAY be any value. `M` is read as a map in a value position: it MAY be empty, and an entry whose value is `null` is dropped, as in any map. A `call` without the map MUST be rejected.
- In a value position, `call` always starts a handler application, so a widget named `call` cannot be called there: `call(x: 1)` MUST be rejected (the `(` starts a widget builder as `H`, which `x: 1` does not complete). `call` followed by `.` MUST be rejected (in `craft_text_format`, `call.x` was a symbol reference).
- `call` MUST be a reserved word exactly like `absent`, and MUST be rejected in initial state and data files.
- A declaration's root is still read as a widget call: `widget r = call();` parses to a call named `call` with no arguments, and `widget r = call(handler: args.h, arguments: {});` to the same node that `call args.h {}` gives in a value position.

### **3. Conditional list elements**

- In a list in a value position, where `...for` is allowed, the element `...if C: E` MUST parse to the loop whose input is the switch on `C` with the cases `true: [true]` and `default: []`, in that order, and whose output is `E`. In canonical form: `{"$": "loop", "input": {"$": "switch", "input": C, "cases": [{"key": true, "value": [true]}, {"default": true, "value": []}]}, "output": E}`.
- That loop has a loop variable that no name refers to. It MUST count as an enclosing loop for loop references inside `E`, and MUST NOT count inside `C`: inside a `...for item`, `item` in `C` has the loop index 0 and `item` in `E` has the index 1.
- `C` MUST be followed by `:`. There is no `else` branch: anything after `E` other than `,` or `]` MUST be rejected.
- `if` is not a reserved word: it is only special right after `...`, so a loop variable named `if` remains valid.
- Where `...` is rejected (initial state and data files), `...if` MUST be rejected too.
- By the loop and switch semantics of RFW, this makes `E` appear once in the list when `C` is `true` and not at all otherwise; the `craft_runtime` feature specifies that evaluation.

### **4. Local values**

- A widget declaration's body (after `=`) MAY start with `let N1 = V1, N2 = V2, ... in R`, with at least one binding. `R` is the root, read as usual (a widget call or a switch), or the name of a binding.
- Each `Vi` MUST be parsed where it is written, as a value in a value position outside any loop or widget builder. Of the bindings, it sees only those before it (`N1` ... `Ni-1`); any other name in it reads as it would without `let`. For example, in `let n = item.name in ...`, `item.name` is a symbol reference even if `n` is used inside a loop over `item`, and in `let b = b.x in ...`, `b.x` is a symbol reference. `Vi` cannot be `null`.
- In the rest of the declaration (the later `Vi` and `R`), the bare name `Ni` in a value position MUST parse to the value `Vi`, unless a builder argument or loop variable of the same name is in scope; those take precedence, as they do over symbol references (`craft_text_format`, requirement 4). The library contains `Vi` at each use and nothing for the binding itself; a binding that is never used leaves nothing.
- As `R`, a binding's name MUST be accepted when its value is a widget call or a switch, and MUST be rejected otherwise.
- A use MUST be the whole name: a binding's name followed by `.`, `(` or `::` MUST be rejected, so within the declaration a binding hides a widget or library of the same name.
- A binding name MUST be an identifier that may be a part of a library qualifier (`craft_libraries_and_names`, requirement 1, including `absent` and `call`): every reserved word, the keywords `default`, `for`, `import`, `in`, `null`, `widget`, and `switch` MUST be rejected. Two bindings with the same name in one declaration MUST be rejected.
- Bindings MUST apply only to the declaration they start: in the next declaration the same name reads as it would without `let`.
- At the start of a declaration's body, `let` followed by a name MUST start bindings; followed by anything else, `let` is the start of the root call's name, read as before, so `widget r = let(x: 1);`, `widget r = let::Card();` and `widget r = let.ui::Card();` keep their meaning. Since a name starts bindings, `let in R` (no binding) and bindings not followed by `in` MUST be rejected.
- Elsewhere `let` is not special: in a value position `let(x: 1)` is a widget call named `let`, and `let` inside a value cannot start bindings.

### **5. Construct names**

- The calls named `absent` and `call` always mean these constructs, including when written as a root call (`widget r = absent();`). A library MAY declare a widget named `absent` or `call`, as RFW does not check declaration names, and an import or core MAY define one, but such a widget can never be called: in a value position the words start the constructs, and widget name resolution (`craft_libraries_and_names`) of `absent` or `call`, bare or after any qualifier, MUST fail with `notFound`. This holds for imported-only resolution, the list of visible names and catalog components too: neither name is ever a component of a catalog.
- A standard function named `absent` or `call` is callable only bare, never as `core::absent` or `core::call` (`craft_libraries_and_names`, requirement 11).

### **6. Binary round trip**

- Every construct parses only to node kinds of the `craft_text_format` canonical form, so `craft_binary_format` encodes it without a new tag or version. For every library accepted by this feature, encoding it with `craft_binary_format` and decoding the result MUST give the same canonical form.

### **7. Nested list elements**

- The element of a `...for` or `...if` (what follows its `:`) MAY itself be a `...for` or `...if` element, nested to any depth. The inner element MUST parse to the loop it gives as a list element, and that loop MUST be the output of the enclosing loop: `...for x in L: ...if C: E` parses to `{"$": "loop", "input": L, "output": {"$": "loop", "input": <switch on C>, "output": E}}`.
- Each nested loop counts as an enclosing loop exactly as it would directly in a list: inside `...for x in L: ...if C: E`, `x` has the loop index 0 in `C` and 1 in `E`; inside `...for x in L: ...for y in x.items: E`, `x` has the index 0 in `x.items` and 1 in `E`, and `y` the index 0 in `E`.
- After the innermost element, anything other than `,` or `]` MUST be rejected, as after any list element. `...` anywhere else outside a list element or such an element's element (as in `Box(child: ...if C: E)`) MUST be rejected, as in RFW 2.0.0.
- The `craft_runtime` feature specifies how a loop whose output is a loop expands: for each item, the elements the inner loop gives, so `...for x in L: ...if C: E` keeps the items for which `C` is `true`.

---

## **Detailed Description of Changes**

```craft
import core;

widget Pick = let label = Text(text: args.label) in Column(children: [
  label,
  ...if args.more: Button(onPressed: call args.onMore { value: 1 }, child: label),
  Button(onPressed: absent),
]);
```

- `absent` is the call `absent()`. It is meant to stand for no value (a button whose `onPressed` is absent has no handler); `craft_functions` specifies that it evaluates to the absent value.
- `call args.onMore { value: 1 }` is the call `call(handler: args.onMore, arguments: {value: 1})`: it applies a handler that the template received as a value, with arguments.
- `...if args.more: Button(...)` is a loop over `switch args.more { true: [true], default: [] }`, so the button is in the list only when `args.more` is `true`. Because it is a loop, it shifts the indices of outer loop references inside the element, exactly like a written `...for`.
- `let label = ...` is replaced by its value at both uses, so the library holds two copies of `Text(text: args.label)` and no binding.

Elements nest, which filters a list without a host function:

```craft
widget Visible = Column(children: [
  ...for item in data.items: ...if item.visible: Text(text: item.name),
]);
```

The inner `...if` is the output of the loop over `data.items`, so the column holds one `Text` for each visible item.

Since the constructs reuse existing nodes, an engine that does not know them still decodes their binary form: it sees calls named `absent` and `call`, loops and switches.

Compared with RFW 2.0.0 and the earlier features, these sources change meaning:

- A loop variable or builder argument named `absent` or `call`, and `absent` or `call` in a qualified name, are rejected. So `core::absent()` and `core::call(...)` are rejected, and standard functions with these names are callable only bare.
- In a value position, `absent(...)` with arguments and `call(...)`, which RFW reads as widget calls, are rejected; `absent()` is the same call as in RFW.
- `absent.x`, `call.x`, and a binding's name followed by `.`, which `craft_text_format` reads as symbol references, are rejected.
- A widget declared with the name `absent` or `call` still parses but no longer resolves (requirement 5).
- `...for` or `...if` as the element of a `...for` or `...if`, which RFW 2.0.0 rejects, parses to a loop whose output is a loop (requirement 7).

---

## **Links**

- Text format and canonical JSON form: [craft_text_format](craft_text_format.blueprint.md).
- Qualified names and the qualifier-part rule: [craft_libraries_and_names](craft_libraries_and_names.blueprint.md).
- Binary format: [craft_binary_format](craft_binary_format.blueprint.md).
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `conformance/craft/craft_language_extensions.yaml`. Each case is tagged with `F-CRAFT-LANG-<n>`, `n` being the requirement it tests (`conformance/features.yaml`). Each parse case gives a source (or several sources with one expectation) and either the expected canonical JSON form or the line of the expected error; columns are not checked. Every accepted case is also checked to survive the binary round trip. An engine MUST pass every case:

- **Absent value**: `absent`, `absent()` and `absent ( )` in an argument, a list and a map; `absent` in a switch and a handler argument; `absent(x: 1)` is rejected; `absent.x` and `absent::Card()` are rejected; `absent` in initial state and in a data file is rejected; `absent()`, `absent(x: 1)` and `call()` as the root are calls; a bare `absent` as the root is rejected; a loop variable, a builder argument, a qualifier part and a name after `::` spelled `absent` are rejected, and a control case with the names `absents` and `caller` in the same positions parses.
- **Handler application**: `call` with arguments, dropping a `null` entry; `call` with a loop reference, a list and an event handler as the handler, and empty arguments; `call` without the map is rejected; `call(x: 1)` in a value position is rejected; `call(...)` as the root is the same node as the handler form; `call.x` is rejected; `call` in initial state and in a data file is rejected; a loop variable, a builder argument, a qualifier part and a name after `::` spelled `call` are rejected (with the same control case).
- **Conditional list elements**: `...if` between other elements; loop indices in the condition, the element and a nested `...if`; a loop variable named `if`; a missing `:` and an `else` are rejected; `...if` in initial state and in a data file is rejected.
- **Local values**: a binding used twice and by a later binding, and a key spelled like a binding; a binding as the root (a call and a switch) and in a root switch; a root binding that is not a widget is rejected; a loop variable and a builder argument shadow a binding; a binding's value is parsed where it is written; an unused binding and the next declaration; a binding as a switch key; a use followed by `.`, `(` or `::` is rejected, in a value and as the root; duplicate bindings are rejected; each reserved word, keyword and `switch` as a binding name is rejected, with a control case for `export`, `let` and `if`; a missing binding and a missing `in` are rejected; a `null` binding is rejected; `let(x: 1)`, `let::Card()` and `let.ui::Card()` as the root keep their meaning, and `let(x: 1)` in a value position is a call; `let` inside a value is rejected.
- **Construct names**: widgets named `absent` and `call`, declared by the library, an import and core, never resolve, bare or qualified, also in imported-only resolution, in the visible names and as catalog components (of a template catalog exporting `call` and of a primitive catalog defining `absent`); `Box` is the control. The function-key cases are in `craft_libraries_and_names.yaml`.
- **Binary round trip**: one library with all four constructs, in addition to the check on every accepted case.
- **Nested list elements**: `...if` in `...for`, `...for` in `...for`, `...for` in `...if` and `...if` in `...if`, with the loop indices of each variable in conditions, inputs and elements; three levels of nesting; something after the innermost element and `...if` as an argument value are rejected.

Resolution cases use the format of `craft_libraries_and_names.yaml`. In addition, the engine's unit tests check the same constructs in terms of its library model, and the message for a binding used with `.`, `(` or `::`.

---

## **Implementation Steps**

1. Reserve `absent` and `call`, and parse them in value positions as calls.
2. Parse `...if` in lists as a loop over a switch, with an unnamed loop variable.
3. Parse `let` bindings at the start of declaration bodies and substitute their values at each use.
4. Make widget name resolution fail for `absent` and `call`, and list standard functions with these names only bare.
5. Read a `...for` or `...if` after the `:` of another as that loop's output.
6. Run the conformance cases, including the binary round trip.
