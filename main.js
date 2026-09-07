 const locations = [
    { name: "Resource Center 1", lat: -36.854121017936365, lon: 174.73171861142893, resources: { Water: 5, Food: 10, MedSupplies: 10, ShelterSupplies: 5 } },
    //{ name: "Location B", lat: -36.854861178026475, lon: 174.72714457883023, resources: { Water: -3, Food: -10, MedSupplies: -12, ShelterSupplies: -8 } },
    { name: "Resource Center 2", lat: -36.84920936441189, lon: 174.75803849390655, resources: { Water: 5, Food: 10, MedSupplies: 5, ShelterSupplies: 5 } },
    //{ name: "Location D", lat: -36.855702527894785, lon: 174.7464279774692, resources: { Water: -7, Food: -7, MedSupplies: -3, ShelterSupplies: -2 } },
    { name: "Team 1", lat: -36.856154227983396, lon: 174.75903745981554, resources: { Water: 0, Food: 0, MedSupplies: 0, ShelterSupplies: 0 }, isTeam: true },
    { name: "Team 2", lat: -36.86433572429402, lon: 174.73905268752475, resources: { Water: 0, Food: 0, MedSupplies: 0, ShelterSupplies: 0 }, isTeam: true }
];

const resourceTypes = ['Water', 'Food', 'MedSupplies', 'ShelterSupplies'];

const originalResources = locations.map(loc => ({ ...loc.resources }));

let isAddingDisaster = false; // Flag for adding disaster location
let disasterCount = 0; 
const maxDisasters = 2; //Limit
let isDrawing = false;

const hazardCategories = {
    NONE: "None",
    FIRE: "Fire",
    EARTHQUAKE: "Earthquake",
    FLOOD: "Flood",
    HURRICANE: "Hurricane"
};

const hazardColors = {
    0: '#888888', // GRAY (no hazard)
    1: '#00FF00', // GREEN
    2: '#FFFF00', // YELLOW
    3: '#FF9900', // ORANGE
    4: '#FF6600', // DARK ORANGE
    5: '#FF3300', // RED-ORANGE
    6: '#FF0000', // RED
    7: '#8B0000'  // DARL RED 
};

const hazardIcons = {
    [hazardCategories.NONE]: '', 
    [hazardCategories.FIRE]: 'fa-regular fa-fire',
    [hazardCategories.EARTHQUAKE]: 'fa-regular fa-house-crack',
    [hazardCategories.FLOOD]: 'fa-regular fa-house-flood-water',
    [hazardCategories.HURRICANE]: 'fa-regular fa-hurricane'
};

const map = L.map('map').setView([-36.854, 174.74], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);
// Local OSRM router
const osrmRouter = L.Routing.osrmv1({
     serviceUrl: 'http://localhost:5000/route/v1',
    routerOptions: {
      alternatives: 'true', // Provide more than 1 route if exist
      geometries: 'geojson' 
    }
});

