# NUX MG-30 Studio — Worker 1.2.4 Change Note

Date: 2026-11-18

## Source baseline
- User-provided Cloudflare Worker source v1.2.3 (619 lines).
- Updated on a dedicated branch; no production deployment performed.

## Changes
- Bumped Worker version to 1.2.4.
- Added POST /api/v1/tone3000/ai-search.
- Requires the signed-in user's TONE3000 OAuth bearer token.
- Searches the existing TONE3000 proxy for NAM format and architecture 2 (Gen 2).
- Adds a fallback query using the final search term and normalizes returned tone rows.
- Added no changes to existing proxy or model-download handlers.

## Preserved
- Existing /api/v1/tone3000/proxy route.
- Existing /api/v1/tone3000/download route.
- Existing model-download and TONE3000 auth behavior outside the new endpoint.
- NAM is not involved in IR mapping or MIDI mapping.

## Validation
- GitHub file re-fetched after commit; endpoint, Gen 2 NAM filters, proxy route, and download route checked.
- No production deployment performed.
