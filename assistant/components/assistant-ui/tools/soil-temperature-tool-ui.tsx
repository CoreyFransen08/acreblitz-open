"use client";

import { useMemo, memo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Thermometer, TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Soil Temperature Hour data from Precip AI
 * Note: Temperature field name may vary
 */
interface SoilTemperatureHour {
  startTime: string;
  temperature?: number;
  temp_0_10cm?: number;
  "temp_0-10cm"?: number;
  soil_temp?: number;
  source?: string;
}

interface SoilTemperatureUIData {
  fieldName: string | null;
  latitude: number;
  longitude: number;
  timeZoneId: string;
  hours: SoilTemperatureHour[];
  currentTemperature: number | null;
  averageTemperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
}

interface SoilTemperatureToolResult {
  success: boolean;
  error?: string;
  uiData?: SoilTemperatureUIData;
  // agentSummary is now a text string for LLM context (not used by UI)
  agentSummary?: string;
}

function SoilTemperatureSkeleton() {
  return (
    <div className="my-4 w-full max-w-2xl space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
      <div className="flex gap-4">
        <div className="h-16 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 flex-1 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

/**
 * Extract temperature from hour data (handles different field names)
 */
function extractTemperature(hour: SoilTemperatureHour): number | null {
  // Check specific fields first (in order of preference)
  if (typeof hour["temp_0-10cm"] === "number") return hour["temp_0-10cm"];
  if (typeof hour.soil_temp === "number") return hour.soil_temp;
  if (typeof hour.temp_0_10cm === "number") return hour.temp_0_10cm;
  if (typeof hour.temperature === "number") return hour.temperature;

  // Fallback: try to find any numeric field that looks like temperature
  for (const [key, value] of Object.entries(hour)) {
    if (key.includes("temp") && typeof value === "number") {
      return value;
    }
  }

  return null;
}

/**
 * Convert Celsius to Fahrenheit
 */
function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9 / 5 + 32) * 10) / 10;
}

/**
 * Get color based on temperature (Celsius)
 */
function getTemperatureColor(tempCelsius: number): string {
  if (tempCelsius < 5) return "#3b82f6"; // blue - cold
  if (tempCelsius < 10) return "#06b6d4"; // cyan - cool
  if (tempCelsius < 15) return "#22c55e"; // green - cool-moderate
  if (tempCelsius < 20) return "#84cc16"; // lime - moderate
  if (tempCelsius < 25) return "#eab308"; // yellow - warm
  if (tempCelsius < 30) return "#f97316"; // orange - very warm
  return "#ef4444"; // red - hot
}

/**
 * Get description based on temperature (Celsius)
 */