function createIcon(iconClass, color, letter) {
    const html = `
        <div style="position: relative; text-align: center;">
            <i class="fas ${iconClass}" style="font-size: 24px; color: ${color};"></i>
            <span style="position: absolute; top: 0; left: 0; font-size: 12px; color: white; width: 100%;">${letter}</span>
        </div>
    `;
    return L.divIcon({
        html: html,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}
const teamIcons ={
    "Team 1":createIcon('fa-van-shuttle', 'blue', 'T1'),
    "Team 2":createIcon('fa-van-shuttle', 'green', 'T2'),
}

const resourceCenterIcons ={
    "Resource Center 1":createIcon('fa-warehouse', 'red', 'R1'),
    "Resource Center 2":createIcon('fa-warehouse', 'purple', 'R2'),
}

// Add markers
const markers = [];
locations.forEach(loc => {
    const resourceText = resourceTypes.map(type => `${type}: ${loc.resources[type]}`).join('<br>');
    let icon;
    if (loc.isTeam) {
        icon = teamIcons[loc.name];
    } else if (loc.name === "Resource Center 1" || loc.name === "Resource Center 2") {
        icon = resourceCenterIcons[loc.name];
    } 
    const marker = L.marker([loc.lat, loc.lon], { icon }).addTo(map)
        .bindPopup(`${loc.name}:<br>${resourceText}`);
    markers.push(marker);
});
// Routing layers
let routes = [];

let routeLayers = {}; // Store route layers for later manipulation
let allRoutes = {}; // Global variable
// GA variables
let population = [];
const popSize = 100;
let fitness = [];
let bestSolution = null;
let recordDistance = Infinity;
let prevBestFitness = -Infinity;
// Cache for routing distances
const distanceCache = new Map();
// Ensure DOM is loaded before UI setup
document.addEventListener('DOMContentLoaded', async () => {
    // DOM elements
    const fromSelect = document.getElementById('fromLocation');
    const toSelect = document.getElementById('toLocation');
    const routeSelect = document.getElementById('routeSelection');
    const runButton = document.getElementById('runButton');
    const resetButton = document.getElementById('resetButton');
    const addHazardButton = document.getElementById('addHazard'); 
    const addDisasterButton = document.getElementById('addDisasterLocationButton');
    const loadRoutesButton = document.getElementById('loadRoutesButton');

    // Toggle disaster-adding mode
    addDisasterButton.addEventListener('click', () => {
        if (!isAddingDisaster && disasterCount < maxDisasters) {
            isAddingDisaster = true;
            map.getContainer().style.cursor = 'crosshair';
            addDisasterButton.textContent = 'Stop Adding Disasters';
        } else {
            isAddingDisaster = false;
            map.getContainer().style.cursor = '';
            addDisasterButton.textContent = 'Add Disaster Location';
        }
    });

    // Load routes
    loadRoutesButton.addEventListener('click', async () => {        
        isAddingDisaster = false; // OFF Marker
        map.getContainer().style.cursor = '';
        addDisasterButton.textContent = 'Add Disaster Location';
        allRoutes = await precomputeAllRoutes();
        console.log('All Routes:', allRoutes);
        if (Object.keys(allRoutes).length > 0) {
            displayRouteOptionsOnMap(allRoutes);
            updateRouteDropdown(allRoutes);
            loadRoutesButton.disabled = true; // Disable after loading
        } else {
            console.error('No routes precomputed. Check OSRM server or network.');
        }
    });

    map.on('click', (e) => {
        if (isAddingDisaster && !isDrawing && disasterCount < maxDisasters) {
            const { lat, lng } = e.latlng;
            disasterCount++;
            const locName = `Location ${String.fromCharCode(65 + disasterCount - 1)}`; // Name location from A to Z
            const newLocation = {
                name: locName,
                lat,
                lon: lng,
                resources: { Water: 0, Food: 0, MedSupplies: 0, ShelterSupplies: 0 } // Default to 0
            };
            locations.push(newLocation);

            // Add marker
            const resourceText = resourceTypes.map(type => `${type}: ${newLocation.resources[type]}`).join('<br>');
            const marker = L.marker([lat, lng]).addTo(map)
                .bindPopup(`${locName}:<br>${resourceText}`);
            markers.push(marker);

            // Update resource input table
            updateResourceTable();
            updateRouteDropdown(allRoutes);

            loadRoutesButton.disabled = false; // Enable load routes button if at least one disaster location is added
            
            isAddingDisaster = false;// OFF Disaster marker
            map.getContainer().style.cursor = '';
            addDisasterButton.textContent = 'Add Disaster Location';

            if (disasterCount >= maxDisasters) { // Button disabled if max disasters reached
                addDisasterButton.disabled = true;
            }
        }
    });
    
    updateResourceTable();
    // Populate from and to dropdowns
    locations.forEach(loc => {
        fromSelect.add(new Option(loc.name, loc.name));
        toSelect.add(new Option(loc.name, loc.name));
    });
    
    // Precompute all routes once    
    try {
        allRoutes = await precomputeAllRoutes();        
        console.log(`Precomputed ${Object.keys(allRoutes).length} route pairs`);
        if (Object.keys(allRoutes).length > 0) {
            displayRouteOptionsOnMap(allRoutes); // Display routes on the map
        } else {
            console.error('No routes precomputed. Check OSRM server or network.');
        }
    } catch (error) {
        console.error('Error precomputing routes:', error);
    }
    // Update route dropdown when from/to changes
    fromSelect.addEventListener('change', () => updateRouteDropdown(allRoutes));
    toSelect.addEventListener('change', () => updateRouteDropdown(allRoutes));

    // Route selection change
    routeSelect.addEventListener('change', () => {
        const from = fromSelect.value;
        const to = toSelect.value;
        const routeIndex = routeSelect.value;

        Object.values(routeLayers).forEach(layer => {
            if (layer.hazardLevel && layer.hazardLevel > 0) {
                layer.setStyle({ color: hazardColors[layer.hazardLevel], opacity: 0.8 });
            } else {
                layer.setStyle({ color: '#888888', opacity: 0.3 });
            }
        });

        if (routeIndex !== '') {
            const routeId = `${from}-${to}[${parseInt(routeIndex) + 1}]`;
            const selectedLayer = routeLayers[routeId];
            if (selectedLayer) {
                if (!selectedLayer.hazardLevel || selectedLayer.hazardLevel === 0) {
                    selectedLayer.setStyle({ color: 'blue', opacity: 0.8 });
                }
                map.fitBounds(selectedLayer.getBounds());
            } else {
                console.error(`Route layer not found for ${routeId}`);
            }
        }
    });
    
    addHazardButton.addEventListener('click', () => {
        const from = fromSelect.value;
        const to = toSelect.value;
        const routeIndex = routeSelect.value;
        const hazardLevel = parseInt(document.getElementById('hazardLevel').value);
        const hazardCategory = document.getElementById('hazardCategory').value;
    
        if (from && to && routeIndex !== '' && hazardLevel >= 1 && hazardLevel <= 7) {
            const route = allRoutes[`${from}-${to}`][routeIndex];
            const routeId = `${from}-${to}[${parseInt(routeIndex) + 1}]`;
    
            route.isManualHazard = true;
            route.manualHazardLevel = hazardLevel; // Store original manual value
            route.hazardLevel = hazardLevel; // Initial total
            route.hazardCategory = hazardCategory;
    
            const layer = routeLayers[routeId];
            if (layer) {
                layer.hazardLevel = hazardLevel;
            }
    
            updateRouteHazards();
            document.getElementById('hazardCategory').value = 'None';
        } else {
            alert('Please select valid locations, a route, and a hazard level (1-7).');
        }
    });

    
    runButton.addEventListener('click', async () => {
        const isRunning = runButton.textContent === 'Run Algorithm';
        if (isRunning) {
            const startTime = performance.now();
            await runGeneticAlgorithm();
            const endTime = performance.now();
            document.getElementById('compTime').textContent = (endTime - startTime).toFixed(2);
        }
    });
    
    resetButton.addEventListener('click', () => reset());

});
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
var hazardAreas = [];
var hazardIconsMarkers = [];

function updateHazardList() {
    const list = document.getElementById('hazardList');
    list.innerHTML = '';
    const allRoutes = distanceCache.get('allRoutes') || {};
    Object.entries(allRoutes).forEach(([pair, routes]) => {
        routes.forEach(route => {
            if (route.hazardLevel >= 1) { // Include level 1 and above
                const li = document.createElement('li');
                li.textContent = `${route.id}: Hazard Level ${route.hazardLevel}, Category: ${route.hazardCategory}, Distance ${route.distance.toFixed(2)} km`;
                list.appendChild(li);
            }
        });
    });
}

document.getElementById('updateResources').addEventListener('click', () => {
    const resourceRows = document.querySelectorAll('#resourceInputs tbody tr');
    resourceRows.forEach(row => {
        const locationName = row.getAttribute('data-location');
        const location = locations.find(loc => loc.name === locationName);
        if (location && !location.isTeam) { // Update only non-team locations
            const inputs = row.querySelectorAll('.resource-input');
            inputs.forEach(input => {
                const resourceType = input.getAttribute('data-resource');
                const value = parseInt(input.value, 10);
                location.resources[resourceType] = value;
            });
        }
    });
    updateMarkers(); // Update the locations with new resource values
});

function updateMarkers() {
    locations.forEach((loc, i) => {
        const resourceText = resourceTypes.map(type => `${type}: ${loc.resources[type]}`).join('<br>');
        markers[i].setPopupContent(`${loc.name}:<br>${resourceText}`);
    });
}

async function getAllRoutes(from, to) {
    const fromLat = Number(from.lat.toFixed(6));
    const fromLon = Number(from.lon.toFixed(6));
    const toLat = Number(to.lat.toFixed(6));
    const toLon = Number(to.lon.toFixed(6));
    const key = `${fromLat},${fromLon}-${toLat},${toLon}`;

    if (distanceCache.has(key)) {
        return distanceCache.get(key);
    }

    const coordinates = `${fromLon},${fromLat};${toLon},${toLat}`;
    const url = `http://localhost:5000/route/v1/driving/${coordinates}?alternatives=true&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes.length) {
        throw new Error(`No routes found between ${from.name} and ${to.name}`);
    }

    const routes = data.routes.map((route, index) => {
        const actualDistance = route.distance / 1000;
        const geometry = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
        return {
            id: `${from.name}-${to.name}[${index + 1}]`,
            distance: actualDistance,
            geometry: geometry,
            hazardLevel: 0,
            manualHazardLevel: 0, // Add this
            hazardCategory: hazardCategories.NONE
        };
    });
    distanceCache.set(key, routes);
    return routes;
}

function updateResourceTable() {
    const tbody = document.querySelector('#resourceInputs tbody');
    tbody.innerHTML = ''; // Clear existing rows
    locations.forEach(loc => {
        if (!loc.isTeam) { // Ignore teams
            const isResourceCenter = loc.name === "Resource Center 1" || loc.name === "Resource Center 2";
            const row = document.createElement('tr');
            row.setAttribute('data-location', loc.name);
            row.innerHTML = `
                <td>${loc.name}</td>
                <td><input type="number" class="resource-input" data-resource="Water" value="${loc.resources.Water}"></td>
                <td><input type="number" class="resource-input" data-resource="Food" value="${loc.resources.Food}"></td>
                <td><input type="number" class="resource-input" data-resource="MedSupplies" value="${loc.resources.MedSupplies}"></td>
                <td><input type="number" class="resource-input" data-resource="ShelterSupplies" value="${loc.resources.ShelterSupplies}"></td>
                <td>${isResourceCenter ? '' : '<button class="delete-location">Delete</button>'}</td>
            `;
            tbody.appendChild(row);
        }
    });
    document.querySelectorAll('.delete-location').forEach(button => {
        button.addEventListener('click', () => {
            const row = button.closest('tr');
            const locationName = row.getAttribute('data-location');
            deleteLocation(locationName);
        });
    });
}
    
function deleteLocation(locationName) {
    const locIndex = locations.findIndex(loc => loc.name === locationName);//Makes sure its not a Resource Center or a Team
    if (locIndex === -1 || locations[locIndex].isTeam || locationName === "Resource Center 1" || locationName === "Resource Center 2") {
        console.error(`Cannot delete ${locationName}: Invalid or protected location`);
        return;
    }

    // Remove from locations and 
    locations.splice(locIndex, 1);
    //initialResources.splice(locIndex, 1);

    const markerIndex = markers.findIndex(m => m.getPopup().getContent().includes(locationName)); // Remove marker
    if (markerIndex !== -1) {
        map.removeLayer(markers[markerIndex]);
        markers.splice(markerIndex, 1);
    }

    // Decrement disaster count
    disasterCount--;
    document.getElementById('addDisasterLocationButton').disabled = false; // Re-enable adding
    document.getElementById('loadRoutesButton').disabled = true; 

    // Clear existing routes
    Object.values(routeLayers).forEach(layer => map.removeLayer(layer));
    routeLayers = {};
    allRoutes = {};
    distanceCache.clear();

    // Update UI
    updateResourceTable();
    updateRouteDropdown(allRoutes);
    }

async function precomputeAllRoutes() {
    for (let i = 0; i < locations.length; i++) {
        for (let j = 0; j < locations.length; j++) {
            if (i !== j) {
                const from = locations[i];
                const to = locations[j];
                allRoutes[`${from.name}-${to.name}`] = await getAllRoutes(from, to);
            }
        }
    }
    console.log('Precomputed allRoutes:', allRoutes);
    distanceCache.set('allRoutes', allRoutes);
    return allRoutes;
}

function displayRouteOptionsOnMap(allRoutes) {
    Object.entries(allRoutes).forEach(([pair, routes]) => {
        routes.forEach(route => {
            const layer = L.polyline(route.geometry, {
                color: '#888888', // Gray for unused routes
                opacity: 0.3,
                weight: 3
            }).addTo(map);
            layer.routeId = route.id;
            routeLayers[route.id] = layer;
        });
    });
}

function getBestRoute(from, to, allRoutes) {
    if (from.name === to.name) {
        return { distance: 0, geometry: [], hazardLevel: 0 };
    }
    const pair = `${from.name}-${to.name}`;
    const routes = allRoutes[pair];
    if (!routes || routes.length === 0) {
        console.error(`No routes found for ${pair}`);
        return { distance: Infinity, geometry: [], hazardLevel: 0 };
    }

    const maxAcceptableHazard = 4; 
    const bestRoute = routes.reduce((min, curr) => {
        // Apply hazard penalty to distance
        const hazardPenalty = curr.hazardLevel > maxAcceptableHazard
            ? curr.hazardLevel * 100 // Large penalty for high-hazard routes
            : curr.hazardLevel * 10; // Moderate penalty for acceptable hazards
        const adjustedDistance = curr.distance + hazardPenalty;

        if (adjustedDistance < min.adjustedDistance) {
            return { ...curr, adjustedDistance };
        }
        return min;
    }, { distance: Infinity, adjustedDistance: Infinity, hazardLevel: 0, geometry: [] });

    return {
        distance: bestRoute.distance,
        geometry: bestRoute.geometry,
        hazardLevel: bestRoute.hazardLevel
    };
}

function updateRouteDropdown(allRoutes) {
    const fromSelect = document.getElementById('fromLocation');
    const toSelect = document.getElementById('toLocation');
    const routeSelect = document.getElementById('routeSelection');
    
    // Preserve current selections
    const currentFrom = fromSelect.value;
    const currentTo = toSelect.value;
    
    // Rebuild dropdowns
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    locations.forEach(loc => {
        const fromOption = new Option(loc.name, loc.name);
        const toOption = new Option(loc.name, loc.name);
        if (loc.name === currentFrom) fromOption.selected = true;
        if (loc.name === currentTo) toOption.selected = true;
        fromSelect.add(fromOption);
        toSelect.add(toOption);
    });

    // Update route options
    const from = fromSelect.value;
    const to = toSelect.value;
    routeSelect.innerHTML = '<option value="">Select a route</option>';
    if (from && to && from !== to && allRoutes[`${from}-${to}`]) {
        allRoutes[`${from}-${to}`].forEach((route, index) => {
            routeSelect.add(new Option(
                `Route ${index + 1}: ${route.distance.toFixed(2)} km`,
                index
            ));
        });
    }
}

let rectangleDrawer = new L.Draw.Rectangle(map, {
    shapeOptions: {
        weight: 2,
        opacity: 0.7
    }
});

document.getElementById('add-hazard-btn').addEventListener('click', function() {
    rectangleDrawer.enable();
});

map.on('draw:drawstart', function() {
    isDrawing = true;
    console.log('Drawing started, isDrawing:', isDrawing);
});

map.on('draw:created', function(e) {
    isDrawing = false;
    rectangleDrawer.disable();

    if (e.layerType === 'rectangle') {
        const layer = e.layer;
        const hazardLevel = parseInt(prompt("Enter hazard level (1-7):", "1")) || 1;
        if (hazardLevel < 1 || hazardLevel > 7) hazardLevel = 1;
        const categoryInput = prompt("Enter hazard category (None, Fire, Earthquake, Flood, Hurricane):", "None").toLowerCase();
        const validCategories = Object.values(hazardCategories).map(c => c.toLowerCase());
        const hazardCategory = validCategories.includes(categoryInput) 
            ? Object.values(hazardCategories).find(c => c.toLowerCase() === categoryInput)
            : hazardCategories.NONE;
        layer.hazardLevel = hazardLevel;
        layer.hazardCategory = hazardCategory;
        layer.setStyle({ color: hazardColors[hazardLevel], opacity: 0.5 });
        drawnItems.addLayer(layer);
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        if (hazardCategory !== hazardCategories.NONE) {
            const iconClass = hazardIcons[hazardCategory];
            const iconMarker = L.marker(center, {
                icon: L.divIcon({
                    className: 'hazard-icon',
                    html: `<i class="fas ${iconClass}" style="font-size: 24px; color: black;"></i>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(map);
            hazardIconsMarkers.push({ layer: layer, marker: iconMarker });
        }
        hazardAreas.push({ bounds: layer.getBounds(), hazardLevel: hazardLevel, hazardCategory: hazardCategory, layer: layer });
        updateRouteHazards();
    }
});

