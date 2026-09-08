---
name: pathway-extraction
version: 1.1.1
repository: git@github.com:lovechar1/pathwise-pathway-extraction.git
description: Extract a biological pathway (molecular initiating events, key events, key event relationships, adverse outcomes) from a batch of PDF articles on one topic, using ONLY what each article's own text and figures state — never AOP-Wiki, never background/training knowledge to fill gaps or resolve ambiguity. Aligns every term against a shared reference ontology JSON (reuse existing IDs, flag uncertain matches, mint new terms with HGNC/PubChem/SNOMED-style preference), then merges across all articles into a tallied pathway showing how many articles support each key event and relationship. Use this whenever the user provides a folder or list of PDFs plus a topic and asks to "extract the pathway," "build an AOP from these papers," "align these against my ontology," or otherwise wants a strictly source-grounded key-event/key-event-relationship structure out of literature — even if they don't use the words "AOP" or "ontology." Do NOT use this for weight-of-evidence grading, dose/species/exposure data extraction, narrative literature summaries, or anything that should reference the AOP-Wiki database or general toxicology knowledge — those belong to a different skill.
compatibility: Needs a host that can read PDFs page-by-page (Read tool with page ranges) and write files. Designed for Claude Code / Claude Code-like sessions where the whole batch runs in one continuous conversation.
---

# PathWise Ontology Extraction

## The one rule that overrides everything else below

**Every key event and relationship must come from what the article you're currently reading actually says — full stop.** If you recognize the general mechanism from training data, the AOP-Wiki, a textbook, or any other article, that recognition must never fill a gap, resolve an ambiguity, order the steps, or shape the structure. If an article is vague, incomplete, or organizes something unexpectedly, extract it exactly that way — vague or unusual — rather than smoothing it into the version you already expect. If you can't point to a specific quoted passage supporting a candidate key event or relationship, leave it out.

This extends specifically to the AOP-Wiki: never search it, never check whether a matching pathway already exists there, never let its structure influence what you extract, and never look it up at all during extraction — not even to borrow wording for a term. There is no exception during Steps 1-7. The reason a "just for wording" carve-out doesn't work: looking up a key event on AOP-Wiki necessarily surfaces the whole entry — its upstream/downstream events, the pathways it belongs to — and once that's in context, "don't let it influence structure" is asking you not to be influenced by something you've already read. The lookup itself creates the exposure it's supposed to prevent.

Why this matters: the entire point of this pipeline is to surface pathways that may be new, or that branch differently from what's already registered. Treating an existing AOP (or your own prior knowledge of "how this pathway usually goes") as ground truth defeats that purpose before the run even starts.

If the user wants terms reworded to match AOP-Wiki's standard phrasing, that's available as a separate, optional, later pass — see "Optional: post-extraction wording pass" in [references/procedure.md](references/procedure.md) — and only runs after the full batch's structure is already final and written to disk. Never fold it into the main run.

## What this skill is not

It doesn't grade weight of evidence beyond a simple article count, doesn't extract dose/species/exposure study parameters, and doesn't produce a narrative summary. If the user wants any of that, it's a different job — say so rather than quietly adding it.

## Required inputs — ask for these, don't wait for a pre-filled prompt

This skill is meant to be invoked with nothing more than "extract the pathway for X" — it is not a template the user fills in ahead of time. Unless the triggering message already states an input plainly, ask for it directly in chat before doing anything else. Don't guess, and don't start Step 1 on a partial set:

