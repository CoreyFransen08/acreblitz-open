/**
 * NWS Rain Forecast Utilities (Server-side)
 *
 * Fetches and parses DWML weather data from NWS MapClick API,
 * specifically for 48-hour rain accumulation forecasts.
 * Includes 5-minute in-memory caching.
 */

import { DOMParser } from "@xmldom/xmldom";

// ============================================
// Types
// ============================================

export interface HourlyRainData {
  /** ISO timestamp for this hour */
  validTime: string;
  /** Quantitative precipitation forecast in inches */
  precipitationAmount: number | null;
  /** Probability of precipitation (0-100) */
  precipitationChance: number | null;
}

export interface RainForecastLocation {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  areaDescription?: string;
}

export interface RainForecastData {
  location: RainForecastLocation;
  hourly: HourlyRainData[];
  totalPrecipitation48hr: number;
  creationTime: string;
}

interface CacheEntry {
  data: RainForecastData;
  cachedAt: number;
}

interface TimeLayout {
  layoutKey: string;
  timeCoordinates: string[];
}

interface ParameterSet {
  timeLayout: string;
  type: string;
  values: (number | null)[];
}

// ============================================
// Constants
// ============================================

const NWS_MAPCLICK_BASE = "https://forecast.weather.gov/MapClick.php";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FORECAST_HOURS = 48;

// ============================================
// In-Memory Cache
// ============================================

const forecastCache = new Map<string, CacheEntry>();

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt < CACHE_TTL_MS;
}

function getCachedForecast(lat: number, lng: number): RainForecastData | null {
  const key = getCacheKey(lat, lng);
  const entry = forecastCache.get(key);

  if (entry && isCacheValid(entry)) {
    return entry.data;
  }

  if (entry) {
    forecastCache.delete(key);
  }

  return null;
}

function cacheForecast(lat: number, lng: number, data: RainForecastData): void {
  const key = getCacheKey(lat, lng);
  forecastCache.set(key, {
    data,
    cachedAt: Date.now(),
  });
}

// ============================================
// DWML Fetching
// ============================================

