---
feature_name: limits
module_blueprints:
  - craft_engine
dependencies:
  - text_format
  - binary_format
  - functions
  - runtime
date_added: 2026-11-21
---

# **Limits Feature Blueprint**

This document specifies the limits under which an engine loads and expands templates. Templates are untrusted by default, so every stage runs under limits: the text parser and the binary decoder on the size, nesting, node count and strings of what they read; the registry on each library; the evaluator and the runtime on the nesting of evaluation, the values they are given and compute, and the work and output of each expansion. Every limit has an engine default that a host can raise or lower.

Where a limit can be checked exactly when a library loads, it is checked there and the library is rejected. What depends on data (the cost of an expansion) is counted while expanding, and an expansion that runs out stops with one error node, a bounded placeholder, instead of a partial tree. No stage that reads a template or its input overflows the stack: each one stops at its depth limit first.

---

## **Requirements**

### **1. Limits**

An engine MUST have these six limits, each a positive integer, with these defaults:

| Limit             | Default   | What it bounds                                                           |
| ----------------- | --------- | ------------------------------------------------------------------------ |
| `maxSourceBytes`  | 1,048,576 | the size of a text source or data file (in UTF-8) or of a blob, in bytes |
| `maxStringBytes`  | 65,536    | the length of a string value, in UTF-8 bytes                             |
| `maxDeclarations` | 1,000     | the declarations of a library                                            |
| `maxDepth`        | 100       | the nesting of a declaration, a data value, a value, and of evaluation   |
| `maxNodes`        | 100,000   | the nodes of a declaration or a data file or blob, and of an expansion   |
| `maxSteps`        | 100,000   | the evaluation steps of an expansion                                     |

- A host MUST be able to set each limit to any positive integer, keeping the defaults of the others, except that an engine MUST reject, when the limits are set, a value it cannot honor without exhausting its own resources (such as a depth its stack cannot hold), and MUST document the largest value it accepts.
- The parser and the decoders MUST take a set of limits, and a registry MUST have one, which applies to the libraries registered in it and to every evaluation and expansion over it. Where the host gives none, the defaults apply.
- The **JSON form** of a set of limits, which a host publishes with what it supports so that tooling can warn authors before a template exceeds a target's limits, is an object with the six limits by name: `{"maxSourceBytes": 1048576, "maxStringBytes": 65536, "maxDeclarations": 1000, "maxDepth": 100, "maxNodes": 100000, "maxSteps": 100000}`. Reading a JSON form, an engine MUST give a limit that the object leaves out its default, and MUST reject an object with another key or with a value that is not a positive integer.

### **2. Library measures**

The **children** of a node of a library are: a list's elements (loop elements included); a map's values; a loop's input and output; a call's argument values (so the children of `call H {M}` are `H` and the map `M`); an event's argument values; a switch's input, its case keys (not `default`) and its case values; a setter's value; a builder's widget. Other nodes (literals, the absent value, references) have none. The arguments of a call and of an event are no node of their own, unlike the canonical form's `args` maps.

- A node's **depth** is 1 for a declaration's root and for its initial state (a map node), and one more than its parent's for a child. A declaration's **nodes** are the nodes of its root and of its initial state, the initial state and the root included.
- A **string value** is a string that is a node: names, map keys, event names, reference parts and import names are none.
- A library is **within the limits** when it has at most `maxDeclarations` declarations, each declaration has no node deeper than `maxDepth` and at most `maxNodes` nodes, and every string value is at most `maxStringBytes` long in UTF-8. A data value is within them when it has no node deeper than `maxDepth`, at most `maxNodes` nodes and no string longer than `maxStringBytes`.

### **3. Text sources**

