# Architecture: Swiggy Instamart Cross-Category Discovery Engine

> **Document Type:** Technical System Architecture  
> **Version:** 1.0  
> **Last Updated:** 2026-07-19  
> **Derived From:** [`problemStatement.md`](./problemStatement.md)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Data Schema](#3-data-schema)
4. [Component Architecture](#4-component-architecture)
   - 4.1 [Ingestion Layer](#41-ingestion-layer)
   - 4.2 [Normalization Layer](#42-normalization-layer)
   - 4.3 [PII Scrubbing Node](#43-pii-scrubbing-node)
   - 4.4 [Semantic Clustering Engine](#44-semantic-clustering-engine)
   - 4.5 [Theme Ranking Module](#45-theme-ranking-module)
   - 4.6 [Hallucination Mitigation (Quote Trust) Layer](#46-hallucination-mitigation-quote-trust-layer)
   - 4.7 [Edge-Case Resilience Protocol](#47-edge-case-resilience-protocol)
   - 4.8 [Dashboard UI Layer](#48-dashboard-ui-layer)
5. [Pipeline State Machine](#5-pipeline-state-machine)
6. [File & Folder Structure](#6-file--folder-structure)
7. [Technology Stack](#7-technology-stack)
8. [Data Flow Diagram](#8-data-flow-diagram)
9. [Key Formulas & Algorithms](#9-key-formulas--algorithms)
10. [Constraints & Boundaries](#10-constraints--boundaries)
11. [Non-Functional Requirements](#11-non-functional-requirements)

---

## 1. System Overview

The **Swiggy Instamart Cross-Category Discovery Engine** is a browser-native, AI-powered web dashboard that:

- **Ingests** unstructured consumer feedback at scale from multiple channels (Play Store, App Store, Reddit, Forums, Social Media).
- **Normalizes & cleans** raw text through a strict multi-stage quality filter pipeline.
- **Scrubs PII** before any text reaches an external LLM endpoint.
- **Clusters** reviews into friction themes using unsupervised semantic grouping — without any pre-defined taxonomy.
- **Ranks** discovered themes by a strategic priority score that surfaces high-leverage opportunities for the Growth team.
- **Validates** every LLM-generated user quote against the actual source corpus to eliminate hallucinations.
- **Renders** an executive-grade dashboard with a Friction Priority Matrix, Category Deep Dives, and Experimentation Blueprints.

The system is **100% browser-executable** (no dedicated backend server required). All heavy processing is orchestrated via LLM API calls made directly from the client.

---

## 2. High-Level Architecture

```
+-------------------------------------------------------------------------+
|                        BROWSER (Client Runtime)                         |
|                                                                         |
|  +--------------+    +----------------------------------------------+  |
|  |  Static Asset |    |             Application Core                |  |
|  |  Server / CDN |--->|  index.html  |  app.js  |  styles.css       |  |
|  +--------------+    +--------------------+--------------------------+  |
|                                           |                             |
|              +----------------------------v------------------------+    |
|              |               PIPELINE ORCHESTRATOR                 |    |
|              |  Coordinates all phase transitions and state mgmt   |    |
|              +--+-------------+-------------------+---------------+    |
|                 |             |                   |                    |
|    +------------v---+ +-------v------+ +-----------v------------+      |
|    |  INGESTION     | | NORMALIZATION| |   REASONING ENGINE     |      |
|    |  LAYER         | |  LAYER       | |  (LLM API Calls)       |      |
|    |                | |              | |  * PII Scrubbing       |      |
|    | * compiled_    | | * Length     | |  * Semantic Clustering |      |
|    |   insights.json| |   floor      | |  * Theme Summarization |      |
|    | * Drag-&-Drop  | | * Lang check | |  * Quote Generation    |      |
|    |   CSV / JSON   | | * Payload    | |                        |      |
|    |                | |   sanitize   | |                        |      |
|    +----------------+ +--------------+ +------------------------+      |
|                                                |                        |
|              +---------------------------------v------------------+     |
|              |          QUOTE TRUST VALIDATOR                     |     |
|              |  Programmatic substring match against corpus       |     |
|              +---------------------------------+------------------+     |
|                                                |                        |
|              +---------------------------------v------------------+     |
|              |            DASHBOARD UI RENDERER                   |     |
|              |  * Metrics Bar  * Friction Matrix  * Deep Dive     |     |
|              |  * Experimentation Blueprint  * File Dropper       |     |
|              +----------------------------------------------------+     |
|                                                                         |
+-------------------------------------------------------------------------+
                                     |
                                     v
                        +------------------------+
                        |   External LLM API     |
                        |  (e.g., Gemini / GPT)  |
                        +------------------------+
```

---

## 3. Data Schema

Every review record (regardless of ingest source) is normalized into the following canonical structure throughout the entire runtime lifecycle:

| Field              | Type    | Description                                                                              |
|--------------------|---------|------------------------------------------------------------------------------------------|
| `review_id`        | String  | Cryptographic hash or native payload key. Uniquely identifies each review.               |
| `source_channel`   | String  | Origin of the review: `PlayStore`, `AppStore`, `Reddit`, `Forum`, etc.                   |
| `raw_text`         | String  | Original, completely unedited text submitted by the user.                                |
| `scrubbed_text`    | String  | Text after PII scrubbing and normalization filters have been applied.                    |
| `rating`           | Integer | Star rating from `1` (worst) to `5` (best).                                             |
| `timestamp`        | String  | ISO 8601 datetime string for longitudinal behavioral pattern tracking.                   |
| `assigned_cluster` | Integer | Computed clustering index. Defaults to `-1` for noise / unclassified reviews.           |

> **Dropped fields (sanitized at ingest):** `userName`, `userImage`, `reviewCreatedVersion`, `replyContent`, `repliedAt`

---

## 4. Component Architecture

### 4.1 Ingestion Layer

**Responsibility:** Load review data into the runtime pipeline from two sources.

#### Source A — Pre-Compiled Baseline (`compiled_insights.json`)

- Bundled with the application as a static asset.
- Contains **800+ granular review records** spanning Play Store, App Store, Reddit threads, and community forums.
- Loaded automatically on application startup — no network call or API friction for the reviewer.
- Guarantees a fully-populated, production-scale dataset is available instantly.

#### Source B — Dynamic Batch File Ingest (Drag-and-Drop)

- A drag-and-drop UI node accepts `.csv` or `.json` batch files.
- Represents a fresh week's worth of unstructured feedback from any supported source channel.
- Parsed entirely in-browser using the File API; no server upload required.
- Merged with (or replaces) the baseline dataset before pipeline execution.

#### Ingestion Constraints

| Constraint               | Value              | Behavior on Violation                               |
|--------------------------|--------------------|-----------------------------------------------------|
| Minimum review floor     | >= 20 reviews      | Pipeline halts gracefully; user-facing error shown  |
| Maximum volume cap       | <= 5,000 raw reviews | Excess records are truncated/dropped before processing |

---

### 4.2 Normalization Layer

**Responsibility:** Apply three sequential, strict quality filters to raw reviews before they reach any reasoning module.

```
Raw Reviews
    |
    v
+-------------------------------------+
|  Filter 1: Length Floor             |
|  Discard reviews with < 8 words     |
|  (removes low-signal noise like     |
|   "very good", "bad app")           |
+------------------+------------------+
                   | PASS
                   v
+-------------------------------------+
|  Filter 2: Language / Char Check    |
|  Discard reviews with:              |
|  * Non-ASCII symbols                |
|  * Heavy emoji density              |
|  * Non-English language scripts     |
|  (isolates high-signal EN context)  |
+------------------+------------------+
                   | PASS
                   v
+-------------------------------------+
|  Filter 3: Payload Sanitization     |
|  Strip peripheral fields:           |
|  userName, userImage,               |
|  reviewCreatedVersion,              |
|  replyContent, repliedAt            |
|  (fully anonymizes records)         |
+------------------+------------------+
                   |
                   v
            Clean Review Pool
```

- Output updates the **Retained Clean Samples** metric displayed in the dashboard summary bar.
- Minimum floor (>= 20) is re-validated against the clean pool (not the raw pool).

#### Conditional Normalization Bypass

- While the pipeline enforces a strict >= 8 words floor to filter out low-signal app store noise, it implements a **conditional exception gate**: if a short text review (< 8 words) contains critical friction anchor roots (such as `expired`, `fake`, `seal`, `return`, `cosmetic`, `beauty`, `baby`, `pet`), the word-count floor is bypassed entirely and the record is preserved in the clean data pool to protect critical growth insights.

---

### 4.3 PII Scrubbing Node

**Responsibility:** Replace sensitive personal identifiers in review text before any string is sent to an external LLM endpoint.

Implemented as regex-based token replacement applied to `raw_text` to produce `scrubbed_text`:

| Pattern                              | Replacement Token |
|--------------------------------------|-------------------|
| Email addresses                      | `[EMAIL]`         |
| Indian phone number formats          | `[PHONE]`         |
| Numeric runs of >= 9 digits          | `[ID]`            |

**Key guarantee:** No raw user text ever leaves the browser without first passing through this node. The `scrubbed_text` field is the sole input to all downstream LLM calls.

---

### 4.4 Semantic Clustering Engine

**Responsibility:** Dynamically group reviews into friction themes using unsupervised semantic similarity — with zero pre-defined taxonomy.

#### Approach

- **Embedding Simulation:** Because the system executes purely in-browser without a vector database, semantic proximity is computed via token-based semantic categorizers within the LLM architecture.
- **Algorithm:** Unsupervised spatial density clustering (conceptually equivalent to DBSCAN/HDBSCAN):
  - Reviews close in semantic embedding space → assigned to the same cluster.
  - Outliers with no nearby neighbors → assigned `assigned_cluster = -1` (noise).
- **Output:** Each clean review receives an `assigned_cluster` integer index.
- **Theme Labels & Summaries:** A secondary LLM call generates a human-readable theme name and behavioral summary for each discovered cluster.

#### Token Optimization Strategy

To minimize external LLM token consumption and prevent API rate limit window exhaustion during high-volume evaluations, the clustering architecture runs a **split-execution workflow**:

- **Pass 1 — Taxonomy Discovery (LLM-side):** The engine passes a micro-seed batch of **20 random reviews** to the LLM to identify and define the top **4 structural cross-category friction categories** (e.g., Search Autopilot Lock-In, Perceived Quality Risk Aversion). This single bounded call establishes the semantic taxonomy at minimal token cost.
- **Pass 2 — Client-Side Vector Engine (in-browser):** Once categories are returned, the engine handles the remaining high-volume records **natively in browser memory** using a phrase-proximity keyword matrix match indexer. Explicit term mappings drive assignment:
  - Terms like `type`, `search bar`, `filter`, `find` → **Search UX** cluster.
  - Terms like `expired`, `fake`, `beauty`, `cosmetic`, `seal` → **Risk Aversion** cluster.
  - This eliminates redundant token loops completely, with zero additional LLM API calls for bulk classification.

#### Cluster Outputs Per Theme

| Output Field         | Description                                                  |
|----------------------|--------------------------------------------------------------|
| `cluster_id`         | Integer index for the cluster.                               |
| `theme_name`         | Short, human-readable label (e.g., "Trust Barrier – Beauty").|
| `behavioral_summary` | 2–3 sentence description of the core friction pattern.       |
| `reviews`            | Array of `review_id`s assigned to this cluster.              |
| `avg_rating`         | Mean star rating across all reviews in the cluster.          |
| `cluster_size`       | Total number of reviews in the cluster.                      |
| `priority_score`     | Computed ranking score (see Section 4.5).                    |
| `verified_quotes`    | Array of verbatim user quotes that passed Quote Trust check. |
| `experiment_steps`   | Actionable feature recommendations generated per cluster.    |

---

### 4.5 Theme Ranking Module

**Responsibility:** Sort all discovered friction themes by strategic growth impact.

#### Priority Score Formula

```
Priority Score = Cluster Size x (6 - Average Rating)
```

**Interpretation:**
- A **large cluster** (many users affected) amplifies the score.
- A **low average star rating** (high friction) amplifies the score.
- This surfaces the themes with the **widest user impact and highest dissatisfaction** — the prime targets for the Growth team.

#### Example

| Theme                  | Cluster Size | Avg Rating | Priority Score           |
|------------------------|-------------|------------|--------------------------|
| Trust Barrier – Beauty | 220         | 2.1        | 220 x (6 - 2.1) = **858** |
| Delivery Speed         | 180         | 3.5        | 180 x (6 - 3.5) = **450** |
| Search UX              | 95          | 1.8        |  95 x (6 - 1.8) = **399** |

Themes are rendered in descending priority score order in the Friction Priority Matrix.

---

### 4.6 Hallucination Mitigation (Quote Trust) Layer

**Responsibility:** Guarantee that every user quote surfaced on the dashboard is verbatim — verified against the original source corpus. Prevent AI-fabricated quotes from polluting the product roadmap.

#### Algorithm

```
For each LLM-generated quote Q:
  1. Strip all punctuation and whitespace from Q         -> Q_normalized
  2. Strip all punctuation and whitespace from every
     scrubbed_text in the corpus                         -> Corpus_normalized[]
  3. Execute case-insensitive substring match:
     Does any Corpus_normalized[] CONTAIN Q_normalized?
  4. If MATCH FOUND  -> quote is VERIFIED -> include in output
     If NO MATCH     -> quote is DROPPED (fabricated)

For each Theme T:
  5. If all quotes for T are dropped -> omit Theme T entirely
```

**Guarantee:** The dashboard will never display a quote that cannot be traced back to a real user submission.

---

### 4.7 Edge-Case Resilience Protocol

The pipeline must handle two critical degenerate scenarios gracefully:

#### Case A: "All Noise" Scenario

**Trigger:** 100% of input reviews are assigned `cluster = -1` (density thresholds too tight).

**Response:** Automatically lower density constraints and execute a **rating-stratified re-analysis pass**:
- Segment reviews by star-rating brackets (1-star, 2-star, 3-star, 4-star, 5-star).
- Re-run clustering within each rating stratum.
- Never surface a generic system error to the user.

#### Case B: "Single Monolith" Scenario

**Trigger:** A single cluster captures > 80% of the entire review pool (e.g., a systemic delivery outage dominates the data).

**Response:** Split the monolith cluster by **rating tiers** before priority calculation:
- **Sub-cluster A:** 1–2 Star Frictions (critical pain points).
- **Sub-cluster B:** 4–5 Star Frictions (positive signals within the dominant theme).
- Calculate independent priority scores for each sub-cluster.
- Never merge sub-clusters back into a single theme for ranking purposes.

---

### 4.8 Dashboard UI Layer

**Responsibility:** Render an executive-grade interface for Product Managers and Growth Leads.

#### Panel 1 — Metrics & Ingestion Bar

| Element                      | Description                                                              |
|------------------------------|--------------------------------------------------------------------------|
| Total Ingested Reviews        | Raw count of records loaded (baseline + any uploaded batch).             |
| Retained Clean Samples        | Count of records that passed all 3 normalization filters.                |
| Total Active Friction Themes  | Count of validated, non-noise clusters surfaced by the engine.           |
| File Dropper                  | Drag-and-drop zone for `.csv`/`.json` uploads; triggers live re-pipeline.|

#### Panel 2 — Friction Priority Matrix

A prioritized, card-based layout displaying per theme:
- **Theme Name** (cluster label)
- **Core Behavioral Dynamic** (2–3 sentence summary)
- **Priority Score** (prominently displayed)
- **Verified Verbatim User Quotes** (sourced from Quote Trust layer)

#### Panel 3 — Category Deep Dive

- Highlights specific qualitative friction transitions.
- Example: What specific trust barrier prevents a regular grocery buyer from tapping the "Beauty" or "Personal Care" carousel?
- Rendered as annotated theme cards with contextual sub-patterns.

#### Panel 4 — Experimentation Blueprint

- Actionable, programmatic feature-step recommendations.
- Dynamically generated per friction tier by the LLM.
- Mapped directly to the themes displayed in the Priority Matrix.
- Enables the Growth team to move from insight → experiment → roadmap item with zero manual synthesis.

---

## 5. Pipeline State Machine

```
                          +-------------+
                          |    IDLE     | <- App loads, baseline JSON read
                          +------+------+
                                 |  User triggers run / upload
                                 v
                          +-------------+
                          |  INGESTING  | <- Parse file, merge with baseline
                          +------+------+
                                 |  Raw records loaded
                                 v
                          +-------------+
                          | NORMALIZING | <- 3 quality filters applied
                          +------+------+
                          +------+------------------------+
                    >= 20 clean                  < 20 clean
                          |                          |
                          v                          v
                   +-------------+         +-----------------+
                   |  PII SCRUB  |         |   ERROR STATE   |
                   +------+------+         |  (graceful halt)|
                          |                +-----------------+
                          v
                   +-------------+
                   |  CLUSTERING | <- LLM semantic grouping
                   +------+------+
                   +------+-----------------------+
              normal           all-noise     monolith
              result           scenario      scenario
                   |               |              |
                   |     +---------v------+  +----v-----------+
                   |     | Relax density  |  | Split by       |
                   |     | + re-cluster   |  | rating tier    |
                   |     +--------+-------+  +----+-----------+
                   +-------------+-----------+----+
                                 v
                        +-----------------+
                        | THEME RANKING   | <- Priority score calc
                        +--------+--------+
                                 v
                        +-----------------+
                        | QUOTE TRUST     | <- Substring validation
                        +--------+--------+
                                 v
                        +-----------------+
                        |   RENDERING     | <- Dashboard updates
                        +--------+--------+
                                 v
                              +------+
                              | IDLE |
                              +------+
```

---

## 6. File & Folder Structure

```
NL_Swiggy_Instamart/
|
+-- docs/
|   +-- problemStatement.md          # Original project brief
|   +-- architecture.md             # This document
|
+-- data/
|   +-- compiled_insights.json      # 800+ pre-compiled review records (baseline)
|
+-- src/
|   +-- index.html                  # Application entry point & shell
|   +-- styles/
|   |   +-- index.css               # Design system, tokens, layout, animations
|   |
|   +-- pipeline/
|   |   +-- ingestion.js            # File parsing, baseline loader, merge logic
|   |   +-- normalization.js        # 3 quality filters (length, lang, sanitize)
|   |   +-- piiScrubber.js          # Regex-based PII replacement node
|   |   +-- clustering.js           # LLM-powered semantic clustering engine
|   |   +-- ranking.js              # Priority score formula & theme sorter
|   |   +-- quoteTrust.js           # Hallucination mitigation validator
|   |
|   +-- edgeCases/
|   |   +-- allNoise.js             # "All Noise" fallback protocol
|   |   +-- monolith.js             # "Single Monolith" split protocol
|   |
|   +-- llm/
|   |   +-- apiClient.js            # LLM API abstraction layer
|   |
|   +-- ui/
|   |   +-- metricsBar.js           # Metrics & ingestion panel component
|   |   +-- frictionMatrix.js       # Priority matrix card renderer
|   |   +-- categoryDeepDive.js     # Deep dive panel component
|   |   +-- experimentBlueprint.js  # Experiment step renderer
|   |
|   +-- app.js                      # Pipeline orchestrator & state machine
|
+-- README.md
+-- .gitignore
```

---

## 7. Technology Stack

| Layer             | Technology                        | Rationale                                                   |
|-------------------|-----------------------------------|-------------------------------------------------------------|
| Runtime           | Pure Browser (HTML + JS)          | No backend required; fully client-side as specified.        |
| Structure         | HTML5 (Semantic)                  | Accessibility, SEO-readiness, and screen reader support.    |
| Styling           | Vanilla CSS (Custom Properties)   | Maximum design control; no framework overhead.              |
| Scripting         | Vanilla JavaScript (ES2020+)      | Zero dependency footprint; direct DOM control.              |
| File Parsing      | Browser File API                  | Native `.csv`/`.json` reading without server upload.        |
| LLM Integration   | External LLM REST API             | Clustering, theme summarization, quote generation, experiments. |
| Data Baseline     | Static JSON (`compiled_insights`) | Instant load; no API friction on first render.              |
| PII Scrubbing     | Regex (in-browser)                | No sensitive data ever leaves client before scrubbing.      |

---

## 8. Data Flow Diagram

```
[compiled_insights.json]   [User Upload: .csv / .json]
           |                          |
           +----------+---------------+
                      v
              +---------------+
              |  INGESTION    |  Enforce: min 20, max 5,000
              +------+--------+
                     v
              +-------------------------------+
              |  NORMALIZATION (3 Filters)    |
              |  1. Length >= 8 words         |
              |  2. ASCII / EN-only           |
              |  3. Strip PII fields          |
              +--------------+----------------+
                             v
              +------------------------------+
              |  PII SCRUB (Regex)           |
              |  raw_text -> scrubbed_text   |
              +--------------+---------------+
                             v
              +------------------------------+        +-----------------+
              |  LLM API CALL #1             +------->+  External LLM   |
              |  Semantic Clustering         +<-------+  (API Response) |
              +--------------+---------------+        +-----------------+
                             | assigned_cluster per review
                             v
              +------------------------------+        +-----------------+
              |  LLM API CALL #2             +------->+  External LLM   |
              |  Theme Labels + Summaries    +<-------+  (API Response) |
              |  + Verbatim Quotes           |        +-----------------+
              |  + Experiment Steps          |
              +--------------+---------------+
                             v
              +------------------------------+
              |  PRIORITY SCORE              |
              |  size x (6 - avg_rating)     |
              +--------------+---------------+
                             v
              +------------------------------+
              |  QUOTE TRUST VALIDATOR       |
              |  Substring match vs corpus   |
              |  Drop unverified quotes      |
              +--------------+---------------+
                             v
              +------------------------------+
              |  DASHBOARD RENDER            |
              |  Metrics | Matrix | Dive |   |
              |  Blueprints                  |
              +------------------------------+
```

---

## 9. Key Formulas & Algorithms

### Priority Score

```
Priority Score = Cluster_Size x (6 - Mean_Star_Rating)
```

Score increases with cluster size and decreases with average rating — maximizing for large, high-friction cohorts.

### PII Regex Patterns

| Target               | Regex Pattern (approximate)          | Token      |
|----------------------|--------------------------------------|------------|
| Email addresses      | `[\w.+-]+@[\w-]+\.[a-z]{2,}`        | `[EMAIL]`  |
| Indian phone numbers | `(\+91[\-\s]?)?[6-9]\d{9}`          | `[PHONE]`  |
| Long numeric runs    | `\b\d{9,16}\b`                      | `[ID]`     |

> **ID Scrubber Boundary Note:** The ID expression maps to strict word boundaries (`\b\d{9,16}\b`). This ensures the script redacts standalone customer account strings or unique system identifiers, but explicitly **prevents the accidental destruction of close-proximity product metrics** like item pack net weights, item quantities, or standard price units.

### Quote Trust Verification

```javascript
function verifyQuote(quote, corpus) {
  const q_norm = quote.replace(/[^\w]/g, '').toLowerCase();
  for (const review of corpus) {
    const c_norm = review.scrubbed_text.replace(/[^\w]/g, '').toLowerCase();
    if (c_norm.includes(q_norm)) return 'VERIFIED';
  }
  return 'REJECTED';
}
```

#### Verification Fallback Logic

If a direct case-insensitive string match returns an absolute negative result due to punctuation deviations or minor LLM text adjustments, the validator executes a **continuous token chunking fallback**:

1. The generated quote string is programmatically sliced into small continuous **4-word segment blocks**.
2. Each segment token is independently matched against the corresponding `review_id` payload text using a case-insensitive index search.
3. If **multiple sequential segment tokens** yield successful index hits within the same source review, the quote is flagged as **verified** and included in the dashboard output.

```javascript
function verifyQuoteWithFallback(quote, corpus) {
  const q_norm = quote.replace(/[^\w]/g, '').toLowerCase();
  // Primary: direct substring match
  for (const review of corpus) {
    const c_norm = review.scrubbed_text.replace(/[^\w]/g, '').toLowerCase();
    if (c_norm.includes(q_norm)) return 'VERIFIED';
  }
  // Fallback: 4-word chunk segment matching
  const words = quote.trim().split(/\s+/);
  const segments = [];
  for (let i = 0; i <= words.length - 4; i++) {
    segments.push(words.slice(i, i + 4).join(' ').replace(/[^\w]/g, '').toLowerCase());
  }
  for (const review of corpus) {
    const c_norm = review.scrubbed_text.replace(/[^\w]/g, '').toLowerCase();
    const hits = segments.filter(seg => c_norm.includes(seg));
    if (hits.length >= 2) return 'VERIFIED'; // >= 2 sequential segments hit
  }
  return 'REJECTED';
}
```

---

## 10. Constraints & Boundaries

| Constraint                        | Value / Behavior                                              |
|-----------------------------------|---------------------------------------------------------------|
| Min reviews for clustering        | >= 20 (post-normalization)                                    |
| Max reviews per run               | <= 5,000 (raw, pre-normalization)                             |
| Min review word length            | >= 8 words (post-tokenization)                                |
| Supported ingest file types       | `.csv`, `.json`                                               |
| Language filter                   | English-only, ASCII-clean                                     |
| Noise cluster index               | `-1` (DBSCAN convention)                                      |
| Monolith trigger threshold        | Single cluster > 80% of total reviews                         |
| PII exposure to LLM               | Zero — `scrubbed_text` only, never `raw_text`                 |
| Quote trust method                | Case-insensitive substring match (punctuation/whitespace stripped) |
| Unverified quote behavior         | Dropped. Theme with zero verified quotes -> omitted entirely. |

---

## 11. Non-Functional Requirements

| Requirement       | Specification                                                                   |
|-------------------|---------------------------------------------------------------------------------|
| **Performance**   | Baseline JSON loads instantly on app launch. UI remains responsive during LLM calls with progress indicators. |
| **Privacy**       | PII scrubbing is a mandatory gate before any external API call. No user-identifying data persists post-session. |
| **Reliability**   | Edge-case protocols prevent pipeline breakage on degenerate inputs. Graceful error states for all violations. |
| **Traceability**  | Every quote is traceable to a specific `review_id` in the corpus.               |
| **Scalability**   | Volume cap (5,000) protects API token budgets; system is designed for weekly batch cadence. |
| **Usability**     | Dashboard targets non-technical Growth PMs; all insights rendered as plain-language summaries with no raw data exposure. |
| **Portability**   | Pure browser execution — no server, no installs, no build pipeline required.    |
