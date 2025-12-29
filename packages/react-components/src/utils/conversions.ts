/**
 * Unit conversion utilities for weather data
 */

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number | null): number | null {
  if (celsius === null) return null;
  return Math.round((celsius * 9) / 5 + 32);
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number | null): number | null {
  if (fahrenheit === null) return null;
  return Math.round(((fahrenheit - 32) * 5) / 9);
}

/**
 * Convert wind direction degrees to compass direction
 */
export function degreesToCompass(degrees: number | null): string {
  if (degrees === null) return '';

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
 * Convert meters per second to miles per hour
 */
export function mpsToMph(mps: number | null): number | null {
  if (mps === null) return null;
  return Math.round(mps * 2.237);
}

/**
 * Convert miles per hour to meters per second
 */
export function mphToMps(mph: number | null): number | null {
  if (mph === null) return null;
  return Math.round(mph / 2.237);
}

/**
 * Convert Pascals to inches of mercury
 */
export function pascalsToInHg(pascals: number | null): number | null {
  if (pascals === null) return null;
  return pascals / 3386.39;
}

/**
 * Convert Pascals to millibars (hPa)
 */
export function pascalsToMb(pascals: number | null): number | null {
  if (pascals === null) return null;
  return pascals / 100;
}

/**
 * Format temperature with unit
 */
export function formatTemperature(
  temp: number | null,
  unit: 'imperial' | 'metric'
): string {
  if (temp === null) return 'N/A';
  const suffix = unit === 'imperial' ? '°F' : '°C';
  return `${temp}${suffix}`;
}

/**
 * Format wind speed with unit
 */
export function formatWindSpeed(
  speed: number | null,
  unit: 'imperial' | 'metric'
): string {
  if (speed === null) return 'N/A';
  const suffix = unit === 'imperial' ? 'mph' : 'm/s';
  return `${speed} ${suffix}`;
}

/**
 * Format pressure with unit
 */
export function formatPressure(
  pascals: number | null,
  unit: 'imperial' | 'metric'
): string {
  if (pascals === null) return 'N/A';
  if (unit === 'imperial') {
    const inHg = pascalsToInHg(pascals);
    return inHg ? `${inHg.toFixed(2)} inHg` : 'N/A';
  }
  const mb = pascalsToMb(pascals);
  return mb ? `${Math.round(mb)} mb` : 'N/A';
}
