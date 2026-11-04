# Contributing

This is a fork of [Monkeytype](https://github.com/monkeytypegame/monkeytype). Before changing anything, decide where the change belongs.

- **Themes, languages, quotes, layouts, fonts and typing test changes** belong upstream. Send them to Monkeytype, and they arrive here with the next [upstream sync](../README.md#staying-up-to-date-with-upstream). Their guides are [THEMES.md](THEMES.md), [LANGUAGES.md](LANGUAGES.md), [QUOTES.md](QUOTES.md), [LAYOUTS.md](LAYOUTS.md) and [FONTS.md](FONTS.md).
- **Game codes, the leaderboard, the server, hosting and upstream sync** belong in this repo.

## Project layout

- `frontend/` is Monkeytype's SolidJS site. Most of the game lives in `src/ts/components/pages/game/`, `src/ts/controllers/game-controller.ts` and `src/ts/states/game.ts`.
- `server/` is the Express and SQLite server. `src/anticheat.ts` holds the result checks.
- `packages/` holds shared code. `packages/schemas/src/games.ts` defines what the site and server send each other.

## Development

Setup is in the [README](../README.md#develop). Before opening a pull request, run:

```sh
pnpm exec turbo run ts-check lint build
pnpm exec turbo run test
```

Run the tests with `TZ=UTC`, because some date tests depend on the timezone.

Upstream changes come in as patches, so keep edits to upstream files small. New files are better than big changes to existing ones, because they can't conflict.
