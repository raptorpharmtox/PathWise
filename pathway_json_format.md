# PathWise Pathway JSON Format

## Introduction

PathWise is an open-source biological pathway repository built on the principle that biological knowledge should be structured, citable, and community-maintainable — the same way open-source software is. Each pathway in PathWise is represented as a single JSON file that encodes the biological logic of a pathway: the key events that occur, the relationships between those events, and the scientific literature that justifies each step.

This document describes the PathWise JSON format and explains the intent behind each section. It is written for contributors who are building new pathways, as well as for developers and researchers who want to understand how the data is structured.

**The PathWise Core Ontology** (version 1.0.1) is the ontology that underlies the PathWise JSON format. Nearly every identifier used in a pathway file — biological entities, relationship types, organism names, anatomical locations, and sex classifications — must resolve to a term in the ontology. This ensures that pathways are consistent, machine-readable, and queryable across the repository. The ontology file (`pathwise_ontology.json`) is maintained separately and should be consulted when building a pathway file.

A PathWise JSON pathway file has six top-level sections:

1. `aop_id` — a unique identifier for the pathway
2. `versions` — a versioned authorship record with citable DOIs
3. `concept_doi` — a persistent DOI representing the pathway across all versions
4. `key_events` — the biological entities and states that define the pathway's nodes
5. `key_event_relationships` — the directional relationships between key events, each backed by evidence
6. `literature_cited` — a bibliography registry for all references used in the file

---

## Format Specifics

### AOP ID

**Field:** `aop_id`
**Type:** String
**Required:** Yes
**Ontology reference:** `biological pathways` category

The `aop_id` is a unique identifier for this pathway within the PathWise repository. It must correspond to a term registered in the `biological pathways` category of the PathWise Core Ontology. The pathway entry in the ontology defines the pathway's label, a brief definition, the sex(es) it applies to, and the organisms for which it has been characterized.

The ID format is:

```
<stressor_or_mie>@<adverse_outcome_or_endpoint>
```

Where the left side describes the initiating stressor or molecular initiating event, and the right side describes the adverse outcome or biological endpoint. If the stressor is not yet characterized, use `unk` as the namespace.

**Examples of registered pathway IDs:**

| ID | Label |
|---|---|
| `unk@steatohepatitis_1` | Steatohepatitis with unknown etiology (PPARa/DHB4 axis) |
| `unk@steatohepatitis_2` | Steatohepatitis with unknown etiology (PPARa/SHP axis) |
| `fluid_buildup_in_the_lungs@death` | Fluid buildup in the lungs leading to death |
| `oxidative_stress@lung_function` | Oxidative stress leading to impaired lung function |

**Notes:**
- Before submitting a new pathway file, register the `aop_id` in the ontology's `biological pathways` category. A pathway JSON file with an unregistered `aop_id` will not be accepted.
- The `_1`, `_2` suffix convention allows for multiple pathways within the same biological domain that differ in mechanism, stressor, or molecular axis.
- The `aop_id` is stable and does not change across versions of the pathway file.

---

### Versions

**Field:** `versions`
**Type:** Array of version objects
**Required:** Yes (at least one entry upon first publication)

The `versions` array tracks the authorship and citable history of this pathway file. Each time a substantive change is made to the pathway — adding or removing key events, modifying relationships, updating evidence — a new version entry should be added. The corresponding updated file is deposited to Zenodo, which mints a new Version DOI.

**Each version object contains:**

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | String | Yes | Semantic version number (e.g., `"1.0.0"`) |
| `date` | String | Yes | ISO 8601 date of this version (e.g., `"2026-04-15"`) |
| `doi` | String | Yes (after publication) | The Zenodo Version DOI for this specific snapshot of the file |
| `authors` | Array | Yes | List of contributors to this version |
| `changelog` | String | Yes | Brief description of what changed in this version |