map.on('draw:drawstop', function() {
    isDrawing = false; // Reset if drawing is canceled
    rectangleDrawer.disable(); // Ensure drawing mode is off
});

map.on('draw:deleted', function(e) {
    var layers = e.layers;
    layers.eachLayer(function(layer) {
        hazardAreas = hazardAreas.filter(area => area.layer !== layer);
        const iconIndex = hazardIconsMarkers.findIndex(obj => obj.layer === layer);
        if (iconIndex !== -1) {
            map.removeLayer(hazardIconsMarkers[iconIndex].marker);
            hazardIconsMarkers.splice(iconIndex, 1);
        }
    });
    updateRouteHazards();
});

function updateRouteHazards() {
    Object.values(allRoutes).forEach(routeList => {
        routeList.forEach(route => {
            const layer = routeLayers[route.id];

            let maxDrawnHazardLevel = 0;

            const routeLine = turf.lineString(route.geometry.map(coord => [coord.lng, coord.lat]));
            for (let i = 0; i < route.geometry.length - 1; i++) {
                let start = route.geometry[i];
                let end = route.geometry[i + 1];
                let segment = turf.lineString([[start.lng, start.lat], [end.lng, end.lat]]);
                let segmentHazardLevel = 0;

                hazardAreas.forEach(area => {
                    const areaGeoJSON = area.layer.toGeoJSON();
                    const areaPolygon = turf.polygon(areaGeoJSON.geometry.coordinates);
                    const intersectsInterior = turf.lineIntersect(segment, areaPolygon).features.length > 0;
                    const boundaryLine = turf.polygonToLine(areaPolygon);
                    const touchesPerimeter = turf.lineOverlap(segment, boundaryLine).features.length > 0;

                    if (intersectsInterior || touchesPerimeter) {
                        segmentHazardLevel += area.hazardLevel; 
                    }
                });
                maxDrawnHazardLevel = Math.max(maxDrawnHazardLevel, segmentHazardLevel);
            }

            let totalHazardLevel = maxDrawnHazardLevel;
            if (route.isManualHazard) {
                totalHazardLevel += route.manualHazardLevel || 0; // Use original manual value
            }
            totalHazardLevel = Math.min(totalHazardLevel, 7);

            const hazardCategory = route.isManualHazard && route.hazardCategory !== hazardCategories.NONE
                ? route.hazardCategory
                : hazardCategories.NONE;

            route.hazardLevel = totalHazardLevel;
            route.hazardCategory = hazardCategory;

            if (layer) {
                layer.setStyle({ color: hazardColors[totalHazardLevel], opacity: 0.8 });
                layer.hazardLevel = totalHazardLevel;
                layer.bringToFront();
            }
        });
    });
    updateHazardList();
}

