/**
 * Precip AI API Client
 *
 * Shared client for Precip AI weather and soil data endpoints.
 * https://api-docs.precip.ai/
 *
 * Supports:
 * - Daily Soil Moisture
 * - Last 48 Hours Precipitation (coming soon)
 * - Soil Temperature (coming soon)
 */

// ============================================
// Types
// ============================================

export interface PrecipAICoordinate {
  latitude: number;
  longitude: number;
}

export interface SoilMoistureDay {
  startTime: string;
  soil_moisture: number;
  "rsm_0-10cm"?: number;
}

/**
 * Actual API response format (array of these objects)
 */
interface PrecipAILocationResponse {
  days: SoilMoistureDay[];
  timeZoneId: string;
  latitude: number;
  longitude: number;
}

export interface SoilMoistureFeature {
  type: "Feature";
  properties: {
    days: SoilMoistureDay[];
    timeZoneId: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface SoilMoistureResponse {
  type: "FeatureCollection";
  features: SoilMoistureFeature[];
}

export interface SoilMoistureParams {
  coordinates: PrecipAICoordinate[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  timeZoneId?: string;
}

export interface SoilMoistureResult {
  latitude: number;
  longitude: number;
  timeZoneId: string;
  days: SoilMoistureDay[];
  averageMoisture: number | null;
  minMoisture: number | null;
  maxMoisture: number | null;
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

// ============================================
// Constants
// ============================================

const PRECIP_AI_BASE_URL = "https://api.precip.ai/api/v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ============================================
// Cache
// ============================================

const soilMoistureCache = new Map<string, CacheEntry<SoilMoistureResult[]>>();

function getCacheKey(params: SoilMoistureParams): string {
  const coordsKey = params.coordinates
    .map((c) => `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`)
    .join("|");
  return `sm:${coordsKey}:${params.startDate}:${params.endDate}`;
}

function isCacheValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.cachedAt < CACHE_TTL_MS;
}

function getCached(params: SoilMoistureParams): SoilMoistureResult[] | null {
  const key = getCacheKey(params);
  const entry = soilMoistureCache.get(key);

  if (entry && isCacheValid(entry)) {
    return entry.data;
  }

  if (entry) {
    soilMoistureCache.delete(key);
  }

  return null;
}

function setCached(params: SoilMoistureParams, data: SoilMoistureResult[]): void {
  const key = getCacheKey(params);
  soilMoistureCache.set(key, {
    data,
    cachedAt: Date.now(),
  });
}

// ============================================
// API Key
// ============================================

function getApiKey(): string {
  const apiKey = process.env.PRECIP_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PRECIP_AI_API_KEY environment variable is not set. Please add it to your .env file."
    );
  }
  return apiKey;
}

// ============================================
// API Helpers
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function calculateStats(days: SoilMoistureDay[]): {
  average: number | null;
  min: number | null;
  max: number | null;
} {
  const validValues = days
    .map((d) => d.soil_moisture)
    .filter((v): v is number => v !== null && v !== undefined);

  if (validValues.length === 0) {
    return { average: null, min: null, max: null };
  }

  const sum = validValues.reduce((a, b) => a + b, 0);
  return {
    average: Math.round((sum / validValues.length) * 10) / 10,
    min: Math.round(Math.min(...validValues) * 10) / 10,
    max: Math.round(Math.max(...validValues) * 10) / 10,
  };
}

// ============================================
// Daily Soil Moisture
// ============================================

/**
 * Fetch daily soil moisture data from Precip AI
 *
 * @param params - Coordinates and date range
 * @returns Array of soil moisture results with statistics
 * @throws Error if API key missing or request fails
 */
export async function fetchDailySoilMoisture(
  params: SoilMoistureParams
): Promise<SoilMoistureResult[]> {
  // Check cache first
  const cached = getCached(params);
  if (cached) {
    return cached;
  }

  const apiKey = getApiKey();

  // Build query parameters
  const latitudes = params.coordinates.map((c) => c.latitude.toFixed(5)).join(",");
  const longitudes = params.coordinates.map((c) => c.longitude.toFixed(5)).join(",");

  const queryParams = new URLSearchParams({
    start: params.startDate,
    end: params.endDate,
    latitude: latitudes,
    longitude: longitudes,
    format: "json",
  });

  if (params.timeZoneId) {
    queryParams.set("timeZoneId", params.timeZoneId);
  }

  const url = `${PRECIP_AI_BASE_URL}/soil-moisture-daily?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid Precip AI API key");
    }
    if (response.status === 422) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Precip AI validation error: ${JSON.stringify(errorData)}`
      );
    }
    throw new Error(`Precip AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // API returns an array of location results directly (not GeoJSON)
  // Format: [{ days: [...], timeZoneId, longitude, latitude }, ...]
  if (!Array.isArray(data)) {
    console.error("Unexpected Precip AI response structure:", JSON.stringify(data, null, 2));
    throw new Error(
      `Unexpected response format from Precip AI. Expected array but got: ${typeof data}`
    );
  }

  // Transform response to result format
  const results: SoilMoistureResult[] = data.map((location: PrecipAILocationResponse) => {
    const days = location.days || [];
    const stats = calculateStats(days);

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      timeZoneId: location.timeZoneId || "America/Chicago",
      days,
      averageMoisture: stats.average,
      minMoisture: stats.min,
      maxMoisture: stats.max,
    };
  });

  // Cache the results
  setCached(params, results);

  return results;
}

// ============================================
// Utility Exports
// ============================================

/**
 * Clear all Precip AI caches (useful for testing)
 */
export function clearPrecipAICache(): void {
  soilMoistureCache.clear();
}

/**
 * Get default date range for soil moisture (last 7 days)
 */
export function getDefaultSoilMoistureDateRange(): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

/**
 * Get moisture level description
 */
export function getMoistureDescription(moisture: number): string {
  if (moisture < 10) return "Very dry";
  if (moisture < 20) return "Dry";
  if (moisture < 30) return "Moderately dry";
  if (moisture < 40) return "Adequate";
  if (moisture < 50) return "Moist";
  if (moisture < 60) return "Very moist";
  return "Saturated";
}

// ============================================
// SOIL TEMPERATURE TYPES (Separate from Soil Moisture)
// Endpoint: /temp-0-10cm-hourly
// Returns hourly temperature data in Celsius at 0-10cm depth
// ============================================

/**
 * Hourly soil temperature data point from Precip AI
 * Note: Field names are determined by actual API response
 */
export interface SoilTemperatureHour {
  startTime: string;
  /** Temperature in Celsius - field name may vary, we'll detect it */
  temperature?: number;
  temp_0_10cm?: number;
  "temp_0-10cm"?: number;
  soil_temp?: number;
  source?: string;
}

/**
 * Soil Temperature API request parameters
 */
export interface SoilTemperatureParams {
  coordinates: PrecipAICoordinate[];
  startDate: string; // YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  endDate: string;
  timeZoneId?: string;
}

/**
 * Processed soil temperature result
 */
export interface SoilTemperatureResult {
  latitude: number;
  longitude: number;
  timeZoneId: string;
  hours: SoilTemperatureHour[];
  currentTemperature: number | null;
  averageTemperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
}

// ============================================
// Soil Temperature Cache (separate from moisture)
// ============================================

const soilTemperatureCache = new Map<string, CacheEntry<SoilTemperatureResult[]>>();
const SOIL_TEMP_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (shorter for hourly data)

function getSoilTempCacheKey(params: SoilTemperatureParams): string {
  const coordsKey = params.coordinates
    .map((c) => `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`)
    .join("|");
  return `st:${coordsKey}:${params.startDate}:${params.endDate}`;
}

function getCachedSoilTemp(params: SoilTemperatureParams): SoilTemperatureResult[] | null {
  const key = getSoilTempCacheKey(params);
  const entry = soilTemperatureCache.get(key);

  if (entry && Date.now() - entry.cachedAt < SOIL_TEMP_CACHE_TTL_MS) {
    return entry.data;
  }

  if (entry) {
    soilTemperatureCache.delete(key);
  }

  return null;
}

function setCachedSoilTemp(params: SoilTemperatureParams, data: SoilTemperatureResult[]): void {
  const key = getSoilTempCacheKey(params);
  soilTemperatureCache.set(key, {
    data,
    cachedAt: Date.now(),
  });
}

// ============================================
// Soil Temperature Helpers
// ============================================

/**
 * Extract temperature value from hour data
 * Handles different possible field names from the API
 */
function extractTemperature(hour: Record<string, unknown>): number | null {
  // Try different possible field names (order matters - prefer more specific)
  const possibleFields = [
    "temp_0-10cm",
    "soil_temp",
    "temp_0_10cm",
    "temperature",
    "soil_temperature",
    "temp",
    "value",
  ];

  for (const field of possibleFields) {
    const value = hour[field];
    if (typeof value === "number" && !isNaN(value)) {
      return value;
    }
  }

  return null;
}

/**
 * Calculate temperature statistics from hourly data
 */
function calculateTempStats(hours: SoilTemperatureHour[]): {
  current: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
} {
  const validTemps: number[] = [];

  for (const hour of hours) {
    const temp = extractTemperature(hour as unknown as Record<string, unknown>);
    if (temp !== null) {
      validTemps.push(temp);
    }
  }

  if (validTemps.length === 0) {
    return { current: null, average: null, min: null, max: null };
  }

  const sum = validTemps.reduce((a, b) => a + b, 0);
  return {
    current: Math.round(validTemps[validTemps.length - 1] * 10) / 10, // Most recent
    average: Math.round((sum / validTemps.length) * 10) / 10,
    min: Math.round(Math.min(...validTemps) * 10) / 10,
    max: Math.round(Math.max(...validTemps) * 10) / 10,
  };
}

// ============================================
// Hourly Soil Temperature API
// ============================================

/**
 * Fetch hourly soil temperature data from Precip AI
 * Endpoint: /temp-0-10cm-hourly
 *
 * @param params - Coordinates and date range
 * @returns Array of soil temperature results with statistics
 * @throws Error if API key missing or request fails
 */
export async function fetchSoilTemperature(
  params: SoilTemperatureParams
): Promise<SoilTemperatureResult[]> {
  // Check cache first
  const cached = getCachedSoilTemp(params);
  if (cached) {
    return cached;
  }

  const apiKey = getApiKey();

  // Build query parameters
  const latitudes = params.coordinates.map((c) => c.latitude.toFixed(5)).join(",");
  const longitudes = params.coordinates.map((c) => c.longitude.toFixed(5)).join(",");

  const queryParams = new URLSearchParams({
    start: params.startDate,
    end: params.endDate,
    latitude: latitudes,
    longitude: longitudes,
    format: "json",
  });

  if (params.timeZoneId) {
    queryParams.set("timeZoneId", params.timeZoneId);
  }

  const url = `${PRECIP_AI_BASE_URL}/temp-0-10cm-hourly?${queryParams.toString()}`;

  // Log the request URL for debugging
  console.log("Soil Temperature API Request URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    // Try to get error body for better debugging
    const errorBody = await response.text().catch(() => "");
    console.error("Soil Temperature API Error:", {
      status: response.status,
      statusText: response.statusText,
      url,
      body: errorBody,
    });

    if (response.status === 401) {
      throw new Error("Invalid Precip AI API key");
    }
    if (response.status === 422) {
      throw new Error(`Precip AI validation error: ${errorBody}`);
    }
    throw new Error(`Precip AI API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();

  // Log the raw response for debugging (remove in production)
  console.log("Soil Temperature API Response:", JSON.stringify(data, null, 2));

  // Handle different response formats
  let locations: Array<{
    hours?: unknown[];
    timeZoneId?: string;
    latitude?: number;
    longitude?: number;
  }>;

  if (Array.isArray(data)) {
    // Simple array format (like soil moisture)
    locations = data;
  } else if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    // GeoJSON FeatureCollection format
    locations = data.features.map((feature: {
      properties?: { hours?: unknown[]; timeZoneId?: string };
      geometry?: { coordinates?: [number, number] };
    }) => ({
      hours: feature.properties?.hours,
      timeZoneId: feature.properties?.timeZoneId,
      longitude: feature.geometry?.coordinates?.[0],
      latitude: feature.geometry?.coordinates?.[1],
    }));
  } else {
    console.error("Unexpected Soil Temperature API response:", JSON.stringify(data, null, 2));
    throw new Error(
      `Unexpected response format from Precip AI soil temperature endpoint. Got: ${typeof data === "object" ? Object.keys(data).join(", ") : typeof data}`
    );
  }

  // Transform response to result format
  const results: SoilTemperatureResult[] = locations.map((location) => {
    const hours = (location.hours || []) as SoilTemperatureHour[];
    const stats = calculateTempStats(hours);

    return {
      latitude: location.latitude ?? 0,
      longitude: location.longitude ?? 0,
      timeZoneId: location.timeZoneId || "America/Chicago",
      hours,
      currentTemperature: stats.current,
      averageTemperature: stats.average,
      minTemperature: stats.min,
      maxTemperature: stats.max,
    };
  });

  // Cache the results
  setCachedSoilTemp(params, results);

  return results;
}

