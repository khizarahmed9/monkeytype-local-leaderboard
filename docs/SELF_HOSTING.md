# Self hosting

Everything runs in one process: it serves the site, the game API and live updates, and keeps its data in one SQLite file.

## With Docker

```sh
git clone https://github.com/khizarahmed9/monkeytype-local-leaderboard.git
cd monkeytype-local-leaderboard
docker compose up -d --build
```

The site is on port 5005. To update, run `git pull` and the same `docker compose` command again. Games are kept in the `monkeytype-data` volume.

## Without Docker

You need Node 24 and pnpm 11.

```sh
pnpm install
pnpm exec turbo run build --filter=@monkeytype/frontend --filter=@monkeytype/server
pnpm start
```

## Settings

Set these as environment variables, or in a `.env` file next to `docker-compose.yml`.

| Variable        | Default  | Meaning                                                                                  |
| --------------- | -------- | ---------------------------------------------------------------------------------------- |
| `PORT`          | `5005`   | Port to listen on.                                                                       |
| `GAME_TTL_DAYS` | `30`     | Delete a game after this many days with no new players or results.                       |
| `TRUST_PROXY`   | `0`      | Number of reverse proxies in front of the server. Set it to `1` behind one proxy.         |
| `DATA_DIR`      | `./data` | Where the database goes. Docker uses `/data`.                                            |

## HTTPS and reverse proxies

The game works over plain HTTP, which is fine on a home network. Browsers turn off a few things there: copy buttons do not work, and the app cannot be installed or used offline.

Put the server behind any reverse proxy and set `TRUST_PROXY=1`, otherwise all players share one rate limit. Live updates use a long-lived connection, so turn off response buffering for `/api`. For nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:5005;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 1h;
}
```

## Backups

Back up the `data` directory, or the `monkeytype-data` volume, while the server is stopped.
