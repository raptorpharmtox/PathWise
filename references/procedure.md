# Extraction Procedure — Full Mechanics

This is the specification SKILL.md points to. Follow it precisely — the discipline here (verbatim evidence, causal source/target ordering, the reuse-or-mint terminology process) is what makes the merged output trustworthy across articles written by different authors in different styles.

## Scope

Always in scope, in both extraction modes: pathway extraction (key events, key event relationships, MIE/AO flags), a flat bibliography per article, terminology alignment across the batch, per-KE/KER citation linking (Step 3C), and a final tally of how many articles *and* how many distinct cited sources support each key event and relationship.

Always out of scope, by deliberate design choice, not because anything is unknown: review-type/certainty-language tagging, any weight-of-evidence measure beyond a simple count, and any automated judgment about whether a disagreement between articles is real biology or an extraction error — flag it, don't resolve it. Don't add any of this on your own initiative even if it looks easy; ask the user first if they want scope expanded.

### Extraction mode: Simplified vs. Full

Ask which mode the user wants first, before any other input and before Step 1, and tell them the choice is final for the run — it changes what Step 2 looks for while reading, not just what gets shown afterward, so switching later means re-reading every PDF.

**Simplified** — extract only the core chain: MIEs, KEs, KERs, AO flags, evidence quotes, citation links, and the tally. Don't go looking for species/circumstance qualifiers, confounder language, developmental-timing statements, or initiating-event-class distinctions — if a sentence happens to carry one, don't chase it down, just extract the underlying KE/KER as usual and move on.

**Full** — everything in Simplified, plus four additional kinds of annotation, captured only when the article's own text states them (same verbatim-evidence discipline as everything else — if you can't quote it, don't add it):

1. **Species-specific / conditional branching** — a KE/KER that only applies to certain species, or only under a stated non-species condition (e.g. a minor enzyme pathway that matters "under specific circumstances," a genotype-driven fast/slow-metabolizer split). Fields: `species_annotation` (object, species → short state string) and `molecular_basis` (string) on the KE; `gate_type`, `active_in`, `absent_in`, and an optional `note` (short free-text) on the KER for structural on/off-in-this-species-or-condition branching; `special_circumstances` (array of `{ "condition": "...", "evidence": "<verbatim quote>", "reference_ids": [] }`) for non-species qualifiers that don't cleanly fit the species fields; `has_special_circumstances` (true/false, derived from whether that array is non-empty). `species_annotation`, `molecular_basis`, `gate_type`, `active_in`, `absent_in`, and `note` carry no quote of their own: the KE's or KER's own `evidence` (or `additional_evidence`) quote must support them, and if no quote does, leave them out.
2. **Confounders** — a variable that shifts a KER's probability or magnitude without gating whether it exists at all (sex, background malformation frequency, species physiology, a genetic polymorphism that changes metabolic rate rather than switching a pathway on/off). KER-level field: `confounders` (array of `{ "type": "sex" | "genetic_polymorphism" | "background_frequency" | "species_physiology" | "other", "description": "...", "evidence": "<verbatim quote>", "reference_ids": [] }`).
3. **Developmental/temporal window** — a KE/KER that's only operative within a stated developmental stage or time window. Field: `developmental_window` (object: `{ "species": "...", "stage": "...", "time_range": "...", "evidence": "<verbatim quote>", "reference_ids": [] }`) on the KE or KER.
4. **Initiating-event class** — on MIE key events only (`"mie": true`), whether the article frames this MIE's origin as genetic, chemical, or something else (disease-driven, endogenous, etc.). Field: `initiating_event_class`: `"genetic" | "chemical" | "other"`, grounded in the KE's existing `evidence` quote (or a separate verbatim quote if the classification is stated elsewhere in the text) — never inferred from what kind of entity it is.

Any KE/KER carrying #1, #2, or #3 also gets a `layers` field: an array drawn from `["species_conditional", "confounder", "developmental_window"]`, naming which of these three apply. This is the field a future visualizer toggle would filter on — it doesn't drive any behavior in this skill itself. A KE/KER with none of these stays untagged (no `layers` field), meaning "core pathway, always shown."

Why these four and not others, and why Case Study 2-style genetic/chemical convergence isn't in this list: an article describing two mechanisms (e.g. a chemical branch and a genetic-susceptibility branch) that converge on a shared downstream KE is just ordinary branching/convergence topology — Step 2 already encodes that natively as separate KE chains meeting at one node. It doesn't need a special field; only genuinely *conditional* content (present in this species but not that one, active only past a threshold, magnitude shifted by a modifier, valid only in a time window) needs one of the four fields above.

## Step 1: Read each article

If ARTICLES names a folder, list every PDF in it now and process in filename order; record the full resolved list in the run log before starting, so there's a record of exactly what got processed this run.

For each PDF: use the Read tool. If it's more than 10 pages, pass a page range (max 20 pages per call) and read in sequential chunks until the whole document is covered — don't assume one call gets everything. Read the entire article before starting Step 2; a connection between something introduced early and something described later would otherwise get missed. Each page returns as both text and an image, so figures/diagrams are visible as you read — no separate step needed for that.

If a PDF fails to open or returns no readable content (likely scanned/image-only), note it in the run log, tell the user right away (see "Per-article callouts" below), and move to the next article rather than stopping the whole run.