// ============================================
// Soil Temperature Utility Functions
// ============================================

/**
 * Get date range for current temperature (last 1 hour)
 */
export function getCurrentSoilTempDateRange(): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  // Use today's date for current temp (API will return hourly data for the day)
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD format

  return {
    startDate: today,
    endDate: today,
  };
}

/**
 * Get date range for soil temperature trends (last 7 days by default)
 */
export function getSoilTempTrendDateRange(days: number = 7): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Use YYYY-MM-DD format for API compatibility
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9 / 5 + 32) * 10) / 10;
}

/**
 * Get temperature description for soil (agricultural context)
 * Based on optimal soil temperatures for planting
 */
export function getSoilTempDescription(tempCelsius: number): string {
  if (tempCelsius < 5) return "Too cold for planting";
  if (tempCelsius < 10) return "Cool - limited germination";
  if (tempCelsius < 15) return "Cool - suitable for cool-season crops";
  if (tempCelsius < 20) return "Moderate - good for most crops";
  if (tempCelsius < 25) return "Warm - ideal for warm-season crops";
  if (tempCelsius < 30) return "Very warm";
  return "Hot - may stress plants";
}

/**
 * Clear soil temperature cache
 */
export function clearSoilTemperatureCache(): void {
  soilTemperatureCache.clear();
}

