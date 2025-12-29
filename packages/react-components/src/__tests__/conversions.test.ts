import { describe, it, expect } from 'vitest';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  degreesToCompass,
  mpsToMph,
  mphToMps,
  pascalsToInHg,
  pascalsToMb,
  formatTemperature,
  formatWindSpeed,
  formatPressure,
} from '../utils/conversions';

describe('Temperature Conversions', () => {
  describe('celsiusToFahrenheit', () => {
    it('converts 0°C to 32°F', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
    });

    it('converts 100°C to 212°F', () => {
      expect(celsiusToFahrenheit(100)).toBe(212);
    });

    it('converts -40°C to -40°F', () => {
      expect(celsiusToFahrenheit(-40)).toBe(-40);
    });

    it('converts 20°C to 68°F', () => {
      expect(celsiusToFahrenheit(20)).toBe(68);
    });

    it('returns null for null input', () => {
      expect(celsiusToFahrenheit(null)).toBeNull();
    });
  });

  describe('fahrenheitToCelsius', () => {
    it('converts 32°F to 0°C', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
    });

    it('converts 212°F to 100°C', () => {
      expect(fahrenheitToCelsius(212)).toBe(100);
    });

    it('converts -40°F to -40°C', () => {
      expect(fahrenheitToCelsius(-40)).toBe(-40);
    });

    it('converts 68°F to 20°C', () => {
      expect(fahrenheitToCelsius(68)).toBe(20);
    });

    it('returns null for null input', () => {
      expect(fahrenheitToCelsius(null)).toBeNull();
    });
  });
});

describe('Wind Direction Conversions', () => {
  describe('degreesToCompass', () => {
    it('converts 0° to N', () => {
      expect(degreesToCompass(0)).toBe('N');
    });

    it('converts 360° to N', () => {
      expect(degreesToCompass(360)).toBe('N');
    });

    it('converts 90° to E', () => {
      expect(degreesToCompass(90)).toBe('E');
    });

    it('converts 180° to S', () => {
      expect(degreesToCompass(180)).toBe('S');
    });

    it('converts 270° to W', () => {
      expect(degreesToCompass(270)).toBe('W');
    });

    it('converts 45° to NE', () => {
      expect(degreesToCompass(45)).toBe('NE');
    });

    it('converts 135° to SE', () => {
      expect(degreesToCompass(135)).toBe('SE');
    });

    it('converts 225° to SW', () => {
      expect(degreesToCompass(225)).toBe('SW');
    });

    it('converts 315° to NW', () => {
      expect(degreesToCompass(315)).toBe('NW');
    });

    it('returns empty string for null input', () => {
      expect(degreesToCompass(null)).toBe('');
    });
  });
});

describe('Wind Speed Conversions', () => {
  describe('mpsToMph', () => {
    it('converts 1 m/s to approximately 2 mph', () => {
      expect(mpsToMph(1)).toBe(2);
    });

    it('converts 10 m/s to approximately 22 mph', () => {
      expect(mpsToMph(10)).toBe(22);
    });

    it('converts 0 m/s to 0 mph', () => {
      expect(mpsToMph(0)).toBe(0);
    });

    it('returns null for null input', () => {
      expect(mpsToMph(null)).toBeNull();
    });
  });

  describe('mphToMps', () => {
    it('converts 2 mph to approximately 1 m/s', () => {
      expect(mphToMps(2)).toBe(1);
    });

    it('converts 22 mph to approximately 10 m/s', () => {
      expect(mphToMps(22)).toBe(10);
    });

    it('converts 0 mph to 0 m/s', () => {
      expect(mphToMps(0)).toBe(0);
    });

    it('returns null for null input', () => {
      expect(mphToMps(null)).toBeNull();
    });
  });
});

describe('Pressure Conversions', () => {
  describe('pascalsToInHg', () => {
    it('converts standard pressure (101325 Pa) to approximately 29.92 inHg', () => {
      const result = pascalsToInHg(101325);
      expect(result).toBeCloseTo(29.92, 1);
    });

    it('returns null for null input', () => {
      expect(pascalsToInHg(null)).toBeNull();
    });
  });

  describe('pascalsToMb', () => {
    it('converts 101325 Pa to 1013.25 mb', () => {
      const result = pascalsToMb(101325);
      expect(result).toBeCloseTo(1013.25, 1);
    });

    it('converts 100000 Pa to 1000 mb', () => {
      expect(pascalsToMb(100000)).toBe(1000);
    });

    it('returns null for null input', () => {
      expect(pascalsToMb(null)).toBeNull();
    });
  });
});

describe('Format Functions', () => {
  describe('formatTemperature', () => {
    it('formats imperial temperature correctly', () => {
      expect(formatTemperature(72, 'imperial')).toBe('72°F');
    });

    it('formats metric temperature correctly', () => {
      expect(formatTemperature(22, 'metric')).toBe('22°C');
    });

    it('returns N/A for null temperature', () => {
      expect(formatTemperature(null, 'imperial')).toBe('N/A');
    });

    it('formats negative temperatures', () => {
      expect(formatTemperature(-5, 'imperial')).toBe('-5°F');
      expect(formatTemperature(-10, 'metric')).toBe('-10°C');
    });
  });

  describe('formatWindSpeed', () => {
    it('formats imperial wind speed correctly', () => {
      expect(formatWindSpeed(15, 'imperial')).toBe('15 mph');
    });

    it('formats metric wind speed correctly', () => {
      expect(formatWindSpeed(7, 'metric')).toBe('7 m/s');
    });

    it('returns N/A for null wind speed', () => {
      expect(formatWindSpeed(null, 'imperial')).toBe('N/A');
    });

    it('formats zero wind speed', () => {
      expect(formatWindSpeed(0, 'imperial')).toBe('0 mph');
    });
  });

  describe('formatPressure', () => {
    it('formats imperial pressure in inHg', () => {
      const result = formatPressure(101325, 'imperial');
      expect(result).toBe('29.92 inHg');
    });

    it('formats metric pressure in mb', () => {
      const result = formatPressure(101325, 'metric');
      expect(result).toBe('1013 mb');
    });

    it('returns N/A for null pressure', () => {
      expect(formatPressure(null, 'imperial')).toBe('N/A');
    });
  });
});
