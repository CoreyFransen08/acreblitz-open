"use client";

import { useMemo, memo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CloudRain } from "lucide-react";

interface HourlyPrecipitationHour {
  startTime: string;
  precip: number;
  precip_probability: number | null;
  precip_type: "rain" | "snow" | "mixed";
  source: "observation" | "forecast";
}

interface PrecipitationUIData {
  fieldName: string | null;
  latitude: number;
  longitude: number;
  timeZoneId: string;
  startDate: string;
  endDate: string;
  hours: HourlyPrecipitationHour[];
  totalPrecipitationInches: number;
  maxHourlyInches: number;
  hoursWithPrecip: number;
}

interface PrecipitationAgentSummary {
  fieldName: string | null;
  dateRange: string;
  totalPrecipitationInches: number;
  precipDescription: string;
  maxHourlyInches: number;
  hoursWithPrecip: number;
  precipType: "rain" | "snow" | "mixed" | null;
}

interface PrecipitationToolResult {
  success: boolean;
  error?: string;
  uiData?: PrecipitationUIData;
  agentSummary?: PrecipitationAgentSummary;
}

function PrecipitationSkeleton() {
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
 * Convert mm to inches for display
 */
function mmToInches(mm: number): number {
  return Math.round((mm / 25.4) * 1000) / 1000;
}

/**
 * Get color based on precipitation type
 */
function getPrecipColor(type: "rain" | "snow" | "mixed"): string {
  switch (type) {
    case "rain":
      return "#3b82f6"; // blue
    case "snow":
      return "#06b6d4"; // cyan
    case "mixed":
      return "#8b5cf6"; // purple
    default:
      return "#3b82f6";
  }
}

/**
 * Get description for total precipitation
 */
function getPrecipDescription(inches: number): string {
  if (inches === 0) return "No precipitation";
  if (inches < 0.1) return "Trace amounts";
  if (inches < 0.25) return "Light";
  if (inches < 0.5) return "Moderate";
  if (inches < 1.0) return "Significant";
  return "Heavy";
}

interface ChartDataPoint {
  time: string;
  fullTime: string;
  precipInches: number;
  precipMm: number;
  type: "rain" | "snow" | "mixed";
  source: "observation" | "forecast";
}

const MemoizedPrecipitationChart = memo(function MemoizedPrecipitationChart({
  data,
}: {
  data: PrecipitationUIData;
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
    } else if (diffDays <= 3) {
      label = `Last ${diffDays} Days`;
    } else if (diffDays <= 7) {
      label = "Last Week";
    } else {
      label = `Last ${Math.ceil(diffDays / 7)} Weeks`;
    }
    return { days: diffDays, label };
  }, [data.hours]);

  // Transform data for the chart (convert mm to inches)
  const chartData: ChartDataPoint[] = useMemo(() => {
    const isMultiDay = dateRange.days > 2;
    return data.hours.map((hour) => {
      const date = new Date(hour.startTime);
      const precipInches = mmToInches(hour.precip);

      // For multi-day data, show date + hour; for short periods, just hour
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
        precipInches,
        precipMm: hour.precip,
        type: hour.precip_type,
        source: hour.source,
      };
    });
  }, [data.hours, dateRange.days]);

  // Find max precip for Y-axis
  const maxPrecip = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.precipInches), 0.1);
    return Math.ceil(max * 10) / 10; // Round up to nearest 0.1"
  }, [chartData]);

  const precipDesc = getPrecipDescription(data.totalPrecipitationInches);

  return (
    <div className="my-4 w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CloudRain className="h-5 w-5 text-blue-500" />
        <h3 className="font-semibold">
          Precipitation{data.fieldName ? ` - ${data.fieldName}` : ""}
        </h3>
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{dateRange.label}</span>
          <span>
            {data.startDate} to {data.endDate}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart
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
              domain={[0, maxPrecip]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}"`}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as ChartDataPoint;
                return (
                  <div className="rounded-lg border bg-popover p-2 shadow-md">
                    <p className="text-xs text-muted-foreground">
                      {point.fullTime}
                    </p>
                    <p
                      className="font-semibold"
                      style={{ color: getPrecipColor(point.type) }}
                    >
                      {point.precipInches.toFixed(3)}" ({point.precipMm.toFixed(1)} mm)
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {point.type} ({point.source})
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="precipInches" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getPrecipColor(entry.type)}
                  fillOpacity={entry.source === "forecast" ? 0.6 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold text-blue-500">
            {data.totalPrecipitationInches.toFixed(2)}"
          </p>
          <p className="text-xs text-muted-foreground">{precipDesc}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Max Hourly</p>
          <p className="text-xl font-bold text-cyan-500">
            {data.maxHourlyInches.toFixed(3)}"
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Rain Hours</p>
          <p className="text-xl font-bold text-purple-500">
            {data.hoursWithPrecip}
          </p>
          <p className="text-xs text-muted-foreground">
            of {data.hours.length}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Rain
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-500" /> Snow
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-500" /> Mixed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500/60" /> Forecast
        </span>
      </div>
    </div>
  );
});

export const PrecipitationToolUI: ToolCallMessagePartComponent = ({
  toolName,
  result,
  status,
}) => {
  if (toolName !== "getHourlyPrecipitation") return null;

  const precipResult = result as PrecipitationToolResult | undefined;

  // Memoize the UI data to prevent unnecessary re-renders
  const stableData = useMemo(() => {
    if (!precipResult?.success || !precipResult.uiData) {
      return null;
    }
    return precipResult.uiData;
  }, [precipResult?.success, precipResult?.uiData]);

  // Show skeleton during loading
  if (status?.type === "requires-action" || status?.type === "running") {
    return <PrecipitationSkeleton />;
  }

  // Handle errors
  if (status?.type === "incomplete") {
    return (
      <div className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to get precipitation data
        </p>
      </div>
    );
  }

  // Handle tool-level errors
  if (!precipResult?.success) {
    return (
      <div className="my-4 rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {precipResult?.error || "Unable to get precipitation data"}
        </p>
      </div>
    );
  }

  // Only render chart if we have uiData (includeHourly was true)
  if (!stableData) {
    return null;
  }

  return (
    <MemoizedPrecipitationChart
      key={`precipitation-${stableData.latitude}-${stableData.longitude}-${stableData.startDate}`}
      data={stableData}
    />
  );
};