async function fetchDWMLRainData(lat: number, lng: number): Promise<string> {
  const url = `${NWS_MAPCLICK_BASE}?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&FcstType=digitalDWML`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`NWS API error: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

// ============================================
// DWML Parsing
// ============================================

function parseDWMLRainForecast(xmlText: string): RainForecastData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  // Check for parsing errors
  const parseError = doc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("Invalid XML response from NWS");
  }

  const location = parseLocation(doc);
  const timeLayouts = parseTimeLayouts(doc);
  const parameters = parseRainParameters(doc);
  const hourly = buildHourlyRainData(timeLayouts, parameters);

  const totalPrecipitation48hr = hourly.reduce(
    (sum, h) => sum + (h.precipitationAmount ?? 0),
    0
  );

  const creationTimeNodes = doc.getElementsByTagName("creation-date");
  const creationTime =
    creationTimeNodes.length > 0 && creationTimeNodes[0].textContent
      ? creationTimeNodes[0].textContent
      : new Date().toISOString();

  return {
    location,
    hourly,
    totalPrecipitation48hr: Math.round(totalPrecipitation48hr * 1000) / 1000,
    creationTime,
  };
}

function parseLocation(doc: Document): RainForecastLocation {
  const locationNodes = doc.getElementsByTagName("location");
  const locationNode = locationNodes.length > 0 ? locationNodes[0] : null;

  let pointNode: Element | null = null;
  let cityNode: Element | null = null;
  let descNode: Element | null = null;

  if (locationNode) {
    const pointNodes = locationNode.getElementsByTagName("point");
    pointNode = pointNodes.length > 0 ? pointNodes[0] : null;

    const cityNodes = locationNode.getElementsByTagName("city");
    cityNode = cityNodes.length > 0 ? cityNodes[0] : null;

    const descNodes = locationNode.getElementsByTagName("description");
    descNode = descNodes.length > 0 ? descNodes[0] : null;
  }

  const lat = parseFloat(pointNode?.getAttribute("latitude") || "0");
  const lng = parseFloat(pointNode?.getAttribute("longitude") || "0");

  const cityText = cityNode?.textContent || "";
  const state = cityNode?.getAttribute("state") || "";
  let city = cityText.replace(/, [A-Z]{2}$/, "").trim();
  if (!city) city = "Unknown";

  return {
    city,
    state,
    latitude: lat,
    longitude: lng,
    areaDescription: descNode?.textContent || undefined,
  };
}

function parseTimeLayouts(doc: Document): Map<string, TimeLayout> {
  const layouts = new Map<string, TimeLayout>();
  const layoutNodes = doc.getElementsByTagName("time-layout");

  for (let i = 0; i < layoutNodes.length; i++) {
    const node = layoutNodes[i];
    const layoutKeyNodes = node.getElementsByTagName("layout-key");
    const layoutKey =
      layoutKeyNodes.length > 0 ? layoutKeyNodes[0].textContent || "" : "";

    const validTimes = node.getElementsByTagName("start-valid-time");
    const timeCoordinates: string[] = [];

    for (let j = 0; j < validTimes.length; j++) {
      timeCoordinates.push(validTimes[j].textContent || "");
    }

    if (layoutKey) {
      layouts.set(layoutKey, { layoutKey, timeCoordinates });
    }
  }

  return layouts;
}

function parseRainParameters(doc: Document): Map<string, ParameterSet[]> {
  const parameters = new Map<string, ParameterSet[]>();
  const paramsNodes = doc.getElementsByTagName("parameters");
  if (paramsNodes.length === 0) return parameters;

  const paramsNode = paramsNodes[0];

  // Parse precipitation probability
  parseParameterType(paramsNode, "probability-of-precipitation", parameters);

  // Parse quantitative precipitation forecast
  parseParameterType(paramsNode, "hourly-qpf", parameters);

  return parameters;
}

function parseParameterType(
  paramsNode: Element,
  paramName: string,
  parameters: Map<string, ParameterSet[]>
): void {
  const nodes = paramsNode.getElementsByTagName(paramName);
  const sets: ParameterSet[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const timeLayout = node.getAttribute("time-layout") || "";
    const type = node.getAttribute("type") || "value";
    const values: (number | null)[] = [];

    const valueNodes = node.getElementsByTagName("value");
    for (let j = 0; j < valueNodes.length; j++) {
      const valueNode = valueNodes[j];
      const text = valueNode.textContent;
      const isNil = valueNode.getAttribute("xsi:nil") === "true";
      if (isNil || !text) {
        values.push(null);
      } else {
        values.push(parseFloat(text));
      }
    }

    sets.push({ timeLayout, type, values });
  }

  if (sets.length > 0) {
    parameters.set(paramName, sets);
  }
}

function buildHourlyRainData(
  timeLayouts: Map<string, TimeLayout>,
  parameters: Map<string, ParameterSet[]>
): HourlyRainData[] {
  // Find primary hourly time layout
  let primaryLayout: TimeLayout | null = null;
  for (const [key, layout] of timeLayouts) {
    if (key.includes("p1h") || layout.timeCoordinates.length > 100) {
      primaryLayout = layout;
      break;
    }
  }

  if (!primaryLayout) {
    // Fall back to longest layout
    let maxLength = 0;
    for (const layout of timeLayouts.values()) {
      if (layout.timeCoordinates.length > maxLength) {
        maxLength = layout.timeCoordinates.length;
        primaryLayout = layout;
      }
    }
  }

  if (!primaryLayout) return [];

  const hourlyData: HourlyRainData[] = [];
  const times = primaryLayout.timeCoordinates;

  const getNumericValue = (
    paramName: string,
    type: string,
    index: number
  ): number | null => {
    const sets = parameters.get(paramName);
    if (!sets) return null;
    const set = sets.find((s) => s.type === type) || sets[0];
    const val = set?.values[index];
    return typeof val === "number" ? val : null;
  };

  // Limit to 48 hours
  const hoursToProcess = Math.min(times.length, MAX_FORECAST_HOURS);

  for (let i = 0; i < hoursToProcess; i++) {
    hourlyData.push({
      validTime: times[i],
      precipitationAmount: getNumericValue("hourly-qpf", "floating", i),
      precipitationChance: getNumericValue(
        "probability-of-precipitation",
        "floating",
        i
      ),
    });
  }

  return hourlyData;
}

// ============================================
// Public API
// ============================================

/**
 * Fetch 48-hour rain forecast for coordinates with 5-minute caching.
 *
 * @param lat - Latitude (must be in CONUS: 24-50)
 * @param lng - Longitude (must be in CONUS: -125 to -66)
 * @returns RainForecastData with hourly breakdown and 48hr total
 * @throws Error if coordinates outside CONUS or API fails
 */
export async function fetchRainForecast(
  lat: number,
  lng: number
): Promise<RainForecastData> {
  // Check cache first
  const cached = getCachedForecast(lat, lng);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const xmlText = await fetchDWMLRainData(lat, lng);
  const data = parseDWMLRainForecast(xmlText);

  // Cache the result
  cacheForecast(lat, lng, data);

  return data;
}

/**
 * Clear all cached forecasts (useful for testing)
 */
export function clearRainForecastCache(): void {
  forecastCache.clear();
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getRainForecastCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: forecastCache.size,
    keys: Array.from(forecastCache.keys()),
  };
}