**Each author object within a version contains:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Author name, formatted as "Last F" or full name |
| `orcid` | String | Recommended | Author's ORCID identifier |
| `role` | String | Yes | Either `"creator"` (original author) or `"contributor"` (subsequent contributor) |

**Workflow note:** When submitting a new pathway via pull request, leave the `doi` field as `"TBD"`. PathWise maintainers will complete the Zenodo deposit upon approval and insert the minted DOI before merging.

**Example:**

```json
"versions": [
  {
    "version": "1.0.0",
    "date": "2026-04-15",
    "doi": "10.5281/zenodo.XXXXXXX",
    "authors": [
      {
        "name": "Burgoon LR",
        "orcid": "0000-0001-2345-6789",
        "role": "creator"
      }
    ],
    "changelog": "Initial release of cardiac development pathway."
  },
  {
    "version": "1.1.0",
    "date": "2026-06-01",
    "doi": "10.5281/zenodo.YYYYYYY",
    "authors": [
      {
        "name": "Burgoon LR",
        "orcid": "0000-0001-2345-6789",
        "role": "creator"
      },
      {
        "name": "Smith J",
        "orcid": "0000-0002-9876-5432",
        "role": "contributor"
      }
    ],
    "changelog": "Added KE:11 (looping of heart tube) and KER:9 linking heart tube to looping."
  }
]
```

---

### Concept DOI

**Field:** `concept_doi`
**Type:** String
**Required:** Yes (after first publication; `"TBD"` for new submissions)

The Concept DOI is a persistent identifier that represents this pathway *across all versions*. Unlike a Version DOI — which resolves to a specific, frozen snapshot — the Concept DOI always resolves to the most recent published version of the pathway on Zenodo. This allows researchers to cite the pathway as an evolving, living document while still enabling version-specific citation when reproducibility requires it.

**Important:** The Concept DOI is assigned by Zenodo at the time of first publication and cannot be reserved in advance. When submitting a new pathway, set this field to `"TBD"`.

**Example:**

```json
"concept_doi": "10.5281/zenodo.ZZZZZZZ"
```

**When to cite which DOI:**
- Cite the **Concept DOI** when referencing the pathway in general (e.g., "the PathWise cardiac development pathway").
- Cite the **Version DOI** from `versions` when reproducibility matters — for example, in a regulatory submission or a publication where readers need to access the exact pathway state you used.

---

### Key Events

**Field:** `key_events`
**Type:** Array of key event objects
**Required:** Yes
**Ontology references:** `biological entities`, `organisms`, `sex`, `locations` categories

Key events (KEs) are the nodes of the pathway. Each key event represents a discrete biological entity, state, or process that is part of the causal chain being described. Every key event must reference a term from the `biological entities` category of the PathWise Core Ontology via the `biological_entity_id` field.

The ontology currently contains 150 registered biological entities, each with an `id`, a human-readable `label`, a `definition`, and one or more `locations` indicating where in the body that entity is found. If the biological entity you need does not yet exist in the ontology, submit a new ontology term alongside your pathway pull request.

**Each key event object contains:**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | Yes | Unique identifier within this file, formatted as `"KE:N"` where N is an integer starting at 0 |
| `biological_entity_id` | String | Yes | Must match a term `id` from the `biological entities` category of the ontology |
| `mie` | Boolean | Yes | `true` if this is the Molecular Initiating Event; otherwise `false` |
| `adverse_outcome` | Boolean | Yes | `true` if this is the adverse outcome (terminal endpoint); otherwise `false` |
| `sex` | Array of Strings | Recommended | One or more term IDs from the `sex` category of the ontology |
| `organism` | Array of Strings | Recommended | One or more term IDs from the `organisms` category of the ontology |

**Controlled vocabulary — `sex` field** (from `sex` category of ontology):

