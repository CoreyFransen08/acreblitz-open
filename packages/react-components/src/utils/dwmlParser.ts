/**
 * DWML (Digital Weather Markup Language) Parser
 *
 * Parses NWS MapClick.php XML responses into structured forecast data.
 * DWML Documentation: https://graphical.weather.gov/xml/
 */

import type {
  DWMLForecastData,
  DWMLLocation,
  DWMLHourlyData,
  DWMLTimeLayout,
  DWMLParameterSet,
} from '../types/clickForecast';

const NWS_MAPCLICK_BASE = 'https://forecast.weather.gov/MapClick.php';

/**
 * Fetch DWML forecast data for coordinates
 */
export async function fetchDWMLForecast(
  lat: number,
  lng: number
): Promise<DWMLForecastData> {
  // Validate coordinates (CONUS only)
  if (lat < 24 || lat > 50 || lng < -125 || lng > -66) {
    throw new Error('Coordinates outside CONUS coverage area');
  }

  const url = `${NWS_MAPCLICK_BASE}?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&FcstType=digitalDWML`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`NWS API error: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  return parseDWMLResponse(xmlText);
}

/**
 * Parse DWML XML response into structured data
 */
export function parseDWMLResponse(xmlText: string): DWMLForecastData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  // Check for parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML response from NWS');
  }

  // Parse location
  const location = parseLocation(doc);

  // Parse time layouts
  const timeLayouts = parseTimeLayouts(doc);

  // Parse parameters
  const parameters = parseParameters(doc);

  // Build hourly data array
  const hourly = buildHourlyData(timeLayouts, parameters);

  // Get creation time
  const creationTime =
    doc.querySelector('creation-date')?.textContent || new Date().toISOString();

  // Get product info
  const productInfo = parseProductInfo(doc);

  return {
    location,
    hourly,
    creationTime,
    productInfo,
  };
}

/**
 * Parse location information from DWML
 */
function parseLocation(doc: Document): DWMLLocation {
  const locationNode = doc.querySelector('location');
  const pointNode = locationNode?.querySelector('point');
  const cityNode = locationNode?.querySelector('city');
  const descriptionNode = locationNode?.querySelector('description');

  const lat = parseFloat(pointNode?.getAttribute('latitude') || '0');
  const lng = parseFloat(pointNode?.getAttribute('longitude') || '0');

  // City text may include state
  const cityText = cityNode?.textContent || '';
  const state = cityNode?.getAttribute('state') || '';

  // Clean up city name (remove state suffix if present)
  let city = cityText.replace(/, [A-Z]{2}$/, '').trim();
  if (!city) city = 'Unknown';

  return {
    city,
    state,
    latitude: lat,
    longitude: lng,
    areaDescription: descriptionNode?.textContent || undefined,
  };
}

/**
 * Parse time-layout elements
 */
function parseTimeLayouts(doc: Document): Map<string, DWMLTimeLayout> {
  const layouts = new Map<string, DWMLTimeLayout>();
  const layoutNodes = doc.querySelectorAll('time-layout');

  layoutNodes.forEach((node) => {
    const layoutKey = node.querySelector('layout-key')?.textContent || '';
    const validTimes = node.querySelectorAll('start-valid-time');
    const timeCoordinates: string[] = [];

    validTimes.forEach((timeNode) => {
      timeCoordinates.push(timeNode.textContent || '');
    });

    if (layoutKey) {
      layouts.set(layoutKey, { layoutKey, timeCoordinates });
    }
  });

  return layouts;
}

/**
 * Parse all parameter sets from DWML
 */
function parseParameters(doc: Document): Map<string, DWMLParameterSet[]> {
  const parameters = new Map<string, DWMLParameterSet[]>();
  const paramsNode = doc.querySelector('parameters');
  if (!paramsNode) return parameters;

  // Temperature parameters
  parseParameterType(paramsNode, 'temperature', parameters);

  // Precipitation
  parseParameterType(paramsNode, 'probability-of-precipitation', parameters);
  parseParameterType(paramsNode, 'hourly-qpf', parameters);

  // Humidity
  parseParameterType(paramsNode, 'humidity', parameters);

  // Wind
  parseParameterType(paramsNode, 'wind-speed', parameters);
  parseParameterType(paramsNode, 'direction', parameters);

  // Cloud cover
  parseParameterType(paramsNode, 'cloud-amount', parameters);

  // Weather conditions
  parseWeatherConditions(paramsNode, parameters);

  return parameters;
}

/**
 * Parse a specific parameter type with multiple sub-types
 */
function parseParameterType(
  paramsNode: Element,
  paramName: string,
  parameters: Map<string, DWMLParameterSet[]>
): void {
  const nodes = paramsNode.querySelectorAll(paramName);
  const sets: DWMLParameterSet[] = [];

  nodes.forEach((node) => {
    const timeLayout = node.getAttribute('time-layout') || '';
    const type = node.getAttribute('type') || 'value';
    const values: (number | null)[] = [];

    node.querySelectorAll('value').forEach((valueNode) => {
      const text = valueNode.textContent;
      const isNil = valueNode.getAttribute('xsi:nil') === 'true';
      if (isNil || !text) {
        values.push(null);
      } else {
        values.push(parseFloat(text));
      }
    });

    sets.push({ timeLayout, type, values });
  });

  if (sets.length > 0) {
    parameters.set(paramName, sets);
  }
}

/**
 * Parse weather conditions (text descriptions)
 */
function parseWeatherConditions(
  paramsNode: Element,
  parameters: Map<string, DWMLParameterSet[]>
): void {
  const weatherNode = paramsNode.querySelector('weather');
  if (!weatherNode) return;

  const timeLayout = weatherNode.getAttribute('time-layout') || '';
  const values: (string | null)[] = [];

  weatherNode.querySelectorAll('weather-conditions').forEach((condNode) => {
    const isNil = condNode.getAttribute('xsi:nil') === 'true';
    if (isNil) {
      values.push(null);
    } else {
      // Get weather type and coverage from value element
      const valueEl = condNode.querySelector('value');
      if (valueEl) {
        const weatherType = valueEl.getAttribute('weather-type') || '';
        const coverage = valueEl.getAttribute('coverage') || '';
        if (coverage && weatherType) {
          values.push(`${coverage} ${weatherType}`);
        } else if (weatherType) {
          values.push(weatherType);
        } else {
          values.push(null);
        }
      } else {
        values.push(null);
      }
    }
  });

  parameters.set('weather', [
    {
      timeLayout,
      type: 'conditions',
      values,
    },
  ]);
}

/**
 * Build hourly data array from parsed parameters
 */
function buildHourlyData(
  timeLayouts: Map<string, DWMLTimeLayout>,
  parameters: Map<string, DWMLParameterSet[]>
): DWMLHourlyData[] {
  // Find the primary hourly time layout (usually k-p1h-n1-N)
  let primaryLayout: DWMLTimeLayout | null = null;
  for (const [key, layout] of timeLayouts) {
    if (key.includes('p1h') || layout.timeCoordinates.length > 100) {
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

  const hourlyData: DWMLHourlyData[] = [];
  const times = primaryLayout.timeCoordinates;

  // Helper to get numeric value at index for a parameter
  const getNumericValue = (
    paramName: string,
    type: string,
    index: number
  ): number | null => {
    const sets = parameters.get(paramName);
    if (!sets) return null;
    const set = sets.find((s) => s.type === type) || sets[0];
    const val = set?.values[index];
    return typeof val === 'number' ? val : null;
  };

  // Helper to get string value
  const getStringValue = (paramName: string, index: number): string | null => {
    const sets = parameters.get(paramName);
    if (!sets || !sets[0]) return null;
    const val = sets[0].values[index];
    return typeof val === 'string' ? val : null;
  };

  for (let i = 0; i < times.length; i++) {
    hourlyData.push({
      validTime: times[i],
      temperature: getNumericValue('temperature', 'hourly', i),
      dewPoint: getNumericValue('temperature', 'dew point', i),
      apparentTemperature:
        getNumericValue('temperature', 'apparent', i) ||
        getNumericValue('temperature', 'wind chill', i) ||
        getNumericValue('temperature', 'heat index', i),
      precipitationChance: getNumericValue(
        'probability-of-precipitation',
        'floating',
        i
      ),
      precipitationAmount: getNumericValue('hourly-qpf', 'floating', i),
      humidity: getNumericValue('humidity', 'relative', i),
      windSpeed: getNumericValue('wind-speed', 'sustained', i),
      windGust: getNumericValue('wind-speed', 'gust', i),
      windDirection: getNumericValue('direction', 'wind', i),
      cloudCover: getNumericValue('cloud-amount', 'total', i),
      weatherCondition: getStringValue('weather', i),
    });
  }

  return hourlyData;
}

/**
 * Parse product information
 */
function parseProductInfo(
  doc: Document
): { conciseName: string; operationalMode: string } | undefined {
  const headNode = doc.querySelector('head');
  if (!headNode) return undefined;

  const product = headNode.querySelector('product');
  return {
    conciseName: product?.getAttribute('concise-name') || 'Digital Forecast',
    operationalMode: product?.getAttribute('operational-mode') || 'official',
  };
}

/**
 * Get compass direction from degrees
 */
export function degreesToCompassDirection(degrees: number | null): string {
  if (degrees === null) return 'N/A';
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Convert Fahrenheit to Celsius
 */
export function dwmlFahrenheitToCelsius(f: number | null): number | null {
  if (f === null) return null;
  return Math.round(((f - 32) * 5) / 9);
}

/**
 * Convert mph to km/h
 */
export function mphToKmh(mph: number | null): number | null {
  if (mph === null) return null;
  return Math.round(mph * 1.60934);
}

/**
 * Convert inches to mm
 */
export function inchesToMm(inches: number | null): number | null {
  if (inches === null) return null;
  return Math.round(inches * 25.4 * 10) / 10;
}
