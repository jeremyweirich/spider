# Spider Solitaire

Spider solitaire in the browser, hosted on GitHub Pages: https://jeremyweirich.github.io/spider/

- 1, 2 or 4 suits (4 is the default)
- Drag a run, or click a card to send it to the best spot
- Unlimited undo, hints (press again to cycle), numbered deals you can replay
- Toolbar at the bottom for thumbs, with Undo on the far right
- Backgrounds: felt, beach, ocean, sunset, wood, night (`src/themes.ts`)
- The game in progress, chosen background and stats (win rate, fastest and average win, best score, streaks) are kept in localStorage

Keys: `Ctrl/Cmd+Z` undo, `H` hint, `D` deal, `N` new game.

Scoring follows the classic rules: start at 500, −1 per move (undo included), +100 per completed King-to-Ace run.

## Development

```sh
npm install
npm run dev     # local dev server
npm test        # rules, session, stats tests
npm run build   # type-check and build to dist/
```

Every push to `main` runs the tests and the build and publishes to Pages (`.github/workflows/pages.yml`).

The game logic in `src/game/` is pure TypeScript with no React; `src/components/` only draws it.