- A source longer than `maxSourceBytes` in UTF-8 MUST be rejected before it is parsed, reporting the position of its first character beyond the limit.
- Parsing MUST reject a source whose library, or whose data value, is not within the limits (requirement 2). It counts the nodes it produces in source order, each at the position of the token that starts it, and checks the limits when a node starts, before the rest of the node is read; the rejection reports the position of the node that exceeds a limit: the first node too deep, the first node beyond `maxNodes` in its declaration, the string value too long, or the first token of the declaration beyond `maxDeclarations`.
- The nodes that `language_extensions` adds count like written ones: `...for x in L: E` and `...if C: E` start, at `...`, a loop one level deeper than the list, and `...if` also starts there its switch, the key `true`, the list `[true]`, its element `true` and the list `[]`, so its deepest node is four levels below the list; `C` is three levels below it and `E` two.
- A `let` binding's value MUST be within `maxDepth`, `maxNodes` and `maxStringBytes` where it is written, as a value of its own whose root is 1 deep. Each use of a binding counts the binding's nodes again, and its depth below the use's place, at the use; a binding that is not used counts no node of its declaration.
- A null map value, which the text format drops, is no node.
- A rejection MUST name the limit and report the position, as the text format reports other rejections (`text_format`, requirement 1).

### **4. Binary blobs**

- A blob longer than `maxSourceBytes` MUST fail before anything else is read, at the offset `maxSourceBytes`.
- A library blob whose declaration count exceeds `maxDeclarations` MUST fail at the offset of the count (after the count is checked against the blob's length, `binary_format` requirement 10).
- Each tagged value the decoder reads, skipped extension values included, counts as a node one level deeper than the tagged value it is read in; a data blob's root value and a declaration's root are 1 deep. A declaration's initial state, when it has entries, is a map node 1 deep at the offset of its entry count. The marker of a switch's `default` case and the parts of references are no nodes. Nodes count per data value and per declaration. A node deeper than `maxDepth`, or beyond `maxNodes`, MUST fail at the offset of its tag, checked when the tag is read, before anything else about the value.
- A string value (a value with the string tag) longer than `maxStringBytes` MUST fail at the offset of its tag, after its length is checked against the blob's length. Map keys, names and reference parts are not string values.
- Each of these fails with the error kind `limitExceeded`, which MUST name the limit; like every decoding error, it reports the blob's version.

### **5. Registration**

- A registry MUST reject a template library that is not within its limits (requirement 2), naming the limit, and leave its registrations unchanged.
- So a library that the parser or a decoder produced under the same limits registers: their checks count every node of the library they produce, and the decoder also counts nodes that it drops.

### **6. Values**

The **depth** of a value is 1 for a boolean, a number, a string, the absent value, a host handler or a host widget, and one more than its deepest element for a list or a map (1 when empty).

- These values MUST be no deeper than `maxDepth` and MUST hold no string longer than `maxStringBytes`: the root's arguments (as a map; in the A2UI integration, the resolved values of a component's props), the data, the event arguments of a firing (as a map) and the argument of a builder's output, which the host gives the runtime; the value that a reference reads in the evaluator of `functions` (only the value read, after its parts); and the result of every function call.
- A host value MUST be checked without converting or walking deeper than `maxDepth`, so that no value overflows a stage before it is checked.
- A function result beyond them MUST fail with the evaluation error `depthExceeded` or `stringTooLong`, as MUST a value read in the evaluator. Host input to the runtime beyond them stops the expansion (requirement 8) or the firing (requirement 9).
- The host's own registrations (the metadata of primitives, the app version, the media context) are not checked. Values built during an expansion (lists and maps, loops) are not checked either: their nesting is bounded by that of evaluation (requirement 7) plus that of the values they hold, so by twice `maxDepth`.

### **7. Evaluation depth**

- The evaluator of `functions` MUST evaluate the value it is given at depth 1 and each child of a node at one more than the node, and MUST fail with `depthExceeded` when it would evaluate a node deeper than `maxDepth`.
- In an expansion, the root's position is 1 deep. A node evaluated at depth `d` evaluates the children it evaluates (`runtime`, requirements 5 to 8) at `d + 1`; a loop element counts as a node, so the loop's input and outputs are two levels below the list. A reference that reads a template argument for the first time evaluates the argument's value as its child, however deep the call that passed it. A widget call placed at a position of depth `d` evaluates a primitive's arguments, or a template's root, at `d + 1`, and places them at positions of depth `d + 1`; a list or map placed at depth `d` places its elements at `d + 1`; the output of a builder node placed at depth `d` is evaluated and placed at `d + 1`.
- Evaluating a node deeper than `maxDepth` MUST fail with `depthExceeded`, which becomes an error node like every failure of the runtime (`runtime`, requirement 12): at the primitive whose arguments, the template whose root, or the builder output that was being evaluated. Placing a value evaluates nothing and is not limited.

