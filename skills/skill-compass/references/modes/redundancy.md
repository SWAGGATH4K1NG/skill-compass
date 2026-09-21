# Redundancy

Compare skills by what they actually do. Start from the summaries and the `similarTo` field; read the `SKILL.md` bodies of the skills that look alike, since descriptions are often too vague to tell them apart.

`similarTo` is a word-overlap heuristic, not a verdict. It misses pairs that describe the same job in different words (e.g. "diagnose" vs "debug"), and it flags pairs that share vocabulary but do different jobs (a skill finder vs a skill inventory). Use it to decide what to read, then judge from the bodies.

Classify each overlapping group:
- **Duplicate** - same job, same kind of help.
- **Partial overlap** - share ground; say what is unique to each.
- **Complementary** - same area, different purpose (teaching vs doing, designing vs reviewing). Not redundant.

Give a clear opinion per skill - **keep** or **worth reviewing** - with the reason, and note the cost of near-duplicates: more context used, and the agent may pick the weaker one. The decision to remove is the user's; do not tell them to delete skills or offer to do it.

Shortcuts (a skill that only runs another) and the same skill installed for several agents are not duplicates - do not flag them.

## "Should I install X?"

Compare X with the inventory and say whether it adds something new or overlaps with a skill the user already has. If you do not know what X does, ask for its description or link rather than guessing.