Derive this article's slug now: first author's last name + publication year, lowercase (e.g. `smith_2019`). Use it consistently everywhere this article is referenced. If two articles in the same batch would produce the same slug, disambiguate with `-a`/`-b` suffixes in processing order.

## Step 1b: Confirm this article is actually relevant to TOPIC

Do this after finishing the full read of the article and before starting Step 2 — a title or abstract alone can be misleading in either direction, so decide this from the whole article, not a skim.

The bar is substantive engagement with TOPIC (and TOPIC DESCRIPTION, if given), not mere adjacency. An article that mentions TOPIC in passing, cites it as background for a different mechanism, or covers a related-but-distinct pathway that never actually connects to what TOPIC names, is not relevant, even if it's well-written and pathway-shaped in isolation. This is the same "must connect to every element TOPIC names" discipline from Step 2 (see below), applied to the whole article instead of one candidate key event — a batch assembled by keyword search routinely pulls in a few articles that are adjacent but don't actually belong, and this is the point where they get caught rather than quietly producing a padded pathway.

- **Clearly off-topic** — the article isn't substantively about TOPIC at all. Exclude it: write one line to `output/run_log.md` as `excluded — not relevant to TOPIC (reason: <one line>)`, don't produce a `<article_slug>_pathway.json` for it, and move to the next article. The one-line reason is required, not optional — it's what the user is told live and what the end-of-run recap repeats, so a bare label isn't enough. Don't spend Steps 2-5 on an article you've already determined doesn't belong.
- **Genuinely on-topic** — proceed to Step 2 normally. If Step 2 then produces zero key events, that is not a normal result: log it as `processed — on-topic, but no key events extracted` and handle it like the borderline-with-zero case below (flagged prominently).
- **Borderline** (touches TOPIC's subject area but you're not certain it clears the bar) — don't exclude it on suspicion alone. Write down a one-line reason for the uncertainty (what part of TOPIC it touches and what's missing or unclear). Proceed to Step 2 and let the evidence requirement do the filtering: if nothing in the article actually supports a TOPIC-connected key event, Step 2 will legitimately produce zero key events for it. That's a real, informative outcome in its own right. Log it as `processed — borderline on-topic (reason: <one line>)`, or if Step 2 produced zero key events, as `processed — borderline on-topic, no TOPIC-relevant content found (reason: <one line>)`, rather than silently producing an empty file with no explanation.

"Borderline" here means only one thing: uncertainty about whether the article is on-topic for TOPIC / TOPIC DESCRIPTION. It says nothing about the article's quality, methods, or reliability.

Don't use this step to second-guess an article's scientific quality or methodology — that's out of scope here, same as weight-of-evidence grading. This is strictly a topic-boundary check.

## Per-article callouts — tell the user live

Right after each article is finished (its file written in Step 5, or it was skipped in Step 1/1b), check whether it falls into one of the five cases below. If so, say so in chat immediately, in a sentence or two — don't hold it for the end of the run, and don't leave it only in `run_log.md`.

- **Failed to parse** — name the article, say the PDF was unreadable and skipped, and that it didn't contribute to the run.
- **Excluded as entirely off-topic** — name the article and give the one-line reason from Step 1b.
- **Borderline on-topic** — name the article, say plainly that "borderline" means the skill was unsure whether it's on-topic for the topic/description given (not a comment on quality), that it was processed anyway, and give the one-line reason.
- **Borderline and zero key events extracted** — a more serious case than plain borderline: the uncertain call also produced nothing usable. Flag it more prominently than the plain borderline message (e.g. open with "Needs attention:"), name the article, and give the reason.
- **On-topic but zero key events extracted** — the article was judged on-topic yet nothing usable came out of it. Same prominent flag as the borderline-with-zero case ("Needs attention:"), naming the article and saying that it was judged on-topic but yielded no key events.

Never call out, at this stage or any other: a normal processed article with no issues; a *partial* exclusion (leaving out a tangential section or side mechanism of an article that is on-topic overall — that is ordinary scoping, it isn't logged as an exclusion, and it isn't mentioned to the user); the source type (text/figure/both) or adverse-outcome flag of any individual key event or relationship; single-source flags on individual key events or relationships.

## Step 2: Extract the pathway from this article

Read paragraph by paragraph. Pull out every molecular initiating event, key event, adverse outcome, and the relationships connecting them, as actually described in THIS article's text and figures, restricted to TOPIC (and TOPIC DESCRIPTION, if given). Use only what this article states — don't fill gaps from background knowledge.

When TOPIC names more than one element (e.g. "X and Y"), a candidate key event or relationship must connect — directly, or through the chain — to every element named, not just one of them. A mechanism that's clearly related to the article's subject but never actually touches the other half of a multi-part topic is exactly the kind of thing to leave out, no matter how well-evidenced or pathway-shaped it looks in isolation. Check this explicitly before keeping a branch, not just at the end.

Work from the text outward: find the actual sentence or passage that supports a candidate key event or relationship before deciding it belongs. Don't settle on a plausible pathway shape first and then go looking for sentences to fit it — that ordering is exactly how prior familiarity with a mechanism ends up substituting for what the article actually says. If you can't point to a specific supporting passage, leave it out.

