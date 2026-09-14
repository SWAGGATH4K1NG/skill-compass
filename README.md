# skill-compass

Platform-agnostic [Agent Skills](https://agentskills.io) that keep your skill collection legible as it grows.

I built this because I kept losing track of my own skills. Install enough of them and you stop remembering what you have, what each one does, or which one actually fits the task in front of you. `skill-compass` answers those questions instead of making you guess or dig through folders by hand.

> Work in progress. The first skill is `skill-compass`, more are planned.

## Why this exists

Skills solve a real problem: reusable, shareable discipline for an agent. But they create a new one once you have more than a handful. You can no longer hold your own collection in your head.

- You forget a skill exists, so the agent falls back to guessing instead of using it.
- You forget what a skill actually does, so you second-guess whether it's the right one.
- Skills pile up with overlap (three frontend skills doing roughly the same thing) and nothing points it out.
- Installs break quietly: broken symlinks, missing frontmatter, a skill installed for the wrong agent. Nothing tells you until the agent fails to use it.

`skill-compass` answers all of this directly, on demand, so you don't have to audit your own `.claude/skills` folder by hand.

## Skills

| Skill | What it does |
|---|---|
| [`skill-compass`](skills/skill-compass) | Your skills inventory: lists what you have and what each skill does, recommends which of your skills to use for a task, tells you when you are missing one, spots redundant skills, and health-checks broken or invisible installs. |

## skill-compass

Ask it things like:

- "What skills do I have?"
- "What does `grilling` do?"
- "Which of my skills should I use to build a REST API with JWT?"
- "Do I have anything for OAuth?" (and hands off to `find-skills` if not)
- "Do I need all these frontend skills?" / "Should I install X?"
- "Are my skills installed correctly?"

Answers are short by default, one line per skill. Ask about a specific skill to get the full explanation.

It never installs, removes, edits, or runs anything on your behalf. It only reports on what's there.

### Install

```bash
npx skills add SWAGGATH4K1NG/skill-compass --skill skill-compass
```

Optional: Node.js 18+ lets the skill use its read-only inventory script, which is faster and cheaper. Without Node it reads the skill folders directly.

### Start it explicitly

Agents pick skills automatically when your question matches the description, but a question like "what skills do I have?" is often answered from memory instead. Starting the skill explicitly is the reliable way:

| Agent | How to start it |
|---|---|
| Claude Code | `/skill-compass what skills do I have?` |
| Codex | `$skill-compass what skills do I have?` (or pick it from `/skills`) |
| Cursor | `/skill-compass` in Agent chat |
| Windsurf | `@skill-compass` in Cascade |
| OpenCode | Mention it: `use the skill-compass skill - what skills do I have?` |
| Other agents | Mention the skill by name in your message |

Syntax changes between versions, so check your agent's docs if one of these does not work: [Codex](https://developers.openai.com/codex/skills), [Cursor](https://cursor.com/docs/skills), [Windsurf](https://docs.windsurf.com/windsurf/cascade/skills), [OpenCode](https://opencode.ai/docs/skills/).

### Make it trigger automatically

Add this to your project's `AGENTS.md` (Codex, Cursor, OpenCode, Windsurf and others) or `CLAUDE.md` (Claude Code), or to your global instructions file:

```markdown
## Skills
When I ask about my agent skills - what I have, what one does, which to use for a task,
whether one is missing or redundant, or whether they are installed correctly - use the
skill-compass skill.
```

### Use it without an agent

The inventory script works on its own in any terminal. No tokens, no agent, no writes:

```bash
node skills/skill-compass/scripts/inventory.mjs --text             # skills and problems
node skills/skill-compass/scripts/inventory.mjs --issues --text    # problems only
node skills/skill-compass/scripts/inventory.mjs --skill grilling --text
```

It scans the skill folders of Claude Code, Codex, Cursor, OpenCode, Windsurf and the shared `.agents/skills`, for both your user folder and the current project. It never writes anything.

### How is this different from…

- **[`find-skills`](https://github.com/vercel-labs/find-skills)** (vercel-labs) searches skills.sh for skills you *don't* have. `skill-compass` works on what you *already have* and hands off to `find-skills` when something is missing. Use them together: find-skills is the shop, skill-compass is the inventory.
- **[`ask-matt`](https://github.com/mattpocock/skills)** (mattpocock) routes between Matt Pocock's own skills. `skill-compass` works with skills from any source, installed by anyone.

### Test results

The prompts and fixtures used to test the skill are in [`skills/skill-compass/evals`](skills/skill-compass/evals).

## License

[MIT](LICENSE)