function reset() {
    // Clear existing routes
    routes.forEach(route => map.removeLayer(route));
    routes = [];

    const initialLocationNames = [
        "Resource Center 1",
        "Resource Center 2",
        "Team 1",
        "Team 2"
    ];

    const newMarkers = [];
    markers.forEach(marker => {
        const popupContent = marker.getPopup().getContent();
        const locationName = popupContent.split(':')[0]; // Name from popup
        if (initialLocationNames.includes(locationName)) {
            newMarkers.push(marker); // Keep marker for resource center and teams
        } else {
            map.removeLayer(marker); // Remove disaster location marker
        }
    });
    markers.length = 0;
    markers.push(...newMarkers);

    
    const newLocations = locations.filter(loc => initialLocationNames.includes(loc.name));// Filter locations to keep only initial locations
    locations.length = 0;
    locations.push(...newLocations);

    // Restore Original Source Values 
    locations.forEach(loc => {
        const original = originalResources.find(orig => orig === loc.resources);
        if (original) {
            loc.resources = { ...original };
        }
    });    disasterCount = 0;

    // Reset UI
    updateResourceTable();
    updateRouteDropdown(allRoutes);
    document.getElementById('addDisasterLocationButton').textContent = 'Add Disaster Location';
    document.getElementById('addDisasterLocationButton').disabled = false;
    document.getElementById('loadRoutesButton').disabled = true;
    document.getElementById('totalDistance').textContent = '0';
    document.getElementById('compTime').textContent = '0';
    document.getElementById('routeDisplay').value = '';
    document.getElementById('hazardList').innerHTML = '';
    document.getElementById('resourceStatus').textContent = '';

    // Reset GA Parameters
    bestSolution = null;
    population = [];
    fitness = [];
    recordDistance = Infinity;

    // Clear routes and hazards
    Object.values(routeLayers).forEach(layer => map.removeLayer(layer));
    routeLayers = {};
    allRoutes = {};
    distanceCache.clear();
    drawnItems.clearLayers();
    hazardIconsMarkers.forEach(iconObj => map.removeLayer(iconObj.marker));
    hazardIconsMarkers = [];
    hazardAreas = [];
    updateHazardList();
    updateMarkers();
}

