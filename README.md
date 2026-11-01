# Knightly Chess Platform

A responsive local chess interface built with React and Vite. The current version
supports legal two-player moves, move highlighting, captures, notation, promotion,
undo/redo, board flipping, light and dark themes, and a 10-minute-per-side clock.
Chess positions and games can also be loaded or exported as FEN and PGN.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Development

```sh
npm install
npm run dev
```

## Checks

```sh
npm run lint
npm run build
npm run test:ads
npm run test:chess
```

## Advertisement configuration

Ad placements are centrally configured in `src/ads/adConfig.js` and checked
through `src/ads/adManager.js`. The reusable `Ad` component loads the official Google AdSense script only for an
eligible placement. Every placement is disabled by default, and eligibility
requires all of the following:

- `VITE_ADS_ENABLED=true`
- `VITE_ADSENSE_APPROVED=true` after the publisher account is approved
- A valid `VITE_ADSENSE_PUBLISHER_ID` supplied by the publisher
- The requested placement's `VITE_AD_PLACEMENT_*` flag set to `true`
- The placement's actual numeric `VITE_AD_SLOT_*` ID from AdSense
- Explicit confirmation that no chess game is active
- The user is not marked as a premium member (`App` receives the trusted
  account entitlement through its `isPremium` prop)

Copy `.env.example` to `.env.local` for local configuration. Never commit actual
publisher-specific configuration. Do not enable ads or placements until the
publisher is approved and its real publisher ID has been provided.

The homepage banner and dashboard sidebar render only before the first move;
the post-game placement is shown only when the game has ended. The reusable
`Ad` component also supports the configured puzzle-page placement. While a game
is active, no ad component is mounted.

### Google AdSense values to provide

1. **Publisher ID:** `ca-pub-` followed by the 16-digit ID shown in your
   approved AdSense account.
2. **Ad unit slot IDs:** numeric IDs created in AdSense for each placement you
   want to enable (homepage banner, dashboard sidebar, puzzles, and post-game).
3. **Publisher approval:** approval for the website/domain in AdSense. Set the
   approval flag only after approval is confirmed.

No client secret or API key is used by this browser integration. Keep ads and
all placement flags off until the real IDs and approval are in place. Vite reads
these values at startup/build time; restart the dev server after changing them.
