 # Growth Team Discovery Project: Swiggy Instamart Cross-Category Engine

## 1. Objective & Strategic Intent
You are a Growth Product Manager at Swiggy Instamart. While the platform has successfully cemented its place in high-frequency, low-consideration weekly routines (Groceries, Dairy, Snacks & Beverages), user behaviors rapidly solidify into automated, search-driven autopilots. Users open the app with narrow intent, buy their fixed basket, and rarely cross over to long-tail, high-margin categories (e.g., Pet Supplies, Personal Care & Beauty, Home Essentials, Baby Care).

The core growth goal is to **increase the percentage of Monthly Active Customers (MAC) who adopt and purchase products from at least one new category every month**. 

To drive this objective without relying on assumptions, you are building an automated AI-Powered Discovery Engine within a web dashboard interface. This dashboard will parse unstructured user feedback at scale to map out the psychological and behavioral patterns preventing cross-category conversion, generating direct inputs for strategic target experimentation.

## 2. Ingestion & Core Data Specifications
The ingestion layer handles imports of unstructured consumer feedback spanning multiple channels (Play Store reviews, App Store reviews, Reddit discussions, community forums, social media conversations, product reviews, and quick-commerce discussion groups).

### A. Ingestion Scope
- **Pre-Compiled Baseline:** The system reads an embedded multi-source repository file (`compiled_insights.json`) containing over 800+ granular data records across Play Store, App Store, Reddit threads, and community forums to populate the primary view instantly upon launch. This guarantees a complete data scale for reviewers without initial API network friction.
- **Dynamic Batch File Ingest:** The interface provides a functional drag-and-drop ingestion node that accepts comprehensive `.csv` or `.json` batch files representing a fresh week's worth of multi-source unstructured text fields.

### B. Core Schema Structure
Every ingested review record must maintain this absolute data structure throughout the runtime lifecycle:
- `review_id`: Cryptographic string hash or native payload key identifier.
- `source_channel`: Explicit string identifying origin (e.g., PlayStore, AppStore, Reddit, Forum).
- `raw_text`: The completely unedited text review string submitted by the user.
- `scrubbed_text`: The text body post-execution of the data cleaning nodes.
- `rating`: An integer range from 1 to 5 stars.
- `timestamp`: Date/Time element to track longitudinal behavioral patterns.
- `assigned_cluster`: The computed clustering index integer (Defaults to `-1` for noise).

### C. Execution Triggers & Ingestion Constraints
- **Minimum Ingestion Bounds:** The processing pipeline must enforce a hard minimum baseline floor of $\ge 20$ normalized reviews before allowing downstream clustering execution. If the sample size is lower, execution must gracefully halt to prevent skewed pattern generation.
- **Maximum Volume Cap:** A single processing iteration enforces a hard limit threshold of 5,000 raw reviews to protect API credit allocations and prevent token window exhaustion.

## 3. The Technical Pipeline: Phase-Wise Breakdown

### Phase 1: Ingestion & Strict Normalization
Before raw imports pass to reasoning modules, they are put through three structural quality filters:
1. **Length Floor:** Discard all reviews containing fewer than 8 total words after processing boundaries to eliminate low-signal complaints (e.g., "very good", "bad app").
2. **Language/Character Cleanliness:** Automatically scan and eliminate reviews containing non-ASCII symbols, heavy emoji density, or scripts written in non-English languages to isolate high-signal textual contexts.
3. **Payload Sanitization:** Completely strip away peripheral operational parameters (`userName`, `userImage`, `reviewCreatedVersion`, `replyContent`, `repliedAt`) to keep the data processing layer completely anonymous and focused purely on user voice.

### Phase 2: Processing & Core Reasoning Canvas
- **PII Scrubbing Node:** Before text strings interface with external LLM endpoints, the text must be scrubbed using regular expression patterns to replace sensitive details with clear placeholder tokens:
  * Email formats $\rightarrow$ `[EMAIL]`
  * Indian phone number standards $\rightarrow$ `[PHONE]`
  * Numeric runs spanning $\ge 9$ digits (e.g., unique identifier runs) $\rightarrow$ `[ID]`
- **Unsupervised Theme Clustering:** Rather than mapping text to a rigid, pre-configured taxonomy, the engine must leverage text embeddings to calculate proximity matrices. Reviews are grouped dynamically based on semantic similarity using unsupervised spatial density clustering models (simulated via token-based semantic categorizers within the LLM architecture for pure browser execution).
- **Theme Ranking Logic:** Discovered categories are automatically sorted and prioritized using an explicit ranking multiplier formula:
  $$\text{Priority Score} = \text{Cluster Size} \times (6 - \text{Average Rating})$$
  This explicitly prioritizes large-scale user cohorts reporting low-star categorical frictions, giving the growth team immediate clarity on high-leverage opportunities.

### Phase 3: Programmatic Hallucination Mitigation (Quote Trust)
To ensure absolute fidelity to the customer voice, every user quote generated by the text summary models must pass a strict programmatic check before being rendered on the growth manager's dashboard:
1. The engine strips punctuation and spaces from both the generated quote and the scrubbed text collection.
2. It executes a case-insensitive substring match verification check.
3. If a quote fails this validation step, it is completely dropped from the payload. If a theme loses all supporting user quotes, the theme is omitted entirely to prevent AI hallucinations from polluting the product roadmap.

## 4. Edge-Case Resilience Protocol
- **The "All Noise" Scenario:** If the density parameters categorize 100% of the input text as unstructured noise (Cluster `-1`), the engine must automatically lower its density constraints to execute a broader, rating-stratified analytical pass rather than breaking with a generic system error.
- **The "Single Monolith" Scenario:** If a single complaint theme (e.g., a systemic delivery glitch) swallows $> 80\%$ of the entire data pool, the system must split that monolith by rating tiers (1-2 Star Frictions vs 4-5 Star Frictions) before calculating priority metrics.

## 5. Intended Dashboard Experience & User Value
The final web interface built in Anti-Gravity must deliver an executive view for Product Managers and Growth Leads:
- **Metrics & Ingestion Panel:** A prominent summary bar showing aggregate metrics (Total Ingested Reviews, Retained Clean Samples, and Total Active Friction Themes) alongside an active file dropper where growth managers or reviewers can upload new weekly data sheets to watch the entire engine normalize, filter, and map behavioral cohorts in real time.
- **Friction Priority Matrix:** A highly legible, prioritized layout showing the name of each theme, its core behavioral dynamic, its priority score, and verified verbatim user quotes.
- **Category Deep Dive:** Highlighting specific qualitative transitions (e.g., what specific trust barrier stops a regular grocery buyer from trying the "Beauty" or "Personal Care" carousel).
- **Experimentation Blueprint:** Actionable programmatic feature steps dynamically mapped to each major friction tier.