async function runGeneticAlgorithm() {
    const teamCapacity = parseInt(document.getElementById('teamCapacity').value);
    updateRouteHazards();
    initializePopulation();
    const maxGenerations = 2000;
    let noImprovementCount = 0;
    const maxNoImprovement = 300;

    if (!bestSolution) {
        bestSolution = generateRandomSolution(
            locations.filter(loc => !loc.isTeam),
            locations.filter(loc => loc.isTeam)
        );
    }

    Object.values(routeLayers).forEach(layer => {
        layer.setStyle({ color: hazardColors[0], opacity: 0.3 });
        layer.bringToBack();
    });

    const startTime = performance.now();
    for (let gen = 0; gen < maxGenerations; gen++) {
        const result = await calculateFitness(teamCapacity);
        if (result && result.fitness > prevBestFitness) {
            prevBestFitness = result.fitness;
            noImprovementCount = 0;
            console.log(`Generation ${gen}: Best Fitness = ${prevBestFitness.toFixed(6)}, Distance = ${result.distance.toFixed(2)}, Success = ${result.success}, Deficit = ${result.remainingDeficit}`);
        } else {
            noImprovementCount++;
        }
        if (noImprovementCount >= maxNoImprovement) {
            console.log("No improvement after", maxNoImprovement, "generations.");
            break;
        }
        normalizeFitness();
        nextGeneration();
    }
    const endTime = performance.now();
    console.log("Final bestSolution:", JSON.stringify(bestSolution, null, 2));
    const finalResult = await simulateSolution(bestSolution, teamCapacity, allRoutes);
    await displayBestSolution(teamCapacity, allRoutes, finalResult);
    document.getElementById('compTime').textContent = (endTime - startTime).toFixed(2);
}



function initializePopulation() {
    const teamLocs = locations.filter(loc => loc.isTeam);
    const nonTeamLocs = locations.filter(loc => !loc.isTeam);
    population = [];
    for (let i = 0; i < popSize; i++) {
        const order = generateRandomSolution(nonTeamLocs, teamLocs);
        population.push(order);
    }
}