Match the granularity shown in the reference example below — that's the actual standard for how finely to chunk biology into separate key events, more so than the abstract schema.

Encode as:

```json
{
  "aop_id": "<article_slug>",
  "key_events": [
    { "id": "KE:0", "biological_entity_id": "<term_id>", "mie": true, "adverse_outcome": false, "source_type": "text", "evidence": "<verbatim quote from the article supporting this key event>", "reference_ids": [] }
  ],
  "key_event_relationships": [
    { "id": "KER:0", "source": "KE:0", "target": "KE:1", "relationship": ["<relationship_type>"], "evidence": "<verbatim quote from the article supporting this relationship>", "reference_ids": [] }
  ]
}
```

`source_type` is `"text"`, `"figure"`, or `"both"` — whichever the key event was actually drawn from. Keep this distinction visible: figure-derived extractions are expected to be less reliable than text-derived ones.

`reference_ids` starts as `[]` here in Step 2 — it gets filled in during Step 3C, once the article's reference list has ref_ids to point to. Don't try to resolve citations while still in Step 2; just keep the field present so Step 3C has something to fill in. (It lists the citations attached to the `evidence` quote on the same node. The article's full list of cited works, at the end of the file, is a different thing and is called `references`.)

`evidence` is a short, exact quote copied from the article's own text — not a paraphrase, not a summary — that directly supports this specific key event or relationship. If something is genuinely drawn from a figure with no supporting text, quote the figure's caption or axis/node labels instead, and set `source_type` accordingly. If you can't quote support for a candidate, that's a sign it doesn't belong in this file.

If the article supports the same key event or relationship in more than one place (separate sentences, possibly with different citations), keep the clearest quote as `evidence` and add each further quote to an `additional_evidence` array on the same node: `[{ "quote": "<verbatim quote>", "reference_ids": [] }]`. Each quote keeps its own citations, so a source cited for only one of the sentences isn't lost. Leave `additional_evidence` off when there's only one quote.

`id` values (KE:0, KER:0, etc.) only need to be unique within this one article's file. Every KER's `source`/`target` must point to a real KE id in the same file. Every KE and KER must have a unique id within the file, no repeats.

`adverse_outcome: true` marks a terminal/endpoint node of a branch — nothing downstream of it in this article's pathway — not "something harmful." A benign or protective endpoint (e.g. successful clearance of a drug) gets `adverse_outcome: true` just as much as a toxic endpoint does, if it's the last thing this branch describes. Don't reserve this flag for harm only, and don't set it on an intermediate step just because it sounds significant.

`source`/`target` direction is always causal/temporal order: `source` is the earlier event, `target` is what it leads to, regardless of how the relationship phrase is worded. This holds even when the relationship label reads passively in one direction and actively in the next (an upstream node can be the `source` of a "metabolized_by" edge and the `target` of the next "oxidizes_to" edge — still source=earlier, target=later in both, don't flip the edge to make the verb read more naturally). If unsure which end is earlier, use what actually happens first biologically, not which phrasing sounds more natural.

Encode whatever topology the article actually describes — chain, branch, convergence — don't force a single line and don't invent branches that aren't there.

**Hard constraint:** see SKILL.md's opening section — it applies here in full, including the AOP-Wiki restriction.

## Step 3: Extract bibliographic information from this article

Two distinct things, don't conflate them:

**A. Metadata about this source article itself** (the article you're reading, not something it cites). Add a `source_article` object: `article_slug`, title, full author list, author institutions/affiliations (as printed near the title or in a footnote), journal, publication date (year, full date if given), DOI, and the PDF filename read.

**B. References actually cited inside the key events and relationships you extracted** — not the article's full bibliography. A review article can cite hundreds of works; only the ones backing a specific evidence quote you wrote down belong here. As you write each KE/KER's `evidence` field, note whether that sentence carries an inline citation (a bracketed number resolved against the article's numbered reference list, or an author-year mention like "(Chen et al., 2008)"). After finishing Step 2, collect the distinct works actually cited this way — typically a handful per article, not the whole bibliography — and for each capture just enough to locate it later: a `ref_id` (`"ref_1"`, `"ref_2"`, ... assigned in order of first appearance — this is what Step 3C links to, and it's only unique within this one article's file, not across the batch), first author plus "et al." if there are more, publication year, title, and `journal` if the entry prints one (otherwise `null`). Also record the DOI as `doi` if the reference-list entry prints one, otherwise `null` — don't look one up, and don't assume every PDF's reference section will include one. Skip volume and page range. The title (and DOI when present) is what lets Step 7 tell two different papers by the same first author and year apart, so copy the title faithfully rather than abbreviating it. Keep the original in-text citation form as `citation_text` (e.g. `"Chen et al. (2008)"` or the bracketed number plus what it resolved to) as a fallback. Don't guess at a date or spell out an institution; leave a field `null` rather than invent it.

Write `references` as the **last** key in the file, after `key_event_relationships` — so a human opening the file sees the actual pathway extraction first and doesn't have to scroll past citations to get to it.

If any field in A or B is unclear or not plainly stated, leave it `null`. A wrong value here is worse than a missing one — this data needs to be traceable.

Add a `source_articles: ["<article_slug>"]` field to every key event and key event relationship created in Step 2 — this is what makes counting possible later, don't skip it.

## Step 3C: Link each key event and relationship to its specific citations

This is what makes the reference list traceable back to individual claims instead of sitting as an undifferentiated block at the end of the file — do this right after Step 3B, once every reference has a `ref_id`.

Go back through every KE and KER from Step 2. For each quote on it, look at the sentence it came from: if that sentence carried an inline citation (the same ones you resolved in Step 3B), set the `reference_ids` next to that quote to the `ref_id`(s) it resolved to, e.g. `"reference_ids": ["ref_2"]`, or `["ref_2", "ref_5"]` if the sentence cited more than one. This applies to every quote, with no exceptions: the main `evidence` quote, each entry in `additional_evidence`, and (Full mode) each entry in `special_circumstances` and `confounders` and the `developmental_window`, which each carry their own `reference_ids`. If a quote synthesizes several sentences and only part of it carries a citation, still just record whichever `ref_id`(s) actually appear attached to that quote — don't extend it to nearby citations that support a different sentence.

If a quote's sentence carries no inline citation at all (it's the reviewing authors' own uncited synthesis, or a figure with no citation in its caption), leave its `reference_ids` as `[]` — don't guess a source for it, and don't leave the field missing entirely; an empty array and "not yet checked" need to stay distinguishable, so always set it one way or the other before Step 5.

## Step 4: Align terminology against the ontology and everything minted so far

Applies to every `biological_entity_id` AND every `relationship` type written in Step 2 — both go through the same process.

**First check:** does this concept already exist, under this name or different wording, in the ontology file, or in terms already minted earlier in this same run (article 2 onward)? If yes, reuse that existing ID exactly.

If not confident it's the same concept, **default to treating it as new rather than merging**, but flag it: add `"possible_duplicate_of": "<existing_id>"` and a one-line `"reason"` explaining the resemblance, so it surfaces for manual review instead of silently becoming an unreviewed merge or an unreviewed new term. Only skip this flag when genuinely confident it's a clean reuse or a clean new term.

If no match exists at all, before writing a free-text term, check for an already-accepted name:

- Gene or protein → the official HGNC gene symbol
- Chemical → the standard/common name as used in PubChem
- A disease or adverse-outcome-type node → check if this maps to a standard clinical term (SNOMED CT, MedDRA, MeSH-style naming); use it if confident of the mapping
- A mechanistic key event step (not a named disease) with no HGNC/PubChem/SNOMED-style match → write a clear, plain-language `id` (lowercase, underscores, matching the ontology's existing style) and a one-sentence `definition`, formatted exactly like existing entries. Do **not** check AOP-Wiki here, even just for wording — see Step 8c below for the separate, later, user-approved step where AOP-Wiki matching happens.
- Otherwise, write a clear, plain-language `id` (lowercase, underscores, matching the ontology's existing style) and a one-sentence `definition`, formatted exactly like existing entries.

Relationship types follow the same reuse-or-mint discipline, not a separate one. Check the ontology's relationship-type category first (activates, inhibits, binds_to, etc.) and reuse an existing verb whenever it captures the actual meaning, even if the article's phrasing is more elaborate. Only mint a new relationship term when an existing one would genuinely lose meaning, not just because the article's wording is more specific or colorful. A new relationship term gets a clear `id`, a one-sentence `definition`, and a `direction` field describing which end is earlier/causal, matching the format of existing relationship-type entries. Log it in `new_terms.json` under the relationship-type category, not mixed in with entity terms.

Track every genuinely new term in a running list for this session (don't write into the ontology file itself) — output it in Step 7.

### Full mode only: applying the four additional annotation types

If EXTRACTION MODE is Full, apply this alongside Step 4, on the same paragraph-by-paragraph pass as Step 2 (don't do a separate re-read of the article looking for these — catch them as you go). For any KE or KER where the article's own text states one of the four kinds of qualifier described in "Extraction mode: Simplified vs. Full" above, add the matching field(s), grounded in a verbatim quote exactly like every other evidence-bearing field in this skill. Add the `layers` array to any KE/KER that received a species/circumstance, confounder, or developmental-window annotation. Don't go hunting for these if the article doesn't clearly state one — absence of a qualifier is the default, not something to infer from silence.

## Step 5: Validate and write this article's file now

Before moving to the next article, check: every KE and KER id is unique within this file; every KER's source/target points to a real KE id; every KE has `source_articles`, `source_type`, and `evidence` set; every KER has `evidence` set; every `evidence` value is an actual excerpt from the article's own text or figure (not a paraphrase or something generated to sound plausible); `source_article` (Step 3A) and the article's `references` list (Step 3B) are both present; every quote (the `evidence` quote, each `additional_evidence` entry, and in Full mode each `special_circumstances` / `confounders` entry and the `developmental_window`) has its `reference_ids` set (Step 3C) — `[]` is fine, missing is not, and every `ref_id` named actually exists in this file's `references` list. In Full mode, also check that every `species_annotation`, `molecular_basis`, `gate_type`, `active_in`, `absent_in`, `note`, `special_circumstances`, `confounders`, `developmental_window`, and `initiating_event_class` value is backed by a verbatim quote (the KE/KER's own `evidence` or `additional_evidence` quote, or for the entries that carry their own, that entry's quote) — not a paraphrase, and not something added because it seemed biologically plausible.

Write `output/<article_slug>_pathway.json` now, containing `source_article`, `key_events`, `key_event_relationships`, and `references`. Do this immediately — don't wait until all articles are processed, so an interrupted run still leaves completed work on disk. Append one line to `output/run_log.md`: article slug, one of processed successfully / processed — borderline on-topic (reason) / processed — borderline on-topic, no TOPIC-relevant content found (reason) / processed — on-topic, but no key events extracted / excluded — not relevant to TOPIC (reason) / failed to open / no readable text found, plus pages read. Then apply "Per-article callouts" above.

## Step 6: Repeat Steps 1-5 for the next article

Continue through the full ARTICLES list. Each new article gets checked against the original ontology file plus every term minted from earlier articles in this run, so the same concept described differently across articles converges on one ID instead of being reinvented each time.

## Step 7: Merge across articles and produce the remaining output files

Once every article has its own file (Step 5), read them all back in and produce:

- `output/new_terms.json` — every term minted this run that wasn't already in the ontology (including any `possible_duplicate_of` flags), plus which article(s) prompted each one. Write this file once, the first time Step 7 runs. If Step 7 is run again later (Step 8 does this after relabeling), regenerate **only** `merged_tally.json` — never rewrite `new_terms.json`, because by then it also holds the review decisions and `merged_into` marks from Step 8.
- `output/merged_tally.json` — built by joining the per-article files on each KE's `biological_entity_id` (not its local `KE:N` id, which only exists within one article) and each KER's (source entity, target entity, relationship type) tuple. For each, record:
  - `article_count` and `supporting_articles`: how many articles support it, and which ones — the original tally.
  - `distinct_sources_cited` and `cited_sources`: collect every `ref_id` on every quote of every contributing article's version of this node (the `evidence` quote, each `additional_evidence` entry, and in Full mode each `special_circumstances` / `confounders` entry and the `developmental_window`), resolve them back to that article's own reference-list entries (author/year/title/journal/doi), then deduplicate across **all** contributing articles — the same primary source is often cited by more than one review in the batch, and that shouldn't inflate the count. Decide whether two entries are the same paper in this order, never on first author + year alone when titles are available (two different "Jones et al. 2012" papers must stay separate): (1) if both entries have a `doi`, same paper iff the DOIs match (case-insensitive); (2) otherwise, if both have a title and the normalized titles match (lowercased, punctuation and extra whitespace stripped): if the years also match, same paper; if the first author matches but the years differ (typically a preprint versus its published version), treat it as a **likely match** — count it once — and list it in `ambiguous_source_matches` for manual review, noting whether the journals match (if both entries have one) or differ; if the first author differs too, treat them as different papers; (3) only if a title is missing on either or both sides, fall back to first author + year, and list that pairing in an `ambiguous_source_matches` array in `merged_tally.json` (both entries, which articles they came from) so a human can confirm — don't silently merge or split it. Before writing `merged_tally.json`, re-check that every source merged via this fallback appears in `ambiguous_source_matches`; a fallback merge that isn't listed there is a mistake. Where titles differ slightly because of typos or abbreviation but author and year match, treat as different and list it in `ambiguous_source_matches` too; undercounting a shared source is the safer error than silently merging two different papers. `cited_sources` is the deduplicated list (`{ "first_author": ..., "year": ..., "title": ..., "journal": ..., "doi": ... }`); `distinct_sources_cited` is its length. This is a different number from `article_count` on purpose — a KE backed by 1 article citing 4 distinct primary sources is better evidenced than one backed by 3 articles all citing the same single source, and this makes that visible.
  - In Full mode only: a `layers` field (union of every contributing article's `layers` values for this KE/KER) and a `layer_details` array, one entry per contributing article that supplied any Full-mode annotation: `{ "article_slug": "...", "species_annotation": ..., "molecular_basis": ..., "gate_type": ..., "active_in": ..., "absent_in": ..., "note": ..., "special_circumstances": ..., "confounders": ..., "developmental_window": ..., "initiating_event_class": ... }`, including only the sub-fields that article actually populated. Don't reconcile disagreements between articles here (e.g. one says a branch is species-conditional on rat/human, another gives different species) — list both entries under `layer_details` and let a human notice the discrepancy, same as `single_source_flags` below.
- Within `merged_tally.json`, a `single_source_flags` array: any key event or relationship supported by only one article where the other articles clearly do discuss that same region of the pathway (not just articles that never touched that topic at all). Don't judge whether these are real biological differences or extraction misses — just surface them.
- A separate `single_citation_flags` array: any KE/KER where `article_count` is more than 1 but `distinct_sources_cited` is only 1 — several articles all repeating the same single primary source is a materially weaker claim than the article count alone suggests, and it's a distinct condition from `single_source_flags` (which is about article coverage, not citation depth), so keep the two arrays separate rather than merging them.

## Step 8: End-of-run summary and interactive checkpoints

Runs after Step 7, once every article's file and `merged_tally.json` are written. Nothing here changes what the earlier steps write — it only adds what's said to the user, plus the two optional review checkpoints below. Everything in 8b and 8c is relabeling only (see "What relabeling may and may not do"). The ontology file itself is never modified at any point in Step 8; every new or adopted term lives in `output/new_terms.json`, for a human to add to the ontology later.

### 8a. Summary (always print)

- Counts: total key events and total relationships in the merged tally, and how many relationships have `article_count` of 2 or more. Also the batch counts (articles processed / excluded as off-topic / failed to read) and new terms minted. In Full mode, also how many key events/relationships carry each kind of Full-mode annotation.
- A named recap of every article that triggered a callout during parsing (failed / excluded off-topic / borderline / borderline with zero key events / on-topic with zero key events): article name plus its one-line reason, e.g. "1 article flagged: smith_2019 — borderline on-topic (reason: ...)". If none, say none.
- The possible-duplicate term pairs, listed **by name only** (e.g. "mitochondrial membrane rupture" vs. "mitochondrial swelling") — no reasons here; the reason is first shown in 8b. This is how the user learns the pairs exist even if they skip the review.
- Do **not** include single-source or single-citation counts or flags anywhere in this summary — those stay in the JSON only.

### 8b. Possible-duplicate review (interactive)

Ask: "Would you like to review the possible duplicate terms now?"

- **No** — move on; the pairs stay flagged in `new_terms.json` for later.
- **Yes** — go through the pairs one at a time. For each, show both terms and the one-line reason they were flagged, and let the user choose **merged** or **kept separate**. If merged, ask which of the two is the canonical term. If one of the two is already in the ontology file, it must be the canonical one — the ontology file is never relabeled.

Record every decision, merges and keep-separates alike, in a `resolved_duplicates` array in `output/new_terms.json` (one entry per pair): `term_a`, `term_b`, `original_reason` (the one-line flag reason), `decision` (`"merged"` or `"kept_separate"`), `canonical_term` (merges only), `decided_by`, `decided_at`.

- `decided_by`: ask the user once, at the first decision, for the name to record, and reuse it for the rest of the session. Don't infer it from the environment or guess.
- `decided_at`: UTC timestamp, ISO 8601, read from the system clock (e.g. `date -u +%Y-%m-%dT%H:%M:%SZ`), not estimated.
- A `kept_separate` entry is logged exactly like a merge. It documents that a person reviewed the pair and chose not to merge it.
- Before applying a merge, check every per-article file for a relationship that directly connects the two terms (one as source, the other as target). If there is one, tell the user which article and relationship it is, explain that merging would turn it into a relationship from a term to itself, and ask whether to merge anyway or keep the pair separate. Don't remove the relationship on your own. Relationships to *other* key events need no check: they point at key events by internal id, so they follow the relabeled term automatically.
- On a merge, relabel the non-canonical term to the canonical one in every `output/<article_slug>_pathway.json` where it appears (`biological_entity_id` for entity terms, the `relationship` array for relationship types; if a relationship array then lists the same term twice, keep one). Do not touch `evidence`, `additional_evidence`, `reference_ids`, the `references` list, or any other field. The supporting quotes stay exactly as extracted and attributed to their own article. Mark the non-canonical entry in `new_terms.json` with `"status": "merged_into"` and `"merged_into": "<canonical>"`; don't delete it.
- When anything was merged, regenerate `merged_tally.json` only, by re-running the merge part of Step 7 (not the `new_terms.json` part), so the tally reflects the standardized labels.

### 8c. Ontology-check checkpoint (interactive)

Ask: "Would you like to run a check of the new terms against existing ontologies?" If **no**, the run is done. If **yes**, ask: "Would you like a list of the newly minted terms first?" and show the list if so (the entries in `new_terms.json` that haven't been marked `merged_into`).

**Step 1 — AOP-Wiki (always first, automatic once the user said yes).** This is the one place AOP-Wiki may be consulted, and only because the pathway structure is already final on disk (see the rule at the top of SKILL.md for why this can never happen earlier).
- Check the entity (key-event) terms only. Relationship-type terms aren't checked here, and the user should be told so.
- Use AOP-Wiki's SPARQL/RDF endpoint or bulk export (confirm the current address when running). If it can't be reached, say so plainly and skip the check; don't answer from memory.
- Compare only the new term's label and definition against AOP-Wiki key-event titles and definitions. Ignore everything else in the entry (upstream/downstream events, which AOPs it belongs to); none of it may influence the pathway. A hit is a *potential* match, not a verdict.
- Report in plain language, e.g. "5 out of 10 new terms have potential matches on AOP-Wiki." Then ask: "Would you like to review these matches?" If no, the terms stay as written and the flow continues to Step 2.
- If yes: for each term with a potential match, show the new term and its definition beside the candidate AOP-Wiki key event (title, ID, definition), and let the user choose to **adopt** the AOP-Wiki term or **keep** the original.
- Log every decision in a `resolved_ontology_matches` array in `new_terms.json`, parallel to `resolved_duplicates`: `source` (`"AOP-Wiki"`), `original_term`, `candidate_term`, `candidate_id`, `decision` (`"adopted"` or `"kept_original"`), `kept_term`, `decided_by`, `decided_at` (same rules as 8b).
- On **adopt**: the adopted term is still a term that is new to the ontology file, so it stays in `new_terms.json`. Update that entry so its `id` is the AOP-Wiki title in the ontology's id style (lowercase, underscores), its definition is AOP-Wiki's, and it carries `aopwiki_id` and `source: "AOP-Wiki"`; keep the label the run originally minted as `originally_minted_as`. Relabel in the per-article files exactly as in 8b (evidence untouched, same relationship-to-self check, same tally-only regeneration of `merged_tally.json`). The `resolved_ontology_matches` entry is the record of the decision.

**Step 2 — other ontology sources (optional, user decides, context first).** After Step 1, ask whether to check the terms still not adopted into an AOP-Wiki term against **BioCarta** and/or the **eTRANSAFE "Rosetta Stone"** mapping resource. Show a short description of each first, so the user can judge whether it's relevant to this pathway:
- *BioCarta* — curated diagrams of gene/protein-level signaling and metabolic pathways, essentially a labeled map of how particular genes and proteins interact in a defined process. Useful when a new term describes a signaling or metabolic step that already has an established pathway name. It hasn't been actively maintained in years, so its vocabulary reflects older, well-established pathway biology.
- *Rosetta Stone (eTRANSAFE)* — a term-mapping approach from the eTRANSAFE drug-safety research project, built to crosswalk preclinical (animal-study) and clinical (human) terminology, so an animal toxicity finding can be matched to the equivalent human drug-safety term. Useful when a new term is a toxicity endpoint with a plausible clinical correlate; less useful for a purely mechanistic or molecular term.

Then one prompt: "Which would you like to check: BioCarta, Rosetta Stone, both, or neither?" For each one chosen, follow the same pattern as Step 1: run the check, report how many terms have potential matches, offer the same side-by-side review, log decisions in `resolved_ontology_matches` (with `source` set to the resource), relabel on adoption, regenerate `merged_tally.json`.

Neither resource has a confirmed ready-made "check my term against this list" service. BioCarta's data mainly survives as static gene-set files bundled in MSigDB, and public query access for the Rosetta Stone resource is unconfirmed. If the data for a chosen resource can't be fetched, say plainly which one couldn't be checked and why. Never produce matches from memory.

### What relabeling may and may not do

Relabeling changes only the term label a key event or relationship is filed under. It never adds, removes, or reconnects key events or relationships, and never touches `evidence`, `additional_evidence`, `reference_ids`, or the `references` list. It can still have a consequence: if two nodes in one article end up with the same label after a merge or adoption, both nodes stay in that article's file, and Step 7 counts the article once for that term (`article_count` counts distinct articles). Say so if it happens, so the user can look at that article's file.

## What each output file is, in plain language

A run leaves several files in `output/`. Their names don't say much on their own — make sure the user handing this off knows what's in each one and what they'd actually use it for.

**`<article_slug>_pathway.json`** (one per article, e.g. `smith_2019_pathway.json`)
The single-article extraction: this article's key events, its key event relationships, its own bibliographic details, and a short list of just the sources actually cited inside that evidence (not the article's full bibliography — see Step 3B), each one assigned a `ref_id`. Every key event and relationship carries `reference_ids` naming the specific `ref_id`(s) that back each of its quotes (Step 3C) — so a claim can be traced to its exact citation, not just "somewhere in this article's bibliography." That reference list sits at the end of the file, after the pathway content, so opening the file shows the actual extraction first. Written the moment that article finishes, so if the run stops partway through, whichever of these already exist are complete and safe to use — nothing partial. Open one of these to sanity-check that a specific article was read correctly, independent of anything else in the batch.

**`run_log.md`**
A one-line-per-article log: which articles were processed, which were processed as borderline on-topic (with the reason), which were excluded as off-topic (Step 1b, with the reason), which yielded no TOPIC-relevant content, which failed to open or had no readable text, how many pages were read. First stop if something seems off — e.g. if an article expected to contribute is missing from the tally, this file says whether it was excluded, came up empty, or failed outright, rather than just contributing nothing with no explanation.

**`new_terms.json`**
Every term (biological entity or relationship type) that didn't already exist in the ontology file and had to be minted during this run, plus which article(s) prompted it. Review this before adding anything permanently to the ontology — these are new, unreviewed additions. Anything carrying `possible_duplicate_of` is a term the run wasn't confident was new — a prompt for a human to decide whether it should actually merge into the existing term it resembles. If the user went through the end-of-run reviews (Step 8), this file also holds the record of those decisions: `resolved_duplicates` (each pair, the original reason, merged or kept separate, which term was kept, who decided, when) and `resolved_ontology_matches` (the same for terms checked against AOP-Wiki or other ontologies). Merged-away terms stay in the file, marked `merged_into`, so the full history is recoverable.

**`merged_tally.json`**
The actual deliverable. Every key event and relationship, merged across all articles that mention it, with two separate counts: `article_count` (how many articles support it) and `distinct_sources_cited` (how many distinct primary references those articles cite as evidence, deduplicated across the whole batch). A key event backed by 3 of 4 articles is a stronger claim than one backed by 1 — and one backed by 3 articles that each cite a different primary source is stronger still than one backed by 3 articles all citing the same source. This file is what makes both of those visible, which no single article's file can show on its own. In Full mode, entries also carry `layers` and `layer_details` wherever an article stated a species/circumstance qualifier, a confounder, or a developmental window.

**`single_source_flags`** (an array inside `merged_tally.json`, not its own file)
Calls out key events or relationships that only one article supports, in a region of the pathway the other articles clearly do discuss. A deliberate "look here," not a verdict — the run doesn't judge whether that's a real point of biological disagreement between articles or a place where extraction went wrong on one side, a human makes that call.

**`single_citation_flags`** (an array inside `merged_tally.json`, not its own file)
Calls out key events or relationships backed by more than one article but only one distinct primary source between them — several reviews citing the same underlying study isn't the same as independent corroboration, and this is where that distinction becomes visible instead of getting flattened into a reassuring-looking article count.

**Relabeled files (only if the user adopted or merged terms in Step 8)**
Merging a duplicate or adopting an AOP-Wiki term changes the term label inside the per-article files and regenerates `merged_tally.json`. Quotes and references are never changed, and `new_terms.json` keeps the original names, reasons, who decided, and when.

## Reference pathway example

Anchors format and granularity only (Step 2). No matching source text exists for this — it's not a "paragraph in, JSON out" example. It predates the `evidence` field (won't show a filled-in quote) and doesn't show `reference_ids`, since it's plain-chain and Simplified-mode-shaped. This one is a plain linear chain — swap in a branching example if a run needs to model different topology.

```json
{
  "aop_id": "drug@limb_formation_rodents_fish_1",
  "key_events": [
    { "id": "KE:0", "biological_entity_id": "cyp3a", "mie": true, "adverse_outcome": false },
    { "id": "KE:1", "biological_entity_id": "parent_drug", "mie": false, "adverse_outcome": false },
    { "id": "KE:2", "biological_entity_id": "metabolite", "mie": false, "adverse_outcome": false },
    { "id": "KE:3", "biological_entity_id": "normal_sall4_function", "mie": false, "adverse_outcome": false },
    { "id": "KE:4", "biological_entity_id": "normal_limb_formation", "mie": false, "adverse_outcome": true }
  ],
  "key_event_relationships": [
    { "id": "KER:1", "source": "KE:1", "target": "KE:0", "relationship": ["metabolized_by", "binds_to"] },
    { "id": "KER:2", "source": "KE:0", "target": "KE:2", "relationship": ["metabolizes_into", "forms"] },
    { "id": "KER:3", "source": "KE:2", "target": "KE:3", "relationship": ["promotes", "leads_to"] },
    { "id": "KER:4", "source": "KE:3", "target": "KE:4", "relationship": ["leads_to", "results_in"] }
  ]
}
```

## Reference pathway example — Full mode, species-conditional branching

Anchors the four Full-mode annotation types (species/circumstance branching shown here; confounders, developmental windows, and initiating-event class follow the same attach-to-KE/KER, quote-backed pattern). Also predates filled-in `reference_ids` in this excerpt — a real run's evidence would carry actual `ref_id`s, not an empty list.

```json
{
  "aop_id": "drug@hepatotoxicity_apap_1",
  "key_events": [
    { "id": "KE:0", "biological_entity_id": "cyp2e1", "mie": true, "adverse_outcome": false, "reference_ids": [] },
    { "id": "KE:1", "biological_entity_id": "parent_drug", "mie": false, "adverse_outcome": false, "reference_ids": [] },
    { "id": "KE:2", "biological_entity_id": "napqi", "mie": false, "adverse_outcome": false, "reference_ids": [] },
    {
      "id": "KE:3",
      "biological_entity_id": "glucuronidation_capacity",
      "mie": false,
      "adverse_outcome": false,
      "species_annotation": { "cat": "absent", "human": "present" },
      "molecular_basis": "ugt1a6_pseudogene_in_felids",
      "layers": ["species_conditional"],
      "reference_ids": []
    },
    { "id": "KE:4", "biological_entity_id": "gsh_depletion", "mie": false, "adverse_outcome": false, "reference_ids": [] },
    {
      "id": "KE:5",
      "biological_entity_id": "hepatocyte_necrosis",
      "mie": false,
      "adverse_outcome": true,
      "species_annotation": { "cat": "therapeutic_dose", "human": "overdose_only" },
      "layers": ["species_conditional"],
      "reference_ids": []
    }
  ],
  "key_event_relationships": [
    { "id": "KER:1", "source": "KE:1", "target": "KE:0", "relationship": ["metabolized_by"], "reference_ids": [] },
    { "id": "KER:2", "source": "KE:0", "target": "KE:2", "relationship": ["oxidizes_to", "forms"], "reference_ids": [] },
    {
      "id": "KER:3",
      "source": "KE:2",
      "target": "KE:3",
      "relationship": ["intercepted_by", "detoxified_by"],
      "gate_type": "species_conditional",
      "active_in": ["human"],
      "absent_in": ["cat"],
      "layers": ["species_conditional"],
      "reference_ids": []
    },
    {
      "id": "KER:4",
      "source": "KE:2",
      "target": "KE:4",
      "relationship": ["depletes", "binds_covalently"],
      "gate_type": "species_conditional",
      "active_in": ["cat"],
      "note": "engaged_only_when_KE:3_absent",
      "layers": ["species_conditional"],
      "reference_ids": []
    },
    { "id": "KER:5", "source": "KE:4", "target": "KE:5", "relationship": ["leads_to", "causes"], "reference_ids": [] }
  ]
}
```
