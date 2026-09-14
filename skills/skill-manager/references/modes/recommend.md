# Recommend

Pick installed skills that genuinely help with the task, ordered by when the user would use them. Separate essentials from optional extras. Each line states the skill's role in *this* task. Three well-chosen skills beat seven loosely related ones.

The summaries from `--summary` are usually enough to choose. Read a candidate's `SKILL.md` only when two skills look equally fitting and you need to tell them apart.

```
🎯 Recommended, in order:
1. backend-development → API structure and the auth flow
2. code-review → review before merging

Optional:
- grilling → challenge the design before you start

⚠️ Missing: nothing you have specialises in <topic>.
Want me to search for one?
```

Once the user picks a skill, step aside: it starts the normal way (the agent loads it, or the user calls it by name, e.g. `/code-review`) and runs exactly as written. Do not carry out a shortened version of it yourself.

Prefer skills this agent can load. If the best fit is installed only for another agent, say so rather than recommending it as if it works here.

## When something is missing

Say so plainly, show what covers it partially, and ask whether to search. If the user agrees:
- `find-skills` installed and loadable here → hand over to it with a concrete search term (e.g. "oauth google").
- Installed only for another agent → say where it is and that this agent may not load it; show `npx skills find <term>` as the direct route.
- Not installed → show `npx skills find <term>`, and that find-skills itself can be added with `npx skills add vercel-labs/skills --skill find-skills`.

Remind the user the agent can still help without a specialised skill.