function generateRandomSolution(nonTeamLocs, teamLocs) {
    const solution = [];
    const surplusLocs = nonTeamLocs.filter(loc => resourceTypes.some(type => loc.resources[type] > 0));
    const deficitLocs = nonTeamLocs.filter(loc => resourceTypes.some(type => loc.resources[type] < 0));

    const totalDeficit = deficitLocs.reduce((sum, loc) =>
        sum + resourceTypes.reduce((s, type) => s + Math.abs(Math.min(0, loc.resources[type])), 0), 0);
    const tripsNeeded = Math.ceil(totalDeficit / (5 * resourceTypes.length * teamLocs.length)) + 2;

    for (const team of teamLocs) {
        const route = [];
        let lastLoc = team;
        let needsPickup = true;

        for (let i = 0; i < tripsNeeded * 2; i++) {
            const availableSurplus = surplusLocs.filter(loc => loc.name !== lastLoc.name && resourceTypes.some(type => loc.resources[type] > 0));
            const availableDeficit = deficitLocs.filter(loc => loc.name !== lastLoc.name && resourceTypes.some(type => loc.resources[type] < 0));

            if (needsPickup && availableSurplus.length > 0) {
                // Prefer surplus locations with safer routes
                const scoredSurplus = availableSurplus.map(loc => {
                    const route = getBestRoute(lastLoc, loc, allRoutes);
                    return { loc, score: route.hazardLevel === 0 ? -route.distance : route.hazardLevel * 100 + route.distance };
                });
                scoredSurplus.sort((a, b) => a.score - b.score);
                const nextLoc = scoredSurplus[0].loc;
                route.push(nextLoc);
                lastLoc = nextLoc;
                needsPickup = false;
            } else if (!needsPickup && availableDeficit.length > 0) {
                // Prefer deficit locations with safer routes
                const scoredDeficit = availableDeficit.map(loc => {
                    const route = getBestRoute(lastLoc, loc, allRoutes);
                    return { loc, score: route.hazardLevel === 0 ? -route.distance : route.hazardLevel * 100 + route.distance };
                });
                scoredDeficit.sort((a, b) => a.score - b.score);
                const nextLoc = scoredDeficit[0].loc;
                route.push(nextLoc);
                lastLoc = nextLoc;
                needsPickup = true;
            } else {
                // Fallback: revisit any location with safer routes
                const remainingLocs = [...surplusLocs, ...deficitLocs].filter(loc => loc.name !== lastLoc.name);
                if (remainingLocs.length === 0) break;
                const scoredLocs = remainingLocs.map(loc => {
                    const route = getBestRoute(lastLoc, loc, allRoutes);
                    return { loc, score: route.hazardLevel === 0 ? -route.distance : route.hazardLevel * 100 + route.distance };
                });
                scoredLocs.sort((a, b) => a.score - b.score);
                const nextLoc = scoredLocs[0].loc;
                route.push(nextLoc);
                lastLoc = nextLoc;
                needsPickup = !needsPickup;
            }
        }
        solution.push({ team: team.name, route });
    }
    return solution;
}

async function calculateFitness(teamCapacity) {
    fitness = [];
    let bestFitness = -Infinity;
    let bestIndex = -1;

    for (let i = 0; i < population.length; i++) {
        const { distance, hazardPenalty, success, transfers, remainingDeficit } = await simulateSolution(population[i], teamCapacity, allRoutes);
        let adjustedFitness;

        // Exponential hazard penalty: e^(hazardLevel) for each segment
        const exponentialHazardPenalty = hazardPenalty * Math.exp(hazardPenalty / 10); 
        if (success) {
            adjustedFitness = 1000000 / (distance + 1 + exponentialHazardPenalty * 10); // Increase multiplier
        } else {
            adjustedFitness = 1 / (distance + 1 + exponentialHazardPenalty * 10 + Math.abs(remainingDeficit) * 200);
        }
        fitness[i] = adjustedFitness;

        if (adjustedFitness > bestFitness) {
            bestFitness = adjustedFitness;
            bestIndex = i;
        }
    }

    if (bestIndex !== -1) {
        const { distance, success, transfers, remainingDeficit } = await simulateSolution(population[bestIndex], teamCapacity, allRoutes);
        bestSolution = population[bestIndex];
        recordDistance = distance;
        if (success || bestFitness > prevBestFitness * 1.5) {
            console.log(`Updated bestSolution: Distance = ${distance.toFixed(2)}, Fitness = ${bestFitness.toFixed(6)}, Success = ${success}, Deficit = ${remainingDeficit}`);
        }
        return { distance, success, fitness: bestFitness, transfers, remainingDeficit };
    }
    return null;
}

