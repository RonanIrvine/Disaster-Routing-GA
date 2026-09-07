# OSRM Routing Backend Setup

This app requires a local OSRM server at `http://localhost:5000` serving
Auckland/New Zealand road data. `main.js` calls it directly for route
precomputation and the genetic algorithm — nothing else in the app will
work without it.

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
  and running.
  - On Windows, Docker Desktop with the WSL2 backend is recommended (this is
    what the original setup uses — Ubuntu 22.04 under WSL2).
- ~5–10 GB free disk space (raw extract + processed graph files).
- Internet access for the one-time data download (not needed after that).

## First-time setup (once per machine)

1. Clone/copy this repo, `cd` into it.
2. Make the setup script executable and run it:
   ```bash
   chmod +x setup-osrm.sh
   ./setup-osrm.sh
   ```
   This downloads `new-zealand-latest.osm.pbf` from Geofabrik into
   `./osrm-data/` and runs `osrm-extract` → `osrm-partition` →
   `osrm-customize` inside temporary containers. This step can take several
   minutes to tens of minutes depending on your machine — it only needs to
   be done once (the processed files are cached in `./osrm-data/`).

   **Windows users:** run this from a WSL2 shell (e.g. Ubuntu), not
   PowerShell/cmd — that matches the original environment and avoids path
   issues with Docker volume mounts.

## Running the server

```bash
docker compose up -d
```

This starts `osrm-routed --algorithm mld /data/new-zealand-latest.osrm`,
bind-mounting `./osrm-data` into the container, and exposes it on
`localhost:5000` — exactly matching the reference setup.

Check it's up:
```bash
curl "http://localhost:5000/route/v1/driving/174.7633,-36.8485;174.7400,-36.8600"
```
You should get back a JSON response with `"code":"Ok"`.

Stop it with:
```bash
docker compose down
```

## Running the app

Once the OSRM container is running, open `main.html` in a browser (or serve
the folder with any static file server, e.g. `python -m http.server`).

## Troubleshooting
- **`ERR_CONNECTION_REFUSED` on `localhost:5000`** — the OSRM container
  isn't running. Check `docker ps` and `docker compose logs osrm`.
- **Container exits immediately** — usually means the `.osrm*` files in
  `./osrm-data` are missing or incomplete; re-run `setup-osrm.sh`.
- **Routes only exist for parts of NZ / missing roads** — the Geofabrik
  extract is the whole country; this is expected to be large but shouldn't
  cause missing Auckland roads. If it does, re-download the `.pbf` (it may
  be stale) and redo the extract/partition/customize steps.
