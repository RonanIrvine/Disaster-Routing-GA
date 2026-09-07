#!/usr/bin/env bash
# One-time setup: downloads the New Zealand OSM extract and preprocesses it
# for OSRM using the mld algorithm. Run this once before `docker compose up`.
#
# Usage:
#   chmod +x setup-osrm.sh
#   ./setup-osrm.sh
#
# Requires: docker, curl (or wget)

set -euo pipefail

DATA_DIR="./osrm-data"
PBF_FILE="new-zealand-latest.osm.pbf"
PBF_URL="https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf"
IMAGE="ghcr.io/project-osrm/osrm-backend"

mkdir -p "$DATA_DIR"

if [ ! -f "$DATA_DIR/$PBF_FILE" ]; then
    echo "Downloading New Zealand OSM extract from Geofabrik..."
    curl -L -o "$DATA_DIR/$PBF_FILE" "$PBF_URL"
else
    echo "Found existing $PBF_FILE, skipping download."
fi

echo "Extracting (car profile)..."
docker run -t -v "$(pwd)/$DATA_DIR:/data" "$IMAGE" \
    osrm-extract -p /opt/car.lua "/data/$PBF_FILE"

echo "Partitioning..."
docker run -t -v "$(pwd)/$DATA_DIR:/data" "$IMAGE" \
    osrm-partition "/data/new-zealand-latest.osrm"

echo "Customizing..."
docker run -t -v "$(pwd)/$DATA_DIR:/data" "$IMAGE" \
    osrm-customize "/data/new-zealand-latest.osrm"

echo ""
echo "Done. Start the routing server with:"
echo "  docker compose up -d"
echo ""
echo "It will be available at http://localhost:5000"
