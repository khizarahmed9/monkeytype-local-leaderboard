# MonkeyType — HackHCC Local Leaderboard Edition

A stripped-down fork of [MonkeyType](https://github.com/monkeytypegame/monkeytype) built for the **HackHCC student hackathon typing speed competition**. Runs entirely on a local machine or Ubuntu VM — no database, no accounts, no cloud services required.

Modified by [Khizar Ahmed](https://www.linkedin.com/in/khizar-ahmed9/)
Fork: [github.com/khizarahmed9/monkeytype-local-leaderboard](https://github.com/khizarahmed9/monkeytype-local-leaderboard)

---

## How it works

1. A participant opens the site and types their name into the input field above the typing test.
2. They complete a **15-second time trial** (the only available mode).
3. On finish, their name, WPM, accuracy, and timestamp are sent to the backend and appended to `backend/local_leaderboard.csv`.
4. The `/local-leaderboards` page displays all scores sorted by WPM.

Scores persist in a plain CSV file. No database is used.

---

## Running locally (development)

### Prerequisites

- Node.js ≥ 22 — check with `node -v`
- pnpm 9.6.0 — install with `npm i -g pnpm@9.6.0`

### Setup

```bash
pnpm i
```

### Start (two terminals)

**Terminal 1 — backend** (port 5005):
```bash
cd backend
npm run dev-local
```

**Terminal 2 — frontend** (port 3000):
```bash
npm run dev-fe
```

Open **http://localhost:3000**. Leaderboard at **http://localhost:3000/local-leaderboards**.

---

## Deploying to an Ubuntu VM with Cloudflare Tunnels

In production the backend serves the built frontend too, so only one process and one port (5005) are needed. Cloudflare Tunnel exposes that port publicly over HTTPS with no port forwarding or firewall changes required.

### 1. Prepare the Ubuntu VM

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm i -g pnpm@9.6.0

# Install PM2 (process manager — keeps the server running)
npm i -g pm2
```

### 2. Clone and install

```bash
git clone https://github.com/khizarahmed9/monkeytype-local-leaderboard.git
cd monkeytype-local-leaderboard
pnpm i
```

### 3. Build the frontend

```bash
npm run build-prod
```

This compiles the frontend into `frontend/dist/`. The build bakes in an empty `backendUrl`, so all API calls go to the same origin (the backend server on port 5005 serves both).

### 4. Start the server

```bash
npm run start-prod
```

Or with PM2 so it survives reboots and crashes:

```bash
pm2 start "npm run start-prod" --name monkeytype
pm2 save
pm2 startup   # follow the printed command to enable auto-start on boot
```

The server now runs on **http://localhost:5005** and serves both the app and the leaderboard API.

### 5. Set up Cloudflare Tunnel

#### Install cloudflared

```bash
curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

#### Authenticate with your Cloudflare account

```bash
cloudflared tunnel login
```

A browser window opens — log in and select your domain.

#### Create a tunnel

```bash
cloudflared tunnel create hackhcc-typing
```

Note the tunnel ID printed (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

#### Configure the tunnel

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Paste the following, replacing `<TUNNEL_ID>` and `typing.yourdomain.com`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: typing.yourdomain.com
    service: http://localhost:5005
  - service: http_status:404
```

#### Route DNS to the tunnel

```bash
cloudflared tunnel route dns hackhcc-typing typing.yourdomain.com
```

This creates a CNAME record in Cloudflare automatically.

#### Run the tunnel with PM2

```bash
pm2 start "cloudflared tunnel run hackhcc-typing" --name cloudflare-tunnel
pm2 save
```

The app is now live at **https://typing.yourdomain.com**.

---

## Updating the server

SSH into the VM, then:

```bash
cd monkeytype-local-leaderboard
git pull
npm run build-prod
pm2 restart monkeytype
```

That's it — `git pull` fetches the latest code, `build-prod` rebuilds the frontend, and PM2 restarts the backend to pick up both changes.

---

## Managing scores

Scores are stored in `backend/local_leaderboard.csv`:

```
name,wpm,acc,timestamp,testType
Khizar,134.06,100,1769201382013,time 15
```

**Reset between rounds:**
```bash
> backend/local_leaderboard.csv
```

**View live scores:**
```bash
cat backend/local_leaderboard.csv
```

---

## What was removed from upstream MonkeyType

| Removed | Reason |
|---|---|
| Settings page & nav link | Defaults are locked in |
| About page & nav link | Not relevant for competition |
| Footer links (contact, support, Discord, Twitter, terms, security, privacy) | Stripped for clean UI |
| Announcements / notification bell | No announcements in local mode |
| Version button ("localhost" patch notes) | Not relevant |
| Merch banner | Not relevant |
| "Dev Info" Firebase banners | Firebase is not configured or needed |
| "local" dev watermarks (top-left / bottom-right) | Distracting in competition |
| Punctuation & numbers toggle buttons | Mode is fixed |
| Mode buttons (words, quote, zen, custom) | Fixed to time only |
| Time buttons (30, 60, 120, custom) | Fixed to 15s only |
| Difficulty setting | Fixed to normal |
| MongoDB + Redis dependency | Replaced with lightweight CSV-based server |
| Firebase / auth system | Not needed for local competition |

## What was changed

| Setting | Upstream default | This fork |
|---|---|---|
| Theme | `serika_dark` | `sonokai` |
| Mode | `time` | `time` (locked) |
| Time | `30s` | `15s` (locked) |
| Difficulty | `normal` | `normal` (locked) |
| Backend | Requires MongoDB + Redis | Standalone server, no DB |
| Prod backend URL | `https://api.monkeytype.com` | Same-origin (serves frontend too) |

---

## License

Original MonkeyType © Miodec & contributors, licensed under [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html).
This fork is also released under GPL-3.0.
