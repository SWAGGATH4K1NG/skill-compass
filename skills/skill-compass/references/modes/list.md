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
- **More than 20 skills:** show each group with its count and at most 3 example names, not every skill (e.g. `Frontend (5) - frontend-ui-engineering, design-taste-frontend, ...`). End with one line offering to expand a group. A full list of 40+ lines is exactly the long answer this skill should avoid; the user can ask for "all of them" if they want it.
- Plugin skills (`origin: "plugin"`) can form their own group named after the plugin; synced skills (`origin: "synced"`) belong in their normal area groups.
- If the user then asks about a specific skill, switch to Explain.
