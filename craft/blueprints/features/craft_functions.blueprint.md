---
feature_name: craft_functions
module_blueprints:
  - craft_engine
dependencies:
  - craft_text_format
  - craft_libraries_and_names
  - craft_language_extensions
date_added: 2026-11-20
---

# **Functions Feature Blueprint**

This document specifies functions: pure computations that a template calls in a value position with the call syntax of widgets (`add(a: 1, b: 2)`). The host registers them; the engine offers a fixed set of standard functions under bare names, and hosts add their own under qualified names. The `craft_template_registry` feature adds its eight introspection functions to these 28 standard functions. It also specifies the evaluator for the values that do not need a runtime: literals, lists, maps, the absent value, references to the args, data and state values the caller supplies, and function calls.

Templates are untrusted. Within the nesting limits of the engine, which the `craft_limits` feature defines (see the module blueprint), no template can make evaluation crash or behave differently on different engines: every value this feature defines evaluates to either a value or an evaluation error.

---

## **Requirements**

### **1. Values**

A **value** is a boolean, an integer (64-bit signed), a double (IEEE 754 double precision, including infinities and NaN), a string, a list of values, a map from strings to values, or the **absent value**, which stands for no value. Absent is RFW's missing value: its canonical JSON form (see `craft_text_format`) is `{"$": "missing"}`.

- A boolean, integer, double or string in a library MUST evaluate to itself, and the missing value (which `craft_binary_format` decodes from an extension value) to absent.
- A list MUST evaluate to the list of its evaluated elements, and a map to the map of its keys to their evaluated values. Absent elements and absent map values MUST be kept, not dropped.
- `args.p1.p2...`, `data....` and `state....` MUST read the args, data or state value that the caller supplies, part by part: a string part reads that key of a map, an integer part that index of a list. The result MUST be absent when a part reads a key the map does not have, an index outside the list, or a value that is not a map (for a string part) or a list (for an integer part). A value the caller does not supply is absent.
- In supplied values, and in what a host function returns, null (no value) MUST be the absent value, also inside lists and maps.
- Supplied values are the host's input: if a reference reads, or reads through, something that is not a value (or a map with keys that are not strings), the engine MUST report it to the host as a host error, distinct from the evaluation errors. Parts of supplied values that no reference reads are not checked.
- This feature does not define the value of any other node of a library: widget calls, loops (so also `...if`), switches, widget builders, event handlers, state setters, handler applications (`call`), and loop, builder argument, theme, media and symbol references. The `craft_runtime` feature defines them, `craft_media_context` the media references and `craft_template_registry` the symbol references. An evaluator that does not evaluate such a node (as one that implements only this feature) MUST fail with `notEvaluated` rather than return a value.

### **2. Absent and call**

