# Excel2ERP TypeScript - Development Guidelines

## Bug Fix Protocol

**All bug fixes must happen under a dedicated branch.** Never touch `main` or `editor` unless bugs are confirmed fixed and tested.

## Playwright-First Bug Replication

When the user reports a bug:

1. **Replicate exactly what was reported** - Use Playwright to automate the exact scenario described, not a random similar case. The goal is to save time by ensuring we're debugging the same issue. Take screenshots or videos via Playwright as needed to aid comprehension with visual feedback. Don't delete such screenshots/videos: they may be required by the user to ascertain and understand.

2. **Use the same fixtures** - If the user is testing with `legacy/`, use `legacy/`. If they're using `demo/`, use `demo/`. Mutual understandability requires being on the same page.

3. **Don't fixate** - If Playwright replication efforts fail after reasonable attempts, stop and ask the user. Don't stubbornly fight tooling issues.

## Revert on Failed Fixes

**When an attempted fix fails, REVERT all production code changes immediately.** This restores the same conditions under which the bug was originally detected.

- Keep the codebase in a known-buggy-but-consistent state
- Don't leave half-baked fixes that muddy the debugging waters
- Debug logging can stay in test branches, but prod code must be pristine

## Branch Naming

- `fix-<issue-description>` for bug fixes
- Merge to parent branch only when fix is confirmed working

## Bug Report Protocol

> **Note:** This guideline may be promoted to project-wide or template-level if proven useful.

### Step 1: Claude echoes understanding (MANDATORY)

When the human reports a bug, Claude **MUST** echo back a detailed understanding **BEFORE** analyzing or attempting any fix:

> "This is my understanding of the bug:
> - **Steps**: [what triggers it]
> - **Expected**: [what should happen]
> - **Actual**: [what happens instead]
> - **Why it matters**: [what task is blocked]
>
> Is this understanding complete and correct? If not, please restate more rigorously."

**Do not proceed until the human confirms.** This places the burden on the human to verify Claude's understanding is accurate.

### Step 2: Human confirms or clarifies

The human must either:
- Confirm: "Yes, that's correct"
- Clarify: Restate with the expected/actual/why structure

### Recommended bug report format (for the human)

To save a round-trip, report bugs with this structure:

1. **Steps to reproduce**: Click X, then Y, then Z
2. **Expected**: What should happen
3. **Actual**: What actually happens
4. **Why it matters**: User story - what task is blocked?

**Example:**
- **Steps**: Load config → Select SuperMaxi → Click cell D2 → Click "DocDate" button
- **Expected**: DocDate remaps to D2
- **Actual**: Button appears grayed out and doesn't respond to clicks
- **Why**: User can't correct a mistaken field mapping

This prevents ambiguity like "X is disabled" (HTML attribute? CSS styling? click not working?).

---
*This Bug Report Protocol may be promoted to the project-wide CLAUDE.md or the overarching template if proven effective.*