async function simulateSolution(solution, teamCapacity, allRoutes) {
    let totalDistance = 0;
    let totalHazardPenalty = 0;
    const tempResources = locations.map(loc => ({
        ...loc,
        resources: { ...loc.resources }
    }));
    const transfers = [];
    let chosenRoute;

    const teamRoutes = solution.filter(item => item.team);
    for (const teamRoute of teamRoutes) {
        const team = tempResources.find(loc => loc.name === teamRoute.team);
        if (!team) {
            console.error(`Team not found: ${teamRoute.team}`);
            continue;
        }
        let capacity = resourceTypes.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});
        const teamTransfers = [];
        let currentPos = team;

        for (const loc of teamRoute.route) {
            const target = tempResources.find(l => l.name === loc.name);
            if (!target) {
                console.error(`Target not found: ${loc.name}`);
                continue;
            }

            let distance = 0;
            let hazardLevel = 0;
            if (currentPos.name !== target.name) {
                const routeResult = getBestRoute(currentPos, target, allRoutes);
                if (routeResult.distance === Infinity) {
                    // Route not precomputed, fetch it dynamically
                    console.warn(`No routes precomputed for ${currentPos.name}-${target.name}, fetching dynamically`);
                    try {
                        const routes = await getAllRoutes(currentPos, target);
                        allRoutes[`${currentPos.name}-${target.name}`] = routes;
                        distanceCache.set('allRoutes', allRoutes); // Update cache
                        const newRouteResult = getBestRoute(currentPos, target, allRoutes);
                        distance = newRouteResult.distance;
                        hazardLevel = newRouteResult.hazardLevel;
                        chosenRoute = routes.find(r => r.distance === newRouteResult.distance && r.geometry === newRouteResult.geometry);
                    } catch (error) {
                        console.error(`Failed to fetch route for ${currentPos.name}-${target.name}: ${error}`);
                        distance = 0; // Skip this segment
                        hazardLevel = 0;
                        chosenRoute = null;
                    }
                } else {
                    distance = routeResult.distance;
                    hazardLevel = routeResult.hazardLevel;
                    const routeKey = `${currentPos.name}-${target.name}`;
                    chosenRoute = allRoutes[routeKey].find(
                        r => r.distance === routeResult.distance && r.geometry === routeResult.geometry
                    );
                }
            }

            totalDistance += distance;
            totalHazardPenalty += hazardLevel;

            const actions = [];
            resourceTypes.forEach(type => {
                if (target.resources[type] > 0 && capacity[type] < teamCapacity) {
                    const take = Math.min(target.resources[type], teamCapacity - capacity[type]);
                    capacity[type] += take;
                    target.resources[type] -= take;
                    if (take > 0) actions.push(`Picked up ${take} ${type}`);
                } else if (target.resources[type] < 0 && capacity[type] > 0) {
                    const give = Math.min(-target.resources[type], capacity[type]);
                    capacity[type] -= give;
                    target.resources[type] += give;
                    if (give > 0) actions.push(`Delivered ${give} ${type}`);
                }
            });

            const actionText = actions.length > 0 ? actions.join(', ') : 'No action';
            teamTransfers.push({
                location: target.name,
                action: actionText,
                routeId: chosenRoute ? chosenRoute.id : 'N/A',
                distance: distance.toFixed(2)
            });
            currentPos = target;
        }
        transfers.push({ team: teamRoute.team, transfers: teamTransfers });
    }

    const success = tempResources.every(loc => resourceTypes.every(type => loc.resources[type] >= 0));
    const remainingDeficit = tempResources.reduce((sum, loc) =>
        sum + resourceTypes.reduce((s, type) => s + Math.min(0, loc.resources[type]), 0), 0);
    return { distance: totalDistance, hazardPenalty: totalHazardPenalty, success, transfers, remainingDeficit };
}