// ============================================
// HOURLY PRECIPITATION TYPES
// Endpoint: /hourly
// Returns hourly precipitation data in millimeters
// ============================================

/**
 * Hourly precipitation data point from Precip AI
 */
export interface HourlyPrecipitationHour {
  startTime: string;
  precip: number; // millimeters
  precip_probability: number | null; // 0-100% or null for observations
  precip_type: "rain" | "snow" | "mixed";
  source: "observation" | "forecast";
}

/**
 * Hourly Precipitation API request parameters
 */
export interface HourlyPrecipitationParams {
  coordinates: PrecipAICoordinate[];
  startDate: string; // YYYY-MM-DD
  endDate: string;
  timeZoneId?: string;
}

/**
 * Processed hourly precipitation result
 */
export interface HourlyPrecipitationResult {
  latitude: number;
  longitude: number;
  timeZoneId: string;
  hours: HourlyPrecipitationHour[];
  totalPrecipitationMm: number;
  totalPrecipitationInches: number;
  maxHourlyMm: number;
  maxHourlyInches: number;
  hoursWithPrecip: number;
}

// ============================================
// Hourly Precipitation Cache (separate from others)
// ============================================

const hourlyPrecipCache = new Map<string, CacheEntry<HourlyPrecipitationResult[]>>();
const HOURLY_PRECIP_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getHourlyPrecipCacheKey(params: HourlyPrecipitationParams): string {
  const coordsKey = params.coordinates
    .map((c) => `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`)
    .join("|");
  return `hp:${coordsKey}:${params.startDate}:${params.endDate}`;
}

