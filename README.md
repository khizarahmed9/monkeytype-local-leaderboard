# Monkeytype Local Leaderboard

A self-hosted fork of [Monkeytype](https://github.com/monkeytypegame/monkeytype) for playing typing games with people you know. There are no accounts and no ads.

Open the site, then either join with a 5 character game code or create a game and share its code. Everyone picks a name and plays. A live leaderboard shows everyone in the game, and a notification pops up when someone finishes a test.

## Features

- **Game codes:** share a random 5 character code. Nobody needs a password.
- **Locked settings:** the host picks time, words, quote, zen or a custom text, plus punctuation, numbers and language. Everyone plays the same test type, and the server rejects results that don't match. Hosts can turn locking off.
- **Shared devices:** everyone types their name when they join, so people can take turns on one device. Typing a name again on that device continues as that player.
- **Live leaderboard:** each player's best result, updated as tests finish. Open it with the crown button.
- **Anticheat:** results are checked on the server, see [below](#anticheat).
- **Easy hosting:** one process, one SQLite file. No MongoDB, Redis or Firebase.

## Run it

```sh
git clone https://github.com/khizarahmed9/monkeytype-local-leaderboard.git
cd monkeytype-local-leaderboard
docker compose up -d --build
```

Open <http://localhost:5005>. See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for HTTPS, settings and running without Docker.

## Develop

You need Node 24 and pnpm 11.

```sh
pnpm install
pnpm dev
```

The site runs on <http://localhost:3000> and proxies `/api` to the server on port 5005. Run the checks with `pnpm exec turbo run ts-check build && pnpm exec turbo run test`.

## Anticheat

Upstream's real anticheat module is closed source and its public repo ships an empty stub, so it can't be kept as is. This fork keeps every open check from upstream's result endpoint (result hash, test length, accuracy, funbox rules, result spacing, duplicates, key data) and adds its own in [server/src/anticheat.ts](server/src/anticheat.ts): locked settings, whether the speed matches the typed characters and key presses, and machine-like key timing.

These checks stop casual cheating. The client runs on the player's machine, so a determined cheat can still fake believable data.

## Staying up to date with upstream

[.github/workflows/upstream-sync.yml](.github/workflows/upstream-sync.yml) runs every Monday, and on demand from the Actions tab. It applies what changed upstream since `.upstream-sha` as one patch, runs the tests and build, and commits to `main` only if they pass.

- Paths that should never come across are listed in [.github/upstream-sync-ignore](.github/upstream-sync-ignore). Changes to files this fork deleted are skipped automatically.
- If a sync or CI fails, [notify-failure.yml](.github/workflows/notify-failure.yml) opens an issue assigned to the repo owner, and GitHub emails them. Check that email is on under GitHub's notification settings.
- To fix a conflict, run `.github/scripts/upstream-sync.sh` locally, resolve the conflict markers, run the `echo` line it prints, then commit.

## Credits and license

Made by [Khizar Ahmed](https://khiz3r.me/). Based on [Monkeytype](https://github.com/monkeytypegame/monkeytype) by Miodec and contributors, and licensed under the [GPL-3.0](LICENSE) like the original. This fork imports upstream as a snapshot, so upstream's commit history lives in their repository.
