"use client";

import { useMemo, memo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import dynamic from "next/dynamic";

// Dynamically import Weather components to avoid SSR issues with Leaflet
const Weather = dynamic(
  () => import("@acreblitz/react-components").then((mod) => mod.Weather),
  { ssr: false, loading: () => <WeatherLoadingPlaceholder /> }
);
const WeatherSkeleton = dynamic(
  () => import("@acreblitz/react-components").then((mod) => mod.WeatherSkeleton),
  { ssr: false }
);

// Simple loading placeholder while dynamic import loads
function WeatherLoadingPlaceholder() {
  return (
    <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
  );
}

interface WeatherToolResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  fieldName?: string | null;
  error?: string;
}

/**
 * Memoized Weather display component to prevent unnecessary re-fetches.
 * Only re-renders when coordinates actually change.
 */
const MemoizedWeatherDisplay = memo(function MemoizedWeatherDisplay({
  latitude,
  longitude,
  fieldName,
}: {
  latitude: number;
  longitude: number;
  fieldName?: string | null;
}) {
  return (
    <div className="my-4 w-full max-w-lg">
      {fieldName && (
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Weather for {fieldName}
        </p>
      )}
      <Weather
        latitude={latitude}
        longitude={longitude}
        units="imperial"
        forecastDays={3}
        className="rounded-lg border shadow-sm"
      />
    </div>
  );
});

export const WeatherToolUI: ToolCallMessagePartComponent = ({
  toolName,
  result,
  status,
}) => {
  if (toolName !== "getWeather") return null;

  // Parse result early so we can use it in memoization
  const weatherResult = result as WeatherToolResult | undefined;

  // Memoize the coordinates to prevent unnecessary re-renders
  const stableCoords = useMemo(() => {
    if (!weatherResult?.success || !weatherResult.latitude || !weatherResult.longitude) {
      return null;
    }
    return {
      latitude: weatherResult.latitude,
      longitude: weatherResult.longitude,
      fieldName: weatherResult.fieldName,
    };
  }, [weatherResult?.success, weatherResult?.latitude, weatherResult?.longitude, weatherResult?.fieldName]);

  // Show skeleton during loading
  if (status?.type === "requires-action" || status?.type === "running") {
    return (
      <div className="my-4 w-full max-w-md">
        <WeatherSkeleton />
      </div>
    );
  }

  // Handle errors
  if (status?.type === "incomplete") {
    return (
      <div className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to get weather data</p>
      </div>
    );
  }

  // Handle tool-level errors
  if (!weatherResult?.success) {
    return (
      <div className="my-4 rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {weatherResult?.error || "Unable to get weather"}
        </p>
      </div>
    );
  }

  // Render memoized Weather component
  if (!stableCoords) {
    return null;
  }

  return (
    <MemoizedWeatherDisplay
      key={`weather-${stableCoords.latitude}-${stableCoords.longitude}`}
      latitude={stableCoords.latitude}
      longitude={stableCoords.longitude}
      fieldName={stableCoords.fieldName}
    />
  );
};
