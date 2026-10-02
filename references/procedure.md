# Extraction Procedure — Full Mechanics

This is the specification SKILL.md points to. Follow it precisely — the discipline here (verbatim evidence, causal source/target ordering, the reuse-or-mint terminology process) is what makes the merged output trustworthy across articles written by different authors in different styles.

## Scope

Always in scope, in both extraction modes: pathway extraction (key events, key event relationships, MIE/AO flags), a flat bibliography per article, terminology alignment across the batch, per-KE/KER citation linking (Step 3C), and a final tally of how many articles *and* how many distinct cited sources support each key event and relationship.

Always out of scope, by deliberate design choice, not because anything is unknown: review-type/certainty-language tagging, any weight-of-evidence measure beyond a simple count, and any automated judgment about whether a disagreement between articles is real biology or an extraction error — flag it, don't resolve it. Don't add any of this on your own initiative even if it looks easy; ask the user first if they want scope expanded.

### Extraction mode: Simplified vs. Full

Ask which mode the user wants as part of Required Inputs, before Step 1 — it changes what Step 2 looks for while reading, not just what gets shown afterward.

**Simplified** — extract only the core chain: MIEs, KEs, KERs, AO flags, evidence quotes, citation links, and the tally. Don't go looking for species/circumstance qualifiers, confounder language, developmental-timing statements, or initiating-event-class distinctions — if a sentence happens to carry one, don't chase it down, just extract the underlying KE/KER as usual and move on.

**Full** — everything in Simplified, plus four additional kinds of annotation, captured only when the article's own text states them (same verbatim-evidence discipline as everything else — if you can't quote it, don't add it):

1. **Species-specific / conditional branching** — a KE/KER that only applies to certain species, or only under a stated non-species condition (e.g. a minor enzyme pathway that matters "under specific circumstances," a genotype-driven fast/slow-metabolizer split). Fields: `species_annotation` (object, species → short state string) and `molecular_basis` (string) on the KE; `gate_type`, `active_in`, `absent_in`, and an optional `note` (short free-text) on the KER for structural on/off-in-this-species-or-condition branching; `special_circumstances` (array of `{ "condition": "...", "evidence": "<verbatim quote>" }`) for non-species qualifiers that don't cleanly fit the species fields; `has_special_circumstances` (true/false, derived from whether that array is non-empty).
2. **Confounders** — a variable that shifts a KER's probability or magnitude without gating whether it exists at all (sex, background malformation frequency, species physiology, a genetic polymorphism that changes metabolic rate rather than switching a pathway on/off). KER-level field: `confounders` (array of `{ "type": "sex" | "genetic_polymorphism" | "background_frequency" | "species_physiology" | "other", "description": "...", "evidence": "<verbatim quote>" }`).
3. **Developmental/temporal window** — a KE/KER that's only operative within a stated developmental stage or time window. Field: `developmental_window` (object: `{ "species": "...", "stage": "...", "time_range": "...", "evidence": "<verbatim quote>" }`) on the KE or KER.
4. **Initiating-event class** — on MIE key events only (`"mie": true`), whether the article frames this MIE's origin as genetic, chemical, or something else (disease-driven, endogenous, etc.). Field: `initiating_event_class`: `"genetic" | "chemical" | "other"`, grounded in the KE's existing `evidence` quote (or a separate verbatim quote if the classification is stated elsewhere in the text) — never inferred from what kind of entity it is.

Any KE/KER carrying #1, #2, or #3 also gets a `layers` field: an array drawn from `["species_conditional", "confounder", "developmental_window"]`, naming which of these three apply. This is the field a future visualizer toggle would filter on — it doesn't drive any behavior in this skill itself. A KE/KER with none of these stays untagged (no `layers` field), meaning "core pathway, always shown."

