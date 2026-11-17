# The model client

The model client is the only part of the app that knows the model. It has
one method, `generate(systemPrompt, turns)`, which yields each text chunk as
it arrives. Do not join chunks, and do not add text between them.

Read `https://a2ui.org/guides/agent-integration.md` and the sources that the
Model client heading of the stack file names, then do what it says.

## The system prompt

The session builds one system prompt for all placements, in this order: the
app's instructions, the turn rules below, then the prompt snippet of the
agent SDK. The model must get all three in the system prompt, not from a
file that it must fetch. Write the app's instructions:

- The role of the generated UI in this app, in one or two sentences.
- When to use each app component, by name.
- Each read tool, and when to call it.
- That each value from a tool goes on the surface unchanged: no summary,
  no new words, no other format. The flow test compares them.
- That a change to the app's data needs a button that the user presses: on
  a confirm surface, or as the submit button of a form.
- For each action: its event name, its button label, and a context that
  names each record by the fields that identify it for a user, such as its
  name and date, not by an id. Tests assert these.
- If a flow is `inline`, the brief of `references/placements/inline.md`.

The model name is one setting of the model client. The Model client heading
names it and its default. If the user names a model, use it.

Put these turn rules in the system prompt, word for word. They give what
the prompt snippet of the tested SDK versions leaves out. If the snippet of
the installed SDK already gives a rule, leave that one rule out:

```text
Show forms, choices, lists and cards as A2UI surfaces.

- Start each <a2ui> block with a surface line. Give each new surface a new
  id: surface("a-new-id"). For a surface with inputs, write
  surface("a-new-id", sendDataModel=true).
- Bind each input to a data path, such as $/form/name. Give a submit button
  an Event action whose context reads those paths.
- When the user acts on a surface, the next user turn is JSON whose "a2ui"
  holds the renderer's v1.0 messages, {"messages": [...]}. A message is an
  action, with its name, surfaceId and resolved context, or an error that
  the renderer met.
- Once a surface is created with sendDataModel, a user turn carries
  "metadata": {"a2uiRendererDataModel": ...}, which holds the data model of
  each such surface.
- Answer an action by updating its surface: write
  surface("its-id", update=true), then the components that change. Or show
  a new surface. Answer an error by correcting the surface that it names.
- In an update block, assign again every variable that the block references.
  To change one component, assign only its variable again.
- In an update block, assign root a component call, such as
  root = Card(body). Never write root = otherVariable.
- A data path segment holds only letters, digits and _, such as
  $/form/first_name. For records whose ids hold other characters, such as -,
  write a list, $/items = [{id: "a-1", name: "One"}], and show it with
  List(_template($/items, item)).
```

Each rule answers a trap of the Traps heading of the stack file. To see
what the snippet gives, print the system prompt once, as the Flow test
heading says.

## The request

In a conversation, the user turn is the text that the user typed. In a
`sidebar` or `home` container, the host builds the user turn, as the
Request heading of the placement file says.

## Tools

- Make one read tool for each data function that a flow reads. Call the
  app's existing function. Do not copy its logic. If the app has more than
  one function for the same value, call the one that the screen uses.
- Return the rows in the order and the format that the app's own screen
  shows. If that format depends on a user setting that only the view can
  read, use the default format, and say in your last message that the tests
  cover the default settings.
- Give each tool a name and a description that say what it returns.
- Return small results. Limit the rows, and return only the fields that a
  surface can show.
- Resolve tool calls inside `generate`. Only text leaves the model client.

## Writes belong to the host

The model gets read tools only. To write:

1. The model shows what will change, or a form, and a button whose action
   has a name that the app owns, such as `confirmArchive`, with the values
   in its context.
2. The action handler of the session gets the action, checks its context,
   and calls the app's write function. Find the record by the fields in
   the context, not by an id: a replayed fixture holds the ids of the run
   that recorded it. If they match no record, or more than one, throw, and
   write nothing. A `TextField` sends
   its value as a string, also with the variant `number` (`"12.5"`).
   Convert each value, and check it. The session calls the handler once for
   each action, in each placement, before the action goes to the model. If
   it throws, the session shows the error and does not send the action.
3. The session sends the action to the model as the next turn of the
   target that shows the surface. A standing surface has its own turn
   history, not the conversation's.

## Timeout and retry

Give each request to the model a timeout of 90 seconds, with the option that
the Model client heading names. If a request fails before the first chunk,
retry it at most two times: wait 5 seconds, then 10 seconds. After the
first chunk, never retry, because the renderer already shows that chunk.
Rethrow the last failure, and the session shows it.

The session has a reply timeout too: a reply that sends no chunk for 5
minutes ends as an error, and the target is no longer busy. Keep it longer
than the client's timeouts and waits together: 3 times 90 s, plus 15 s.

## When the model is unavailable

At step 4, ping the model once, with the model name of your model client in
place of `<model>`. `printf` is part of the shell, so the key is not on a
command line:

```bash
printf 'x-goog-api-key: %s\n' "$GEMINI_API_KEY" | curl -sS -m 30 -o /dev/null -w '%{http_code}\n' -H @- -H 'Content-Type: application/json' -d '{"contents":[{"parts":[{"text":"Say OK."}]}]}' "https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent"
```

- `200`: record, as `references/flows.md` says.
- `429` (quota), `503` (overload), `000` (timeout) or another code: the key
  exists, but the model cannot answer now. Tell the user the code. Make no
  recording attempt: it cannot succeed, and it uses quota. Do not wait and
  ping again in a loop.

Then write each fixture by hand, as `references/flows.md` says.
Name each such flow and the code in your last message, not as a live result.

## Key

The Key heading of the stack file says where the app keeps the key, and
gives the key check command. The key goes to the model client package as a
constructor option. It leaves the device only in that package's request to
the Gemini endpoint.
