# Disaster-Routing-GA
STEM Research: AI for disaster resource distribution

A browser-based disaster resource distribution simulator for Auckland's CBD.
Users place disaster locations and resource centers on a map, mark hazardous
routes, and run a genetic algorithm that computes optimized multi-team
delivery routes — minimizing travel distance and hazard exposure.

Implementation component of Ronan Gondipon's STEM research paper, *"How AI
is used for Resource Distribution: Systematic Literature Review"* 

## Setup

This app requires a local OSRM routing server. See [OSRM_SETUP.md](OSRM_SETUP.md)
for full instructions — in short:

​```bash
git clone https://github.com/RonanIrvine/Disaster-Routing-GA.git
cd Disaster-Routing-GA
chmod +x setup-osrm.sh && ./setup-osrm.sh   # one-time OSRM data setup
docker compose up -d                         # start the routing server
​```

Then open `main.html` in a browser.

## Tech
Plain HTML/CSS/JS (no build step), Leaflet, Leaflet Routing Machine, Turf.js,
Leaflet.draw, OSRM.