Why these four and not others, and why Case Study 2-style genetic/chemical convergence isn't in this list: an article describing two mechanisms (e.g. a chemical branch and a genetic-susceptibility branch) that converge on a shared downstream KE is just ordinary branching/convergence topology — Step 2 already encodes that natively as separate KE chains meeting at one node. It doesn't need a special field; only genuinely *conditional* content (present in this species but not that one, active only past a threshold, magnitude shifted by a modifier, valid only in a time window) needs one of the four fields above.

## Step 1: Read each article

If ARTICLES names a folder, list every PDF in it now and process in filename order; record the full resolved list in the run log before starting, so there's a record of exactly what got processed this run.

For each PDF: use the Read tool. If it's more than 10 pages, pass a page range (max 20 pages per call) and read in sequential chunks until the whole document is covered — don't assume one call gets everything. Read the entire article before starting Step 2; a connection between something introduced early and something described later would otherwise get missed. Each page returns as both text and an image, so figures/diagrams are visible as you read — no separate step needed for that.

If a PDF fails to open or returns no readable content (likely scanned/image-only), note it in the run log and move to the next article rather than stopping the whole run.

Derive this article's slug now: first author's last name + publication year, lowercase (e.g. `smith_2019`). Use it consistently everywhere this article is referenced. If two articles in the same batch would produce the same slug, disambiguate with `-a`/`-b` suffixes in processing order.

## Step 1b: Confirm this article is actually relevant to TOPIC

Do this after finishing the full read of the article and before starting Step 2 — a title or abstract alone can be misleading in either direction, so decide this from the whole article, not a skim.

The bar is substantive engagement with TOPIC (and TOPIC DESCRIPTION, if given), not mere adjacency. An article that mentions TOPIC in passing, cites it as background for a different mechanism, or covers a related-but-distinct pathway that never actually connects to what TOPIC names, is not relevant, even if it's well-written and pathway-shaped in isolation. This is the same "must connect to every element TOPIC names" discipline from Step 2 (see below), applied to the whole article instead of one candidate key event — a batch assembled by keyword search routinely pulls in a few articles that are adjacent but don't actually belong, and this is the point where they get caught rather than quietly producing a padded pathway.

- **Clearly off-topic** — the article isn't substantively about TOPIC at all. Exclude it: write one line to `output/run_log.md` as `excluded — not relevant to TOPIC` with a short reason, don't produce a `<article_slug>_pathway.json` for it, and move to the next article. Don't spend Steps 2-5 on an article you've already determined doesn't belong.
- **Genuinely on-topic** — proceed to Step 2 normally.
- **Borderline** (touches TOPIC's subject area but you're not certain it clears the bar) — don't exclude it on suspicion alone. Proceed to Step 2 and let the evidence requirement do the filtering: if nothing in the article actually supports a TOPIC-connected key event, Step 2 will legitimately produce zero key events for it. That's a real, informative outcome in its own right — note it in the run log as `processed — no TOPIC-relevant content found` rather than silently producing an empty file with no explanation.

