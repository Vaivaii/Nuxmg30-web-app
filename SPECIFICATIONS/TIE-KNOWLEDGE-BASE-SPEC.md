# TIE-05 --- Guitar Tone Knowledge Base Specification

**Project:** MG30 Studio · **Module:** Intelligence knowledge and
retrieval\
**Version:** 1.0 · **Status:** Technical design baseline

## 1. Purpose

Create a modular, searchable guitar/audio engineering reference layer
that supports both Editor AI and Studio AI. The knowledge base
supplements measured application data; it must not replace measurements
or be treated as proof of a diagnosis.

## 2. Content domains

-   Guitar pickups, electronics, wiring and controls.
-   Amplifier topology and operating behavior.
-   Fender-, Marshall-, Vox-, Mesa/Boogie-, Dumble-style- and Tone
    King-related design references.
-   Overdrive, distortion, fuzz, boost and modulation.
-   Speakers, cabinets, microphones and placement.
-   Impulse Response fundamentals and practical use.
-   Neural Amp Modeling concepts and capture limitations.
-   EQ, filters, phase and frequency interactions.
-   Dynamics, gain staging, noise and clipping.
-   Recording, editing, mixing and monitoring.
-   Live PA translation and practical sound checks.

Brand/model descriptions must be factual, appropriately qualified and
sourced where claims are specific.

## 3. Knowledge record schema

``` ts
interface KnowledgeRecord {
  id: string;
  schemaVersion: 1;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  body: string;
  claimType: "established-fact" | "general-practice" | "interpretation" | "hypothesis";
  sources: Array<{
    title: string;
    authorOrPublisher?: string;
    url?: string;
    publicationDate?: string;
    accessedAt?: string;
    sourceType: "manufacturer" | "standard" | "book" | "paper" | "expert" | "other";
  }>;
  confidence?: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
  contentVersion: number;
}
```

The implementation may add localization, license, attribution and
deprecation fields. Never remove provenance fields for sourced claims.

## 4. Content quality rules

-   Separate established electrical/acoustic facts from common practice
    and subjective preference.
-   Cite manufacturer documentation for device-specific specifications.
-   Avoid unsupported exact frequency claims about named amplifiers or
    pedals.
-   Explain when results depend on circuit revision, settings, speaker,
    microphone, guitar or playing.
-   Record uncertainty and disagreement rather than forcing a single
    answer.
-   Avoid copying copyrighted manuals or books; store concise original
    summaries and permitted excerpts/metadata.

## 5. Retrieval

Use category filters, tags and text search initially. Add
embeddings/vector retrieval only if the app's size, runtime and
maintenance costs justify it.

Retrieval should return: - Matching record IDs. - Short relevant
passages. - Source metadata. - Claim type and confidence. - Relevance
score if available.

Keep retrieval deterministic enough to debug. Log which records informed
an AI answer, without logging secrets or unnecessary personal content.

## 6. AI grounding contract

When knowledge is retrieved, the AI should: - Attribute sourced claims
to the retrieved source metadata. - Distinguish knowledge-base facts
from interpretation of current DSP measurements. - Avoid inventing
citations or source details. - Say when no relevant record was found. -
Avoid presenting a subjective preference as universal truth.

Measured values from the current analysis always take precedence over
generic assumptions about a device or tone.

## 7. Editorial workflow

1.  Draft record.
2.  Verify source and factual claims.
3.  Assign category, tags and claim type.
4.  Review licensing/attribution.
5.  Publish versioned record.
6.  Revisit records when manufacturer documentation or standards change.

Support deprecation rather than silently rewriting historical records
used by old analysis reports.

## 8. Search and UI

Intelligence screen should provide: - Search. - Category browse. -
Detail page. - Related topics. - Source/attribution section. - Clear
labels for fact, practice, interpretation and hypothesis.

Keep content readable on Android. Avoid giant unstructured text blocks.

## 9. Acceptance criteria

-   Records are versioned and searchable.
-   Specific claims retain source metadata.
-   Claim type is visible to AI and UI.
-   AI can report missing knowledge without hallucinating references.
-   Content can be updated independently of DSP and provider
    orchestration.
-   License/attribution review is part of publishing.


## 10. Proposed Artist Tone Matching evidence domain — Planning Only

Artist Tone Matching is a proposed future consumer of this knowledge base, not an active implementation task. See `TIE-INTELLIGENCE-EXPANSION-SPEC.md` §4.

Add versioned records for artist/track/album/era/recording-specific rig and tone claims. Preserve all existing provenance fields and add, where relevant:

- Artist/band identity and verified aliases.
- Recording, song, album, session, tour or era applicability; avoid assuming one rig applies to an entire career.
- Claim scope (amp, cab/speaker, microphone, effect, NAM/IR, settings, order, guitar/pickups, recording/production chain).
- Evidence class: primary artist/crew statement, official manufacturer/artist reference, named interview/recording credit, secondary source, or unverified lead.
- Publication/access dates, author/publisher, URL, attribution/license notes, confidence and conflicting claims.
- Whether the claim refers to the actual recording, a later live rig, a tour setup, a general endorsement or only an estimate.

Prefer artist, producer, engineer and official manufacturer material; credible named interviews and recording credits are useful when primary sources are unavailable. Community posts may be search leads but cannot alone establish an exact chain. Store concise summaries and permitted metadata, not unlicensed full recordings, transcripts or manual text.

The AI grounding contract must distinguish (1) source-documented gear, (2) measured user audio, (3) estimated tone/chain inference, and (4) recommendations. A full-mix analysis does not prove a guitar-only spectrum or exact rig. No source-separation claim is allowed without a separately validated and licensed capability. Unknowns and conflicting source statements must remain visible rather than being resolved by model guesswork.