function getCachedHourlyPrecip(params: HourlyPrecipitationParams): HourlyPrecipitationResult[] | null {
  const key = getHourlyPrecipCacheKey(params);
  const entry = hourlyPrecipCache.get(key);

  if (entry && Date.now() - entry.cachedAt < HOURLY_PRECIP_CACHE_TTL_MS) {
    return entry.data;
  }

  if (entry) {
    hourlyPrecipCache.delete(key);
  }

  return null;
}

function setCachedHourlyPrecip(params: HourlyPrecipitationParams, data: HourlyPrecipitationResult[]): void {
  const key = getHourlyPrecipCacheKey(params);
  hourlyPrecipCache.set(key, {
    data,
    cachedAt: Date.now(),
  });
}

// ============================================
// Hourly Precipitation Helpers
// ============================================

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm: number): number {
  return Math.round((mm / 25.4) * 1000) / 1000; // 3 decimal places
}

/**
 * Calculate precipitation statistics from hourly data
 */
function calculatePrecipStats(hours: HourlyPrecipitationHour[]): {
  totalMm: number;
  totalInches: number;
  maxHourlyMm: number;
  maxHourlyInches: number;
  hoursWithPrecip: number;
} {
  let totalMm = 0;
  let maxHourlyMm = 0;
  let hoursWithPrecip = 0;

  for (const hour of hours) {
    const precip = hour.precip ?? 0;
    totalMm += precip;
    if (precip > maxHourlyMm) {
      maxHourlyMm = precip;
    }
    if (precip > 0) {
      hoursWithPrecip++;
    }
  }

  return {
    totalMm: Math.round(totalMm * 100) / 100,
    totalInches: mmToInches(totalMm),
    maxHourlyMm: Math.round(maxHourlyMm * 100) / 100,
    maxHourlyInches: mmToInches(maxHourlyMm),
    hoursWithPrecip,
  };
}

