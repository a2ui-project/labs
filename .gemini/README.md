# Gemini configuration

This directory (`.gemini/`) configures Google's Gemini tools for this repository:

1. [Gemini CLI](https://github.com/google-gemini/gemini-cli), the command-line interface for Gemini.
2. [Gemini Code Assist](https://cloud.google.com/products/gemini/code-assist), which reviews every pull request on GitHub.

The files are:

1. `GEMINI.md`: the context that Gemini CLI reads. It includes the [agent guide](../AGENTS.md) at the root of the repository.
2. `config.yaml`: the settings of the Gemini Code Assist review, such as the number of comments and the lowest severity it reports.
3. `settings.json`: the Gemini CLI settings, which name `GEMINI.md` as the context file.
4. `styleguide.md`: the conventions that Gemini Code Assist checks in a review.

The configuration matches the one in the [A2UI repository](https://github.com/a2ui-project/a2ui/tree/main/.gemini).
