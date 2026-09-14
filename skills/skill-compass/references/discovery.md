# Discovering installed skills

`scripts/inventory.mjs` implements everything below. If it ran, you do not need to scan by hand - use this file to interpret its output. Read it fully when the script is unavailable and you have to scan the filesystem yourself.

## Where to look

Check **all** of these that exist, not only the ones for the agent you are running in - users often have skills installed for several agents, and a skill in another agent's folder is exactly what they forget about. These are common conventions, not guarantees; skip directories that do not exist without reporting them as errors.

| Agent | Project directory | User (global) directory |
|---|---|---|
| Shared convention | `.agents/skills/` | `~/.agents/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `.agents/skills/` | `~/.codex/skills/` |
| Cursor | `.agents/skills/`, `.cursor/skills/` | `~/.cursor/skills/` |
| OpenCode | `.agents/skills/`, `.opencode/skills/` | `~/.config/opencode/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |

Project directories are relative to the current working directory. On Windows, `~` is the user profile folder (e.g. `C:\Users\<name>`).

A skill is a directory containing `SKILL.md`. Look one or two levels deep (`<dir>/*/SKILL.md`, `<dir>/*/*/SKILL.md`). Also note entries in these directories that are *not* skill directories (plain files, empty folders) - they are usually broken installs; see `modes/health-check.md`.

If the user has shell access and agrees, `npx skills list` lists skills installed through the skills CLI. Ask first - it downloads and runs a package.

## Visible to this agent?

A skill on disk is not necessarily one the current agent loads.
- Listed in your context → visible.
- Manual-only (see below) → usually not in your context but still usable by the user; say "manual only".
- On disk, not manual-only, not in your context, and in a directory that belongs to a different agent → say "installed for <other agent> - this agent may not load it". Do not claim certainty; agent loading rules vary.

## Parsing a SKILL.md

- Read only the **first** YAML frontmatter block at the very top (between the first two `---` lines). Skills sometimes contain example frontmatter further down; those are not separate skills.
- `name` and `description` are what you need. If `name` is missing, use the directory name (and note it in a health check).
- For a List, frontmatter is enough. Read the body when explaining a skill in depth, judging redundancy, checking for wrappers, or running a health check.

## Normal things that look odd

- **Manual-only skills.** Fields like `disable-model-invocation: true` mean the agent will not pick the skill on its own; the user must start it.
- **Wrapper / alias skills.** A body that does little more than run another skill (e.g. "Call the Skill tool with grilling") is a shortcut. Show it under the skill it wraps.
- **Same skill in several places.** Same name and same content in multiple directories is usually a multi-agent install or symlink - list it once, mention the locations only if relevant.
- **Unknown frontmatter fields.** Agents add their own. Ignore ones you do not recognise.
