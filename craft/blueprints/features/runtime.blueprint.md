---
feature_name: runtime
module_blueprints:
  - craft_engine
dependencies:
  - text_format
  - libraries_and_names
  - language_extensions
  - functions
  - template_registry
date_added: 2026-11-20
---

# **Runtime Feature Blueprint**

This document specifies the runtime: how an engine expands a template, with its arguments, data and local state, into a tree of primitive calls, and what happens when a handler in that tree is fired. It defines the nodes that `functions` leaves to the runtime: widget calls, loops (so also `...if`), switches, widget builders, event handlers, state setters, handler applications (`call`), and loop and builder argument references.

The runtime knows no UI framework. Its output is the **expansion**: a tree of resolved primitive calls with their argument values, in which handlers are plain descriptions of what firing them does. A framework adapter renders the expansion with its own widgets and fires the handlers it finds in it. So every requirement here is checked on the expansion and on the events that firing gives, without rendering anything.

Within the nesting limits of the engine, which the `limits` feature defines (see the module blueprint), expanding a template never fails as a whole: every failure becomes an error node in the tree, and is reported.

---

## **Requirements**

### **1. Expansion**

A **runtime** expands one root, given:

- a template registry (`template_registry`), with its libraries and functions;
- the **root**: a library `L` and a widget name `N`;
- the root's **arguments**: a map of values (`functions`, requirement 1), which may also hold host handlers (requirement 8);
- the **data**: a value; absent when the host gives none.

Requirements:

- In arguments and data, null (no value) MUST be the absent value, also inside lists and maps. Arguments or data that are not values (host handlers apart, which only arguments may hold) MUST be rejected as a host error.
- The root MUST be classified as `functions` (requirement 3) classifies a call named `N` written in `L` outside any declaration. When it is a widget call, the expansion MUST be the expansion of that widget at the root position, with the host's arguments as its arguments (requirements 3 and 4). Otherwise the root MUST be an error node `notAWidget`.
- An expansion MUST give the root node, the stateful instances it expanded (requirement 10), and its errors (requirement 12).

### **2. Expansion tree**

The canonical JSON form of an expansion has these nodes:

| Node                | Canonical form                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Primitive call      | `{"$": "widget", "name": "lib::Name", "args": {...}}`                                      |
| Error placeholder   | `{"$": "error", "kind": K}`                                                                |
| Widget builder      | `{"$": "builder"}`                                                                         |
| Event handler       | `{"$": "event", "name": E, "args": {...}}`                                                 |
| State setter        | `{"$": "setState", "state": {"at": P, "widget": "lib::Name"}, "parts": [...], "value": V}` |
| Handler application | `{"$": "call", "handler": H, "args": {...}}`                                               |
| Host handler        | `{"$": "hostHandler", "id": I}`                                                            |

- Every other value MUST be in the canonical form of `text_format` (an integer `{"$": "int", "value": 1}`, the absent value `{"$": "missing"}`), lists and maps holding any of these nodes.
- The **path** of a node or value is the list of argument names, map keys and list indexes that leads to it from the root node: the root has the path `[]`, the argument `a` of a primitive at path `P` has the path `P` followed by `"a"`, and so on. In the canonical form, parts and paths are written as plain strings and integers.
- **Document order** is the order of a depth-first walk from the root that visits a primitive's arguments in the order the call writes them, list elements by index and map entries in the order they are written (for host values, in the order the host gives them). Errors and stateful instances are listed in document order; an instance comes before the instances inside its expansion.
- The canonical form of an expansion is `{"root": node, "states": [{"at": P, "widget": "lib::Name", "value": state}], "errors": [{"at": P, "kind": K}]}`.

### **3. Primitive calls**

- A call that `functions` classifies as a widget call of a primitive `lib::Name` MUST expand to a widget node with that name. Its arguments MUST be the call's arguments evaluated in the scope of the call, in the order the call writes them, and then placed at their paths: every widget call in them, at any depth of lists and maps, is expanded at its own path, and every widget builder becomes a builder node at its path.
- The runtime MUST NOT check a primitive's arguments: what a primitive accepts is up to its host.

### **4. Template calls**

- A widget call of a template declaration `D` MUST expand to the expansion of `D`'s root at the same path; the template leaves no node of its own.
- `D`'s root MUST be evaluated in `D`'s library, with `D` as the declaration being bound (so a call named `D` inside `D` does not resolve to `D`, `libraries_and_names` requirement 3), with the call's arguments as args, and with the state of requirement 10. When the root does not give a widget call (a switch with no matching case, `absent()`, a handler application), the template's position MUST be an error node `notAWidget`.
- An argument of the call MUST be evaluated in the scope of the call (its library, its declaration being bound, its args, loop variables, builder arguments and state) and only when the template reads it: an argument the template never reads is never evaluated. A widget call in an argument is expanded at each path where the template places it, once per placement. An argument the call does not pass is absent.

