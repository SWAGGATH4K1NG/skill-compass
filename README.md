# swagga-agent-skills

Platform-agnostic [Agent Skills](https://agentskills.io) that help you work better and learn while you do it.

> Work in progress. The first skill is `skill-manager`.

## Skills

| Skill | What it does |
|---|---|
| [`skill-manager`](skills/skill-manager) | Your skills inventory: lists what you have and what each skill does, recommends which of your skills to use for a task, tells you when you are missing one, spots redundant skills, and health-checks broken or invisible installs. |

## skill-manager

Once you have more than a handful of skills, you forget their names, what they do, and which one to reach for. `skill-manager` answers questions like:

- "What skills do I have?"
- "What does `grilling` do?"
- "Which of my skills should I use to build a REST API with JWT?"
- "Do I have anything for OAuth?" (and hands off to `find-skills` if not)
- "Do I need all these frontend skills?" / "Should I install X?"
- "Are my skills installed correctly?"

Answers are short by default - one line per skill. Ask about a specific skill to get the full explanation.

### Install

```bash
npx skills add <owner>/swagga-agent-skills --skill skill-manager
```

Optional: Node.js 18+ lets the skill use its read-only inventory script, which is faster and cheaper. Without Node it reads the skill folders directly.

### Start it explicitly

Agents pick skills automatically when your question matches the description, but a question like "what skills do I have?" is often answered from memory instead. Starting the skill explicitly is the reliable way:

| Agent | How to start it |
|---|---|
| Claude Code | `/skill-manager what skills do I have?` |
| Codex | `$skill-manager what skills do I have?` (or pick it from `/skills`) |
| Cursor | `/skill-manager` in Agent chat |
| Windsurf | `@skill-manager` in Cascade |
| OpenCode | Mention it: `use the skill-manager skill - what skills do I have?` |
| Other agents | Mention the skill by name in your message |

Syntax changes between versions - check your agent's docs if one of these does not work: [Codex](https://developers.openai.com/codex/skills), [Cursor](https://cursor.com/docs/skills), [Windsurf](https://docs.windsurf.com/windsurf/cascade/skills), [OpenCode](https://opencode.ai/docs/skills/).

### Make it trigger automatically

Add this to your project's `AGENTS.md` (Codex, Cursor, OpenCode, Windsurf and others) or `CLAUDE.md` (Claude Code), or to your global instructions file:

```markdown
## Skills
When I ask about my agent skills - what I have, what one does, which to use for a task,
whether one is missing or redundant, or whether they are installed correctly - use the
skill-manager skill.
```

### Use it without an agent

The inventory script works on its own in any terminal - no tokens, no agent:

```bash
node skills/skill-manager/scripts/inventory.mjs --text             # skills and problems
node skills/skill-manager/scripts/inventory.mjs --issues --text    # problems only
node skills/skill-manager/scripts/inventory.mjs --skill grilling --text
```

It scans the skill folders of Claude Code, Codex, Cursor, OpenCode, Windsurf and the shared `.agents/skills`, for both your user folder and the current project. It never writes anything.

### How is this different from…

- **`find-skills`** (vercel-labs) searches skills.sh for skills you *don't* have. `skill-manager` works on what you *already have* and hands off to `find-skills` when something is missing. Use them together: find-skills is the shop, skill-manager is the inventory.
- **`ask-matt`** (mattpocock) routes between Matt Pocock's own skills. `skill-manager` works with skills from any source.
