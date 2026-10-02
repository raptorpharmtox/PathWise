# Pathway Extraction

A Claude Code skill that pulls a biological pathway out of a batch of PDF articles: molecular initiating events, key events, key event relationships, and adverse outcomes. Everything it records comes from what each article's own text and figures say.

During extraction it uses the papers and nothing else. It doesn't fill gaps with general biology knowledge and it doesn't look anything up, so it can find pathways that are new or that branch differently from what's already registered elsewhere. Outside ontologies are only used in an optional check at the end of a run, and only to match term names.

## What you need before running it

- **Extraction Mode:.** The skill asks this first. There are two options:
  - **Simplified:** the basic pathway. It records what starts the pathway, each step along the way, how the steps connect, and the final outcome, along with the quote and citations behind each one.
  - **Full:** everything in Simplified, plus extra details whenever an article mentions them. These include differences between species, factors like sex or genetics that change how strong an effect is, the stage of development when something happens, steps that only apply in special circumstances, and whether the trigger is genetic, chemical, or something else.

  You can't switch partway through. If you pick Simplified and later want the extra details, the whole batch has to be run again.
- **A topic.** The mechanism or subject to extract, for example "Acetaminophen-Induced Hepatotoxicity."
- **A topic description** (optional, recommended). One to three sentences narrowing the topic: direction of causation, organ, exposure type. Don't describe pathway steps here, only what counts as in scope.
- **A folder of PDFs.** Every article you want processed, with nothing else in the folder. An ordered list of file paths also works.
- **An ontology file** (optional). A `pathwise_ontology.json` reference dictionary of terms to reuse across runs. If you have one from an earlier run, point to it so terminology stays consistent.

You don't need to prepare any of this in a special format. Tell Claude Code what you want extracted and where the PDFs are, and it will ask for whatever is missing.

## How to run it

In a Claude Code session, ask in plain language:

```
Extract the pathway for acetaminophen-induced hepatotoxicity from the PDFs in ./articles,
using pathwise_ontology.json.
```

Articles are processed one at a time in a single conversation. A run can't be split across sessions, because later articles need to see the terms earlier ones introduced.

## What you get back

Everything is written to an `output/` folder:

| File | What it is |
|---|---|
| `<article_slug>_pathway.json` | One per article. Its key events and relationships, each with the quotes that support it and the citations attached to each quote, plus the list of sources it cites. |
| `run_log.md` | One line per article: processed, excluded as off-topic, borderline, or failed to read, with the reason and pages read. Check here first if an article seems to be missing. |
| `new_terms.json` | Every new ontology term minted this run, for your review. Nothing is added to your ontology automatically. If you do the end-of-run reviews, it also records each decision (merged, kept separate, or adopted from an ontology), the reason, who decided, and when. |
| `merged_tally.json` | The main result. Every key event and relationship merged across articles, with `article_count` (how many articles support it) and `distinct_sources_cited` (how many different papers those articles cite for it). It also holds the flag lists described below. In Full mode it carries the extra detail too. |

The flag lists inside `merged_tally.json` are places to look at, not verdicts:

- `single_source_flags`: supported by only one article, in an area other articles also cover.
- `single_citation_flags`: supported by several articles that all cite the same one paper.
- `relationship_disagreement_flags`: two articles connect the same two key events but use no verb in common (for example "activates" and "inhibits").
- `ambiguous_source_matches`: cited papers the skill had to match by author and year, or likely the same paper with different years, so you can confirm them.

## While it runs and when it finishes

While it runs, Claude tells you right away if an article fails to open, is excluded as off-topic, is borderline on-topic, or yields no key events, and gives a reason each time.

When it finishes, it prints a summary: key event and relationship totals, which articles were flagged and why, and the possible duplicate term pairs by name. It then offers two optional reviews. The first steps through the possible duplicates one at a time. The second checks the new terms against existing ontologies, AOP-Wiki first, then BioCarta and the eTRANSAFE Rosetta Stone if you want them. It doesn't interpret the biology. That part is up to you.

## Scope

**Always included:** pathway extraction, per-article citations tied to each key event and relationship, term matching against your ontology, and a tally across articles (both an article count and a count of distinct cited papers).

**Full mode only:** species-specific or conditional branching (including minor pathways that only matter under specific circumstances), confounders (sex, genetic polymorphisms, background rates, species physiology), developmental windows, and initiating-event class. These are recorded only when an article's own text states them, and each one is tagged so a future visualizer can show or hide them separately from the core chain.

**Never included:** weight-of-evidence grading, dose or exposure study details, narrative summaries, and judgments about whether a disagreement between articles is real biology or an extraction mistake. Disagreements get flagged, not resolved. If you want any of this, ask for it directly.

## Known limitations

- The reviewer name saved with each review decision is just a name typed in at the start of the review. It isn't verified.
- The end-of-run AOP-Wiki, BioCarta, and Rosetta Stone checks haven't been tested yet.
- Choosing Simplified mode means any extra detail (species, confounders, special circumstances) can only be added later by running the batch again.
- None of the recent changes have been run on a real batch of PDFs yet.

## Full details

See [SKILL.md](SKILL.md) and [references/procedure.md](references/procedure.md) for the full procedure, including the exact JSON layout, the term-matching rules, and the checks run on each article.
