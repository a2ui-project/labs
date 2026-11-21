---
name: craft_engine
type: module
description: The Craft engine, which loads templates written in the Craft language and expands them into native building blocks inside an A2UI renderer.
---

# Craft Engine Specification

Craft is a client-side template system for A2UI. A developer writes reusable UI components ahead of time in the Craft language. At runtime an agent uses a template like any other catalog component, with regular A2UI messages, and the app renders it natively.

The engine is the part that every host embeds. It is written for someone implementing or reviewing the engine; the building blocks that templates draw with are specified separately.

---

## 1. Principles

- **Templates are data, not code.** A template can compose building blocks, bind data, keep local state and emit events. It cannot run arbitrary code, loop without bound or call anything the host didn't register.
- **Templates are untrusted by default.** The engine validates a template when it loads it and runs every expansion under limits.
- **The agent never sees building blocks.** An agent sees a template as one catalog component with a JSON schema. The building blocks are visible only to templates.
- **One source, every target.** A template means the same thing on every engine. The behavior of each feature is pinned down by shared conformance cases in `craft/conformance/`.

## 2. Layers

| Layer               | Input                                   | Output                                                                                                     | Feature blueprint     |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------- |
| Text format         | `.craft` source                         | a library (the AST)                                                                                        | `text_format`         |
| Binary format       | binary blob                             | the same library                                                                                           | `binary_format`       |
| Libraries and names | libraries and their imports             | every name resolved to one declaration                                                                     | `libraries_and_names` |
| Language extensions | `.craft` source                         | conditional elements, local values, absent values and handler calls, as existing node kinds                | `language_extensions` |
| Functions           | calls in templates                      | values from host-registered pure functions                                                                 | `functions`           |
| Template registry   | registered libraries and host functions | introspection answers, and the components offered to the agent, gated on their dependencies                | `template_registry`   |
| Runtime             | a template, its arguments and data      | a framework-independent tree of primitive calls, local state, events                                       | `runtime`             |
| A2UI integration    | A2UI messages                           | templates rendered as catalog components of an A2UI renderer, with JSON schemas derived from the templates | `a2ui_integration`    |
| Media context       | the host's surface                      | values that templates can branch on (size class, surface kind)                                             | `media_context`       |
| Limits              | a template and its expansion            | rejection at load time, or a bounded placeholder                                                           | `limits`              |

A host can use the text format during development and ship the binary format.

## 3. Libraries

A **library** is the unit the formats encode. It has a list of imports and a list of widget declarations. A declaration has a name, an optional initial state and a root value. Values are literals (booleans, integers, doubles, strings, lists, maps), calls to other widgets, references (to arguments, data, state, loop variables, builder arguments, the theme, the media context or a host symbol's metadata), loops, switches, event handlers and state setters.

The engine started as a fork of [Remote Flutter Widgets](https://pub.dev/packages/rfw) (RFW) 2.0.0, which is kept unmodified in `craft/third_party/rfw/`. Where a feature blueprint says "as in RFW", RFW's documented behavior is the specification.

## 4. Conformance

Each feature blueprint lists its conformance cases. The cases are YAML files in `craft/conformance/<feature>.yaml`, written against the canonical JSON form of a library (see `text_format`) or against the observable output of an expansion, so that any engine can run them. An engine passes a feature when it passes every case in the feature's file.
