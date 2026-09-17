---
name: brainstorm
description: Run a new concept as a questionnaire instead of a draft. Use when the user gives a braindump about something new or unfinished (an NPC, apparition, location, faction, chancellery, spell, spirit, project), types /brainstorm, or says they want to brainstorm something, so the agent replies with a fitted list of questions and waits for answers.
license: MIT
metadata:
  vault: pf2e-kingmaker
  version: "1.0.0"
---

# Brainstorm: braindump in, questionnaire out

A braindump is a starting point, not a brief. When the user drops an idea, your job is to find out
what they mean before a single line of canon is written.

## The one rule

**Reply with questions, not a draft.** No note, no section, no "here's a first version, tell me what
to change". Questions first, every time the concept is new or an existing page is being extended.

## Steps

1. **Read the matching template first.** Pick the closest note in `content/Templates/` (Character,
   Faction, Location, Chancellery, God, Noble house, Spirit, Spell, Session Note) and read it to see
   which fields the finished page expects. If none fits, say so and propose what a new template
   needs before writing anything.
2. **Reply with a questionnaire.** Write the questions yourself, in your own words. Never reuse
   [[Character building questions]] or any other list in the vault as your question bank.
3. **Wait for the answers.** Only the user's replies authorize new canon.
4. **Write the page from those answers**, then run the edit steps in `AGENTS.md` §7.2.

## How to shape the questionnaire

Organise it into subsections that fit *this* concept and *this* braindump, not a generic form. If
the braindump raises a specific relationship, give that its own section (for example "Relation to
[[Vespera]]") and put History, Appearance, Personality, Abilities, and Motivations after it.

The template is a checklist of fields the finished page expects. It is not a question bank.

Cover two kinds of ground:

- **Grounded questions** on what the user already told you: the names, dates, relationships, and
  mechanics that are still vague in their own words.
- **Baseline questions** for the concept type: the template fields they did not mention.

## Suggestions

Do not answer your own questions. When the user asks for ideas ("what would you suggest?", "give me
options"), then offer two or three short options per question, in-world and consistent with canon,
marked as suggestions to accept or reject. An unasked-for suggestion is invented canon.

## Never invent canon

Do not fill a gap with a plausible guess, a default from another note, or a detail borrowed from a
neighbouring page. Unanswered stays unanswered. Never add, drop, or alter a fact, name, number,
date, or quote the user gave you. A quote slot is a gap like any other: leave the placeholder
(`> "A memorable quote."`) for the user to write.

## Barebone stubs

When the user asks for a page on something they will work out later, build the skeleton only:
frontmatter with `agent-editable: true`, the template headings, and the facts they already gave.
Leave the rest empty. Do not pre-fill, and do not treat the gaps as a licence to guess later.

## Existing concepts

A braindump about something already written produces questions too, not edits. Extend a note only
through the user's answers to a questionnaire built the same way. If an answer contradicts existing
canon, flag the conflict instead of overwriting it (`AGENTS.md` §6).

## After the answers

One answer often settles canon that several notes depend on. Propagate it across every note it
touches before reporting back, following `AGENTS.md` §7.3, and run the edit guard (§7.2) before you
finish.

## Reporting back

Vault rules on voice, headings, page layout, and the guard are in `AGENTS.md` §6 and §7.2 — read
them there, do not restate them here. Keep your own reply to the questionnaire short: the questions,
grouped under subsections, with a one-line note on which template you matched.
