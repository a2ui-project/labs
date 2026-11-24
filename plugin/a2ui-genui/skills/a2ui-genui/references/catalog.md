# The catalog

The catalog is the list of components that the model can use: the basic
catalog of the SDK plus an app catalog with the app's own components.
Without the app catalog, the surfaces do not look or act like the app.

Read `https://a2ui.org/guides/defining-a-catalog.md` and the section on
custom components in the installed renderer README. The Catalog heading of
the stack file gives the SDK calls.

## Choose the components

Take 2 or 3 components, with each one that an `expected_surface` names and
the basic catalog does not have. Choose the others by these rules:

- It shows the app's data: a row, a card, a badge, a summary, a chart.
- It already exists in the app, and the app's screens use it. Wrap it. Do
  not write a new one. If the app's widget is private to its screen or
  needs the screen's state, write a small component that reuses its styles
  and helpers, and say so in your last message.
- Its inputs are plain values: text, numbers, booleans, a few named
  choices, or lists of these. A component that needs an app object, a
  callback or global state needs a wrapper that builds these from plain
  values. If that wrapper is large, choose another component.
- It does not fetch data, navigate or write by itself. Data comes from the
  surface's data model. User actions go through an action.
- It renders in each container of the blueprint's placements.

Do not wrap layout primitives, buttons, text or inputs that the basic
catalog has. The model knows the basic ones better.

## Names and properties

- Name each component with an app noun in PascalCase, such as `EntryCard`.
  The name must not be the name of a basic component. The model reads
  the name, so it must say what the component shows.
- Give each property a short name that the app's users understand.
- Declare each property that can show data from the data model as a
  dynamic type, so the model can bind it to a data path. A static property
  takes only a literal value. If a stack has a declaration that the prompt
  shows as static by mistake, its Traps heading names it.
- A property that shows a field of a read tool gets the type of that
  field. A list in the tool's result is a dynamic string list, not a
  string. On a wrong type, a live turn fails validation. Each error turn
  after it uses a request.
- Give that property the name of the field. Say in its description that it
  takes the field's value unchanged. If the surface does not need that
  text, leave the property out.
- Use an enum for a property with a few named choices.
- Give each property a description. The agent SDK puts the schema in the
  model's prompt. A property of a shared dynamic type can have its own
  description next to the reference to that type.
- Do not give a component an optional property of the action type, by
  any name. The prompt of the agent SDK tells the model that a parameter
  named `action`, or marked as an action in the signature, is required. The
  model then adds a placeholder event. If the component needs an action,
  make the property required, and say in the instructions which event to
  use. Else leave it out, and put a basic button beside the component. The
  Traps heading of the stack file says how its prompt marks the property.
- Mark a property required only if the component cannot render without it.

Check the result in the system prompt: the core test of
`references/flows.md` asserts that it names each app component. Before the
first recording, compare each property type in the prompt with its field in
the read tool's result.
