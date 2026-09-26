---
name: vault-cleanup
description: Vault-wide tidying pass that finds duplicated facts, oversized pages, and stray files, then splits and reorganises them into properly headed notes. Use when the user types /cleanup or asks to clean up, de-duplicate, reorganise, or restructure the vault or a folder of it.
license: MIT
metadata:
  vault: pf2e-kingmaker
  version: "1.0.0"
---

# Vault cleanup: duplicates, oversized pages, headings, strays

A retroactive pass over pages that already exist. It is the writing rules of `AGENTS.md` §4 applied
to the backlog, plus a division of labour: every fact has exactly one home, and pages that have
outgrown their own subject get a subnote.

A new section that outgrows its page is split while it is written, not here (`AGENTS.md` §4.4). This
pass is for the backlog the user asks you to sweep.

## Scope and safety

- **Only the marked notes.** Anything without `agent-editable: true` is off-limits — report it, do
  not touch it. Read `AGENTS.md` §3 first; the marker is the rule, not the folder.
- **State the plan before you cut.** Give the user the list of merges, splits, and renames you
  intend, and wait for a go-ahead before the first destructive move. A split that renames headings
  is easy to undo; a delete is not.
- **Never invent canon.** Reorganising moves text. It does not merge two facts into a new one, and
  it never drops a fact, name, number, date, or quote that was on the page.
- **Verification, guard, and commit etiquette** are `AGENTS.md` §5.2 and §6. Run the guard before
  you finish. Leave the work uncommitted unless the user asks for a commit.

## Pass 1 — Duplicates

1. Inventory the editable notes by their key nouns (names, factions, places, ranks) with targeted
   `rg` searches, not by reading every file in full.
2. For each fact that appears on more than one page, decide its **owner**: the note whose subject
   *is* that fact. The owner keeps the full account.
3. Every other page keeps a short description and a wikilink. Nothing else — no copied paragraphs,
   no "as mentioned above" restatements.
4. Do the same check *inside* a page: `### Quick Facts` entries and the body must not say the same
   thing twice. Quick Facts holds the fact; the body holds the explanation.

## Pass 2 — A page that outgrew its subject

The trigger and the mechanics are the authoring rule in `AGENTS.md` §4.4. This pass applies it across
the backlog: split when a section, not a page, has become the real subject — a rank ladder, a roster,
a family of spirits, a whole institution under one hub page.

1. **Inventory the offenders.** A section that carries its own `###` pieces or its own table of
   entries, or that dominates its page, is a candidate. Measure rather than guess.
2. **Check first that the material is not already somewhere else.** Search the vault for the
   section's key terms before creating anything; if the dedicated note already exists, the work is
   a merge into it, not a new note.
3. **Create and move per §4.4** — the subnote in the parent page's folder (the pattern in
   `Spirits/Apparitions/<Family>/`), `agent-editable: true` as the first key, the detail moved onto
   it, and a short summary plus a heading link left on the parent. Link wiki-fandom style, the
   heading itself carrying the link (`### [[Note Name]]`), never a "(see [[Note]])" pointer.

## Pass 3 — Headings

A heading is an index label a reader scans. Rewrite the ones that fail these tests.

- **Noun phrase, not a sentence.** `Appearance`, `The Star Seals`, `Concealment & Bearer Awareness`,
  `Funding & Resource Allocation`. Never a question and never a sentence about the subject.
- **Anti-pattern:** `How a Verse Is Cast`, `How Binding Works`, `The Way He Names Spirits` — spoken
  phrasing, "How to …", or a heading that only makes sense once you have read the section below it.
  Rewrite to the thing itself: `Casting a Verse`, `Binding`, `The Names He Gives`.
- **Vault capitalisation, not sentence case.** Headings are Title Case throughout (`The Liturgical
  Cadence`, `House Notes`). Match the notes around it.
- **No repeated heading.** The first sentence under a heading does not restate the heading.
- **Grouped, not scattered.** Prefer a few `##` groups with `###` pieces inside over a long run of
  short `##` sections. A table carries material that compares (ranks, spells, tiers, rosters).
- Blank line around every heading, table, and list.

### Humanizer precedence (this trips the vault up)

The `humanizer` skill is for running prose. Its style patterns must not be applied to the vault's
structure, or pages stop looking like their neighbours:

- Humanizer §17 (title case in headings) **does not apply** — this vault's headings are Title Case.
- Humanizer §16 (lists with bold mini-headings) and §15 (too much bold) **do not apply** to
  `### Quick Facts` entries, template labels, or the vault's `**[[Name]] — Role:**` label style.
- Humanizer §14 (dashes) applies to running prose only; the structured em-dash spots in
  `AGENTS.md` §6 stay.
- Everything else in humanizer — AI tells, sales language, triads, passive voice, filler — applies
  to every prose change as usual.

## Pass 4 — Strays

- Images: every vault image lives in `content/Attachments/`. Loose images anywhere else in the vault
  get moved there (never overwrite or delete an image that is already in place). Framework assets
  under `docs/` and `quartz/` stay where they are.
- Notes outside `content/`: report them to the user rather than moving them. The vault publishes
  `content/` only, so a note parked at the repo root may be deliberate.
- Scratch files (test pages, drafts, `_wip` notes) that you created: delete them, they are not
  canon.

## Pass 5 — Verify

- Every new or moved note carries `agent-editable: true` and valid YAML frontmatter.
- Every wikilink resolves; no link points at a heading you renamed or a page you moved.
- Run the edit guard (`AGENTS.md` §5.2 step 6) and fix anything it flags.
- Report: what was merged, what was split, what was renamed, what you left alone and why. Keep it
  short — a list of pages and one line each.
