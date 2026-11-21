---
feature_name: media_context
module_blueprints:
  - craft_engine
dependencies:
  - text_format
  - functions
  - runtime
date_added: 2026-11-21
---

# **Media Context Feature Blueprint**

This document specifies the media context: what a host tells templates about the surface they render on, so that one template adapts to a phone, a tablet or a desktop. A template reads it with media references (`media.width`, see `text_format`) and branches on it like on any other value, for example `switch media.width { "compact": ..., default: ... }`, or with the standard function `atLeast`.

The media context holds **classes, never pixels**: a width class, a height class, an orientation, the platform and the user's motion preference. Pixel sizes would differ between engines and devices (pixel ratios, zoom) and invite breakpoints chosen per template; classes are the same everywhere, and each one covers a range of sizes. The host measures, the engine quantizes with fixed breakpoints, and the agent is not involved.

---

## **Requirements**

### **1. Media properties**

A **media context** has these properties:

| Property        | Values                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `width`         | the width class: `compact`, `medium`, `expanded`, `large` or `extraLarge` (requirement 2)                                                            |
| `height`        | the height class: `compact`, `medium` or `expanded` (requirement 2)                                                                                  |
| `orientation`   | `portrait` or `landscape`                                                                                                                            |
| `platform`      | `android`, `fuchsia`, `ios`, `linux`, `macos`, `web` (in a browser, whatever its operating system) or `windows`; or none, when the host does not say |
| `reducedMotion` | a boolean: whether the user asked the platform to reduce motion                                                                                      |

- A host MUST be able to make a media context from these properties, `platform` being none and `reducedMotion` false when the host does not give them, and from a size (requirement 2).
- The **media map** of a media context MUST be the map from each property's name to its value: the classes, the orientation and the platform as the strings of the table, `reducedMotion` as a boolean. It MUST have no `platform` entry when the platform is none, and no other entries. An engine MUST be able to give the media map of a media context.
- Two media contexts MUST be equal when their media maps are equal, whichever way the host made them.

### **2. Size classes**

