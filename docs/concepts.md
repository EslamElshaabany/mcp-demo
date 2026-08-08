# MCP concepts

The **Model Context Protocol (MCP)** is a standard way for applications to expose
context and capabilities to LLM-powered clients. Instead of every tool or data
source inventing its own API, MCP provides one protocol for discovery, calls,
and streaming.

MCP servers expose three core building blocks:

| Block | What it represents | Best for |
| --- | --- | --- |
| **Tools** | Executable actions or operations | Do something or compute something |
| **Resources** | Addressable content | Read or watch context data |
| **Prompts** | Reusable message templates | Guide the model with structured requests |

The easiest mental model:

- **Tools** are for **actions**.
- **Resources** are for **data**.
- **Prompts** are for **instructions**.

## Tools

Tools are callable operations. A client sends structured arguments, the server
runs logic, and returns a result.

Use a **tool** when the server should:

- Perform an action
- Run a calculation
- Transform input
- Fetch fresh data on demand
- Trigger workflow logic

Examples:

- `echo`
- `roll-dice`
- `long-task`

A tool is the right choice when the client is asking the server to **do**
something.

## Resources

Resources are addressable pieces of content. A client reads a URI and receives
text, JSON, files, or other data. Resources can also be template-based, so one
URI pattern can represent many items.

Use a **resource** when the server should:

- Expose context for the model to read
- Represent files, documents, settings, or records
- Provide stable content by URI
- Support discovery or subscription

Examples:

- `demo://about`
- `demo://config`
- `demo://users/{id}`
- `demo://live/stats`

A resource is the right choice when the client is asking the server to **show**
something.

## Prompts

Prompts are reusable message templates that produce one or more chat messages.
They are not data, and they are not business logic. They package a good request
for the model in a consistent way.

Use a **prompt** when the server should:

- Standardize a common LLM request
- Provide a few-shot example
- Shape wording, tone, or output format
- Reuse a known instruction pattern

Examples:

- `code-review`
- `commit-message`

A prompt is the right choice when the client is asking the server to **guide**
the model.

## Choose by intent

Ask what the client is really trying to do:

- **Do it?** → **Tool**
- **Read it?** → **Resource**
- **Ask the model well?** → **Prompt**

### Good rules of thumb

- Use a **tool** for verbs: create, run, compute, validate, toggle.
- Use a **resource** for nouns: file, config, user, record, dashboard, state.
- Use a **prompt** for reusable requests: review this code, draft this commit,
  summarize this document.

## Common confusion

### “This could be a tool or a resource.”

If the caller needs the current value, it is usually a **resource**.
If the caller needs the server to act on the value, it is usually a **tool**.

Example:

- “Give me the current config” → **resource**
- “Update the config” → **tool**

### “This could be a prompt or a tool.”

If the goal is to prepare instructions for a model, use a **prompt**.
If the goal is to perform server-side logic, use a **tool**.

Example:

- “Draft a commit message” → **prompt**
- “Create a git commit” → **tool**

## In this repo

This demo shows:

- **Tools** in `src/server/tools.ts`
- **Resources** in `src/server/resources.ts`
- **Prompts** in `src/server/prompts.ts`

For the transport and session model, see [architecture.md](./architecture.md).