// Function to calculate route distance with hazard adjustments
async function getRouteDistance(from, to) {
    const fromLat = Number(from.lat.toFixed(6));
    const fromLon = Number(from.lon.toFixed(6));
    const toLat = Number(to.lat.toFixed(6));
    const toLon = Number(to.lon.toFixed(6));
    const key = `${fromLat},${fromLon}-${toLat},${toLon}`;

     // Check cache first
    if (distanceCache.has(key)) {
        return distanceCache.get(key);
    }

    const coordinates = `${fromLon},${fromLat};${toLon},${toLat}`;
    const url = `http://localhost:5000/route/v1/driving/${coordinates}?geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes.length) {
        throw new Error('No route found');
    }

    const route = data.routes[0]; // Use the first route
    const actualDistance = route.distance / 1000; // Meters to kilometers
    const result = { distance: actualDistance };
    distanceCache.set(key, result);
    return result;
}

function normalizeFitness() {
    const sum = fitness.reduce((a, b) => a + b, 0);
    fitness = fitness.map(f => f / sum);
}

function nextGeneration() {
    const newPopulation = [];
    for (let i = 0; i < popSize; i++) {
        const orderA = pickOne(population, fitness);
        const orderB = pickOne(population, fitness);
        const order = crossOver(orderA, orderB);
        mutate(order, 0.4);
        newPopulation.push(order);
    }
    population = newPopulation;
}

function pickOne(list, prob) {
    let index = 0;
    let r = Math.random();
    while (r > 0) {
        r -= prob[index];
        index++;
    }
    return structuredClone(list[index - 1]);
}

function crossOver(orderA, orderB) {
    const newSolution = [];
    orderA.forEach((teamA, i) => {
        const teamB = orderB[i];
        const routeA = teamA.route;
        const routeB = teamB.route;
        const crossoverPoint = Math.floor(Math.random() * Math.min(routeA.length, routeB.length));
        let newRoute = [...routeA.slice(0, crossoverPoint), ...routeB.slice(crossoverPoint)];
        // Filter out duplicates
        newRoute = newRoute.filter((loc, idx) => 
            idx === 0 || loc.name !== newRoute[idx - 1].name
        );
        newSolution.push({ team: teamA.team, route: newRoute });
    });
    return newSolution;
}

function mutate(order, mutationRate) {
    const nonTeamLocs = locations.filter(loc => !loc.isTeam);
    order.forEach(teamRoute => {
        if (Math.random() < mutationRate && teamRoute.route.length > 1) {
            const i = Math.floor(Math.random() * teamRoute.route.length);
            let newLoc;
            do {
                newLoc = nonTeamLocs[Math.floor(Math.random() * nonTeamLocs.length)];
            } while (
                (i > 0 && newLoc.name === teamRoute.route[i - 1].name) ||
                (i < teamRoute.route.length - 1 && newLoc.name === teamRoute.route[i + 1].name)
            );
            // Ensure surplus-deficit alternation
            const isSurplus = resourceTypes.some(type => newLoc.resources[type] > 0);
            const prevIsDeficit = i > 0 && resourceTypes.some(type => teamRoute.route[i - 1].resources[type] < 0);
            const nextIsDeficit = i < teamRoute.route.length - 1 && resourceTypes.some(type => teamRoute.route[i + 1].resources[type] < 0);
            if ((prevIsDeficit || nextIsDeficit) && isSurplus || (!prevIsDeficit && !nextIsDeficit && !isSurplus)) {
                teamRoute.route[i] = newLoc;
            }
        }
    });
}

async function displayBestSolution(teamCapacity, allRoutes, simulationResult) {
    if (!bestSolution || !Array.isArray(bestSolution) || bestSolution.length === 0) {
        console.error('No valid best solution found:', bestSolution);
        document.getElementById('totalDistance').textContent = 'N/A';
        document.getElementById('routeDisplay').value = 'No valid solution found';
        document.getElementById('resourceStatus').textContent = 'N/A';
        return;
    }

    const { distance, transfers, success, remainingDeficit } = simulationResult || await simulateSolution(bestSolution, teamCapacity, allRoutes);
    console.log('Simulation Result:', { distance, success, remainingDeficit, transfers });
    document.getElementById('totalDistance').textContent = distance.toFixed(2);
    document.getElementById('routeDisplay').value = success
        ? `Solution found (Distance: ${distance.toFixed(2)} km):\n`
        : `Best attempt (Distance: ${distance.toFixed(2)} km, Deficit: ${remainingDeficit}):\n`;

    let routeText = '';
    transfers.forEach(teamData => {
        let teamTotalDistance = 0;
        routeText += `${teamData.team}:\n`;
        let prevLocation = teamData.team;
        const filteredTransfers = teamData.transfers.filter(transfer => transfer.action !== 'No action');
        filteredTransfers.forEach(transfer => {
            const segmentDistance = parseFloat(transfer.distance);
            teamTotalDistance += segmentDistance;
            let actionText = transfer.action
                .split(', ')
                .filter(action => !action.includes(' 0 '))
                .map(action => action.replace('Picked up', 'Pick').replace('Delivered', 'Drop'))
                .join(', ');
            if (actionText === '') actionText = 'No changes';
            const routeInfo = transfer.routeId !== 'N/A' ? ` via ${transfer.routeId}` : '';
            const route = allRoutes[`${prevLocation}-${transfer.location}`]?.find(r => r.id === transfer.routeId);
            const hazardLevel = route ? route.hazardLevel : 0;
            routeText += `  → ${transfer.location}${routeInfo} (${segmentDistance.toFixed(2)} km, Hazard Level: ${hazardLevel}): ${actionText}\n`;
            prevLocation = transfer.location;
        });
        routeText += `  (Team ${teamData.team.split(' ')[1]} Total distance: ${teamTotalDistance.toFixed(2)} km)\n\n`;
    });
    document.getElementById('routeDisplay').value += routeText;

    // Update location resources based on transfers
    transfers.forEach(teamData => {
        teamData.transfers.forEach(transfer => {
            const location = locations.find(loc => loc.name === transfer.location);
            if (transfer.action.includes('Picked up')) {
                const matches = transfer.action.match(/Picked up (\d+) (\w+)/g);
                if (matches) {
                    matches.forEach(match => {
                        const [, amount, type] = match.match(/Picked up (\d+) (\w+)/);
                        location.resources[type] -= parseInt(amount);
                    });
                }
            } else if (transfer.action.includes('Delivered')) {
                const matches = transfer.action.match(/Delivered (\d+) (\w+)/g);
                if (matches) {
                    matches.forEach(match => {
                        const [, amount, type] = match.match(/Delivered (\d+) (\w+)/);
                        location.resources[type] += parseInt(amount);
                    });
                }
            }
        });
    });

    // Update markers and resource status
    locations.forEach((loc, i) => {
        const resourceText = resourceTypes.map(type => `${type}: ${loc.resources[type]}`).join('<br>');
        markers[i].setPopupContent(`${loc.name}:<br>${resourceText}`);
    });
    const statusText = locations.map(loc => 
        `${loc.name}: ${resourceTypes.map(type => `${type}: ${loc.resources[type]}`).join(', ')}`
    ).join('; ');
    document.getElementById('resourceStatus').textContent = statusText;

    // Clear existing routes
    routes.forEach(route => map.removeLayer(route));
    routes = [];

    // Reset background routes
    Object.values(routeLayers).forEach(layer => {
        layer.setStyle({ color: hazardColors[0], opacity: 0.3 });
        layer.bringToBack();
    });

    // Draw optimal routes
    const teamColors = { 'Team 1': '#0000FF', 'Team 2': '#00FF00' };
    for (const teamSol of bestSolution) {
        const teamName = teamSol.team;
        const teamLoc = locations.find(loc => loc.name === teamName);
        if (!teamLoc) {
            console.error(`Team location not found: ${teamName}`);
            continue;
        }
        let prevPos = teamLoc;
        for (const loc of teamSol.route) {
            if (loc.name !== prevPos.name) {
                const { geometry } = getBestRoute(prevPos, loc, allRoutes);
                if (!geometry || geometry.length === 0) {
                    console.error(`Invalid geometry for ${prevPos.name} → ${loc.name}`);
                    prevPos = loc;
                    continue;
                }
                const routeLine = L.polyline(geometry, {
                    color: teamColors[teamName] || '#888888',
                    opacity: 1.0,
                    weight: 5
                }).addTo(map);
                routeLine.bringToFront();
                routes.push(routeLine);
            }
            prevPos = loc;
        }
    }
    map.invalidateSize();
}