| ID | Meaning |
|---|---|
| `male` | Pathway or event is specific to males |
| `female` | Pathway or event is specific to females |
| `hermaphrodite` | Specific to hermaphroditic organisms |
| `not_known_to_be_sex_specific` | No evidence of sex specificity (absence of evidence, not evidence of absence) |
| `known_to_be_sex_neutral` | Empirically established to occur in both sexes |
| `believed_to_be_sex_neutral` | Believed to occur in both sexes but data are limited |
| `intersex` | Specific to intersex individuals |

**Controlled vocabulary — `organism` field** (from `organisms` category of ontology):

| ID | Label |
|---|---|
| `human` | Homo sapiens |
| `mammals` | Mammals (general) |
| `mouse` | Mus musculus |
| `rat` | Rattus norvegicus |

**Notes:**
- A pathway should have exactly one `mie: true` key event and at least one `adverse_outcome: true` key event, unless the pathway describes a normal biological process without a defined stressor (in which case `mie` may be `false` for all events).
- Key event IDs (`KE:0`, `KE:1`, etc.) are local to this file and do not need to match IDs in other pathway files.
- The special biological entity `unknown_key_event` is available as a placeholder when a key event in the causal chain is not yet characterized.

**Example:**

```json
"key_events": [
  {
    "id": "KE:0",
    "biological_entity_id": "unknown_key_event",
    "mie": true,
    "adverse_outcome": false,
    "sex": ["known_to_be_sex_neutral"],
    "organism": ["human", "mouse", "rat"]
  },
  {
    "id": "KE:1",
    "biological_entity_id": "ppara",
    "mie": false,
    "adverse_outcome": false,
    "sex": ["known_to_be_sex_neutral"],
    "organism": ["human", "mouse", "rat"]
  },
  {
    "id": "KE:2",
    "biological_entity_id": "oxidative_stress",
    "mie": false,
    "adverse_outcome": true,
    "sex": ["known_to_be_sex_neutral"],
    "organism": ["human", "mouse", "rat"]
  }
]
```

---

### Key Event Relationships

**Field:** `key_event_relationships`
**Type:** Array of KER objects
**Required:** Yes
**Ontology reference:** `relationship types` category

Key event relationships (KERs) are the directed edges of the pathway. Each KER asserts that one key event causally leads to, or is a precondition for, another key event. The `relationship` field must use term IDs from the `relationship types` category of the PathWise Core Ontology.

KERs are the primary location where scientific evidence is attached in PathWise. Each KER should be supported by one or more literature references, and crucially, each reference includes a `relevance` statement — a brief explanation of how that specific paper supports this causal step *in the context of this pathway*. This is one of PathWise's defining features: it is not sufficient to cite a paper that discusses two entities; you must explain why that paper supports this directional relationship here. This is the intellectual contribution of the pathway author and what distinguishes PathWise from a raw DOI list.

**Each KER object contains:**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | Yes | Unique identifier within this file, formatted as `"KER:N"` where N starts at 1 |
| `source` | String | Yes | The `id` of the upstream key event |
| `target` | String | Yes | The `id` of the downstream key event |
| `relationship` | Array of Strings | Yes | One or more term IDs from the `relationship types` category of the ontology |
| `references` | Array | Recommended | Literature references supporting this KER in this pathway's context |

**Each reference object within a KER contains:**

| Field | Type | Required | Description |
|---|---|---|---|
| `ref_id` | String | Yes | Must match a `ref_id` from the top-level `literature_cited` registry |
| `relevance` | String | Yes | 1–3 sentences explaining how this paper supports this specific KER in this pathway |

**Controlled vocabulary — `relationship` field** (from `relationship types` category of ontology):

The ontology defines 51 relationship types. Each has a `direction` indicating whether it is activating (`+`), inhibitory (`-`), or bidirectional/neutral (`<>`). A selection of commonly used types:

| ID | Label | Direction |
|---|---|---|
| `activates` | activates | `+` |
| `inhibits` | inhibits | `-` |
| `increases` | increases | `+` |
| `decreases` | decreases | `-` |
| `upregulates` | upregulates | `+` |
| `downregulates` | downregulates | `-` |
| `causes` | causes | `+` |
| `binds_to` | binds to | `<>` |
| `phosphorylates` | phosphorylates | `+` |
| `transcribes` | transcribes | `+` |
| `synthesizes` | synthesizes | `+` |
| `degrades` | degrades | `-` |
| `translocates_to` | translocates to | `<>` |
| `forms_complexes_with` | forms complexes with | `<>` |
| `unknown` | unknown | `<>` |

The full list of 51 relationship types is available in the ontology file under the `relationship types` category. Use the most specific term available. Multiple relationship types may be listed if a single descriptor is insufficient.

**Notes:**
- A KER with no references is permitted for foundational, textbook-level relationships, but contributors are strongly encouraged to provide at least one reference per KER.
- References listed in a KER's `references` array must have a corresponding entry in the top-level `literature_cited` section.
- The `relationship` array should reflect the mechanistic nature of the interaction as precisely as possible. Prefer specific terms (e.g., `phosphorylates`) over generic ones (e.g., `activates`) when the mechanism is known.

**Example:**

```json
"key_event_relationships": [
  {
    "id": "KER:1",
    "source": "KE:1",
    "target": "KE:2",
    "relationship": ["activates"],
    "references": [
      {
        "ref_id": "REF:001",
        "relevance": "Demonstrates that PPARa activation drives expression of pro-oxidant enzymes in hepatocytes, directly supporting the KE:1 → KE:2 transition in this steatohepatitis pathway."
      },
      {
        "ref_id": "REF:002",
        "relevance": "Provides in vivo evidence in PPARa-null mice showing attenuation of oxidative stress markers, confirming the directional dependence of KE:2 on KE:1 in this pathway."
      }
    ]
  }
]
```

---

### Literature Cited

**Field:** `literature_cited`
**Type:** Array of citation objects
**Required:** Yes (if any KERs contain references)

The `literature_cited` section is the bibliography registry for the entire pathway file. It contains full citation metadata for every reference used anywhere in the file. References are keyed by a short `ref_id` (e.g., `"REF:001"`) that is used throughout the KER `references` arrays to link evidence to specific relationships without repeating full citation data.

Think of `literature_cited` as the record of *what a paper is*, while the `relevance` field inside each KER is the statement of *why that paper matters here*.

**Each citation object contains:**

| Field | Type | Required | Description |
|---|---|---|---|
| `ref_id` | String | Yes | Short unique identifier used to cross-reference from KERs (e.g., `"REF:001"`) |
| `doi` | String | Recommended | The paper's DOI, if available |
| `pmid` | String | Recommended | PubMed ID, if available |
| `authors` | Array of Strings | Yes | Author list, formatted as "Last F" |
| `year` | Integer | Yes | Year of publication |
| `title` | String | Yes | Full title of the paper |
| `journal` | String | Yes | Journal name (abbreviated or full) |
| `volume` | String | Optional | Journal volume |
| `pages` | String | Optional | Page range (e.g., `"123-145"`) |

**Notes:**
- Provide at minimum a `doi` or `pmid` for every reference so readers can retrieve the original source. A reference with neither will not be accepted.
- `ref_id` values are local to this file. `REF:001` in one pathway file has no relationship to `REF:001` in another.
- Assign `ref_id` values sequentially as references are added. Do not reuse or skip IDs.
- Every `ref_id` appearing in a KER's `references` array must have a corresponding entry here. Orphaned `ref_id` values will cause validation errors.

**Example:**

```json
"literature_cited": [
  {
    "ref_id": "REF:001",
    "doi": "10.1016/j.jhep.2020.01.001",
    "pmid": "32145678",
    "authors": ["Kersten S", "Stienstra R"],
    "year": 2017,
    "title": "The role and regulation of the peroxisome proliferator activated receptor alpha in human liver",
    "journal": "Biochimie",
    "volume": "136",
    "pages": "75-84"
  },
  {
    "ref_id": "REF:002",
    "doi": "10.1038/nm.3279",
    "pmid": "24177717",
    "authors": ["Pawlak M", "Lefebvre P", "Staels B"],
    "year": 2015,
    "title": "Molecular mechanism of PPARa action and its impact on lipid metabolism, inflammation and fibrosis in non-alcoholic fatty liver disease",
    "journal": "Journal of Hepatology",
    "volume": "62",
    "pages": "720-733"
  }
]
```