- **TOPIC** — required. The mechanism/subject to extract. Scope extraction strictly to this; if an article discusses other mechanisms in passing, ignore them. When TOPIC names more than one element (e.g. "X and Y"), a candidate key event or relationship must connect — directly, or through the chain — to every element named, not just one. Being related to only one half of a multi-part topic isn't enough to keep it; that's exactly how a plausible-looking but off-topic branch sneaks in (e.g. a CFTR-related mechanism that never actually touches oxidative stress, when the topic is "oxidative stress and CFTR").
- **TOPIC DESCRIPTION** — optional but ask for it anyway rather than skipping straight past it; the user can decline. A short 1-3 sentence elaboration of TOPIC's scope: which direction of causation, which mechanism type (e.g. genetic vs. acquired), which organ or exposure. Its only job is to disambiguate what counts as in-scope subject matter — it must never describe what the pathway's steps or structure should turn out to be. If it reads like a preview of key events in order, it's doing the wrong job and will bias extraction exactly the way the hard constraint above forbids; rewrite it as a boundary statement instead. Use it the same way as TOPIC itself when deciding whether something belongs.
- **ARTICLES** — required. A folder path (list every PDF in it, process in filename order) or an explicit ordered file list. If it's a folder, confirm with the user that it contains only the PDFs meant for this run — anything else sitting in there gets swept in too and processed as if it belonged.
- **ONTOLOGY FILE** — path to the reference ontology JSON. If the user doesn't name one, ask whether they have an existing ontology file to reuse before defaulting to `pathwise_ontology.json` in the working directory — reusing their existing file is what makes terminology converge across separate runs, so don't default silently past one that already exists. Confirm whichever path is actually in play is present and readable before starting Step 1, since every term-alignment decision depends on it.

## Workflow overview

Process articles **one at a time, in this same conversation** — later articles must see every term already minted by earlier ones in this run, so this cannot be parallelized or split across sessions. For each article: read it completely (chunked, max 20 pages per call, don't start extracting after only the first chunk), confirm it's actually relevant to TOPIC before extracting anything from it, extract its pathway paragraph-by-paragraph with verbatim evidence quotes, pull its bibliographic metadata and reference list, align every term against the ontology plus everything minted so far this run, validate, and write that article's output file immediately (so an interrupted run still leaves completed work on disk). Once every article is done, merge all per-article files into a tallied cross-article output.

The full mechanics — the relevance check, exact JSON schemas, the granularity-anchoring reference example, the terminology-alignment decision procedure, validation checklist, and merge logic — are in **[references/procedure.md](references/procedure.md)**. Read it before starting Step 1 of an actual run; it is not optional background reading, it's the specification.

## Final report

When the full batch is done, report only counts: articles processed successfully vs. excluded as off-topic vs. failed to read, key events and relationships in the merged tally, new terms minted (and how many are flagged `possible_duplicate_of`), and single-source flags. Don't interpret the results or draw biological conclusions — that's for the human reviewing the output.

## What each output file is, for the user

The user will be looking at files in `output/` whose names don't say much on their own. When handing off the results, make sure they know:

- **`<article_slug>_pathway.json`** (one per article) — that single article's extraction only: its key events, relationships, and a short list (at the very end of the file) of just the sources actually cited inside that evidence — not the article's full bibliography, which can run into the hundreds for a review article and would bury the pathway content. Written the moment that article finishes, so a stopped run still leaves complete, usable files behind for whichever articles got through.
- **`run_log.md`** — one line per article: processed / excluded as off-topic / failed to open / no readable text, plus pages read. The first place to check if an expected article seems to be missing from the tally.
- **`new_terms.json`** — every ontology term minted this run, unreviewed, plus which article(s) prompted it. Anything with `possible_duplicate_of` is the run flagging its own uncertainty — a human call, not a resolved merge.
- **`merged_tally.json`** — the actual deliverable: every key event/relationship merged across articles with a count of how many support it, plus a `single_source_flags` array inside it calling out anything backed by only one article where others clearly discuss the same region. That flag is a "look here," not a verdict on whether it's a real disagreement or an extraction miss.
- **`wording_suggestions.json`** — only appears if the optional post-extraction wording pass ran. Proposed relabelings, not applied automatically.

See "What each output file is, in plain language" in [references/procedure.md](references/procedure.md) if the user wants the fuller version of this.