// ============================================
// Hourly Precipitation API
// ============================================

/**
 * Fetch hourly precipitation data from Precip AI
 * Endpoint: /hourly
 *
 * @param params - Coordinates and date range
 * @returns Array of hourly precipitation results with statistics
 * @throws Error if API key missing or request fails
 */
export async function fetchHourlyPrecipitation(
  params: HourlyPrecipitationParams
): Promise<HourlyPrecipitationResult[]> {
  // Check cache first
  const cached = getCachedHourlyPrecip(params);
  if (cached) {
    return cached;
  }

  const apiKey = getApiKey();

  // Build query parameters
  const latitudes = params.coordinates.map((c) => c.latitude.toFixed(5)).join(",");
  const longitudes = params.coordinates.map((c) => c.longitude.toFixed(5)).join(",");

  const queryParams = new URLSearchParams({
    start: params.startDate,
    end: params.endDate,
    latitude: latitudes,
    longitude: longitudes,
    format: "json",
  });

  if (params.timeZoneId) {
    queryParams.set("timeZoneId", params.timeZoneId);
  }

  const url = `${PRECIP_AI_BASE_URL}/hourly?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("Hourly Precipitation API Error:", {
      status: response.status,
      statusText: response.statusText,
      url,
      body: errorBody,
    });

    if (response.status === 401) {
      throw new Error("Invalid Precip AI API key");
    }
    if (response.status === 422) {
      throw new Error(`Precip AI validation error: ${errorBody}`);
    }
    throw new Error(`Precip AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Handle different response formats
  let locations: Array<{
    hours?: HourlyPrecipitationHour[];
    timeZoneId?: string;
    latitude?: number;
    longitude?: number;
  }>;

  if (Array.isArray(data)) {
    // Simple array format
    locations = data;
  } else if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    // GeoJSON FeatureCollection format
    locations = data.features.map((feature: {
      properties?: { hours?: HourlyPrecipitationHour[]; timeZoneId?: string };
      geometry?: { coordinates?: [number, number] };
    }) => ({
      hours: feature.properties?.hours,
      timeZoneId: feature.properties?.timeZoneId,
      longitude: feature.geometry?.coordinates?.[0],
      latitude: feature.geometry?.coordinates?.[1],
    }));
  } else {
    console.error("Unexpected Hourly Precipitation API response:", JSON.stringify(data, null, 2));
    throw new Error(
      `Unexpected response format from Precip AI hourly endpoint. Got: ${typeof data === "object" ? Object.keys(data).join(", ") : typeof data}`
    );
  }

  // Transform response to result format
  const results: HourlyPrecipitationResult[] = locations.map((location) => {
    const hours = (location.hours || []) as HourlyPrecipitationHour[];
    const stats = calculatePrecipStats(hours);

    return {
      latitude: location.latitude ?? 0,
      longitude: location.longitude ?? 0,
      timeZoneId: location.timeZoneId || "America/Chicago",
      hours,
      totalPrecipitationMm: stats.totalMm,
      totalPrecipitationInches: stats.totalInches,
      maxHourlyMm: stats.maxHourlyMm,
      maxHourlyInches: stats.maxHourlyInches,
      hoursWithPrecip: stats.hoursWithPrecip,
    };
  });

  // Cache the results
  setCachedHourlyPrecip(params, results);

  return results;
}

// ============================================
// Hourly Precipitation Utility Functions
// ============================================

/**
 * Get date range for precipitation data (X days ago to today)
 */
export function getPrecipDateRange(days: number = 7): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

/**
 * Get precipitation description based on total inches
 */
export function getPrecipDescription(inches: number): string {
  if (inches === 0) return "No precipitation recorded";
  if (inches < 0.1) return "Trace amounts";
  if (inches < 0.25) return "Light precipitation";
  if (inches < 0.5) return "Moderate precipitation";
  if (inches < 1.0) return "Significant precipitation";
  return "Heavy precipitation";
}

/**
 * Clear hourly precipitation cache
 */
export function clearHourlyPrecipCache(): void {
  hourlyPrecipCache.clear();
}