### **5. References and values**

- `args.a.p...` MUST read the argument `a` (requirement 4), then the parts after it; `data.p...` the data; `state.p...` the state of requirement 10; a loop reference the item of its loop; a builder argument reference the argument its builder was expanded with. Parts read as in `functions` (requirement 1): absent for a missing key, an index outside the list, or a part of the wrong kind, also when the value read is a widget, a builder or a handler.
- Literals, lists, maps, `absent`, symbol references and function calls MUST evaluate as `functions` and `template_registry` specify.
- A function argument MUST be a value: an argument that holds a widget, a builder or a handler MUST fail with `invalidValue`.
- This feature does not define theme and media references; `media_context` defines the media references. An engine that does not evaluate them MUST fail with `notEvaluated`.

### **6. Lists and loops**

- In a list, a loop MUST give one element for each item of its input list, in order, the output being evaluated with the loop variable set to the item. An output that is itself a list stays one element. An input that is not a list (absent, a map, a string, a number) MUST give no element.
- A null item in host data is the absent value (requirement 1), so it gives an element whose loop variable is absent.
- `...if C: E` therefore gives `E` once when `C` is `true`, and nothing when `C` is anything else (`language_extensions`, requirement 3).
- A loop that is not a list element, a loop reference without its loop and a builder argument reference without its builder, which the text format never produces, MUST fail with `invalidValue`.

### **7. Switches**

- A switch MUST evaluate its input, then its keys in order (`default` apart), and give the evaluated value of the first case whose key equals the input under the equality of `equals` (`functions`, requirement 9; so `1` matches `1.0`). With no matching key it MUST give the value of `default`, or absent when there is none.
- Keys after the matching one and the values of cases that are not selected MUST NOT be evaluated, so failures in them are no failures.
- The input and every key evaluated MUST be values: a widget, builder or handler there MUST fail with `invalidValue`.

### **8. Handlers**

Handlers evaluate to handler nodes, resolved when they are expanded:

- `event E {M}` MUST give an event node with `M` evaluated.
- `set state.p... = V` MUST give a setter node naming the stateful instance of requirement 10 (its path and template), the parts, and `V` evaluated. Without a stateful instance it MUST fail with `noState`.
- `call H {M}` MUST give a handler application node with `H` and `M` evaluated (a missing `handler` is absent, missing `arguments` the empty map). A call named `call` with an argument other than `handler` and `arguments` MUST fail with `invalidArgument`, and one whose arguments are not a map with `invalidValue`.
- The values of `M`, of an event's arguments and of `V` MUST be values; `H` may hold values and handlers. A widget or builder in any of them, or a handler in the first three, MUST fail with `invalidValue`.
- A **host handler** is a handler that the host passes in the root's arguments, with an identifier; it is a value of the expansion like any other and gives a host handler node.
- A value is **runnable** when it is an event, a setter or a host handler, a handler application whose handler is runnable, or a list with a runnable element. An engine MUST tell whether a value is runnable; an adapter typically disables a control whose handler is not.

### **9. Firing**

The host fires a value of an expansion, with **event arguments**: a map of values that the primitive supplies (such as `{value: true}` from a checkbox).

- Firing an event MUST emit to the host the event's name with its arguments merged with the event arguments, which win.
- Firing a handler application `H {M}` MUST fire `H` with the event arguments merged with `M`, which wins.
- Firing a host handler MUST emit to the host the handler's identifier with the event arguments.
- Firing a list MUST fire each element in order with the same event arguments. Firing anything else MUST do nothing.
- Firing a setter MUST set the state of its instance at its parts to its value: each part MUST name existing state (a key that the map has, an index inside the list), and the last part's entry is replaced with a copy of the value. When the instance is no longer kept (requirement 10) or the parts do not name existing state, the setter MUST fail with `unknownState`; when the value is absent, with `absentValue`. A failed setter changes nothing, and the rest of the firing goes on.
- A setter sets the value computed when it was expanded, so setters fired together do not see each other's changes.
- Firing MUST give the emitted events in order, the setter failures in order, and whether some state was set. Expansions made before MUST NOT change.

### **10. Local state**

