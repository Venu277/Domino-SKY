const fs = require('fs');
const path = require('path');

const statesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../frontend/src/data/india-states-full.geojson'), 'utf8'));

// Bounds chosen to fit all of India (including Kashmir, NE, Andaman, Lakshadweep)
const MIN_LNG = 68.0;
const MAX_LNG = 97.8;
const MIN_LAT = 6.8;
const MAX_LAT = 37.4;
const WIDTH = 800;
const HEIGHT = 880;

function project(lng, lat) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (WIDTH - 80) + 40;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * (HEIGHT - 80) + 40;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function coordsToSvgPath(coords, type) {
  let pathStr = '';
  if (type === 'Polygon') {
    for (const ring of coords) {
      if (ring.length === 0) continue;
      const [startX, startY] = project(ring[0][0], ring[0][1]);
      pathStr += 'M' + startX + ',' + startY;
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = project(ring[i][0], ring[i][1]);
        pathStr += 'L' + x + ',' + y;
      }
      pathStr += 'Z ';
    }
  } else if (type === 'MultiPolygon') {
    for (const poly of coords) {
      for (const ring of poly) {
        if (ring.length === 0) continue;
        const [startX, startY] = project(ring[0][0], ring[0][1]);
        pathStr += 'M' + startX + ',' + startY;
        for (let i = 1; i < ring.length; i++) {
          const [x, y] = project(ring[i][0], ring[i][1]);
          pathStr += 'L' + x + ',' + y;
        }
        pathStr += 'Z ';
      }
    }
  }
  return pathStr.trim();
}

const states = [];
for (const feature of statesData.features) {
  const name = feature.properties.NAME_1 || feature.properties.st_nm || feature.properties.name || 'State';
  const pathStr = coordsToSvgPath(feature.geometry.coordinates, feature.geometry.type);
  if (pathStr) {
    states.push({ name, path: pathStr });
  }
}

const tsContent = `// Real Indian Political Map boundaries pre-projected into SVG viewBox 0 0 800 880
export interface StatePath {
  name: string;
  path: string;
}

export const INDIA_MAP_CONFIG = {
  viewBox: '0 0 800 880',
  minLng: ${MIN_LNG},
  maxLng: ${MAX_LNG},
  minLat: ${MIN_LAT},
  maxLat: ${MAX_LAT},
  width: ${WIDTH},
  height: ${HEIGHT},
  padding: 40
};

export function projectCoordinates(lng: number, lat: number): [number, number] {
  const x = ((lng - ${MIN_LNG}) / (${MAX_LNG} - ${MIN_LNG})) * (${WIDTH} - 80) + 40;
  const y = ((${MAX_LAT} - lat) / (${MAX_LAT} - ${MIN_LAT})) * (${HEIGHT} - 80) + 40;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export const INDIA_STATES: StatePath[] = ${JSON.stringify(states, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../frontend/src/data/indiaMapPaths.ts'), tsContent);
console.log('Successfully generated frontend/src/data/indiaMapPaths.ts with', states.length, 'states');
