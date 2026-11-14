# Deploying Relish

Relish runs as one FastAPI process on a small always-on VM. It serves the API (`/api/*`) and the built web app from the same origin, and it is reachable only over your Tailscale network. The iPhone uses it as a home-screen web app (PWA).

```
iPhone (Tailscale on) ──HTTPS──► relish.<tailnet>.ts.net  (tailscale serve, tailnet only)
                                        │  http://127.0.0.1:8000
                                        ▼
                               uvicorn (1 worker, --no-proxy-headers)
                               ├─ /api/*   FastAPI, owner identity from Tailscale
                               └─ /*       frontend/dist (web app)
                                        │
                               /var/lib/relish/relish.db  (SQLite, WAL)
                               /var/lib/relish/backups/   (startup + nightly snapshots)
```

Status: these steps are written ahead of Phase 3 (go live) in [DEPLOYMENT_ROADMAP.md](DEPLOYMENT_ROADMAP.md). `npm run build:web` produces a build that calls `/api` on the server's own address.

## 1. Create the VM (Google Cloud Always Free)

- Machine: `e2-micro`, region `us-west1`, `us-central1`, or `us-east1` (the free tier only covers these).
- Boot disk: Ubuntu 24.04 LTS, 30 GB standard persistent disk.
- Firewall: do not tick "Allow HTTP/HTTPS traffic". Nothing on the VM needs a public port; Tailscale connects outbound.
- Keep the ephemeral external IP (Tailscale needs outbound internet; Google's free tier docs say an in-use external IP on the free e2-micro is not charged).
- Set a billing budget alert (for example $1) so any surprise charge emails you.

## 2. Install Tailscale on the VM

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh          # approve the login in your browser
```

In the Tailscale admin console: enable MagicDNS and HTTPS certificates, and rename the machine `relish`. After this you can SSH with `tailscale ssh <user>@relish` and close port 22 in the Google Cloud firewall.

## 3. Prepare directories, user, and Python

```bash
sudo apt-get update && sudo apt-get install -y python3-venv sqlite3 rsync
sudo useradd --system --home /opt/relish --shell /usr/sbin/nologin relish
sudo mkdir -p /opt/relish/app /var/lib/relish/backups /etc/relish
sudo chown -R relish:relish /opt/relish /var/lib/relish
sudo python3 -m venv /opt/relish/venv
sudo chown -R relish:relish /opt/relish/venv
```

## 4. Ship the code and the web build

Build the web app on your development machine (it needs Node 20 and about 1 GB of RAM, which the e2-micro does not have to spare):

```bash
conda activate svelte
cd frontend && npm run build:web && cd ..
rsync -az --delete --exclude node_modules --exclude .git --exclude '*.db*' --exclude tmp \
  ./ <user>@relish:/tmp/relish-release/
```

On the VM:

```bash
sudo rsync -a --delete /tmp/relish-release/ /opt/relish/app/
sudo chown -R relish:relish /opt/relish/app
sudo -u relish /opt/relish/venv/bin/pip install -e /opt/relish/app
```

## 5. Secrets

Copy [`deploy/relish.env.example`](../deploy/relish.env.example) to the server and fill it in:

```bash
sudo install -m 600 -o root -g root deploy/relish.env.example /etc/relish/relish.env
sudoedit /etc/relish/relish.env
```

- `OWNER_EMAIL` must be the exact email of the Tailscale account you sign in with on the iPhone.
- `OPENAI_API_KEY`: set a monthly spending limit on the key in the OpenAI dashboard.
- The file is root-only. systemd reads it as root and passes the values to the `relish` user, which cannot read the file itself. Never commit it.
- Optional: store the values in Google Secret Manager instead and write this file from them at boot. For one user the root-only file is enough.

The server refuses to start if the production settings are unsafe or incomplete (wrong `AUTH_MODE`, missing `OWNER_EMAIL`, relative `DATABASE_URL`, missing `BACKUP_DIR`, `DEV_AUTO_LOGIN` on, or a `WEB_DIST_DIR` without `index.html`).

## 6. Install the services

```bash
sudo cp /opt/relish/app/deploy/relish.service /opt/relish/app/deploy/relish-backup.service \
  /opt/relish/app/deploy/relish-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now relish.service relish-backup.timer
systemctl status relish.service
curl -s http://127.0.0.1:8000/api/health
```

`relish.service` runs [`scripts/prod-backend.sh`](../scripts/prod-backend.sh): uvicorn on `127.0.0.1:8000`, one worker, `--no-proxy-headers` (required; see [PROJECT_SETUP.md](PROJECT_SETUP.md#environment-variables)).

## 7. Publish on your tailnet

```bash
sudo tailscale serve --bg --https=443 http://127.0.0.1:8000
tailscale serve status
```

Never use `tailscale funnel` for Relish: Funnel is public and carries no identity headers.

## 8. Install on the iPhone

1. Install the Tailscale app from the App Store and sign in with the same account as `OWNER_EMAIL`.
2. In Tailscale settings, turn on VPN On Demand (or keep the VPN on) so the app can reach `relish.<tailnet>.ts.net`.
3. Open `https://relish.<tailnet>.ts.net` in Safari, tap Share, then Add to Home Screen.
4. Open Relish from the home screen. It recognizes you through Tailscale and goes straight to onboarding or Home. The installed app has its own storage, separate from Safari.

## Updating

Repeat step 4, then `sudo systemctl restart relish.service`. A snapshot is taken automatically before each start. `index.html` and `sw.js` are served with `Cache-Control: no-cache`, so the phone picks up the new build on its next launch.

## Backups and restore

- Startup snapshots and nightly snapshots (03:30, `relish-backup.timer`) go to `/var/lib/relish/backups`; the newest 14 of each kind are kept.
- Off-machine copies (Litestream or rclone to a free Cloudflare R2 or Backblaze B2 bucket) are set up in Phase 3.
- `GET /api/export` (or the app's export, once added) downloads everything as JSON.

Restore drill (do this once after going live):

```bash
sudo systemctl stop relish.service
sudo -u relish cp /var/lib/relish/relish.db /var/lib/relish/relish.db.before-restore
sudo -u relish rm -f /var/lib/relish/relish.db-wal /var/lib/relish/relish.db-shm
sudo -u relish cp /var/lib/relish/backups/<snapshot>.db /var/lib/relish/relish.db
sudo systemctl start relish.service
```

## Troubleshooting

- App shows "Connect Tailscale to open Relish": the iPhone's Tailscale VPN is off or signed into a different account than `OWNER_EMAIL`.
- Every request returns 403 "Untrusted identity source": uvicorn is running without `--no-proxy-headers`; start it through `scripts/prod-backend.sh`.
- Logs: `journalctl -u relish.service -f`.