- A template declaration with initial state that is expanded at a path `P` MUST have an **instance** identified by `P` and the template's name, even when its root then fails. The first time, its state MUST be a copy of the declaration's initial state; afterwards the instance keeps its state.
- When the library declaring the template is registered again (even with the same source), the instance MUST start again from the initial state.
- `state` references MUST read the **nearest stateful instance**: in a template's root, the template's own instance when it has initial state, and otherwise the nearest stateful instance of the scope of its call; in an argument, that of the scope of the call. Without one, they MUST read absent (and a setter fails, requirement 8).
- After each expansion of the root, the runtime MUST keep the instances expanded in it and those whose path starts with the path of one of its builder nodes, and MUST drop every other instance, so a template that leaves the expansion starts from its initial state when it comes back.
- Updates of the arguments and the data, and registrations other than that of the template's library, MUST keep the state.

Because an instance is identified by its path and template:

- A stateful template that comes to another path (an element inserted before it, another wrapper around it) starts from its initial state.
- An instance in a builder's output is kept as long as the root's expansion has a builder node at that builder's path, whether or not the host expands the output for that key again.
- A template that places another call of itself at its own path (a root that passes an argument through, with `W(child: W())`) shares one instance with that call.

### **11. Widget builders**

- A widget builder `(x) => W` MUST evaluate to a builder node, which captures the scope where it is written.
- The host MUST be able to expand the output of a builder node at path `P` for a key `K` (a string or an integer that the host chooses, such as an item's index) and an argument value: `W` is evaluated in the captured scope with `x` set to the argument, and expanded at the path `P` followed by `K`. That expansion gives its root node, the stateful instances and the errors in it, like the expansion of the root; when `W` gives no widget, its root MUST be an error node `notAWidget`.

### **12. Errors**

| Kind                                                   | Cause                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `unknownFunction`, `invalidArgument`, `functionFailed` | an evaluation error of `functions`                                                                           |
| `notEvaluated`                                         | a node that no feature implemented by the engine evaluates (requirement 5)                                   |
| `notAWidget`                                           | the root, a template's root or a builder's output gives no widget                                            |
| `recursiveWidget`                                      | a template is called inside its own expansion                                                                |
| `invalidValue`                                         | a widget, builder or handler where a value is required, or a node the text format never produces where it is |
| `noState`                                              | a setter without a stateful instance                                                                         |

- A failure while evaluating a primitive's arguments MUST make that primitive's position an error node; a failure while evaluating a template's root, or a root that gives no widget, the template's position; for a builder's output, the output's position. The kind MUST be that of the first failure in evaluation order (arguments in the order the call writes them, then as `functions`, requirement 6, orders them). Nodes elsewhere are not affected: an unknown call inside a primitive's arguments fails that primitive, and its parent and siblings expand as usual.
- A widget call of a template `D` MUST be an error node `recursiveWidget` when `D`'s root is already being expanded in the scope of the call (the chain of template roots that led to the call, not counting templates that only received it as an argument). A builder output continues the chain of the scope where the builder is written. Since a declaration's own name never resolves to it, a template cannot call itself, not even in a builder (`widget Tree = List(item: (i) => Tree())` fails with `unknownFunction` when the output is expanded); through other templates it is `recursiveWidget`.
- An expansion MUST report one error for each error node, with its kind and path, in document order. An engine SHOULD attach a message for authors; messages are not part of conformance.

### **13. Updates**

- A host MUST be able to replace the root's arguments and the data. The next expansion MUST use the new values and the current registrations of the registry.
- A runtime MUST notify the host when an expansion may have changed: after a change of the arguments or the data, after a firing that set state, and when the host says that the registrations changed.

---

## **Detailed Description of Changes**

```craft
import core;

widget Toggle = Button(onPressed: call args.onToggle { label: args.label }, child: Text(text: args.label));

widget Panel { open: false } = Column(children: [
  Toggle(label: data.title, onToggle: [set state.open = switch state.open { true: false, default: true }, args.onOpen]),
  ...if state.open: Text(text: data.body),
]);
```

Expanded as `Panel` with data `{title: "Help", body: "..."}` and the host handler `opened` as `onOpen`, the tree is a `core::Column` whose first child is a `core::Button` with `onPressed: {$: call, handler: [{$: setState, state: {at: [], widget: "main::Panel"}, parts: [open], value: true}, {$: hostHandler, id: opened}], args: {label: "Help"}}`. Firing it with `{}` sets `open` and emits `{hostHandler: opened, args: {label: "Help"}}`; the next expansion has the `Text` too. A new `data.title` changes the label and keeps `open`.

Compared with RFW 2.0.0's runtime:

- The runtime produces a framework-independent tree; the adapter builds widgets from it. RFW resolves arguments lazily as each widget builds, with subscriptions to the data; this runtime expands the whole tree again after each change.
- Handler values are resolved when expanded, as in RFW. Handler lists keep host handlers, and a setter with an absent value is skipped and reported rather than stored.
- Switch keys compare with the equality of `functions` rather than Dart's equality, and state is identified by path and template rather than by the host framework's element tree. Keys that keep the state of reordered items are not part of this feature.
- Template state is kept across data updates and reset when the template's library is registered again.
- An unresolved widget, an unknown function or a failed function gives an error node and an error report instead of an exception.

---

## **Links**

- Canonical JSON form of values and libraries: [text_format](text_format.blueprint.md).
- Name resolution: [libraries_and_names](libraries_and_names.blueprint.md).
- `absent`, `call`, `...if`: [language_extensions](language_extensions.blueprint.md).
- Values, call classification, functions and evaluation errors: [functions](functions.blueprint.md).
- Registry and symbol references: [template_registry](template_registry.blueprint.md).
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `craft/conformance/runtime.yaml`. Each case registers template and primitive libraries by source, expands a root with arguments and data, and checks the canonical form of the expansion; then it runs steps on the same runtime (firing the value at a path, replacing the data or the arguments, registering libraries again, expanding a builder's output, asking whether a value is runnable) and checks the events, firing errors and expansion after each. The YAML header documents the format. An engine MUST pass every case:

- **Expansion**: a template root with arguments and data; a primitive root, qualified; the root resolved as a call (an own declaration shadowing core's); a function name, an unknown name and a private declaration of another library as the root.
- **Expansion tree**: values of every kind in arguments, absent kept; paths through argument names, map keys and list indexes, seen in errors and states.
- **Primitive calls**: widget calls at any depth of lists and maps; a primitive of another library.
- **Template calls**: no node of its own; a missing argument; an unread argument is not evaluated, with a control; arguments in the scope of the call (loop variable, state); a widget argument placed twice; parts of an argument, of a widget and of a handler; a root call that is `absent()` or a handler application; templates of an imported library.
- **References and values**: data parts; absent data; symbol references; function calls; widgets, handlers and builders as function arguments, with a control.
- **Lists and loops**: elements around a loop and a list output; nested loops; inputs that are not lists; a null item; `...if` on true, false, absent and a number; `...if` inside a loop.
- **Switches**: first matching key, default, no match, `1` and `1.0`, lists, default written first; unselected values and later keys not evaluated; a root switch, including a case that gives no widget and no case; a widget as input and as a key.
- **Handlers**: event arguments and a setter's value resolved at expansion; a call with and without a handler; a handler list with a host handler; widgets, builders and handlers where values are required, with controls; a call named `call` with an extra argument or arguments that are not a map; a setter without a stateful instance; runnable values.
- **Firing**: event arguments merged; a call's arguments merged over the event arguments and into an event's; a list in order with host handlers; setters fired together; nested parts, missing keys, indexes out of range, a part through a non-container and an absent value; a setter whose instance is gone; firing values that are not handlers.
- **Local state**: a counter; separate instances; a stateless template using the nearest stateful one, and none; two instances at one path; a template passing a call of itself through sharing its instance; a failed template's instance; state across data, argument and registry updates and reset on reload; state dropped and started again; state by position.
- **Widget builders**: outputs for two keys, reading the argument and the captured scope; an output that is not a widget; state in an output, kept, fired and dropped with the builder.
- **Errors**: errors of each `functions` kind at the innermost primitive, with the parent and siblings intact; an unknown widget failing its parent; the first error in argument order; errors in a template's root and in an argument read; recursion through templates, a self-call and a template passed to itself; a self-call and recursion through templates in a builder's output.
- **Updates**: data and argument updates; a registry change.

The engine's unit tests additionally cover what the YAML cannot express: theme and media references; loops outside lists, loop and builder argument references without their loop or builder, and a setter without parts (built with the library model); host input that is not a value, host handlers in data, builder keys; the same library object registered again, and the registry's generation of a library name; notifications; and expansions that keep what they read after a firing.

---

## **Implementation Steps**

1. Define the expansion nodes, handler nodes and their canonical form.
2. Implement the evaluation of every node in a scope (library, declaration, arguments evaluated on first read, loop variables, builder arguments, nearest stateful instance) and the placement of widget calls at their paths, with error nodes at the innermost widget.
3. Implement stateful instances keyed by path and template, and firing.
4. Implement builder expansion, updates and notifications.
5. Run the conformance cases.
