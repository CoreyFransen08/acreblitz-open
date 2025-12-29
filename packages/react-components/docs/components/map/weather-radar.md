# Weather Radar Overlay

Animated NEXRAD weather radar tiles with playback controls for the Map component.

## Overview

The weather radar overlay displays real-time precipitation data from the Iowa State Mesonet NEXRAD service:

- **Animated playback** through the past hour of radar data
- **5-minute intervals** (12 frames of history)
- **Play/pause controls** with timeline slider
- **No API key required** - free public data
- **Pre-loaded frames** for smooth animation

## Data Source

- **Provider**: Iowa State Mesonet (IEM)
- **Endpoint**: `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi`
- **Layer**: `nexrad-n0q-wmst` (Base Reflectivity)
- **Format**: WMS-T (Web Map Service with Time dimension)
- **Update frequency**: Every 5 minutes
- **Coverage**: Continental United States

Sources:
- [IEM OGC Services](https://mesonet.agron.iastate.edu/ogc/)

## Quick Start

```tsx
import { Map, WEATHER_RADAR_OVERLAY_CONFIG, DEFAULT_LAYERS } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function WeatherMap() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={6}
      height="600px"
      layers={{
        baseLayers: [
          DEFAULT_LAYERS.esriWorldImagery,
          DEFAULT_LAYERS.openStreetMap,
        ],
        overlays: [WEATHER_RADAR_OVERLAY_CONFIG],
        defaultBaseLayer: 'esri-satellite',
        defaultOverlays: ['weather-radar-nexrad'],
      }}
    />
  );
}
```

## WEATHER_RADAR_OVERLAY_CONFIG

The pre-configured overlay with sensible defaults:

```typescript
const WEATHER_RADAR_OVERLAY_CONFIG: AnimatedTileLayerConfig = {
  id: 'weather-radar-nexrad',
  name: 'Weather Radar',
  url: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi',
  layers: 'nexrad-n0q-wmst',
  attribution: 'NEXRAD data courtesy of <a href="https://mesonet.agron.iastate.edu/">IEM</a>',
  maxZoom: 12,
  minZoom: 3,
  animated: true,
  animationType: 'time',
  timeConfig: {
    historyMinutes: 60,      // Past 1 hour
    intervalMinutes: 5,      // 5-minute frames
    includeCurrent: true,    // Include latest available
  },
  animationConfig: {
    frameDelay: 500,         // 500ms between frames
    loop: true,              // Loop continuously
    loopPauseDelay: 2000,    // Pause 2s at end before looping
    autoPlay: false,         // Don't auto-start animation
  },
};
```

## Animation Controls

When the radar overlay is visible, animation controls appear in the bottom-left corner:

- **Play/Pause button** - Start or stop the animation
- **Timeline slider** - Seek to any frame
- **Timestamp display** - Shows current frame time

### Controls Position

```tsx
import { Map, WeatherRadarLayer, WEATHER_RADAR_OVERLAY_CONFIG } from '@acreblitz/react-components';

// If using WeatherRadarLayer directly, you can set controls position:
<WeatherRadarLayer
  config={WEATHER_RADAR_OVERLAY_CONFIG}
  visible={true}
  controlsPosition="bottomright"  // 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
/>
```

## Configuration Options

### Time Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `historyMinutes` | `number` | `60` | How far back in time to show |
| `intervalMinutes` | `number` | `5` | Minutes between frames |
| `includeCurrent` | `boolean` | `true` | Include the most recent frame |

### Animation Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `frameDelay` | `number` | `500` | Milliseconds between frames |
| `loop` | `boolean` | `true` | Loop animation continuously |
| `loopPauseDelay` | `number` | `2000` | Pause at end before looping (ms) |
| `autoPlay` | `boolean` | `false` | Start playing automatically |

## Custom Configuration

Override defaults by spreading the config:

```tsx
import { Map, WEATHER_RADAR_OVERLAY_CONFIG, DEFAULT_LAYERS } from '@acreblitz/react-components';

const customRadarConfig = {
  ...WEATHER_RADAR_OVERLAY_CONFIG,
  timeConfig: {
    historyMinutes: 120,     // 2 hours of history
    intervalMinutes: 10,     // 10-minute intervals (12 frames)
    includeCurrent: true,
  },
  animationConfig: {
    frameDelay: 750,         // Slower playback
    loop: true,
    loopPauseDelay: 3000,    // Longer pause at end
    autoPlay: true,          // Start playing immediately
  },
};

<Map
  center={[39.7456, -97.0892]}
  zoom={6}
  height="600px"
  layers={{
    baseLayers: [DEFAULT_LAYERS.esriWorldImagery],
    overlays: [customRadarConfig],
    defaultOverlays: ['weather-radar-nexrad'],
  }}
/>
```

## Using with useRadarAnimation Hook

For custom UI or programmatic control:

```tsx
import { useRadarAnimation, WEATHER_RADAR_OVERLAY_CONFIG } from '@acreblitz/react-components';

function CustomRadarControls() {
  const {
    state,
    play,
    pause,
    togglePlayback,
    goToFrame,
    nextFrame,
    previousFrame,
    goToLatest,
    refresh,
    currentWmsTime,
  } = useRadarAnimation({
    config: WEATHER_RADAR_OVERLAY_CONFIG,
    onFrameChange: (frame, index) => {
      console.log('Frame changed:', frame.timestamp);
    },
    onPlaybackStateChange: (state) => {
      console.log('Playback:', state); // 'playing' | 'paused'
    },
  });

  return (
    <div>
      <p>Frame {state.currentFrameIndex + 1} of {state.frames.length}</p>
      <p>Time: {state.currentTimestamp?.toLocaleTimeString()}</p>

      <button onClick={previousFrame}>Previous</button>
      <button onClick={togglePlayback}>
        {state.playbackState === 'playing' ? 'Pause' : 'Play'}
      </button>
      <button onClick={nextFrame}>Next</button>
      <button onClick={goToLatest}>Latest</button>
      <button onClick={refresh}>Refresh</button>

      <input
        type="range"
        min={0}
        max={state.frames.length - 1}
        value={state.currentFrameIndex}
        onChange={(e) => goToFrame(Number(e.target.value))}
      />
    </div>
  );
}
```

## Combining with Data Overlays

Weather radar can be used alongside soil and hydro overlays:

```tsx
import {
  Map,
  WEATHER_RADAR_OVERLAY_CONFIG,
  SSURGO_OVERLAY_CONFIG,
  HYDRO_3DHP_OVERLAY_CONFIG,
  DEFAULT_LAYERS,
} from '@acreblitz/react-components';

function FieldWeatherMap() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={14}
      height="600px"
      layers={{
        baseLayers: [
          DEFAULT_LAYERS.esriWorldImagery,
          DEFAULT_LAYERS.openStreetMap,
        ],
        overlays: [WEATHER_RADAR_OVERLAY_CONFIG],
        defaultBaseLayer: 'esri-satellite',
        defaultOverlays: ['weather-radar-nexrad'],
      }}
      dataOverlays={{
        enabled: true,
        showPanel: true,
        overlays: [SSURGO_OVERLAY_CONFIG, HYDRO_3DHP_OVERLAY_CONFIG],
        defaultVisibility: {
          'ssurgo-soil': true,
          '3dhp-hydro': false,
        },
      }}
    />
  );
}
```

### Layer Ordering (z-index)

| Layer | z-index | Description |
|-------|---------|-------------|
| Base tiles | 0 | Satellite, street map |
| Weather radar | 400 | Radar overlay pane |
| Soil polygons | 450 | SSURGO soil data |
| Hydro features | 460+ | Streams, lakes, drainage |

## WeatherRadarLayerProps

```typescript
interface WeatherRadarLayerProps {
  /** Radar overlay configuration */
  config: AnimatedTileLayerConfig;

  /** Whether the layer is visible */
  visible?: boolean;

  /** Override animation options */
  animationOptions?: Partial<RadarAnimationConfig>;

  /** Show animation controls panel */
  showControls?: boolean;

  /** Controls panel position */
  controlsPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';

  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;

  /** Callback when frame changes */
  onFrameChange?: (frame: RadarFrame, index: number) => void;
}
```

## TypeScript Types

```typescript
import type {
  // Configuration types
  AnimatedTileLayerConfig,
  RadarTimeConfig,
  RadarAnimationConfig,

  // State types
  RadarPlaybackState,
  RadarFrame,
  RadarAnimationState,

  // Hook types
  UseRadarAnimationOptions,
  UseRadarAnimationResult,

  // Component props
  WeatherRadarLayerProps,
  RadarAnimationControlsProps,
} from '@acreblitz/react-components';

// Playback state
type RadarPlaybackState = 'playing' | 'paused' | 'loading';

// Individual frame
interface RadarFrame {
  timestamp: string;     // ISO 8601 string
  date: Date;            // Date object
  wmsTime: string;       // WMS TIME parameter value
  loaded: boolean;       // Whether tiles are loaded
}

// Animation state
interface RadarAnimationState {
  frames: RadarFrame[];
  currentFrameIndex: number;
  playbackState: RadarPlaybackState;
  isInitializing: boolean;
  currentTimestamp: Date | null;
}
```

## Type Guard

Check if a layer config is an animated overlay:

```typescript
import { isAnimatedTileLayer } from '@acreblitz/react-components';
import type { TileLayerConfig, AnimatedTileLayerConfig } from '@acreblitz/react-components';

function renderOverlay(layer: TileLayerConfig) {
  if (isAnimatedTileLayer(layer)) {
    // layer is AnimatedTileLayerConfig
    console.log('Animated layer:', layer.animationConfig);
  } else {
    // Standard tile layer
    console.log('Static layer');
  }
}
```

## Exports

```tsx
// Components
import {
  Map,
  WeatherRadarLayer,
  RadarAnimationControls,
} from '@acreblitz/react-components';

// Hooks
import { useRadarAnimation } from '@acreblitz/react-components';

// Configuration
import { WEATHER_RADAR_OVERLAY_CONFIG } from '@acreblitz/react-components';

// Type guard
import { isAnimatedTileLayer } from '@acreblitz/react-components';

// Types
import type {
  AnimatedTileLayerConfig,
  RadarTimeConfig,
  RadarAnimationConfig,
  RadarPlaybackState,
  RadarFrame,
  RadarAnimationState,
  UseRadarAnimationOptions,
  UseRadarAnimationResult,
  WeatherRadarLayerProps,
  RadarAnimationControlsProps,
} from '@acreblitz/react-components';
```

## CSS Styling

The animation controls use CSS classes prefixed with `acb-radar-controls`:

```css
/* Container */
.acb-radar-controls { }

/* Position variants */
.acb-radar-controls--topleft { }
.acb-radar-controls--topright { }
.acb-radar-controls--bottomleft { }
.acb-radar-controls--bottomright { }

/* Elements */
.acb-radar-controls__header { }
.acb-radar-controls__title { }
.acb-radar-controls__content { }
.acb-radar-controls__playback { }
.acb-radar-controls__play-btn { }
.acb-radar-controls__timeline { }
.acb-radar-controls__slider { }
.acb-radar-controls__time-labels { }
.acb-radar-controls__timestamp { }
```

Override styles in your CSS:

```css
.acb-radar-controls {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
}

.acb-radar-controls__play-btn {
  background: #3b82f6;
}

.acb-radar-controls__play-btn:hover {
  background: #2563eb;
}
```

## Performance Notes

- **Pre-loading**: All frames are added to the map on mount with `opacity: 0`
- **Frame switching**: Only opacity changes during playback (instant, no network delay)
- **Browser caching**: WMS tiles are cached by the browser automatically
- **Memory**: ~12 tile layers kept in memory (one per frame)

For lower memory usage, reduce `historyMinutes` or increase `intervalMinutes`:

```typescript
const lightweightConfig = {
  ...WEATHER_RADAR_OVERLAY_CONFIG,
  timeConfig: {
    historyMinutes: 30,    // Only 30 minutes
    intervalMinutes: 10,   // 3 frames instead of 12
    includeCurrent: true,
  },
};
```

## Troubleshooting

### Radar Not Showing

1. Ensure the overlay is in `defaultOverlays`:
   ```tsx
   layers={{
     overlays: [WEATHER_RADAR_OVERLAY_CONFIG],
     defaultOverlays: ['weather-radar-nexrad'],
   }}
   ```

2. Check zoom level - radar works best at zoom 3-12

3. Verify network access to `mesonet.agron.iastate.edu`

### Animation Stuttering

The animation pre-loads all frames. If you see stuttering:

1. Wait for initial tile loading to complete
2. Reduce the number of frames (increase `intervalMinutes`)
3. Check network speed for tile loading

### Controls Not Visible

Ensure `showControls` is not set to `false`:

```tsx
<WeatherRadarLayer
  config={WEATHER_RADAR_OVERLAY_CONFIG}
  visible={true}
  showControls={true}  // default is true
/>
```

## Related

- [Map Component](./map.md)
- [Data Overlays Overview](./data-overlays/index.md)
- [SSURGO Soil Overlay](./data-overlays/soil-overlay.md)
- [3DHP Hydro Overlay](./data-overlays/hydro-overlay.md)