- A call named `absent` with no arguments (written `absent` or `absent()`, see `craft_language_extensions`) MUST evaluate to absent. It is a literal, not a function: it MUST NOT be looked up as a widget or a function, even when a library declares a widget named `absent`.
- No standard function is named `absent` or `call`, so neither is in the list of visible functions (`craft_libraries_and_names`, requirement 11), and a call named `core::absent` or `core::call` (which the text format rejects, but another source of libraries may hold) MUST fail with `unknownFunction`.
- A call named `absent` with arguments (which the text format allows only as a declaration's root) MUST fail with `invalidArgument`.
- A call named `call` (also `call()` as a root, whether or not it has arguments) MUST be classified as a handler application, never as a widget or function call. This feature does not define its value; the `craft_runtime` feature does.

### **3. Function or widget**

A call named `N` in library `L`, inside the declaration `D` being bound, is classified in this order:

- If `N` resolves to a widget from `L` excluding `D` (`craft_libraries_and_names`), the call MUST be a widget call. A library's own declaration, a core primitive and a primitive of an imported library thus take precedence over a function of the same name. This feature does not define the value of a widget call; the `craft_runtime` feature does.
- Otherwise, whatever the reason resolution failed, if `N` maps to a registered function key from `L` (`craft_libraries_and_names`, requirement 11), the call MUST call that function. So a standard function is called as `add` or `core::add` from any library, and a host function `fmt::price` only by that name from `fmt` or a library that imports `fmt`.
- Otherwise the call is unknown, and evaluating it MUST fail with `unknownFunction`.
- An engine MUST be able to classify a call without evaluating it, as the absent value, a handler application, a widget call (with the widget its name resolves to), a function call (with the function's key) or unknown.

### **4. Arguments**

A function has named **parameters**, each of one kind: `number` (an integer, or a double that is not NaN), `string`, `boolean`, `list` or `any` (every value).

- A call that passes an argument whose name is not a parameter MUST fail with `invalidArgument`. This is checked after classifying the call and before evaluating any argument.
- Then every argument MUST be evaluated, in the order of the call's arguments in the library (for the text format, as written), even one the result does not depend on.
- A parameter that the call does not pass MUST be absent, exactly as if the call passed `absent`.
- If an argument is present and not of its parameter's kind, the call MUST evaluate to absent without running the function. Otherwise the function runs with every parameter's value, absent ones included.
- A function receives copies: what it does to its arguments MUST NOT change supplied values.

### **5. Host functions**

The host registers each host function under a key `lib::name`. Like a standard function, a host function is pure and deterministic: its result depends only on its arguments. That is a contract of the host, which the engine cannot check.

- A key MUST be rejected at registration (a host error) unless it has a qualifier, the qualifier is not `core`, and every part of the qualifier and the name is an identifier that may appear in a qualified name (`craft_libraries_and_names`, requirement 1). So a host cannot add or replace a standard function, and every host function can be written in a template.
- A host function that returns no value MUST give absent. One that returns something that is not a value (at the top or nested) MUST fail with `functionFailed`.
- A host function that throws (fails in any way) MUST fail with `functionFailed`; the failure MUST NOT escape the evaluation.

### **6. Errors**

The evaluation errors are `unknownFunction`, `invalidArgument`, `functionFailed` and `notEvaluated`.

- An error anywhere in a value MUST be the result of the whole evaluation. An error is not a value: `isSet` and `orElse` never see it.
- When a value contains several errors, the engine MUST report the first one met when evaluating list elements, map values and call arguments in their order, a call's classification and argument-name check (requirements 2–4) coming before its arguments.
- An engine SHOULD attach a message for authors; messages are not part of conformance.

### **7. Numbers**

These rules hold for every standard function on numbers.

- `add`, `subtract`, `multiply` and `mod` on two integers MUST give an integer. When one operand is a double, the integer MUST be converted to the nearest double and the operation done in IEEE 754 double precision, rounding to nearest. (`divide` always converts; `min`, `max` and `abs` return a value of their argument's kind.)
- An integer result outside the 64-bit signed range MUST be absent, and so MUST a double result that is infinite or NaN. Infinite arguments are numbers.
- Numbers MUST be compared by their exact mathematical values, also an integer with a double (2⁵³+1 is greater than the double 2⁵³); zero and negative zero are equal.

### **8. Arithmetic**

Parameters `a` and `b` (or `value`), all `number`. If an argument is absent, or present and not a number, the result is absent.

| Function                       | Result                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `add(a, b)`                    | a + b                                                                                                                                                                                                                                                                                      |
| `subtract(a, b)`               | a − b                                                                                                                                                                                                                                                                                      |
| `multiply(a, b)`               | a × b                                                                                                                                                                                                                                                                                      |
| `divide(a, b)`                 | a ÷ b, both converted to doubles: always a double. Absent when b is zero.                                                                                                                                                                                                                  |
| `mod(a, b)`                    | r = a − b × trunc(a ÷ b), computed exactly, plus \|b\| when r is negative, so r is never negative. For doubles that addition is rounded to nearest, so the result can equal \|b\| (`mod(a: -1e-30, b: 1)` is 1.0). Absent when b is zero. An integer for two integers, otherwise a double. |
| `min(a, b)` / `max(a, b)`      | a if a ≤ b (for `max`, a ≥ b), otherwise b: one of the arguments, unchanged.                                                                                                                                                                                                               |
| `abs(value)`                   | \|value\|, of the same kind as value.                                                                                                                                                                                                                                                      |
| `round(value)`                 | The nearest integer, halves away from zero.                                                                                                                                                                                                                                                |
| `floor(value)` / `ceil(value)` | The nearest integer toward negative / positive infinity.                                                                                                                                                                                                                                   |

- `round`, `floor` and `ceil` MUST give an integer, return an integer argument unchanged, and give absent when the rounded double is outside the 64-bit signed range (or infinite).
- Requirement 7 applies to every function in the table: `min` and `max` of two infinite values are absent, and so is `abs` of −2⁶³.

### **9. Comparison and equality**

- `greaterThan(a, b)`, `lessThan(a, b)`, `greaterThanOrEqual(a, b)` and `lessThanOrEqual(a, b)` (parameters `number`) MUST give the boolean a > b, a < b, a ≥ b, a ≤ b, and absent if an argument is absent or not a number.
- `equals(a, b)` (parameters `any`) MUST give a boolean, never absent, under this equality: two numbers are equal when their values are (requirement 7; NaN equals nothing, not even NaN); two strings when they have the same UTF-16 code units; two booleans when they are the same; two lists when they have the same length and equal elements in order; two maps when they have the same keys and equal values for each key, in any order; absent equals only absent. Values of different kinds are never equal (`5` is not `"5"`).
- `notEquals(a, b)` MUST give the negation of `equals(a, b)`.

### **10. Logic**

- `and(a, b)`, `or(a, b)` and `not(value)` (parameters `boolean`) MUST give the boolean a ∧ b, a ∨ b, ¬value, and absent if an argument is absent or not a boolean, even when the other argument would decide the result.

### **11. Strings**

- `concat(a, b)` (parameters `any`) MUST give a string: the display string of a followed by that of b. The display string of a string is itself; of an integer, its decimal digits (with `-` when negative); of a double, ECMAScript's `Number.prototype.toString` (the shortest digits that read back as the same double, exponent form at or above 1e21 and below 1e-6; `Infinity`, `-Infinity`, `NaN`), except that negative zero is `0`; of a boolean, `true` or `false`; of anything else (absent, a list, a map), the empty string.
- `trim(value)` (parameter `string`) MUST remove from both ends of value every character among U+0009–U+000D, U+0020, U+0085, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 and U+FEFF.
- `length(value)` (parameter `string`) MUST give the number of UTF-16 code units of value as an integer.
- `trim` and `length` MUST give absent if value is absent or not a string.

### **12. Lists**

Parameters `list` (`list`) and `value` (`any`). An absent list MUST be the empty list; a present list that is not a list makes the result absent (requirement 4). Elements compare with the equality of `equals`, and an absent value is never in a list, even a list with absent elements.

- `contains(list, value)` MUST give whether an element of list equals value (false when value is absent).
- `listWith(list, value)` MUST give list with value added at the end, unless value is absent or already in the list; then it gives list unchanged.
- `listWithout(list, value)` MUST give list without every element equal to value; when value is absent, list unchanged.
- The input list MUST NOT change; each function gives a new list.

### **13. Optional values**

- `isSet(value)` (parameter `any`) MUST give false when value is absent and true otherwise (also for `""`, `false`, `0` and `[]`).
- `orElse(value, otherwise)` (parameters `any`) MUST give value when it is not absent, otherwise `otherwise` (absent when both are).

---

## **Detailed Description of Changes**

```craft
import core;
import fmt;

widget Price { count: 1 } = Text(
  text: concat(
    a: orElse(value: args.label, otherwise: "Total: "),
    b: fmt::price(amount: multiply(a: data.unitPrice, b: state.count)),
  ),
  enabled: and(a: isSet(value: data.unitPrice), b: greaterThan(a: state.count, b: 0)),
);
```

- `Text` resolves to core's primitive, so it is a widget call and the evaluator leaves it to the runtime. `concat`, `orElse`, `multiply`, `and`, `isSet` and `greaterThan` are standard functions; `fmt::price` is a host function, callable here because the library imports `fmt`.
- With `data.unitPrice` missing, `multiply` is absent, so `fmt::price` runs with `amount` absent and decides what to return; `isSet` is false and so is `and`. Nothing throws.
- A typo such as `orElse(value: args.label, default: "x")` fails with `invalidArgument` instead of silently dropping the default.

The prototype checked argument kinds only for literal arguments, and only in debug builds; this feature checks every argument's kind at every call, so that a function never sees a value of the wrong kind, and makes argument names part of the contract. Functions on media values (`atLeast`), introspection functions (`hasWidget`, `hasFunction`, `meta` and others, see `craft_template_registry`) and `uppercase`/`lowercase` are not part of this feature.

---

## **Links**

- Values and their canonical JSON form: [craft_text_format](craft_text_format.blueprint.md).
- Name resolution and function keys: [craft_libraries_and_names](craft_libraries_and_names.blueprint.md).
- `absent` and `call`: [craft_language_extensions](craft_language_extensions.blueprint.md).
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `conformance/craft/craft_functions.yaml`. Each case is tagged with `F-CRAFT-FUNC-<n>`, `n` being the requirement it tests (`conformance/features.yaml`). Each case gives a library (usually one expression in a fixed wrapper), the supplied args, data and state as text format data files, and the expected value in canonical JSON form, the expected error kind, or, for a call, its classification (requirements 2 and 3). The YAML header documents the primitive libraries and the small fixed set of test host functions the runner registers. An engine MUST pass every case:

- **Values**: literals; lists and maps; absent elements kept; args, data and state references; whole lists and maps; a missing key, an index out of range and a part of the wrong kind; values not supplied; an infinite supplied double.
- **Absent and call**: `absent` and `absent()`; a declared widget named `absent` is ignored, in classification and evaluation; a root `absent()`, and `absent(x: 1)` rejected; a root `call()` is classified as a handler application.
- **Function or widget**: standard functions bare and as `core::`, with and without importing core, classified and evaluated; a host function from an importing library (classified and evaluated) and from its own library, and not from a library that does not import it, nor bare or as `core::`; unknown names, classified and evaluated; an own declaration, a core primitive and a host primitive are classified as widgets, with control cases classified and evaluated as functions; a widget name that fails to resolve falls back to the function.
- **Arguments**: each kind, a double as a number; missing and absent arguments; a wrong kind makes the call absent and does not run the function; unknown argument names; names checked before arguments are evaluated; every argument evaluated; nested calls.
- **Host functions**: no value, no value inside a result, a result that is not a value, a throwing function.
- **Errors**: an error fails the whole value; an error is not absent; the first error in list, map and argument order, with control cases; the function is resolved before its arguments.
- **Numbers**: integer results; double operands; IEEE rounding; integer overflow, with a control case at the range limits; infinite results; infinite arguments; exact integer-double comparison.
- **Arithmetic**: each function, division and `mod` by zero, `mod` signs, its rounded addition and by an infinite double, `min`/`max` on equal values, `round` of 0.49999999999999994 and −0.5, rounding out of range, absent and wrong-kind operands.
- **Comparison and equality**: the four comparisons and absent operands; `equals` on scalars (no coercion, code units, negative zero), lists and maps, and absent; `notEquals`.
- **Logic**: `and`, `or`, `not`, and absent or wrong-kind operands.
- **Strings**: `concat` of every kind and number formatting, including shortest-digit doubles; `trim` of every listed whitespace character, all together and each alone, and of U+001C, U+180E and U+200B, which it keeps; `length` in UTF-16 code units; absent and wrong-kind values.
- **Lists**: `contains`, `listWith` and `listWithout`, with absent lists and values, the input unchanged, and a non-list.
- **Optional values**: `isSet` and `orElse`.

The engine's unit tests additionally cover what the text format cannot express: host key registration, `absent` missing from the visible functions, calls named `core::absent` and `core::call`, `notEvaluated` for each node left to the runtime, NaN arguments, null, maps with untyped string keys and objects that are not values in supplied values, copies of arguments, the exact set of standard functions and the display of numbers.

---

## **Implementation Steps**

1. Define functions (parameters with kinds and an implementation) and a registry of the standard functions and host functions, checking host keys.
2. Implement the standard functions under the number rules.
3. Implement the evaluator: literals, lists, maps, `absent`, args, data and state references, call classification, argument checks, and errors.
4. Run the conformance cases.