---

## Complete Example

The following is a minimal but complete PathWise pathway JSON file illustrating all sections working together. Ontology-controlled fields are annotated in comments (note: JSON does not support comments; these are for illustration only).

```json
{
  "aop_id": "unk@steatohepatitis_1",
  "concept_doi": "10.5281/zenodo.ZZZZZZZ",
  "versions": [
    {
      "version": "1.0.0",
      "date": "2026-04-15",
      "doi": "10.5281/zenodo.XXXXXXX",
      "authors": [
        {
          "name": "Burgoon LR",
          "orcid": "0000-0001-2345-6789",
          "role": "creator"
        }
      ],
      "changelog": "Initial release of steatohepatitis pathway (PPARa/DHB4 axis)."
    }
  ],
  "key_events": [
    {
      "id": "KE:0",
      "biological_entity_id": "unknown_key_event",
      "mie": true,
      "adverse_outcome": false,
      "sex": ["known_to_be_sex_neutral"],
      "organism": ["human", "mouse", "rat"]
    },
    {
      "id": "KE:1",
      "biological_entity_id": "ppara",
      "mie": false,
      "adverse_outcome": false,
      "sex": ["known_to_be_sex_neutral"],
      "organism": ["human", "mouse", "rat"]
    },
    {
      "id": "KE:2",
      "biological_entity_id": "dhb4_hsd17b4",
      "mie": false,
      "adverse_outcome": false,
      "sex": ["known_to_be_sex_neutral"],
      "organism": ["human", "mouse", "rat"]
    },
    {
      "id": "KE:3",
      "biological_entity_id": "oxidative_stress",
      "mie": false,
      "adverse_outcome": true,
      "sex": ["known_to_be_sex_neutral"],
      "organism": ["human", "mouse", "rat"]
    }
  ],
  "key_event_relationships": [
    {
      "id": "KER:1",
      "source": "KE:1",
      "target": "KE:2",
      "relationship": ["activates"],
      "references": [
        {
          "ref_id": "REF:001",
          "relevance": "Demonstrates PPARa-dependent transcriptional activation of DHB4/HSD17B4 in hepatocytes, directly supporting the KE:1 → KE:2 transition in this pathway."
        }
      ]
    },
    {
      "id": "KER:2",
      "source": "KE:2",
      "target": "KE:3",
      "relationship": ["causes"],
      "references": [
        {
          "ref_id": "REF:002",
          "relevance": "Provides mechanistic evidence that DHB4/HSD17B4 activity generates peroxisomal H2O2 as a byproduct, driving hepatocellular oxidative stress consistent with the KE:2 → KE:3 transition."
        }
      ]
    }
  ],
  "literature_cited": [
    {
      "ref_id": "REF:001",
      "doi": "10.1016/j.bbalip.2012.09.001",
      "pmid": "23000205",
      "authors": ["Kersten S"],
      "year": 2014,
      "title": "Integrated physiology and systems biology of PPARalpha",
      "journal": "Molecular Metabolism",
      "volume": "3",
      "pages": "354-371"
    },
    {
      "ref_id": "REF:002",
      "doi": "10.1042/BST20140311",
      "pmid": "25619263",
      "authors": ["Baes M", "Van Veldhoven PP"],
      "year": 2016,
      "title": "Mouse models for peroxisome biogenesis defects and beta-oxidation enzyme deficiencies",
      "journal": "Biochimica et Biophysica Acta",
      "volume": "1822",
      "pages": "1489-1500"
    }
  ]
}
```