Don't use this step to second-guess an article's scientific quality or methodology — that's out of scope here, same as weight-of-evidence grading. This is strictly a topic-boundary check.

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
    { "id": "KE:0", "biological_entity_id": "<term_id>", "mie": true, "adverse_outcome": false, "source_type": "text", "evidence": "<verbatim quote from the article supporting this key event>", "references": [] }
  ],
  "key_event_relationships": [
    { "id": "KER:0", "source": "KE:0", "target": "KE:1", "relationship": ["<relationship_type>"], "evidence": "<verbatim quote from the article supporting this relationship>", "references": [] }
  ]
}
```

`source_type` is `"text"`, `"figure"`, or `"both"` — whichever the key event was actually drawn from. Keep this distinction visible: figure-derived extractions are expected to be less reliable than text-derived ones.

`references` starts as `[]` here in Step 2 — it gets filled in during Step 3C, once the article's reference list has ref_ids to point to. Don't try to resolve citations while still in Step 2; just keep the field present so Step 3C has something to fill in.

`evidence` is a short, exact quote copied from the article's own text — not a paraphrase, not a summary — that directly supports this specific key event or relationship. If something is genuinely drawn from a figure with no supporting text, quote the figure's caption or axis/node labels instead, and set `source_type` accordingly. If you can't quote support for a candidate, that's a sign it doesn't belong in this file.

`id` values (KE:0, KER:0, etc.) only need to be unique within this one article's file. Every KER's `source`/`target` must point to a real KE id in the same file. Every KE and KER must have a unique id within the file, no repeats.

`adverse_outcome: true` marks a terminal/endpoint node of a branch — nothing downstream of it in this article's pathway — not "something harmful." A benign or protective endpoint (e.g. successful clearance of a drug) gets `adverse_outcome: true` just as much as a toxic endpoint does, if it's the last thing this branch describes. Don't reserve this flag for harm only, and don't set it on an intermediate step just because it sounds significant.

`source`/`target` direction is always causal/temporal order: `source` is the earlier event, `target` is what it leads to, regardless of how the relationship phrase is worded. This holds even when the relationship label reads passively in one direction and actively in the next (an upstream node can be the `source` of a "metabolized_by" edge and the `target` of the next "oxidizes_to" edge — still source=earlier, target=later in both, don't flip the edge to make the verb read more naturally). If unsure which end is earlier, use what actually happens first biologically, not which phrasing sounds more natural.

Encode whatever topology the article actually describes — chain, branch, convergence — don't force a single line and don't invent branches that aren't there.

**Hard constraint:** see SKILL.md's opening section — it applies here in full, including the AOP-Wiki restriction.

## Step 3: Extract bibliographic information from this article

Two distinct things, don't conflate them:

**A. Metadata about this source article itself** (the article you're reading, not something it cites). Add a `source_article` object: `article_slug`, title, full author list, author institutions/affiliations (as printed near the title or in a footnote), journal, publication date (year, full date if given), DOI, and the PDF filename read.

**B. References actually cited inside the key events and relationships you extracted** — not the article's full bibliography. A review article can cite hundreds of works; only the ones backing a specific evidence quote you wrote down belong here. As you write each KE/KER's `evidence` field, note whether that sentence carries an inline citation (a bracketed number resolved against the article's numbered reference list, or an author-year mention like "(Chen et al., 2008)"). After finishing Step 2, collect the distinct works actually cited this way — typically a handful per article, not the whole bibliography — and for each capture just enough to locate it later: a `ref_id` (`"ref_1"`, `"ref_2"`, ... assigned in order of first appearance — this is what Step 3C links to, and it's only unique within this one article's file, not across the batch), first author plus "et al." if there are more, publication year, and title (journal too if it's quick). Also record the DOI as `doi` if the reference-list entry prints one, otherwise `null` — don't look one up, and don't assume every PDF's reference section will include one. Skip volume and page range. The title (and DOI when present) is what lets Step 7 tell two different papers by the same first author and year apart, so copy the title faithfully rather than abbreviating it. Keep the original in-text citation form as `citation_text` (e.g. `"Chen et al. (2008)"` or the bracketed number plus what it resolved to) as a fallback. Don't guess at a date or spell out an institution; leave a field `null` rather than invent it.

Write `references` as the **last** key in the file, after `key_event_relationships` — so a human opening the file sees the actual pathway extraction first and doesn't have to scroll past citations to get to it.

If any field in A or B is unclear or not plainly stated, leave it `null`. A wrong value here is worse than a missing one — this data needs to be traceable.

Add a `source_articles: ["<article_slug>"]` field to every key event and key event relationship created in Step 2 — this is what makes counting possible later, don't skip it.

## Step 3C: Link each key event and relationship to its specific citations

This is what makes the reference list traceable back to individual claims instead of sitting as an undifferentiated block at the end of the file — do this right after Step 3B, once every reference has a `ref_id`.

Go back through every KE and KER from Step 2. For each one, look at the `evidence` quote you already recorded: if that sentence carried an inline citation (the same ones you resolved in Step 3B), set this KE/KER's `references` field to the `ref_id`(s) it resolved to, e.g. `"references": ["ref_2"]`, or `["ref_2", "ref_5"]` if the sentence cited more than one. If a review synthesizes several sentences into one evidence quote and only part of it carries a citation, still just record whichever `ref_id`(s) actually appear attached to that quote — don't extend it to nearby citations that support a different sentence.

If the evidence sentence carries no inline citation at all (it's the reviewing authors' own uncited synthesis, or a figure with no citation in its caption), leave `references` as `[]` — don't guess a source for it, and don't leave the field missing entirely; an empty array and "not yet checked" need to stay distinguishable, so always set it one way or the other before Step 5.

## Step 4: Align terminology against the ontology and everything minted so far

Applies to every `biological_entity_id` AND every `relationship` type written in Step 2 — both go through the same process.

**First check:** does this concept already exist, under this name or different wording, in the ontology file, or in terms already minted earlier in this same run (article 2 onward)? If yes, reuse that existing ID exactly.

If not confident it's the same concept, **default to treating it as new rather than merging**, but flag it: add `"possible_duplicate_of": "<existing_id>"` and a one-line `"reason"` explaining the resemblance, so it surfaces for manual review instead of silently becoming an unreviewed merge or an unreviewed new term. Only skip this flag when genuinely confident it's a clean reuse or a clean new term.

If no match exists at all, before writing a free-text term, check for an already-accepted name:

- Gene or protein → the official HGNC gene symbol
- Chemical → the standard/common name as used in PubChem
- A disease or adverse-outcome-type node → check if this maps to a standard clinical term (SNOMED CT, MedDRA, MeSH-style naming); use it if confident of the mapping
- A mechanistic key event step (not a named disease) with no HGNC/PubChem/SNOMED-style match → write a clear, plain-language `id` (lowercase, underscores, matching the ontology's existing style) and a one-sentence `definition`, formatted exactly like existing entries. Do **not** check AOP-Wiki here, even just for wording — see "Optional: post-extraction wording pass" below for why, and for the separate, later step where that's available.
- Otherwise, write a clear, plain-language `id` (lowercase, underscores, matching the ontology's existing style) and a one-sentence `definition`, formatted exactly like existing entries.

Relationship types follow the same reuse-or-mint discipline, not a separate one. Check the ontology's relationship-type category first (activates, inhibits, binds_to, etc.) and reuse an existing verb whenever it captures the actual meaning, even if the article's phrasing is more elaborate. Only mint a new relationship term when an existing one would genuinely lose meaning, not just because the article's wording is more specific or colorful. A new relationship term gets a clear `id`, a one-sentence `definition`, and a `direction` field describing which end is earlier/causal, matching the format of existing relationship-type entries. Log it in `new_terms.json` under the relationship-type category, not mixed in with entity terms.

Track every genuinely new term in a running list for this session (don't write into the ontology file itself) — output it in Step 7.

### Full mode only: applying the four additional annotation types

If EXTRACTION MODE is Full, apply this alongside Step 4, on the same paragraph-by-paragraph pass as Step 2 (don't do a separate re-read of the article looking for these — catch them as you go). For any KE or KER where the article's own text states one of the four kinds of qualifier described in "Extraction mode: Simplified vs. Full" above, add the matching field(s), grounded in a verbatim quote exactly like every other evidence-bearing field in this skill. Add the `layers` array to any KE/KER that received a species/circumstance, confounder, or developmental-window annotation. Don't go hunting for these if the article doesn't clearly state one — absence of a qualifier is the default, not something to infer from silence.

## Step 5: Validate and write this article's file now

Before moving to the next article, check: every KE and KER id is unique within this file; every KER's source/target points to a real KE id; every KE has `source_articles`, `source_type`, and `evidence` set; every KER has `evidence` set; every `evidence` value is an actual excerpt from the article's own text or figure (not a paraphrase or something generated to sound plausible); `source_article` (Step 3A) and `references` (Step 3B) are both present; every KE and KER has a `references` field set (Step 3C) — `[]` is fine, missing is not, and every `ref_id` it names actually exists in this file's `references` list. In Full mode, also check that every `species_annotation`, `special_circumstances`, `confounders`, `developmental_window`, and `initiating_event_class` value is backed by a verbatim quote (either the KE/KER's own `evidence` field or, if stated separately, its own quoted text) — not a paraphrase, and not something added because it seemed biologically plausible.

Write `output/<article_slug>_pathway.json` now, containing `source_article`, `key_events`, `key_event_relationships`, and `references`. Do this immediately — don't wait until all articles are processed, so an interrupted run still leaves completed work on disk. Append one line to `output/run_log.md`: article slug, one of processed successfully / processed — no TOPIC-relevant content found / excluded — not relevant to TOPIC / failed to open / no readable text found, plus pages read.

## Step 6: Repeat Steps 1-5 for the next article

Continue through the full ARTICLES list. Each new article gets checked against the original ontology file plus every term minted from earlier articles in this run, so the same concept described differently across articles converges on one ID instead of being reinvented each time.

## Step 7: Merge across articles and produce the remaining output files

Once every article has its own file (Step 5), read them all back in and produce:

- `output/new_terms.json` — every term minted this run that wasn't already in the ontology (including any `possible_duplicate_of` flags), plus which article(s) prompted each one.
- `output/merged_tally.json` — built by joining the per-article files on each KE's `biological_entity_id` (not its local `KE:N` id, which only exists within one article) and each KER's (source entity, target entity, relationship type) tuple. For each, record:
  - `article_count` and `supporting_articles`: how many articles support it, and which ones — the original tally.
  - `distinct_sources_cited` and `cited_sources`: resolve every contributing article's `references` (Step 3C `ref_id`s) back to that article's own reference-list entries (author/year/title), then deduplicate across **all** contributing articles — the same primary source is often cited by more than one review in the batch, and that shouldn't inflate the count. Decide whether two entries are the same paper in this order, never on first author + year alone when titles are available (two different "Jones et al. 2012" papers must stay separate): (1) if both entries have a `doi`, same paper iff the DOIs match (case-insensitive); (2) otherwise, if both have a title, same paper iff the normalized titles match (lowercased, punctuation and extra whitespace stripped) and the years don't conflict; (3) only if a title is missing on either or both sides, fall back to first author + year, and list that pairing in an `ambiguous_source_matches` array in `merged_tally.json` (both entries, which articles they came from) so a human can confirm — don't silently merge or split it. Before writing `merged_tally.json`, re-check that every source merged via this fallback appears in `ambiguous_source_matches`; a fallback merge that isn't listed there is a mistake. Where titles differ slightly because of typos or abbreviation but author and year match, treat as different and list it in `ambiguous_source_matches` too; undercounting a shared source is the safer error than silently merging two different papers. `cited_sources` is the deduplicated list (`{ "first_author": ..., "year": ..., "title": ..., "doi": ... }`); `distinct_sources_cited` is its length. This is a different number from `article_count` on purpose — a KE backed by 1 article citing 4 distinct primary sources is better evidenced than one backed by 3 articles all citing the same single source, and this makes that visible.
  - In Full mode only: a `layers` field (union of every contributing article's `layers` values for this KE/KER) and a `layer_details` array, one entry per contributing article that supplied any Full-mode annotation: `{ "article_slug": "...", "species_annotation": ..., "molecular_basis": ..., "special_circumstances": ..., "confounders": ..., "developmental_window": ..., "initiating_event_class": ... }`, including only the sub-fields that article actually populated. Don't reconcile disagreements between articles here (e.g. one says a branch is species-conditional on rat/human, another gives different species) — list both entries under `layer_details` and let a human notice the discrepancy, same as `single_source_flags` below.
- Within `merged_tally.json`, a `single_source_flags` array: any key event or relationship supported by only one article where the other articles clearly do discuss that same region of the pathway (not just articles that never touched that topic at all). Don't judge whether these are real biological differences or extraction misses — just surface them.
- A separate `single_citation_flags` array: any KE/KER where `article_count` is more than 1 but `distinct_sources_cited` is only 1 — several articles all repeating the same single primary source is a materially weaker claim than the article count alone suggests, and it's a distinct condition from `single_source_flags` (which is about article coverage, not citation depth), so keep the two arrays separate rather than merging them.

## Optional: post-extraction wording pass

This is a **separate, opt-in step the user must explicitly ask for** — never run it automatically as part of Steps 1-7, and never run it until every article's file is written and Step 7's merge is complete.

Rationale: checking AOP-Wiki for a term's standard phrasing requires actually opening that term's entry, which shows its full context — upstream/downstream key events, other pathways it belongs to. During extraction (Steps 1-7), that exposure risks quietly reshaping what gets extracted or how events connect, which is exactly what the hard constraint at the top of SKILL.md forbids. Once extraction is fully done and the merged tally is on disk, that risk is gone — there's nothing left for a wording lookup to bias, because the structure is already fixed.

If the user asks for this pass:

1. Read `output/merged_tally.json` and `output/new_terms.json` — the term set is now closed; this step relabels, it never adds, removes, or reconnects key events or relationships.
2. For each `biological_entity_id` or relationship type that doesn't already have an HGNC/PubChem/SNOMED-style name, check AOP-Wiki for standard phrasing of that specific, already-identified concept.
3. Don't rewrite the existing per-article or merged files in place. Write suggestions to `output/wording_suggestions.json`, one entry per term: `{ "term_id": "...", "current_label": "...", "suggested_label": "...", "source": "AOP-Wiki KE:1234" }`. A human applies these deliberately (e.g. as a find-and-replace of the label, not the id, across the ontology) rather than having them silently take effect.

## What each output file is, in plain language

A run leaves several files in `output/`. Their names don't say much on their own — make sure the user handing this off knows what's in each one and what they'd actually use it for.

**`<article_slug>_pathway.json`** (one per article, e.g. `smith_2019_pathway.json`)
The single-article extraction: this article's key events, its key event relationships, its own bibliographic details, and a short list of just the sources actually cited inside that evidence (not the article's full bibliography — see Step 3B), each one assigned a `ref_id`. Every key event and relationship carries a `references` field naming the specific `ref_id`(s) that back it (Step 3C) — so a claim can be traced to its exact citation, not just "somewhere in this article's bibliography." That reference list sits at the end of the file, after the pathway content, so opening the file shows the actual extraction first. Written the moment that article finishes, so if the run stops partway through, whichever of these already exist are complete and safe to use — nothing partial. Open one of these to sanity-check that a specific article was read correctly, independent of anything else in the batch.

**`run_log.md`**
A one-line-per-article log: which articles were processed, which were excluded as off-topic (Step 1b), which were processed but yielded no TOPIC-relevant content, which failed to open or had no readable text, how many pages were read. First stop if something seems off — e.g. if an article expected to contribute is missing from the tally, this file says whether it was excluded, came up empty, or failed outright, rather than just contributing nothing with no explanation.

**`new_terms.json`**
Every term (biological entity or relationship type) that didn't already exist in the ontology file and had to be minted during this run, plus which article(s) prompted it. Review this before adding anything permanently to the ontology — these are new, unreviewed additions. Anything carrying `possible_duplicate_of` is a term the run wasn't confident was new — a prompt for a human to decide by hand whether it should actually merge into the existing term it resembles.

**`merged_tally.json`**
The actual deliverable. Every key event and relationship, merged across all articles that mention it, with two separate counts: `article_count` (how many articles support it) and `distinct_sources_cited` (how many distinct primary references those articles cite as evidence, deduplicated across the whole batch). A key event backed by 3 of 4 articles is a stronger claim than one backed by 1 — and one backed by 3 articles that each cite a different primary source is stronger still than one backed by 3 articles all citing the same source. This file is what makes both of those visible, which no single article's file can show on its own. In Full mode, entries also carry `layers` and `layer_details` wherever an article stated a species/circumstance qualifier, a confounder, or a developmental window.

**`single_source_flags`** (an array inside `merged_tally.json`, not its own file)
Calls out key events or relationships that only one article supports, in a region of the pathway the other articles clearly do discuss. A deliberate "look here," not a verdict — the run doesn't judge whether that's a real point of biological disagreement between articles or a place where extraction went wrong on one side, a human makes that call.

**`single_citation_flags`** (an array inside `merged_tally.json`, not its own file)
Calls out key events or relationships backed by more than one article but only one distinct primary source between them — several reviews citing the same underlying study isn't the same as independent corroboration, and this is where that distinction becomes visible instead of getting flattened into a reassuring-looking article count.

**`wording_suggestions.json`** (only if the optional post-extraction wording pass ran)
Proposed relabelings for terms that don't already have a standard name, sourced from AOP-Wiki phrasing. Nothing in the actual data changes when this file is written — these are suggestions to apply by hand (swapping a label, not an id) if the user chooses to.

## Reference pathway example

Anchors format and granularity only (Step 2). No matching source text exists for this — it's not a "paragraph in, JSON out" example. It predates the `evidence` field (won't show a filled-in quote) and doesn't show `references`, since it's plain-chain and Simplified-mode-shaped. This one is a plain linear chain — swap in a branching example if a run needs to model different topology.

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

Anchors the four Full-mode annotation types (species/circumstance branching shown here; confounders, developmental windows, and initiating-event class follow the same attach-to-KE/KER, quote-backed pattern). Also predates a filled-in `references` array in this excerpt — a real run's evidence would carry actual `ref_id`s, not an empty list.

```json
{
  "aop_id": "drug@hepatotoxicity_apap_1",
  "key_events": [
    { "id": "KE:0", "biological_entity_id": "cyp2e1", "mie": true, "adverse_outcome": false, "references": [] },
    { "id": "KE:1", "biological_entity_id": "parent_drug", "mie": false, "adverse_outcome": false, "references": [] },
    { "id": "KE:2", "biological_entity_id": "napqi", "mie": false, "adverse_outcome": false, "references": [] },
    {
      "id": "KE:3",
      "biological_entity_id": "glucuronidation_capacity",
      "mie": false,
      "adverse_outcome": false,
      "species_annotation": { "cat": "absent", "human": "present" },
      "molecular_basis": "ugt1a6_pseudogene_in_felids",
      "layers": ["species_conditional"],
      "references": []
    },
    { "id": "KE:4", "biological_entity_id": "gsh_depletion", "mie": false, "adverse_outcome": false, "references": [] },
    {
      "id": "KE:5",
      "biological_entity_id": "hepatocyte_necrosis",
      "mie": false,
      "adverse_outcome": true,
      "species_annotation": { "cat": "therapeutic_dose", "human": "overdose_only" },
      "layers": ["species_conditional"],
      "references": []
    }
  ],
  "key_event_relationships": [
    { "id": "KER:1", "source": "KE:1", "target": "KE:0", "relationship": ["metabolized_by"], "references": [] },
    { "id": "KER:2", "source": "KE:0", "target": "KE:2", "relationship": ["oxidizes_to", "forms"], "references": [] },
    {
      "id": "KER:3",
      "source": "KE:2",
      "target": "KE:3",
      "relationship": ["intercepted_by", "detoxified_by"],
      "gate_type": "species_conditional",
      "active_in": ["human"],
      "absent_in": ["cat"],
      "layers": ["species_conditional"],
      "references": []
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
      "references": []
    },
    { "id": "KER:5", "source": "KE:4", "target": "KE:5", "relationship": ["leads_to", "causes"], "references": [] }
  ]
}
```
