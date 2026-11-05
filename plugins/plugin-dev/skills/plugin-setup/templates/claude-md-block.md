<!-- BEGIN:plugin-dev -->
## Plugin development

Managed by `/plugin-setup`; re-run it to refresh this section instead of editing it here.

### Where things live

{{LAYOUT}}

- Each manifest is `<plugin>/.claude-plugin/plugin.json`. `skills/`, `agents/`, `hooks/` and every
  other component sit at the plugin root, never inside `.claude-plugin/`.
- A new **plugin** is registered in `.claude-plugin/marketplace.json`. A new skill or agent inside
  an existing plugin is not.
- {{AGENTS_LINE}}
- Every manifest opens with `$schema`: `https://www.schemastore.org/claude-code-plugin-manifest.json`
  for a plugin, `https://www.schemastore.org/claude-code-marketplace.json` for the marketplace.

### After every change to a plugin

Do these in the same change, without being asked. A change is unfinished until they are done.

1. **Bump the version.** {{VERSIONING}}
2. **Update the docs that list capabilities by hand:** {{DOCS}}.
3. **Run {{AUDIT}}** and fix what it reports before committing. It checks manifests,
   docs and frontmatter against what is on disk.
{{BUMP_CHECK}}

### Releasing

{{TAGS}}

### What runs on its own

Nothing in the background. The steps above happen because this file asks for them; CI, if
`.github/workflows/plugin-checks.yml` exists, fails a pull request with drift or a missing bump.
<!-- END:plugin-dev -->