A host MUST be able to make a media context from a width `w` and a height `h` in logical pixels (the units of the host's layout, not physical pixels), each a number of at least zero, infinity included, with a platform and a motion preference as in requirement 1. Its classes and orientation MUST be:

| `width`      | when            | `height`   | when          |
| ------------ | --------------- | ---------- | ------------- |
| `compact`    | w < 600         | `compact`  | h < 480       |
| `medium`     | 600 ≤ w < 840   | `medium`   | 480 ≤ h < 900 |
| `expanded`   | 840 ≤ w < 1200  | `expanded` | 900 ≤ h       |
| `large`      | 1200 ≤ w < 1600 |            |               |
| `extraLarge` | 1600 ≤ w        |            |               |

- The orientation MUST be `landscape` when w > h, and `portrait` otherwise (so a square is portrait).
- A width or height that is negative or NaN MUST be rejected as a host error. Negative zero is zero, not negative: it is accepted, and gives the class of zero.

### **3. Media references**

- A media reference `media.p1.p2...` MUST read the media map of the media context that the evaluation is given, part by part, as `functions` (requirement 1) reads supplied values: absent for a key the map does not have (an unknown property such as `media.pixelWidth`, or `media.platform` when the platform is none), for an integer part, and for any part after a property, whose value is a string or a boolean.
- Without a media context, every media reference MUST be absent.
- This holds wherever values are evaluated: the evaluator of `functions` evaluates media references with the media context it is given along with the args, data and state values, and the runtime with its own media context (requirement 5). A media reference is a value, so it may stand wherever a value may: a switch input, a function argument, a primitive's or template's argument.

### **4. Comparing size classes**

- `atLeast(a, b)` (parameters `a` and `b`, both `string`) is a standard function: registered under its bare name, so called as `atLeast` or `core::atLeast` from any library, listed by `hasFunction` (`template_registry`), and classified like any other call (a visible widget of the same name wins, `functions`, requirement 3).
- It MUST give `true` when `a` and `b` are both size class names and `a` comes at or after `b` in the order `compact` < `medium` < `expanded` < `large` < `extraLarge`, `false` when both are names and `a` comes before `b`, and absent otherwise: when an argument is absent, is not a string, or is a string that is none of the five names (names are case-sensitive).
- The height classes are the first three names in the same order, so `atLeast(a: media.height, b: "medium")` compares height classes. The names alone do not tell a height class from a width class, so a height class compared with `large` or `extraLarge` is below it, by design: `atLeast(a: "expanded", b: "large")` is `false` whichever axis `"expanded"` came from.

### **5. Media changes**

These requirements extend the runtime (`runtime`):

- A runtime MUST have a media context, none unless the host gives one. The host MUST be able to give one when it creates the runtime, and to replace it, also with none.
- Every expansion, of the root or of a builder's output, MUST read the media context that the runtime has when the expansion is made.
- Replacing the media context with one that is not equal to it (requirement 1; none is equal only to none) MUST notify the host that an expansion may have changed (`runtime`, requirement 13), unless the host asks to replace it without notifying (as a framework adapter does when it measures the surface while a frame is built, notifying the other listeners after that frame with the runtime's notification of requirement 13). Replacing it with an equal one MUST NOT notify.
- Replacing the media context MUST keep the arguments, the data and the state of the stateful instances (`runtime`, requirement 10). An instance that the next expansion no longer has is dropped as after any other expansion, so a template that a media change takes out of the expansion starts from its initial state when a later change brings it back.

---

## **Detailed Description of Changes**

```craft
import core;

widget MailList = Column(children: [...for m in data.mails: Text(text: m.subject)]);
widget MailView = Text(text: data.open.body);

widget Inbox = switch atLeast(a: media.width, b: "expanded") {
  true: Row(children: [MailList(), MailView()]),
  default: Column(children: [
    MailList(),
    ...if equals(a: media.platform, b: "ios"): Text(text: "Swipe left to archive"),
  ]),
};
```

On a phone in portrait (`compact`), `Inbox` is one column, with a hint on iOS; on a tablet in landscape (`expanded`) or wider, two panes. When the surface is resized across 840 logical pixels, the host gives the runtime a new media context; the runtime notifies, and the next expansion has the other layout. A template must not assume a media context: without one, `media.width` is absent, `atLeast` gives absent and the switch takes its default.

The width breakpoints are those of Material 3's window size classes, and the height breakpoints those of Android's window size classes; here they apply to the space that the host measures for the surface, which need not be the whole window. A host that renders into a part of the screen (a pane, a card in a list) can measure that part, so that a template adapts to the space it actually gets.

Compared with the prototype:

- The prototype supplied the media context only when the host built a surface with one; here it is part of the runtime, and the conformance cases observe it through the evaluator and through expansions.
- The form factor (phone, tablet, TV and so on), hardware capabilities, the rendering engine and the text scale are not part of the media context. The form factor cannot be measured, so it would be a guess; capabilities are what introspection (`template_registry`) answers; templates must not depend on the rendering engine; and the text scale is a continuous value that the building blocks apply themselves.
- `atLeast` decoded an unknown name as `compact`, so `atLeast(a: "huge", b: "compact")` was true; here it is absent.

---

## **Links**

- Media references in the text format: [text_format](text_format.blueprint.md).
- Values, standard functions and the evaluator: [functions](functions.blueprint.md).
- Expansion, state and notifications: [runtime](runtime.blueprint.md).
- `hasFunction`: [template_registry](template_registry.blueprint.md).
- Material 3 window size classes: <https://m3.material.io/foundations/layout/applying-layout/window-size-classes>.
- Android window size classes: <https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes>.
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `craft/conformance/media_context.yaml`. A case gives a media context by its properties or by a size, or none, and then either checks the media maps of a list of sizes, evaluates an expression with the evaluator of `functions` and that media context, or expands a root with a runtime as `runtime.yaml` does, with steps that replace the media context and check whether the runtime notified. The YAML header documents the format. An engine MUST pass every case:

- **Media properties**: a map with every property; the defaults of `platform` and `reducedMotion`; every platform name.
- **Size classes**: widths on both sides of each breakpoint, zero and infinity; heights on both sides of each breakpoint and infinity; orientation of a square, an infinite square and sizes just off square; a platform and a motion preference with a size; negative, negative infinite and NaN widths and heights refused; negative zero accepted as zero.
- **Media references**: every property; unknown properties, another spelling, an integer part and parts after a property; no platform; no media context; media references as function arguments; a switch on `media.width` in the runtime, with an unlisted class and no media context; media references in primitive arguments, a template's root and a template's argument.
- **Comparing size classes**: ordered pairs, equal names and both directions; unknown and differently spelled names, an orientation, a height class against `large` and `extraLarge`, an empty string, a number, a boolean and absent arguments; `media.width` and `media.height` compared, and an orientation; no media context; `core::atLeast` and `hasFunction`; a library that does not import core; an unknown argument name; a visible widget named `atLeast`, with `core::atLeast` as the control.
- **Media changes**: equal media contexts given as properties and as sizes do not notify, and different classes, motion preference, platform and none do; state, arguments and data kept; a template taken out by a media change and brought back starts again; a builder's output expanded after a change.

The engine's unit tests additionally cover what the YAML cannot express: the exact sets of class, orientation and platform names, equality of media contexts, a media map changed by its reader, a media reference with no parts (which only the library model and the binary format hold), and the runtime's media context as a host API, including notifications, a replacement without notification and expansions made before a change.

---

## **Implementation Steps**

1. Define the media context, its media map and the size classes of a size.
2. Evaluate media references in the evaluator and the runtime.
3. Add `atLeast` to the standard functions.
4. Give the runtime a media context that notifies when it changes.
5. Run the conformance cases.
