# Pathway Extraction

A Claude Code skill that extracts a biological pathway — molecular initiating events (MIEs), key events (KEs), key event relationships (KERs), and adverse outcomes (AOs) — from a batch of PDF research articles, strictly grounded in what each article's own text and figures say.

It never fills gaps from general biology knowledge and never consults the AOP-Wiki database during extraction, so it can surface pathways that are new or that branch differently from what's already registered elsewhere.

## What you need before running it

- **A topic** — the specific mechanism/subject to extract (e.g. "Acetaminophen-Induced Hepatotoxicity").
- **A topic description** (optional, recommended) — 1-3 sentences narrowing the topic's scope (direction of causation, organ, exposure type). Don't describe pathway steps here — just the boundary of what counts as in-scope.
- **A folder of PDFs** — every article you want processed, in one folder, containing nothing else. Or an explicit ordered list of file paths.
- **An ontology file** (optional) — a `pathwise_ontology.json` reference dictionary of terms to reuse across runs. If you don't have one yet, the skill will create one; if you already have one from a previous run, point it there so terminology stays consistent across projects.
- **Extraction mode** — Simplified (just the core MIE→KE→AO chain, evidence, citations, and the tally) or Full (also captures species-specific/conditional branching, confounders, developmental-stage windows, and initiating-event class, whenever an article states them). The skill will ask which you want before starting.

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
| `<article_slug>_pathway.json` | One per article — that article's key events and relationships (each one tagged with exactly which citation(s) back it), plus just the sources it actually cites as evidence. |
| `run_log.md` | One line per article: processed / excluded as off-topic / failed to read, plus pages read. Check here first if an article seems to be missing. |
| `new_terms.json` | Every new ontology term minted this run, flagged for your review — nothing here is merged into your ontology automatically. If you do the end-of-run reviews, it also records each decision (merged / kept separate / adopted from an ontology), the reason, who decided, and when. |
| `merged_tally.json` | **The main deliverable.** Every key event and relationship merged across all articles, with an `article_count` (how many articles) *and* a `distinct_sources_cited` count (how many distinct primary references those articles actually cite), plus `single_source_flags` (only one article) and `single_citation_flags` (several articles, but all citing the same one source) calling out the weaker-evidenced spots. In Full mode, also carries species/circumstance branching, confounders, developmental windows, and initiating-event class wherever an article stated one. |

**While it runs**, Claude tells you right away if an article fails to open, is excluded as off-topic, or is borderline on-topic (with a reason each time). **When it finishes**, it prints a summary (key event and relationship totals, which articles were flagged and why, and the possible-duplicate term pairs by name), then offers two optional reviews: step through the possible duplicates, and check the new terms against existing ontologies (AOP-Wiki first; BioCarta and eTRANSAFE Rosetta Stone optionally after). It won't interpret the biology for you. That review is on you.

## Scope

**Always in scope:** pathway extraction, per-article bibliography with per-key-event/relationship citation linking, terminology alignment, and a support tally across articles (both an article count and a distinct-primary-source count).

**In scope for Full mode only:** species-specific/conditional branching (including minor pathways that only matter "under specific circumstances"), confounders (sex, genetic polymorphisms, background rates, species physiology), developmental/temporal windows, and initiating-event class (genetic/chemical/other) — captured only when an article's own text states them, tagged with a `layers` field so a future visualizer could show/hide them independently of the core chain.

**Out of scope by design regardless of mode:** weight-of-evidence grading, dose/exposure study parameters, narrative summaries, and any judgment call about whether a disagreement between articles is real biology or an extraction miss (these get flagged, not resolved). If you need any of that, ask for it explicitly — the skill won't add it on its own.

## Full details

See [SKILL.md](SKILL.md) and [references/procedure.md](references/procedure.md) for the complete extraction procedure Claude follows, including the exact JSON schema, terminology-alignment rules, and validation checklist.