function getTemperatureDescription(tempCelsius: number): string {
  if (tempCelsius < 5) return "Too cold for planting";
  if (tempCelsius < 10) return "Cool - limited germination";
  if (tempCelsius < 15) return "Cool-season crops";
  if (tempCelsius < 20) return "Good for most crops";
  if (tempCelsius < 25) return "Ideal for warm-season";
  if (tempCelsius < 30) return "Very warm";
  return "Hot - may stress plants";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "warming") {
    return <TrendingUp className="h-4 w-4 text-orange-500" />;
  }
  if (trend === "cooling") {
    return <TrendingDown className="h-4 w-4 text-blue-500" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

interface ChartDataPoint {
  time: string;
  fullTime: string;
  temperatureF: number | null;
  temperatureC: number | null;
}

const MemoizedSoilTemperatureChart = memo(function MemoizedSoilTemperatureChart({
  data,
}: {
  data: SoilTemperatureUIData;
}) {
  // Calculate the date range to determine label format
  const dateRange = useMemo(() => {
    if (data.hours.length === 0) return { days: 0, label: "No data" };
    const firstDate = new Date(data.hours[0].startTime);
    const lastDate = new Date(data.hours[data.hours.length - 1].startTime);
    const diffMs = lastDate.getTime() - firstDate.getTime();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    let label: string;
    if (diffDays <= 1) {
      label = "Last 24 Hours";
    } else if (diffDays <= 7) {
      label = `Last ${diffDays} Days`;
    } else {
      label = `Last ${Math.ceil(diffDays / 7)} Weeks`;
    }
    return { days: diffDays, label };
  }, [data.hours]);

  // Transform data for the chart (convert to Fahrenheit for display)
  const chartData: ChartDataPoint[] = useMemo(() => {
    const isMultiDay = dateRange.days > 1;
    return data.hours.map((hour) => {
      const date = new Date(hour.startTime);
      const tempC = extractTemperature(hour);

      // For multi-day data, show date + hour; for single day, just hour
      const timeLabel = isMultiDay
        ? date.toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            hour12: true,
          })
        : date.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
          });

      return {
        time: timeLabel,
        fullTime: date.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        temperatureF: tempC !== null ? celsiusToFahrenheit(tempC) : null,
        temperatureC: tempC,
      };
    });
  }, [data.hours, dateRange.days]);

  // Calculate trend (using Celsius for consistency with threshold)
  const trend = useMemo(() => {
    const temps = chartData
      .map((d) => d.temperatureC)
      .filter((t): t is number => t !== null);

    if (temps.length < 4) return "stable";

    const midpoint = Math.floor(temps.length / 2);
    const firstHalf = temps.slice(0, midpoint);
    const secondHalf = temps.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    if (change > 1) return "warming";
    if (change < -1) return "cooling";
    return "stable";
  }, [chartData]);

  const currentTempC = data.currentTemperature ?? 0;
  const currentTempF = celsiusToFahrenheit(currentTempC);
  const tempColor = getTemperatureColor(currentTempC);
  const tempDesc = getTemperatureDescription(currentTempC);

  // Calculate min/max for Y-axis domain (in Fahrenheit)
  const tempsF = chartData
    .map((d) => d.temperatureF)
    .filter((t): t is number => t !== null);
  const minTempF = tempsF.length > 0 ? Math.floor(Math.min(...tempsF) - 5) : 20;
  const maxTempF = tempsF.length > 0 ? Math.ceil(Math.max(...tempsF) + 5) : 100;

  return (
    <div className="my-4 w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Thermometer className="h-5 w-5 text-orange-500" />
        <h3 className="font-semibold">
          Soil Temperature (0-10cm){data.fieldName ? ` - ${data.fieldName}` : ""}
        </h3>
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{dateRange.label}</span>
          <div className="flex items-center gap-1">
            <TrendIcon trend={trend} />
            <span className="capitalize">{trend}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              className="text-muted-foreground"
            />
            <YAxis
              domain={[minTempF, maxTempF]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}°F`}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as ChartDataPoint;
                const tempF = point.temperatureF ?? 32;
                const tempC = point.temperatureC ?? 0;
                return (
                  <div className="rounded-lg border bg-popover p-2 shadow-md">
                    <p className="text-xs text-muted-foreground">
                      {point.fullTime}
                    </p>
                    <p className="font-semibold" style={{ color: getTemperatureColor(tempC) }}>
                      {tempF.toFixed(1)}°F ({tempC.toFixed(1)}°C)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getTemperatureDescription(tempC)}
                    </p>
                  </div>
                );
              }}
            />
            {/* Reference lines for temperature zones (50°F = 10°C, 68°F = 20°C) */}
            <ReferenceLine
              y={50}
              stroke="#06b6d4"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={68}
              stroke="#84cc16"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="temperatureF"
              stroke={tempColor}
              strokeWidth={2}
              dot={{ fill: tempColor, strokeWidth: 0, r: 2 }}
              activeDot={{ r: 5, fill: tempColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Current</p>
          <p
            className="text-xl font-bold"
            style={{ color: getTemperatureColor(currentTempC) }}
          >
            {currentTempF.toFixed(1)}°F
          </p>
          <p className="text-xs text-muted-foreground">
            {currentTempC.toFixed(1)}°C
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-xl font-bold text-blue-500">
            {data.minTemperature !== null
              ? `${celsiusToFahrenheit(data.minTemperature).toFixed(1)}°F`
              : "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.minTemperature !== null
              ? `${data.minTemperature.toFixed(1)}°C`
              : "-"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-xl font-bold text-orange-500">
            {data.maxTemperature !== null
              ? `${celsiusToFahrenheit(data.maxTemperature).toFixed(1)}°F`
              : "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.maxTemperature !== null
              ? `${data.maxTemperature.toFixed(1)}°C`
              : "-"}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="text-center text-sm">
        <span
          className="font-medium"
          style={{ color: tempColor }}
        >
          {tempDesc}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Cold (&lt;50°F)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Cool (50-59°F)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-lime-500" /> Moderate (59-68°F)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> Warm (68-86°F)
        </span>
      </div>
    </div>
  );
});

export const SoilTemperatureToolUI: ToolCallMessagePartComponent = ({
  toolName,
  result,
  status,
}) => {
  if (toolName !== "getSoilTemperature") return null;

  const tempResult = result as SoilTemperatureToolResult | undefined;

  // Memoize the UI data to prevent unnecessary re-renders
  const stableData = useMemo(() => {
    if (!tempResult?.success || !tempResult.uiData) {
      return null;
    }
    return tempResult.uiData;
  }, [tempResult?.success, tempResult?.uiData]);

  // Show skeleton during loading
  if (status?.type === "requires-action" || status?.type === "running") {
    return <SoilTemperatureSkeleton />;
  }

  // Handle errors
  if (status?.type === "incomplete") {
    return (
      <div className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to get soil temperature data
        </p>
      </div>
    );
  }

  // Handle tool-level errors
  if (!tempResult?.success) {
    return (
      <div className="my-4 rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {tempResult?.error || "Unable to get soil temperature"}
        </p>
      </div>
    );
  }

  // Only render chart if we have uiData (includeTrend was true)
  if (!stableData) {
    return null;
  }

  return (
    <MemoizedSoilTemperatureChart
      key={`soil-temp-${stableData.latitude}-${stableData.longitude}`}
      data={stableData}
    />
  );
};
