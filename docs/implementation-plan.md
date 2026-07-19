# Implementation Plan: Swiggy Instamart Cross-Category Discovery Engine

> **Document Type:** Phase-Wise Implementation Plan  
> **Version:** 1.0  
> **Last Updated:** 2026-07-19  
> **Derived From:** [`problemStatement.md`](./problemStatement.md) · [`architecture.md`](./architecture.md)  
> **Runtime Model:** 100% browser-native · Vanilla HTML/CSS/JS · External LLM REST API

---

## Table of Contents

- [Phase 0 — Groundwork & Initialization](#phase-0--groundwork--initialization)
- [Phase 1 — Data Ingest & Cleaning Gates](#phase-1--data-ingest--cleaning-gates)
- [Phase 2 — Map-Reduce Reasoning Execution Core](#phase-2--map-reduce-reasoning-execution-core)
  - [Phase 2a — Stage 1: In-Browser Map Engine + Stage 2: LLM Reduce](#phase-2a--stage-1-in-browser-map-engine--stage-2-llm-reduce)
  - [Phase 2b — Post-Reduce Client-Side Classification Engine](#phase-2b--post-reduce-client-side-classification-engine)
- [Phase 3 — Quote Trust Verification & Fallbacks](#phase-3--quote-trust-verification--fallbacks)
- [Phase 4 — PM Executive Dashboard UI](#phase-4--pm-executive-dashboard-ui)
- [Phase 5 — Reviewer Validation & Quality Polish](#phase-5--reviewer-validation--quality-polish)
- [Appendix A — Full File Manifest](#appendix-a--full-file-manifest)
- [Appendix B — Constraint Quick-Reference](#appendix-b--constraint-quick-reference)

---

## Phase 0 — Groundwork & Initialization

### Core Objective

Establish the complete ES6 project scaffold, prepare the decoupled baseline datasets (`raw_playstore_main.json`, `raw_playstore_instamart.json`, `raw_appstore.json`, `raw_reddit.json` with 800+ multi-source review records combined), and lay out all documentation templates. Upon completion of this phase, a developer can open `src/index.html` in a browser and see a valid (empty-state) application shell with zero runtime errors.

---

### Detailed Task Checklist

#### 0.1 — Project Folder Structure

Create the canonical directory tree defined in [`architecture.md` §6](./architecture.md#6-file--folder-structure):

```
NL_Swiggy_Instamart/
|
+-- docs/
|   +-- problemStatement.md
|   +-- architecture.md
|   +-- implementation-plan.md          # [NEW] This document
|
+-- data/
|   +-- raw_playstore_main.json         # [NEW] PlayStore flagship baseline
|   +-- raw_playstore_instamart.json    # [NEW] PlayStore standalone instamart baseline
|   +-- raw_appstore.json               # [NEW] AppStore baseline records
|   +-- raw_reddit.json                 # [NEW] Reddit baseline records
|
+-- src/
|   +-- index.html                      # [NEW] App shell
|   +-- styles/
|   |   +-- index.css                   # [NEW] Design system skeleton
|   |
|   +-- pipeline/
|   |   +-- ingestion.js                # [STUB] Export: loadBaseline(), parseUpload()
|   |   +-- normalization.js            # [STUB] Export: normalize()
|   |   +-- piiScrubber.js              # [STUB] Export: scrub()
|   |   +-- clustering.js               # [STUB] Export: clusterReviews()
|   |   +-- ranking.js                  # [STUB] Export: rankThemes()
|   |   +-- quoteTrust.js               # [STUB] Export: verifyQuotes()
|   |
|   +-- edgeCases/
|   |   +-- allNoise.js                 # [STUB] Export: handleAllNoise()
|   |   +-- monolith.js                 # [STUB] Export: handleMonolith()
|   |
|   +-- llm/
|   |   +-- apiClient.js                # [STUB] Export: callLLM()
|   |
|   +-- ui/
|   |   +-- metricsBar.js               # [STUB] Export: renderMetrics()
|   |   +-- frictionMatrix.js           # [STUB] Export: renderMatrix()
|   |   +-- categoryDeepDive.js         # [STUB] Export: renderDeepDive()
|   |   +-- experimentBlueprint.js      # [STUB] Export: renderBlueprint()
|   |
|   +-- app.js                          # [NEW] Pipeline orchestrator & state machine
|
+-- README.md                           # [UPDATE] Add project description + quickstart
+-- .gitignore
```

**Action items:**

| #   | Task                                          | File(s)                         |
|-----|-----------------------------------------------|---------------------------------|
| 0.1a | Create all directories and empty stub files  | All `src/**/*.js`               |
| 0.1b | Write stub ES6 module exports in every `.js` | Each file exports named functions with `// TODO` bodies |
| 0.1c | Ensure every stub returns a deterministic null/empty-array so the orchestrator can boot without errors | All stubs |

---

#### 0.2 — Baseline Dataset Preparation (`data/raw_playstore_main.json`, `data/raw_playstore_instamart.json`, `data/raw_appstore.json`, `data/raw_reddit.json`)

Construct the static embedded datasets conforming to the canonical schema from [`architecture.md` §3](./architecture.md#3-data-schema). These three files combined should contain the 800+ records:

| Field              | Generation Rule                                                                         |
|--------------------|-----------------------------------------------------------------------------------------|
| `review_id`        | SHA-256 hash of `source_channel + raw_text + timestamp` (or a pre-assigned native key). |
| `source_channel`   | Distribute across: `PlayStore`, `AppStore`, `Reddit`, `Forum`. Approximate ratio: 40% / 25% / 20% / 15%. |
| `raw_text`         | Authentic, verbatim review strings. Must span grocery, delivery, search UX, beauty, pet, baby care, and personal care topics. Include edge-case short reviews (< 8 words) that contain friction anchor roots. |
| `rating`           | Integer 1–5. Skew distribution toward 1–3 stars (~65%) to ensure the priority score formula produces differentiated results. |
| `timestamp`        | ISO 8601 strings distributed across the last 90 days.                                   |
| `scrubbed_text`    | Initialize as empty string `""`. Populated at runtime by the PII scrubber.               |
| `assigned_cluster` | Initialize as `-1` (noise/unclassified).                                                 |

**Record count:** Minimum **800 records**. Maximum 1,200 records (to stay well within the 5,000 cap).

**Mandatory inclusion requirements:**
- At least 30 records explicitly mentioning cross-category friction anchors: `expired`, `fake`, `seal`, `return`, `cosmetic`, `beauty`, `baby`, `pet`.
- At least 20 records with PII patterns embedded (email, phone, numeric ID runs) to validate the scrubber.
- At least 15 short records (< 8 words) that contain friction anchors (to exercise the bypass gate).
- At least 10 short records (< 8 words) that do NOT contain anchors (to validate they are correctly discarded).
- At least 5 records with heavy emoji density or non-ASCII scripts (to validate the language filter).
- Include the peripheral fields (`userName`, `userImage`, `reviewCreatedVersion`, `replyContent`, `repliedAt`) on at least 50 records across the files so the payload sanitization filter can be tested.

---

#### 0.3 — Application Shell (`src/index.html`)

Build the foundational HTML5 document:

| Requirement                    | Implementation Detail                                                 |
|--------------------------------|-----------------------------------------------------------------------|
| Semantic structure             | Single `<h1>` heading. Use `<main>`, `<section>`, `<header>`, `<nav>`. |
| CSS link                       | `<link rel="stylesheet" href="styles/index.css">`                     |
| JS entry point                 | `<script type="module" src="app.js"></script>`                         |
| Empty-state DOM containers     | `<div id="metrics-bar">`, `<div id="file-dropper">`, `<div id="friction-matrix">`, `<div id="deep-dive">`, `<div id="experiment-blueprint">` |
| Meta tags                      | `<title>`, `<meta name="description">`, viewport meta.                |
| Zero-state message             | A visible "Awaiting pipeline execution…" placeholder in each panel.   |

---

#### 0.4 — Design System Skeleton (`src/styles/index.css`)

Establish the CSS custom property design token layer:

```css
:root {
  /* Color tokens */
  --color-bg-primary:    #0f1117;
  --color-bg-surface:    #1a1d27;
  --color-bg-card:       #222639;
  --color-accent:        #6c63ff;
  --color-accent-hover:  #857dff;
  --color-text-primary:  #e8eaf0;
  --color-text-secondary:#9ca3af;
  --color-success:       #34d399;
  --color-warning:       #fbbf24;
  --color-danger:        #f87171;

  /* Typography tokens */
  --font-family:         'Inter', sans-serif;
  --font-size-metric:    28px;
  --font-size-heading:   22px;
  --font-size-body:      15px;
  --font-size-caption:   13px;

  /* Spacing tokens */
  --spacing-xs:  4px;
  --spacing-sm:  8px;
  --spacing-md:  16px;
  --spacing-lg:  24px;
  --spacing-xl:  40px;

  /* Elevation tokens */
  --shadow-card:  0 4px 24px rgba(0,0,0,0.25);
  --radius-card:  12px;
  --radius-btn:   8px;
}
```

Include Google Fonts import for `Inter` at the top of the stylesheet.

---

#### 0.5 — Pipeline Orchestrator Skeleton (`src/app.js`)

Implement the state machine defined in [`architecture.md` §5](./architecture.md#5-pipeline-state-machine):

```
States: IDLE → INGESTING → NORMALIZING → PII_SCRUB → CLUSTERING → RANKING → QUOTE_TRUST → RENDERING → IDLE
                                             ↓ (< 20 clean)
                                        ERROR_STATE
```

**Implementation requirements:**

| Requirement                           | Detail                                                    |
|---------------------------------------|-----------------------------------------------------------|
| State variable                        | `let pipelineState = 'IDLE';`                             |
| Transition function                   | `async function advancePipeline(nextState)` with logging  |
| Import stubs                          | Import all pipeline module stubs via ES6 `import`         |
| Top-level `runPipeline()` function    | Orchestrates the full phase sequence with `await` at each step |
| Error boundary                        | `try/catch` around entire pipeline; transitions to `ERROR_STATE` on unrecoverable exceptions |
| Progress callback                     | `onStateChange(state)` hook that the UI layer will consume in Phase 4 |

---

### Exit Criteria — Phase 0

| #   | Validation Check                                                                       | Pass Condition            |
|-----|----------------------------------------------------------------------------------------|---------------------------|
| EC-0.1 | Open `src/index.html` in Chrome/Edge                                               | Page renders with zero console errors |
| EC-0.2 | All JS stubs load via ES6 module imports                                           | No `import` failures in console |
| EC-0.3 | Baseline data files are valid JSON (`data/raw_playstore_main.json`, etc.)          | `JSON.parse()` succeeds; combined array length >= 800 |
| EC-0.4 | Each record in the baseline contains all 7 schema fields                           | Programmatic schema check returns zero violations |
| EC-0.5 | CSS custom properties resolve correctly                                            | `getComputedStyle()` returns expected token values |
| EC-0.6 | `app.js` pipeline state machine can be invoked from console                        | Calling `runPipeline()` transitions through states and reaches `IDLE` (stubs return immediately) |

---
---

## Phase 1 — Data Ingest & Cleaning Gates

### Core Objective

Build the complete data ingestion layer (baseline loader + drag-and-drop file uploader), implement the three-filter normalization pipeline with the critical keyword bypass gate, and deploy the strict word-boundary PII scrubber. Upon completion, raw review data enters the system, gets cleaned, scrubbed, and the pipeline orchestrator has a clean `scrubbed_text` array ready for the reasoning engine.

---

### Detailed Task Checklist

#### 1.1 — Baseline Loader (`src/pipeline/ingestion.js` → `loadBaseline()`)

| Task                              | Detail                                                                     |
|-----------------------------------|----------------------------------------------------------------------------|
| Fetch the static JSONs            | Use a parallel `Promise.all()` to fetch `./data/raw_playstore_main.json`, `./data/raw_playstore_instamart.json`, `./data/raw_appstore.json`, and `./data/raw_reddit.json`. |
| Parse and validate                | `JSON.parse()` the responses. Dynamically normalize fields to the unified schema. |
| Deduplicate and merge             | Deduplicate records across the three files by their string index keys (`review_id`), and merge them into a single clean in-memory pool. |
| Volume cap enforcement            | If merged `records.length > 5000`, slice to the first 5,000 and log a warning. |
| Minimum floor pre-check           | If merged `records.length < 20`, return an error object and transition pipeline to `ERROR_STATE`. |
| Return canonical array            | Return the validated array to the orchestrator.                            |

---

#### 1.2 — Drag-and-Drop File Uploader (`src/pipeline/ingestion.js` → `parseUpload()`)

| Task                                     | Detail                                                          |
|------------------------------------------|-----------------------------------------------------------------|
| DOM dropper zone                         | Bind `dragover`, `dragleave`, `drop` events on `#file-dropper`. |
| Visual feedback                          | Toggle a `.drag-active` CSS class on drag enter/leave.          |
| File type gate                           | Accept only `.csv` and `.json` extensions. Reject others with a user-visible toast. |
| CSV parsing                              | Implement a lightweight CSV-to-JSON parser (split by newline → split by comma → map headers to schema fields). Handle quoted fields and escaped commas. |
| JSON parsing                             | `JSON.parse()` the file contents directly.                       |
| Schema normalization                     | Map any uploaded field names to the canonical schema. Generate `review_id` via a hash function if not present. Default `scrubbed_text = ""`, `assigned_cluster = -1`. |
| Merge strategy                           | Append uploaded records to the baseline array. De-duplicate by `review_id`. |
| Volume cap re-check after merge          | Re-enforce the 5,000 ceiling. Truncate excess.                   |

---

#### 1.3 — Normalization Pipeline (`src/pipeline/normalization.js` → `normalize()`)

Implement the sequential quality filters from [`architecture.md` §4.2](./architecture.md#42-normalization-layer):

##### Filter 0: Quick-Commerce Filter Gate (New)
**Rule:** For all reviews arriving from the main flagship Swiggy application (`source_channel` matches `PlayStore_Main` or `AppStore_Main`), the system must filter text strings for target terms (`"instamart"`, `"grocery"`, `"groceries"`, `"mart"`).
- If none are matching, **drop the entry immediately** to prevent noise skew.
- Reviews arriving via the standalone Instamart identifiers pass through implicitly.

##### Filter 1: Length Floor (with Conditional Bypass)

```javascript
const FRICTION_ANCHORS = ['expired', 'fake', 'seal', 'return', 'cosmetic', 'beauty', 'baby', 'pet'];

function passesLengthFilter(review) {
  const words = review.raw_text.trim().split(/\s+/);
  if (words.length >= 8) return true;

  // Conditional bypass: preserve short reviews containing critical friction anchor roots
  const lowerText = review.raw_text.toLowerCase();
  return FRICTION_ANCHORS.some(anchor => lowerText.includes(anchor));
}
```

| Behavior                                           | Expected Result                      |
|----------------------------------------------------|--------------------------------------|
| "very good" (2 words, no anchor)                   | **DISCARDED**                        |
| "bad app crashes" (3 words, no anchor)             | **DISCARDED**                        |
| "expired milk product" (3 words, has `expired`)    | **PRESERVED** (bypass gate triggered)|
| "fake beauty items quality" (4 words, has `fake` + `beauty`) | **PRESERVED**               |
| "I love the app but delivery could be faster and the groceries are always fresh" (15 words) | **PRESERVED** (passes length floor) |

##### Filter 2: Language / Character Cleanliness

```javascript
function passesLanguageFilter(review) {
  const text = review.raw_text;
  // Reject non-ASCII dominant text
  const nonAsciiRatio = (text.replace(/[\x00-\x7F]/g, '').length) / text.length;
  if (nonAsciiRatio > 0.3) return false;

  // Reject heavy emoji density (> 20% of characters are emoji)
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiPattern) || []).length;
  if (emojiCount / text.length > 0.2) return false;

  return true;
}
```

##### Filter 3: Payload Sanitization

```javascript
const STRIP_FIELDS = ['userName', 'userImage', 'reviewCreatedVersion', 'replyContent', 'repliedAt'];

function sanitizePayload(review) {
  const sanitized = { ...review };
  STRIP_FIELDS.forEach(field => delete sanitized[field]);
  return sanitized;
}
```

##### Composite Normalize Function

```javascript
export function normalize(reviews) {
  return reviews
    .filter(passesLengthFilter)
    .filter(passesLanguageFilter)
    .map(sanitizePayload);
}
```

**Post-normalization validation:** If `cleanPool.length < 20`, halt the pipeline and surface an `ERROR_STATE` with the message: *"Insufficient clean samples (N found, 20 required). Upload a larger dataset."*

---

#### 1.4 — PII Scrubber (`src/pipeline/piiScrubber.js` → `scrub()`)

Implement regex-based token replacement per [`architecture.md` §4.3](./architecture.md#43-pii-scrubbing-node) and the strict boundary constraint from [`architecture.md` §9](./architecture.md#9-key-formulas--algorithms):

```javascript
const PII_PATTERNS = [
  { regex: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi,          token: '[EMAIL]' },
  { regex: /(\+91[\-\s]?)?[6-9]\d{9}/g,             token: '[PHONE]' },
  { regex: /\b\d{9,16}\b/g,                          token: '[ID]'    },
];

export function scrub(reviews) {
  return reviews.map(review => {
    let scrubbedText = review.raw_text;
    PII_PATTERNS.forEach(({ regex, token }) => {
      scrubbedText = scrubbedText.replace(regex, token);
    });
    return { ...review, scrubbed_text: scrubbedText };
  });
}
```

**Critical detail — `\b\d{9,16}\b`:** The ID scrubber uses strict word boundaries and an upper bound of 16 digits. This prevents accidental destruction of embedded product metrics (pack weights like `500`, quantities like `12`, prices like `299`). Only standalone numeric strings of 9–16 digits (customer IDs, order numbers) are redacted.

---

### Exit Criteria — Phase 1

| #   | Validation Check                                                                             | Pass Condition             |
|-----|----------------------------------------------------------------------------------------------|----------------------------|
| EC-1.1 | App loads and decoupled baseline files populate the internal data array         | `reviews.length >= 800`    |
| EC-1.2 | Drag-and-drop zone accepts a `.csv` file and appends records to the baseline array       | New records visible in internal state |
| EC-1.3 | Drag-and-drop zone accepts a `.json` file                                                | Same as above              |
| EC-1.4 | Non-CSV/JSON file upload is rejected with a visible toast                                | `.pdf` upload shows error  |
| EC-1.5 | Reviews with < 8 words and no friction anchors are discarded                             | "very good" is not in clean pool |
| EC-1.6 | Reviews with < 8 words containing `expired` are preserved                                | "expired milk product" is in clean pool |
| EC-1.7 | Reviews with heavy emoji or non-ASCII are discarded                                      | Hindi/emoji reviews not in clean pool |
| EC-1.8 | `userName`, `userImage`, `reviewCreatedVersion`, `replyContent`, `repliedAt` fields are stripped | `Object.keys()` check on clean records |
| EC-1.9 | Email patterns in `raw_text` are replaced with `[EMAIL]` in `scrubbed_text`              | Regex test on output       |
| EC-1.10 | Indian phone numbers are replaced with `[PHONE]`                                        | `+919876543210` → `[PHONE]` |
| EC-1.11 | 9–16 digit numeric runs are replaced with `[ID]`                                        | `123456789` → `[ID]`       |
| EC-1.12 | 3-digit numbers (e.g., `500` grams) are NOT replaced                                   | `500` remains `500`        |
| EC-1.13 | Pipeline halts with error message if clean pool < 20 records                            | Test with 10-record file   |
| EC-1.14 | Pipeline truncates input at 5,000 records if uploaded file exceeds cap                  | Test with 6,000-record file |

---
---

## Phase 2 — Map-Reduce Reasoning Execution Core

### Core Objective

Implement the Map-Reduce clustering architecture from [`architecture.md` §4.4 Token Optimization Strategy](./architecture.md#44-semantic-clustering-engine). This phase is split into two sub-phases: Phase 2a builds the in-browser Map engine (scanning 100% of reviews) and the LLM Reduce call (taxonomy synthesis from a compressed matrix). Phase 2b handles the post-Reduce client-side classification of every review against the discovered taxonomy.

---

### Phase 2a — Stage 1: In-Browser Map Engine + Stage 2: LLM Reduce

#### Core Objective (2a)

Scan **100% of clean, scrubbed reviews** in-browser to build a high-density frequency matrix, then pass **only that compressed matrix** (not raw review text) to the LLM in a single API call. The LLM synthesizes the aggregate patterns of all 800+ reviews at once to output the definitive 4 cross-category friction themes. This is the **only clustering-related API call** in the entire pipeline.

#### Detailed Task Checklist (2a)

##### 2a.1 — LLM API Client (`src/llm/apiClient.js`)

| Task                              | Detail                                                                     |
|-----------------------------------|----------------------------------------------------------------------------|
| API abstraction function          | `export async function callLLM(prompt, options)` — accepts a prompt string and optional parameters (temperature, max_tokens). |
| API key management                | Read the API key from a `data-api-key` attribute on the `<body>` element, or from a user-input modal rendered on first use. Never hardcode keys. |
| Request construction              | Build a `fetch()` POST request to the LLM API endpoint (e.g., Gemini `generateContent`). Set `Content-Type: application/json`. |
| Response parsing                  | Extract the generated text from the API response JSON. Handle error codes (401, 429 rate limit, 500). |
| Rate limit handling               | If a 429 is received, implement exponential backoff with a maximum of 3 retries (delays: 2s, 4s, 8s). |
| Token budget guard                | Log the `usage.total_tokens` from each response. Accumulate across calls. Surface a warning if total exceeds 50,000 tokens in a single pipeline run. |

##### 2a.2 — Frequency Matrix Builder (`src/pipeline/clustering.js` → `buildFrequencyMatrix()`)

The Map engine scans the **entire clean review pool** to count density frequencies of behavioral friction phrases and cross-category anchor words:

```javascript
const ANCHOR_PHRASES = [
  // Cross-category friction anchors
  'expired', 'fake', 'seal', 'return', 'cosmetic', 'beauty', 'baby', 'pet',
  'quality', 'trust', 'brand', 'original', 'genuine', 'damaged', 'packaging',
  // Search & discovery anchors
  'search', 'search bar', 'type', 'filter', 'find', 'browse', 'category',
  'discover', 'explore', 'suggestion', 'recommend',
  // Delivery & logistics anchors
  'delivery', 'late', 'delay', 'missing', 'wrong item', 'substitut',
  // Pricing & value anchors
  'price', 'expensive', 'overpriced', 'discount', 'offer', 'value',
];

export function buildFrequencyMatrix(scrubbedReviews) {
  const matrix = {
    total_reviews: scrubbedReviews.length,
    source_distribution: {},
    rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    phrase_frequencies: {},
    co_occurrence_pairs: [],
  };

  // Build source and rating distributions
  scrubbedReviews.forEach(review => {
    matrix.source_distribution[review.source_channel] =
      (matrix.source_distribution[review.source_channel] || 0) + 1;
    matrix.rating_distribution[String(review.rating)] += 1;
  });

  // Scan every review for anchor phrase hits
  ANCHOR_PHRASES.forEach(phrase => {
    const entry = { count: 0, avg_rating: 0, sources: new Set(), total_rating: 0 };
    scrubbedReviews.forEach(review => {
      if (review.scrubbed_text.toLowerCase().includes(phrase.toLowerCase())) {
        entry.count++;
        entry.total_rating += review.rating;
        entry.sources.add(review.source_channel);
      }
    });
    if (entry.count > 0) {
      matrix.phrase_frequencies[phrase] = {
        count: entry.count,
        avg_rating: Math.round((entry.total_rating / entry.count) * 10) / 10,
        sources: [...entry.sources],
      };
    }
  });

  // Compute co-occurrence pairs (phrases appearing together in the same review)
  const activeKeys = Object.keys(matrix.phrase_frequencies);
  for (let i = 0; i < activeKeys.length; i++) {
    for (let j = i + 1; j < activeKeys.length; j++) {
      let coCount = 0;
      scrubbedReviews.forEach(review => {
        const text = review.scrubbed_text.toLowerCase();
        if (text.includes(activeKeys[i]) && text.includes(activeKeys[j])) coCount++;
      });
      if (coCount >= 5) {
        matrix.co_occurrence_pairs.push({
          terms: [activeKeys[i], activeKeys[j]],
          count: coCount,
        });
      }
    }
  }

  // Sort co-occurrences by frequency descending, keep top 20
  matrix.co_occurrence_pairs.sort((a, b) => b.count - a.count);
  matrix.co_occurrence_pairs = matrix.co_occurrence_pairs.slice(0, 20);

  return matrix;
}
```

- **Dynamic Phrase Discovery Fallback:** In addition to matching the hardcoded `ANCHOR_PHRASES` array, the matrix builder must execute a regex scanner to identify high-frequency noun chunks immediately preceding transaction verbs (e.g., 'ordered', 'returned', 'refunded'). This ensures the local Map engine captures emerging category-specific terms (like specific pet or baby products) that may not be present in the static primitives.

**Key property:** The output matrix is a fixed-structure JSON object of ~500–800 tokens regardless of corpus size (800 or 5,000 reviews). This guarantees a constant, predictable LLM input cost.

##### 2a.3 — Taxonomy Discovery Prompt Engineering (Reduce Call)

Construct the structured prompt sent to the LLM. The LLM receives **only the frequency matrix**, not raw review text:

```
SYSTEM PROMPT:
You are a consumer insights analyst for a quick-commerce grocery platform (Swiggy Instamart).
You are given a statistical frequency matrix summarizing the phrase-level behavioral patterns
across 800+ user reviews from PlayStore, AppStore, Reddit, and community forums.

Analyze the frequency distributions, co-occurrence patterns, and rating correlations
to identify the top 4 cross-category friction themes that prevent users from exploring
categories beyond their regular grocery basket.

For each theme, return a JSON array with exactly 4 objects:
[
  {
    "cluster_id": <integer 0-3>,
    "theme_name": "<short label, max 6 words>",
    "behavioral_summary": "<2-3 sentence description of the friction pattern>",
    "keyword_anchors": ["<keyword1>", "<keyword2>", ... ] // 8-15 keywords
  }
]

USER PROMPT:
Here is the frequency matrix summarizing all reviews:
<INSERT JSON frequency matrix>

Return ONLY the JSON array. No commentary.
```

##### 2a.4 — Taxonomy Response Parser

| Task                                 | Detail                                                           |
|--------------------------------------|------------------------------------------------------------------|
| Parse the LLM JSON response         | `JSON.parse()` the returned text. Handle markdown code fences.   |
| Validate structure                   | Ensure exactly 4 objects with required fields.                   |
| Extract keyword anchor lists         | Store each theme's `keyword_anchors` array for classification.   |
| Store taxonomy in pipeline state     | Save to `pipelineState.taxonomy = [...]` for Phase 2b consumption. |

---

#### Exit Criteria — Phase 2a

| #   | Validation Check                                                                       | Pass Condition             |
|-----|----------------------------------------------------------------------------------------|----------------------------|
| EC-2a.1 | Frequency matrix is built from 100% of the clean review pool                     | `matrix.total_reviews === scrubbedReviews.length` |
| EC-2a.2 | Matrix contains phrase frequency counts, source distributions, and co-occurrence pairs | All 3 sections populated   |
| EC-2a.3 | A single LLM API call is made with the matrix (verify in browser Network tab)    | Exactly 1 outbound POST; request body contains matrix JSON, not raw review text |
| EC-2a.4 | LLM returns valid JSON with exactly 4 theme objects                              | Parse succeeds; `themes.length === 4` |
| EC-2a.5 | Each theme has `cluster_id`, `theme_name`, `behavioral_summary`, `keyword_anchors` | Schema validation passes   |
| EC-2a.6 | Total token usage for this call is logged in the console                         | `console.log` shows token count |
| EC-2a.7 | Matrix payload size is < 1,000 tokens regardless of corpus size                 | Verified with 800-record and 5,000-record datasets |

---

### Phase 2b — Post-Reduce Client-Side Classification Engine

#### Core Objective (2b)

Classify the **entire review pool** (800–5,000 records) against the 4 taxonomy themes returned by the Reduce call, using an in-browser phrase-proximity keyword match matrix. **Zero additional LLM API calls.** Every record receives an `assigned_cluster` value (0–3 for matched themes, `-1` for noise).

#### Detailed Task Checklist (2b)

##### 2b.1 — Keyword Matrix Builder (`src/pipeline/clustering.js` → internal `buildKeywordMatrix()`)

Using the `keyword_anchors` arrays returned by the Reduce call, construct a mapping dictionary:

```javascript
function buildKeywordMatrix(taxonomy) {
  // taxonomy = [{cluster_id, theme_name, keyword_anchors: [...] }, ...]
  const matrix = {};
  taxonomy.forEach(theme => {
    theme.keyword_anchors.forEach(keyword => {
      matrix[keyword.toLowerCase()] = theme.cluster_id;
    });
  });
  return matrix;
}
```

##### 2b.2 — Proximity Scoring Engine (`src/pipeline/clustering.js` → internal `classifyReview()`)

For each review, compute a match score against every theme by counting keyword hits in the `scrubbed_text`:

```javascript
function classifyReview(review, taxonomy) {
  const text = review.scrubbed_text.toLowerCase();
  const scores = taxonomy.map(theme => {
    const hits = theme.keyword_anchors.filter(kw => text.includes(kw.toLowerCase()));
    return { cluster_id: theme.cluster_id, score: hits.length };
  });

  // Assign to the theme with the highest score. Require at least 1 hit.
  scores.sort((a, b) => b.score - a.score);
  if (scores[0].score >= 1) {
    return scores[0].cluster_id;
  }
  return -1; // noise — no keyword match
}
```

##### 2b.3 — Bulk Classification Loop

```javascript
export function classifyAll(cleanReviews, taxonomy) {
  return cleanReviews.map(review => ({
    ...review,
    assigned_cluster: classifyReview(review, taxonomy),
  }));
}
```

**Performance constraint:** This loop runs entirely in browser memory. For 5,000 records × 4 themes × ~12 keywords, this is ~240,000 string `includes()` calls — well within browser JS performance thresholds (< 200ms on modern hardware).

##### 2b.4 — Theme Ranking (`src/pipeline/ranking.js`)

After classification, compute the priority score per [`architecture.md` §4.5](./architecture.md#45-theme-ranking-module):

```javascript
export function rankThemes(classifiedReviews, taxonomy) {
  return taxonomy.map(theme => {
    const themeReviews = classifiedReviews.filter(r => r.assigned_cluster === theme.cluster_id);
    const clusterSize = themeReviews.length;
    const avgRating = themeReviews.reduce((sum, r) => sum + r.rating, 0) / clusterSize || 0;
    const priorityScore = clusterSize * (6 - avgRating);

    return {
      ...theme,
      cluster_size: clusterSize,
      avg_rating: Math.round(avgRating * 100) / 100,
      priority_score: Math.round(priorityScore),
      reviews: themeReviews.map(r => r.review_id),
    };
  })
  .filter(theme => theme.cluster_size > 0)
  .sort((a, b) => b.priority_score - a.priority_score);
}
```

##### 2b.5 — Edge-Case Handlers (`src/edgeCases/`)

###### `allNoise.js` — "All Noise" Scenario

**Trigger:** After post-Reduce classification, 100% of reviews have `assigned_cluster === -1`.

```javascript
export function handleAllNoise(reviews) {
  // Strategy: segment by rating brackets and re-classify within each stratum
  const strata = { low: [], mid: [], high: [] };
  reviews.forEach(r => {
    if (r.rating <= 2) strata.low.push(r);
    else if (r.rating <= 3) strata.mid.push(r);
    else strata.high.push(r);
  });

  // Assign each stratum as its own cluster
  let clusterId = 0;
  Object.values(strata).forEach(group => {
    if (group.length > 0) {
      group.forEach(r => { r.assigned_cluster = clusterId; });
      clusterId++;
    }
  });

  return reviews;
}
```

###### `monolith.js` — "Single Monolith" Scenario

**Trigger:** After ranking, a single cluster contains > 80% of the review pool.

```javascript
export function handleMonolith(rankedThemes, allReviews) {
  const totalReviews = allReviews.filter(r => r.assigned_cluster !== -1).length;
  const monolith = rankedThemes.find(t => t.cluster_size / totalReviews > 0.8);

  if (!monolith) return rankedThemes;

  // Split the monolith by rating tiers
  const monolithReviews = allReviews.filter(r => r.assigned_cluster === monolith.cluster_id);
  const lowFriction = monolithReviews.filter(r => r.rating <= 2);
  const highFriction = monolithReviews.filter(r => r.rating >= 4);

  // Create two sub-themes, inheriting the monolith's name
  const subThemes = [];
  if (lowFriction.length > 0) {
    const avgRating = lowFriction.reduce((s, r) => s + r.rating, 0) / lowFriction.length;
    subThemes.push({
      ...monolith,
      cluster_id: monolith.cluster_id * 10 + 1,
      theme_name: monolith.theme_name + ' (1–2★ Frictions)',
      cluster_size: lowFriction.length,
      avg_rating: Math.round(avgRating * 100) / 100,
      priority_score: Math.round(lowFriction.length * (6 - avgRating)),
      reviews: lowFriction.map(r => r.review_id),
    });
  }
  if (highFriction.length > 0) {
    const avgRating = highFriction.reduce((s, r) => s + r.rating, 0) / highFriction.length;
    subThemes.push({
      ...monolith,
      cluster_id: monolith.cluster_id * 10 + 2,
      theme_name: monolith.theme_name + ' (4–5★ Signals)',
      cluster_size: highFriction.length,
      avg_rating: Math.round(avgRating * 100) / 100,
      priority_score: Math.round(highFriction.length * (6 - avgRating)),
      reviews: highFriction.map(r => r.review_id),
    });
  }

  // Replace the monolith with sub-themes and re-sort
  return rankedThemes
    .filter(t => t.cluster_id !== monolith.cluster_id)
    .concat(subThemes)
    .sort((a, b) => b.priority_score - a.priority_score);
}
```

---

#### Exit Criteria — Phase 2b

| #   | Validation Check                                                                       | Pass Condition             |
|-----|----------------------------------------------------------------------------------------|----------------------------|
| EC-2b.1 | All 800+ reviews receive an `assigned_cluster` value (0–3 or -1)                 | No records with `undefined` cluster |
| EC-2b.2 | Zero additional LLM API calls are made during Pass 2                             | Network tab shows no new LLM requests |
| EC-2b.3 | Classification loop completes in < 500ms for 800 records                         | `performance.now()` measurement |
| EC-2b.4 | Priority scores are computed and themes are sorted descending                    | `themes[0].priority_score >= themes[1].priority_score` |
| EC-2b.5 | "All Noise" handler activates if all reviews are `cluster = -1`                  | Tested with a synthetic dataset where no keywords match |
| EC-2b.6 | "Monolith" handler splits a cluster that captures > 80% of reviews              | Tested with keyword-skewed dataset |
| EC-2b.7 | Sub-clusters from monolith split have independent priority scores               | Verify different scores for 1–2★ vs 4–5★ sub-clusters |

---
---

## Phase 3 — Quote Trust Verification & Fallbacks

### Core Objective

Build the deterministic hallucination mitigation layer from [`architecture.md` §4.6](./architecture.md#46-hallucination-mitigation-quote-trust-layer). Every user quote surfaced on the dashboard must be verified as a verbatim substring of an actual review in the corpus. Deploy the primary substring match and the 4-word chunking fallback. Integrate with the edge-case protocols.

---

### Detailed Task Checklist

#### 3.1 — LLM Quote Generation Call

Add a second (and final) LLM API call to generate per-theme outputs. This call produces:

| Output                  | Description                                              |
|-------------------------|----------------------------------------------------------|
| `verbatim_quotes`       | 3–5 direct user quotes per theme, extracted from the assigned reviews. |
| `experiment_steps`      | 2–4 actionable experiment recommendations per theme.     |
| `deep_dive_narrative`   | A paragraph-length qualitative analysis of cross-category barriers for each theme. |

**Prompt structure:**

```
SYSTEM PROMPT:
You are a product growth analyst. For each of the following friction themes,
provide supporting evidence and recommendations based ONLY on the review text provided.

For each theme, return:
- "verbatim_quotes": 3-5 EXACT quotes copied verbatim from the reviews (do NOT paraphrase).
- "experiment_steps": 2-4 actionable A/B test or feature experiment recommendations.
- "deep_dive_narrative": A paragraph analyzing the specific cross-category trust barriers.

USER PROMPT:
Themes: <INSERT ranked taxonomy JSON>
Reviews by theme: <INSERT scrubbed_text grouped by assigned_cluster>

Return JSON array matching the theme structure.
```

---

#### 3.2 — Primary Quote Trust Validator (`src/pipeline/quoteTrust.js` → `verifyQuotes()`)

Implement the deterministic substring match from [`architecture.md` §9](./architecture.md#9-key-formulas--algorithms):

```javascript
function primaryMatch(quote, corpus) {
  const qNorm = quote.replace(/[^\w]/g, '').toLowerCase();
  for (const review of corpus) {
    const cNorm = review.scrubbed_text.replace(/[^\w]/g, '').toLowerCase();
    if (cNorm.includes(qNorm)) return true;
  }
  return false;
}
```

---

#### 3.3 — Fallback: 4-Word Continuous Chunking Validator

If the primary match fails (due to LLM punctuation deviations or minor text adjustments), apply the sliding-window segment matcher:

```javascript
function fallbackChunkMatch(quote, corpus) {
  const words = quote.trim().split(/\s+/);
  if (words.length < 4) return false; // Too short for chunk matching

  const segments = [];
  for (let i = 0; i <= words.length - 4; i++) {
    segments.push(
      words.slice(i, i + 4).join(' ').replace(/[^\w]/g, '').toLowerCase()
    );
  }

  for (const review of corpus) {
    const cNorm = review.scrubbed_text.replace(/[^\w]/g, '').toLowerCase();
    const hits = segments.filter(seg => cNorm.includes(seg));
    if (hits.length >= 2) return true; // >= 2 sequential segments hit
  }
  return false;
}
```

---

#### 3.4 — Composite Verifier with Theme Pruning

```javascript
export function verifyQuotes(themes, corpus) {
  return themes
    .map(theme => {
      const verifiedQuotes = (theme.verbatim_quotes || []).filter(quote =>
        primaryMatch(quote, corpus) || fallbackChunkMatch(quote, corpus)
      );
      return { ...theme, verified_quotes: verifiedQuotes };
    })
    .filter(theme => theme.verified_quotes.length > 0);
    // Themes with ZERO verified quotes are omitted entirely
}
```

**Critical guarantee:** If a theme loses all quotes after verification, it is **completely removed** from the dashboard payload. This prevents AI-fabricated quotes from polluting the product roadmap.

---

#### 3.5 — Integration with Edge-Case Protocols

Wire the Quote Trust layer into the pipeline orchestrator **after** ranking and **after** edge-case handling:

```
CLUSTERING → EDGE_CASE_CHECK → RANKING → LLM_QUOTE_CALL → QUOTE_TRUST → RENDERING
```

Ensure that edge-case-generated sub-clusters (from monolith splits or rating stratification) also pass through Quote Trust verification.

---

### Exit Criteria — Phase 3

| #   | Validation Check                                                                       | Pass Condition             |
|-----|----------------------------------------------------------------------------------------|----------------------------|
| EC-3.1 | An exact verbatim quote from the corpus passes primary verification              | `verifyQuotes()` returns it in `verified_quotes` |
| EC-3.2 | A fabricated quote not present in any review is rejected                         | Not present in output      |
| EC-3.3 | A quote with minor punctuation deviation passes fallback chunk matching          | Verified via 4-word segment hits |
| EC-3.4 | A theme with all quotes rejected is omitted from the final output               | Theme absent from rendered payload |
| EC-3.5 | The dashboard metric "Total Active Friction Themes" reflects post-verification count | Count matches `verifiedThemes.length` |
| EC-3.6 | Exactly 2 total LLM API calls are made per pipeline run (1 clustering + 1 quote gen) | Network tab verification   |

---
---

## Phase 4 — PM Executive Dashboard UI

### Core Objective

Build the high-contrast, executive-grade dashboard interface defined in [`architecture.md` §4.8](./architecture.md#48-dashboard-ui-layer). The UI must target non-technical Product Managers and Growth Leads with premium visual design, clear data readability, and zero-state fallbacks.

---

### Detailed Task Checklist

#### 4.1 — Metrics & Ingestion Bar (`src/ui/metricsBar.js`)

Render a prominent top-bar with three aggregate metric counters and the file dropper zone.

| Element                      | Specification                                                        |
|------------------------------|----------------------------------------------------------------------|
| **Total Ingested Reviews**   | Integer counter. Font size >= **28px** (`--font-size-metric`). Color: `--color-accent`. |
| **Retained Clean Samples**   | Integer counter. Font size >= **28px**. Color: `--color-success`.     |
| **Active Friction Themes**   | Integer counter. Font size >= **28px**. Color: `--color-warning`.     |
| **File Dropper Zone**        | Dashed-border card with drag-and-drop target. Shows accepted file types (`.csv`, `.json`). Renders upload status/progress indicator. |
| **Zero-state**               | All counters show `0`. File dropper shows "Drop a .csv or .json file to begin analysis". |

**Layout:** Horizontal flex row with equal-width metric cards. File dropper card is double-width on the right.

**Accessibility:** Each metric card has an `aria-label` describing the value.

---

#### 4.2 — Friction Priority Matrix (`src/ui/frictionMatrix.js`)

Render the ranked theme cards from [`architecture.md` §4.8 Panel 2](./architecture.md#48-dashboard-ui-layer):

| Card Element              | Specification                                                        |
|---------------------------|----------------------------------------------------------------------|
| **Theme Name**            | `<h3>` tag. Font size >= **22px** (`--font-size-heading`). Bold. Color: `--color-text-primary`. |
| **Priority Score Badge**  | Prominently displayed numeric badge in the top-right corner of the card. Background: gradient accent. Font size >= **22px**. |
| **Behavioral Summary**    | 2–3 sentence body text. Font size: **15px** (`--font-size-body`). Color: `--color-text-secondary`. |
| **Verified Quotes**       | Styled as blockquote elements with quotation marks and italic text. Each quote prefixed with a `"` glyph. Font size: **13px** (`--font-size-caption`). |
| **Cluster Size + Rating** | Small metadata row below the summary. Shows `N reviews · Avg ★ X.X`. |

**Card styling:**
- Background: `--color-bg-card`
- Border radius: `--radius-card` (12px)
- Box shadow: `--shadow-card`
- Hover: subtle elevation increase (`transform: translateY(-2px)`) with transition

**Layout:** CSS Grid, 2 columns on desktop (>= 1024px), 1 column on mobile. Cards ordered by descending priority score.

**Zero-state:** Shows a centered message: *"No friction themes discovered yet. Run the pipeline to begin."*

---

#### 4.3 — Category Deep Dive Panel (`src/ui/categoryDeepDive.js`)

| Element                       | Specification                                                      |
|-------------------------------|--------------------------------------------------------------------|
| **Section header**            | `<h2>` with text "Category Deep Dive". Font size >= **22px**.       |
| **Per-theme narrative card**  | Renders the `deep_dive_narrative` text from the LLM output.        |
| **Cross-category transition** | Highlights the specific barrier (e.g., "Grocery → Beauty trust gap"). Styled with a left-border accent color. |
| **Contextual sub-patterns**   | Bullet list of key friction signals extracted from the behavioral summary. |

---

#### 4.4 — Experimentation Blueprint (`src/ui/experimentBlueprint.js`)

| Element                          | Specification                                                   |
|----------------------------------|-----------------------------------------------------------------|
| **Section header**               | `<h2>` with text "Experimentation Blueprint". Font size >= **22px**. |
| **Per-theme experiment card**    | Maps directly to the Priority Matrix theme order.                |
| **Experiment steps**             | Rendered as a numbered `<ol>` list. Each step is a clear action. |
| **Step formatting**              | Bold action verb prefix (e.g., **"Test:"**, **"Measure:"**, **"Deploy:"**). |

---

#### 4.5 — Global UI Requirements

| Requirement                   | Implementation                                                      |
|-------------------------------|---------------------------------------------------------------------|
| **Dark theme by default**     | Use `--color-bg-primary` as `body` background.                      |
| **Font sizes ≥ 22px for headings** | All `<h2>`, `<h3>`, metric headings must use at least 22px.   |
| **Metric counters ≥ 28px**   | Core numeric KPIs use `--font-size-metric` (28px).                   |
| **Progress indicator**        | During pipeline execution, overlay a subtle progress bar or spinner on the main content area with state labels ("Normalizing…", "Clustering…", "Verifying quotes…"). |
| **Responsive layout**         | Breakpoints at 768px (tablet) and 1024px (desktop).                  |
| **Smooth transitions**        | CSS transitions on all interactive elements: `transition: all 0.2s ease`. |
| **Micro-animations**          | Metric counters animate from 0 to final value on render (CSS `@keyframes` or JS increment). |
| **Error state display**       | If pipeline enters `ERROR_STATE`, render a centered error banner with the specific error message and a "Retry" button. |

---

#### 4.6 — Pipeline Progress Integration (`src/app.js` update)

Update the orchestrator to call UI render functions at appropriate state transitions:

```javascript
async function runPipeline() {
  try {
    advancePipeline('INGESTING');
    const raw = await loadBaseline();
    // ... merge with uploads ...

    advancePipeline('NORMALIZING');
    const clean = normalize(raw);
    if (clean.length < 20) throw new Error(`Insufficient samples: ${clean.length}`);

    advancePipeline('PII_SCRUB');
    const scrubbed = scrub(clean);

    advancePipeline('MAP_REDUCE_TAXONOMY'); // Update UI status label to "Compressing & Analyzing Global Trends..."
    const matrix = buildFrequencyMatrix(scrubbed);           // Stage 1 — MAP (in-browser)
    const taxonomy = await discoverTaxonomy(matrix);         // Stage 2 — REDUCE (LLM call)
    const classified = classifyAll(scrubbed, taxonomy);      // Post-Reduce classification (in-browser)

    // Edge-case checks
    const allNoise = classified.every(r => r.assigned_cluster === -1);
    const processed = allNoise ? handleAllNoise(classified) : classified;

    advancePipeline('RANKING');
    let themes = rankThemes(processed, taxonomy);
    themes = handleMonolith(themes, processed);

    advancePipeline('EVIDENCE_EXTRACTION'); // Update UI status label to "Extracting & Verifying Verbatim Customer Evidence..."
    const enriched = await generateQuotes(themes, processed);  // LLM call #2
    const verified = verifyQuotes(enriched, scrubbed);

    advancePipeline('RENDERING');
    renderMetrics({ total: raw.length, clean: clean.length, themes: verified.length });
    renderMatrix(verified);
    renderDeepDive(verified);
    renderBlueprint(verified);

    advancePipeline('IDLE');
  } catch (error) {
    advancePipeline('ERROR_STATE');
    renderError(error.message);
  }
}
```

---

### Exit Criteria — Phase 4

| #   | Validation Check                                                                       | Pass Condition             |
|-----|----------------------------------------------------------------------------------------|----------------------------|
| EC-4.1 | Dashboard renders all 4 panels with data from the baseline dataset               | All panels populated visually |
| EC-4.2 | Metric counters display correct numbers (Total Ingested, Clean, Active Themes)   | Values match pipeline internal state |
| EC-4.3 | Metric heading font size >= 28px                                                 | `getComputedStyle()` check |
| EC-4.4 | Theme card headings font size >= 22px                                            | `getComputedStyle()` check |
| EC-4.5 | Friction Matrix cards are ordered by descending priority score                   | Visual + data inspection   |
| EC-4.6 | Verified quotes are displayed; fabricated quotes are absent                       | Cross-reference with Quote Trust output |
| EC-4.7 | Zero-state renders correctly when no data is loaded                              | Open app without baseline → placeholder messages visible |
| EC-4.8 | Progress indicator shows state transitions during pipeline run                   | Visible "Normalizing…", "Clustering…" etc. labels |
| EC-4.9 | Error state banner displays when pipeline fails                                  | Test with < 20 records → error banner visible |
| EC-4.10 | Dark theme renders with correct color tokens                                    | Background is `#0f1117`, text is `#e8eaf0` |
| EC-4.11 | Cards have hover micro-animation (translateY)                                   | Hover over a card → subtle lift effect |
| EC-4.12 | Responsive layout stacks to single column below 768px                           | Resize browser → single column |

---
---

## Phase 5 — Reviewer Validation & Quality Polish

### Core Objective

Conduct comprehensive end-to-end validation of every pipeline path. Verify the drag-and-drop file uploader with real CSV/JSON test files. Confirm that the default dashboard populates instantly from the embedded baseline data. Perform accessibility, rendering, and edge-case stress tests.

---

### Detailed Task Checklist

#### 5.1 — Dynamic File Dropper Validation

| Test Case                                  | Procedure                                                   | Expected Result                  |
|--------------------------------------------|-------------------------------------------------------------|----------------------------------|
| Valid `.json` upload (50 records)           | Drop a 50-record JSON file onto the dropper zone.           | Records merge with baseline. Pipeline re-runs. Dashboard updates with new metrics. |
| Valid `.csv` upload (100 records)           | Drop a 100-record CSV file with headers matching schema.    | Same as above.                   |
| Invalid file type (`.pdf`)                 | Drop a PDF file.                                            | Rejection toast appears. Pipeline does not run. |
| Oversized upload (6,000 records)           | Drop a 6,000-record JSON file.                              | Truncated to 5,000 cap. Warning logged. Pipeline runs with 5,000. |
| Empty file                                 | Drop an empty `.json` file (empty array `[]`).              | Error: "Insufficient samples" (< 20 after merge). |
| Malformed JSON                             | Drop a `.json` file with syntax errors.                     | Error toast: "Invalid JSON format". |
| CSV with missing columns                   | Drop a CSV missing the `raw_text` column.                   | Error toast: "Missing required field: raw_text". |
| Re-upload while pipeline is running        | Drop a new file while the progress indicator is active.     | Queued or rejected with message. No crash. |

---

#### 5.2 — Instant Default State Validation

| Test Case                                  | Expected Result                                             |
|--------------------------------------------|-------------------------------------------------------------|
| Open `index.html` with no user action      | Baseline `compiled_insights.json` loads automatically.       |
| Metrics bar shows baseline counts          | Total Ingested >= 800. Clean Samples computed. Themes = 0 (pipeline not yet run). |
| "Run Analysis" button/trigger visible      | User can trigger the pipeline manually after reviewing metrics. |
| Pipeline auto-run option                   | Optional: auto-run pipeline on baseline load if configured.  |

---

#### 5.3 — Edge-Case Stress Tests

| Scenario                      | Test Setup                                              | Expected Behavior                       |
|-------------------------------|---------------------------------------------------------|-----------------------------------------|
| **All Noise**                 | Upload a dataset where no review matches any keyword from the taxonomy. | `handleAllNoise()` activates. Reviews split by rating strata. Dashboard renders rating-stratified clusters. |
| **Single Monolith**           | Upload a dataset where 85% of reviews contain the same keyword set. | `handleMonolith()` splits the dominant cluster into 1–2★ and 4–5★ sub-themes. Both appear in the Priority Matrix with independent scores. |
| **All quotes fabricated**     | Mock LLM response with entirely fabricated quotes.       | All quotes fail verification. Themes with zero verified quotes are omitted. Dashboard shows remaining themes only. |
| **Total data = exactly 20**   | Upload exactly 20 records after normalization.           | Pipeline proceeds (minimum met). Clustering runs. |
| **Total data = 19**           | Upload 19 records post-normalization.                    | Pipeline halts at `ERROR_STATE`. Error banner displayed. |

---

#### 5.4 — Accessibility & Rendering Checks

| Check                                      | Standard                                               | Pass Condition                    |
|--------------------------------------------|--------------------------------------------------------|-----------------------------------|
| Color contrast ratio                       | WCAG 2.1 AA (4.5:1 for text)                          | All text passes contrast check    |
| Keyboard navigation                       | Tab order follows logical reading flow                 | All interactive elements focusable |
| Screen reader labels                       | `aria-label` on metric cards, buttons, dropper zone    | VoiceOver / NVDA reads labels     |
| Font rendering                             | Inter loaded from Google Fonts                         | Fallback to system sans-serif if CDN fails |
| Cross-browser rendering                    | Chrome, Edge, Firefox (latest stable)                  | No visual breakage or JS errors   |
| Mobile viewport (375px)                    | Single-column layout, no horizontal scroll             | Usable on iPhone SE viewport      |
| Print stylesheet                           | Optional: readable grayscale print layout              | `@media print` styles applied     |

---

#### 5.5 — Performance Benchmarks

| Metric                                     | Target                      | Measurement Method              |
|--------------------------------------------|-----------------------------|---------------------------------|
| Baseline JSON load time                    | < 200ms                     | `performance.now()` around `fetch()` |
| Normalization + PII scrub (800 records)    | < 100ms                     | `performance.now()`             |
| Pass 2 keyword classification (800 records)| < 200ms                     | `performance.now()`             |
| LLM API call #1 (taxonomy)                | < 15s (network-dependent)    | Network tab timing              |
| LLM API call #2 (quotes + experiments)    | < 15s (network-dependent)    | Network tab timing              |
| Quote Trust verification (800 records)     | < 150ms                     | `performance.now()`             |
| Full dashboard render                      | < 100ms                     | `performance.now()`             |
| Total pipeline (excluding LLM network)     | < 800ms                     | Sum of non-network benchmarks   |

---

#### 5.6 — Final Cleanup & Documentation

| Task                                       | Detail                                                  |
|--------------------------------------------|---------------------------------------------------------|
| Remove all `console.log` debug statements  | Keep only intentional logging (token usage, errors).    |
| Add JSDoc comments to all exported functions | Every `export function` has a `/** */` block.          |
| Update `README.md`                         | Add quickstart instructions, API key setup, and architecture overview link. |
| Verify `.gitignore` excludes sensitive files | Ensure API keys, `.env`, `node_modules` (if any) are ignored. |
| Final commit                               | `git add -A && git commit -m "feat: complete discovery engine v1.0"` |

---

### Exit Criteria — Phase 5

| #   | Validation Check                                                                       | Pass Condition             |
|-----|----------------------------------------------------------------------------------------|----------------------------|
| EC-5.1  | All 8 file dropper test cases pass                                               | Zero unexpected behaviors  |
| EC-5.2  | Default dashboard renders from baseline without user action                      | All metric counters visible with correct values |
| EC-5.3  | "All Noise" edge case handled without error                                     | Dashboard shows rating-stratified themes |
| EC-5.4  | "Monolith" edge case handled with sub-cluster split                             | Two sub-themes visible in Priority Matrix |
| EC-5.5  | Fabricated quotes are rejected; themes with zero quotes are omitted             | Quote Trust output verified |
| EC-5.6  | WCAG AA color contrast passes on all text elements                              | Contrast checker tool passes |
| EC-5.7  | All performance benchmarks met                                                  | Timing logs within targets |
| EC-5.8  | Zero JavaScript errors in console across full pipeline run                       | Console is clean           |
| EC-5.9  | Dashboard is usable on a 375px viewport                                         | No horizontal scroll, all panels readable |
| EC-5.10 | `README.md` contains quickstart instructions                                    | Reviewer can set up the project from README alone |

---
---

## Appendix A — Full File Manifest

Complete list of source files to be created, organized by build phase:

| Phase | File Path                             | Purpose                                     | Type     |
|-------|---------------------------------------|---------------------------------------------|----------|
| 0     | `data/compiled_insights.json`         | 800+ baseline review records                | Data     |
| 0     | `src/index.html`                      | Application entry point & shell             | HTML     |
| 0     | `src/styles/index.css`                | Design system, tokens, layout, animations   | CSS      |
| 0     | `src/app.js`                          | Pipeline orchestrator & state machine       | JS       |
| 1     | `src/pipeline/ingestion.js`           | File parsing, baseline loader, merge logic  | JS       |
| 1     | `src/pipeline/normalization.js`       | 3 quality filters + keyword bypass gate     | JS       |
| 1     | `src/pipeline/piiScrubber.js`         | Regex-based PII replacement node            | JS       |
| 1     | `generate_appstore.js`                | Automated Apple AppStore RSS feed extraction utility | JS       |
| 2a    | `src/llm/apiClient.js`               | LLM API abstraction layer                   | JS       |
| 2a/2b | `src/pipeline/clustering.js`          | Map engine + keyword matrix classifier    | JS       |
| 2b    | `src/pipeline/ranking.js`             | Priority score formula & theme sorter       | JS       |
| 2b    | `src/edgeCases/allNoise.js`           | "All Noise" fallback protocol               | JS       |
| 2b    | `src/edgeCases/monolith.js`           | "Single Monolith" split protocol            | JS       |
| 3     | `src/pipeline/quoteTrust.js`          | Hallucination mitigation validator          | JS       |
| 4     | `src/ui/metricsBar.js`               | Metrics & ingestion panel component         | JS       |
| 4     | `src/ui/frictionMatrix.js`            | Priority matrix card renderer               | JS       |
| 4     | `src/ui/categoryDeepDive.js`          | Deep dive panel component                   | JS       |
| 4     | `src/ui/experimentBlueprint.js`       | Experiment step renderer                    | JS       |

**Total: 17 source files** (1 HTML + 1 CSS + 1 JSON + 14 JS modules)

---

## Appendix B — Constraint Quick-Reference

All hard limits and boundaries, consolidated from [`architecture.md` §10](./architecture.md#10-constraints--boundaries):

| Constraint                        | Value                         | Enforcement Point        |
|-----------------------------------|-------------------------------|--------------------------|
| Min reviews for clustering        | >= 20 (post-normalization)    | `normalization.js`       |
| Max reviews per run               | <= 5,000 (raw)                | `ingestion.js`           |
| Min review word length            | >= 8 words (with bypass gate) | `normalization.js`       |
| Friction anchor bypass keywords   | `expired`, `fake`, `seal`, `return`, `cosmetic`, `beauty`, `baby`, `pet` | `normalization.js` |
| Supported ingest file types       | `.csv`, `.json`               | `ingestion.js`           |
| PII: Email regex                  | `[\w.+-]+@[\w-]+\.[a-z]{2,}` | `piiScrubber.js`         |
| PII: Phone regex                  | `(\+91[\-\s]?)?[6-9]\d{9}`   | `piiScrubber.js`         |
| PII: ID regex (strict boundary)   | `\b\d{9,16}\b`               | `piiScrubber.js`         |
| Noise cluster index               | `-1`                          | `clustering.js`          |
| Taxonomy categories per run       | Exactly 4                     | `clustering.js` (Reduce) |
| Map engine data coverage          | 100% of clean reviews         | `clustering.js` (Map)    |
| LLM clustering input              | Compressed frequency matrix only (no raw text) | `clustering.js` (Reduce) |
| LLM API calls per pipeline run    | Exactly 2 (taxonomy + quotes) | `app.js`                 |
| Monolith trigger threshold        | Single cluster > 80%          | `monolith.js`            |
| Quote trust primary method        | Case-insensitive substring    | `quoteTrust.js`          |
| Quote trust fallback method       | 4-word continuous chunking    | `quoteTrust.js`          |
| Quote fallback hit threshold      | >= 2 sequential segment hits  | `quoteTrust.js`          |
| Metric heading min font size      | >= 28px                       | `index.css`              |
| Section heading min font size     | >= 22px                       | `index.css`              |
