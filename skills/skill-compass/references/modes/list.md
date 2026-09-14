# List

Group skills by area, inferred from what each one does - e.g. Engineering, Backend, Frontend, Design, Security, Testing, Data, Learning, Productivity, Skills/Meta, Other. Only show groups that have skills. One plain-language line per skill; never paste full descriptions here.

```
Engineering
✓ diagnosing-bugs - diagnosis loop for hard bugs and slowdowns
✓ grilling - stress-tests a plan with hard questions
  ↳ grill-me - manual shortcut that runs grilling
Database (this project only)
• prisma-cli - Prisma CLI commands reference
Learning
✓ teach - multi-session teaching in a workspace (manual only)

✓ = this agent can load it · • = installed, but not for this agent
⚠️ 2 issues found - ask me for a health check to see them.
Source: ~/.claude/skills, ~/.agents/skills, ./.claude/skills
```

- Use `✓` only for skills this agent can actually load, and a different marker (with a one-line legend) for skills installed elsewhere - otherwise the user believes a skill works here when it does not.
- Show shortcuts under the skill they run, and label manual-only skills, so they are not mistaken for duplicates.
- If the inventory found issues, mention the count in one line at the end instead of explaining them.
- If the user then asks about a specific skill, switch to Explain.
