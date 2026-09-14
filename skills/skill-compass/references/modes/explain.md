# Explain

This is the one mode where full detail is expected - the user asked for it.

An explanation helps the user decide; it is not a substitute for the skill. If they want to use it, the skill itself is loaded and followed in full.

## A specific skill ("what does X do?")

Get its details (`--skill <name>`, or read its `SKILL.md`). Answer with:
- **What it does** - in plain words, from its description and body.
- **When to use it** - concrete situations.
- **When not to** - and which installed skill fits better in that case, if any.
- **How it starts** - automatically when relevant, or manual only (the user has to call it).
- Where it is installed, and whether this agent can load it, if that is not obvious.

## A skill the user half-remembers ("that skill that... what was it called?")

Match their description on meaning, not keywords. Give the best match with a one-line explanation, and a close second if there is one. Do not list everything.

## skill-compass itself ("what does this skill do?")

Explain briefly what it can do, with an example question for each:
- List and summarise installed skills - "what skills do I have?"
- Explain one skill - "what does grilling do?"
- Recommend which installed skills to use for a task, in order - "which skills for a REST API with JWT?"
- Say when nothing installed fits and hand off to find-skills - "do I have anything for OAuth?"
- Spot overlaps, including before installing something new - "do I need all these frontend skills?"
- Health-check installs - "are my skills OK?"

Mention that the user can start it by name when the agent does not pick it up on its own (e.g. `/skill-compass` in agents with slash commands).
