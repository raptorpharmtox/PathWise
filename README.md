# Pathway Extraction

A Claude Code skill that extracts a biological pathway — molecular initiating events (MIEs), key events (KEs), key event relationships (KERs), and adverse outcomes (AOs) — from a batch of PDF research articles, strictly grounded in what each article's own text and figures say.

It never fills gaps from general biology knowledge and never consults the AOP-Wiki database during extraction, so it can surface pathways that are new or that branch differently from what's already registered elsewhere.

## What you need before running it

- **A topic** — the specific mechanism/subject to extract (e.g. "Acetaminophen-Induced Hepatotoxicity").
- **A topic description** (optional, recommended) — 1-3 sentences narrowing the topic's scope (direction of causation, organ, exposure type). Don't describe pathway steps here — just the boundary of what counts as in-scope.
- **A folder of PDFs** — every article you want processed, in one folder, containing nothing else. Or an explicit ordered list of file paths.
- **An ontology file** (optional) — a `pathwise_ontology.json` reference dictionary of terms to reuse across runs. If you don't have one yet, the skill will create one; if you already have one from a previous run, point it there so terminology stays consistent across projects.

You don't need to prepare any of this in advance in a special format — just tell Claude Code what you want extracted and where the PDFs live, and the skill will ask for whatever it's missing.

## How to run it

In a Claude Code session, just ask for it in plain language, for example:

```
Extract the pathway for acetaminophen-induced hepatotoxicity from the PDFs in ./articles,
using pathwise_ontology.json.
```

If you leave anything out, Claude will ask you for it before starting. Processing happens one article at a time in a single continuous conversation — this can't be split across sessions, since later articles need to see terms already introduced by earlier ones.

## What you get back

Everything is written to an `output/` folder:

| File | What it is |
|---|---|
| `<article_slug>_pathway.json` | One per article — that article's key events, relationships, and just the sources it actually cites as evidence. |
| `run_log.md` | One line per article: processed / excluded as off-topic / failed to read, plus pages read. Check here first if an article seems to be missing. |
| `new_terms.json` | Every new ontology term minted this run, flagged for your review — nothing here is merged into your ontology automatically. |
| `merged_tally.json` | **The main deliverable.** Every key event and relationship merged across all articles, with a count of how many articles support it, plus a `single_source_flags` list calling out anything backed by only one article. |
| `wording_suggestions.json` | Only appears if you separately ask for the optional AOP-Wiki wording pass afterward. |

Claude will report back just the counts (articles processed, key events/relationships found, new terms minted, flags raised) — it won't interpret the biology for you. That review is on you.

## Scope

**In scope:** pathway extraction, per-article bibliography, terminology alignment, and a simple support count across articles.

**Out of scope by design:** weight-of-evidence grading, dose/species/exposure data, narrative summaries, and any judgment call about whether a disagreement between articles is real biology or an extraction miss (these get flagged, not resolved). If you need any of that, ask for it explicitly — the skill won't add it on its own.

## Full details

See [SKILL.md](SKILL.md) and [references/procedure.md](references/procedure.md) for the complete extraction procedure Claude follows, including the exact JSON schema, terminology-alignment rules, and validation checklist.