### **8. Expansion budget**

An expansion of the root, and each expansion of a builder's output, has its own budget:

- **Steps.** Each evaluation of a node is one step: every node evaluated, loop elements included, and a template argument's value each time it is evaluated (once, on its first read). Each value that must be a value (`runtime`, requirements 5, 7 and 8) is one more step for each of its nodes, a list or map being one node plus the nodes of its elements and anything else one node: the arguments of a function call, a switch's input and each key evaluated, an event's arguments (as one map), a setter's value, and a `call`'s handler and arguments.
- **Nodes.** The nodes of an expansion are its widget, error, builder and host widget nodes, and each value placed in a primitive's arguments: one node, plus the nodes of the elements of a list or map, a handler being one node. A value placed at several positions counts at each.
- When the steps exceed `maxSteps`, or the nodes `maxNodes`, the expansion MUST stop: it is one error node `stepsExceeded` or `nodesExceeded` at the position of the root (or of the builder's output), its errors are that node's error alone, it lists no stateful instance, and the runtime MUST NOT drop any instance because of it (the instances of `runtime`, requirement 10, are kept or dropped after expansions that complete).
- An expansion of the root whose arguments or data, or an expansion of a builder's output whose argument, is beyond requirement 6 MUST stop the same way, with `depthExceeded` or `stringTooLong`, until the host replaces them; the arguments and data are no host error.

### **9. Firing**

- Firing evaluates nothing (`runtime`, requirement 9), so it has no budget of its own: the value it fires was built, and its values checked, by an expansion within its budget.
- A firing whose event arguments are beyond requirement 6 MUST fire nothing and give one firing error, `depthExceeded` or `stringTooLong`.
- A setter whose state would become deeper than `maxDepth` MUST fail with the firing error `depthExceeded`, changing nothing; the rest of the firing goes on.

---

## **Detailed Description of Changes**

```craft
import core;

widget Feed = Column(children: [
  ...for post in data.posts: Card(child: Text(text: post.title)),
]);
```

`Feed` registers whatever the limits, because its declaration is small. Expanded over data with a few posts, it takes a few steps per post. Expanded over data with a hundred thousand posts, it runs out of steps (the default budget is 100,000), and the expansion is one error node `stepsExceeded`, which the adapter renders as its error placeholder, and which the runtime reports in the expansion's errors. A source that nests ten thousand lists, or a 90 KB blob that does, is rejected at the node 101 deep instead of overflowing the stack.

The defaults are chosen so that real templates never meet them and an expansion that meets them is still quick:

- `maxSourceBytes` (1 MiB) and `maxDeclarations` (1,000) are far above a library of templates, whose components each become an entry of the catalog that an agent reads.
- `maxDepth` (100) holds about fifty levels of widgets in one tree (each primitive with its list of children is two levels, each template call one), and keeps every stage far from its stack's limit.
- `maxNodes` (100,000) bounds the work of loading a declaration and of rendering an expansion; `maxSteps` (100,000) is the work of an expansion: on a desktop, an expansion that runs out of steps takes a few tens of milliseconds once compiled.
- `maxStringBytes` (64 KiB) bounds what a function can build from a string: without it, a template that sets `state.s = concat(a: state.s, b: state.s)` doubles its state at each tap.

Some measures exist because of how values are shared. A `let` binding stands for its value at each use, so bindings that use each other twice could otherwise make a library of a billion nodes from a hundred bytes of source; the parser counts each use. A value read once can be placed many times (`[...for i in data.items: data.items]`), so placed values count at each place. Checked values count their nodes as steps, so passing a large list to a function in a loop costs its size at each call.

Errors are reported where each stage reports errors: the parser's and the decoder's rejections, the registry's rejection, the errors of an expansion, and the errors of a firing. The A2UI integration reports the errors of an expansion to the host, with the component's id (`a2ui_integration`, requirement 7); it does not forward them to the agent.

Left out of this feature:

- Limits of building blocks (the length of a text, of a list, the number of images, the rate of events): they belong with the building blocks that a host provides.
- Estimating the cost of an expansion when a template loads: it depends on the data, so the load-time checks are those that are exact (requirements 2 to 5), and the cost is counted while expanding.
- Encoders write what the host gives them; they take no limits.
- Forwarding errors to the agent, and publishing the JSON form of the limits in a catalog: the host decides where they go.
- How the A2UI renderer itself (`a2ui_core`) parses and stores deep data-model JSON before a template sees it: that is upstream of the engine.

---

## **Links**

- Text format and the canonical form: [text_format](text_format.blueprint.md).
- Binary format and its errors: [binary_format](binary_format.blueprint.md).
- Values and evaluation errors: [functions](functions.blueprint.md).
- Expansion, errors and firing: [runtime](runtime.blueprint.md).
- Module blueprint (the Limits layer): [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `craft/conformance/limits.yaml`; the YAML header documents the format. Every case sets small limits explicitly, and each case beyond a limit has a control within it, mostly exactly at the limit. An engine MUST pass every case:

- **Limits**: `default_limits`; `hosts_set_each_limit` (with rejected JSON forms).
- **Library measures**: `depth_of_each_node_kind`; `depth_of_loops`; `nodes_of_a_declaration`; `string_values`; `declarations_of_a_library`.
- **Text sources**: `source_size`; `source_declarations`; `source_depth`; `source_depth_of_conditional_elements`; `source_depth_of_a_conditional_element_itself`; `source_depth_of_call_arguments`; `source_let_bindings`; `source_let_nodes`; `source_nodes_of_a_data_file`; `source_strings`.
- **Binary blobs**: `blob_size`; `blob_depth`; `blob_nodes`; `blob_strings`; `blob_declarations`; `blob_initial_state`; `blob_nodes_per_declaration`; `blob_nodes_beyond`.
- **Registration**: `parsed_libraries_register` (the library measures cases also run through registration).
- **Values**: `values_read_are_checked`; `strings_read_are_checked`; `function_results_strings`; `function_results_depth`; `host_input_beyond_the_limits` and `a_builder_argument_beyond_the_limits` (requirement 8) and `event_arguments_beyond_the_limits` (requirement 9) cover host input.
- **Evaluation depth**: `evaluation_depth`; `depth_of_primitive_arguments` with its control; `depth_of_template_calls`; `arguments_are_evaluated_where_read` with its control; `placed_values_are_not_evaluated`; `depth_of_builder_outputs` with its control; `depth_of_loops_in_an_expansion` with its control; `a_failing_template_keeps_its_instance`.
- **Expansion budget**: `steps_of_an_expansion` with `steps_of_an_expansion_beyond`; `checked_values_are_steps`; `an_argument_is_evaluated_once` with `an_argument_is_evaluated_once_beyond`; `nodes_of_an_expansion`; `shared_values_count_at_each_place` with `shared_values_count_at_each_place_beyond`; `each_builder_output_has_its_own_budget`; `a_stopped_expansion_keeps_the_state`; `host_input_beyond_the_limits`; `a_builder_argument_beyond_the_limits`.
- **Firing**: `event_arguments_beyond_the_limits`; `setters_beyond_the_limits`.

The engine's unit tests additionally cover, at the default limits, inputs that used to overflow the stack: a source and a data file nesting 10,000 lists, a 90 KB blob nesting 10,000 lists, a deeply nested expression and value in the evaluator, a deeply nested library built without the parser, a chain of 900 templates and deeply nested host data, a setter that nests the state deeper at each firing, a string that doubles at each firing, `let` bindings that would multiply a source exponentially and nested loops over host data. The A2UI integration's unit tests cover a resolved prop 100,000 deep and one exactly 100 deep as an entry of the arguments, which stop the expansion, with a control just within the limit. The unit tests also cover this engine's ceiling on `maxDepth`, UTF-8 lengths, the registry left unchanged by a rejected library, and a builder output that stops while evaluating a template argument, which a later output then reads.

---

## **Implementation Steps**

1. Define the limits, their defaults and JSON form, and the library measures.
2. Count depth, nodes and string lengths in the parser, the decoders and the registry.
3. Check host values and function results.
4. Count the depth of evaluation in the evaluator and the runtime, and the steps and nodes of each expansion; stop an expansion that runs out, dropping no state.
5. Check event arguments and the state a setter gives.
6. Run the conformance cases.
