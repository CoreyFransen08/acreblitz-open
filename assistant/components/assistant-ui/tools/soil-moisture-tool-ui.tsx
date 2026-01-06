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
import { Droplets, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SoilMoistureDay {
  startTime: string;
  soil_moisture: number;
}

interface SoilMoistureUIData {
  fieldName: string | null;
  latitude: number;
  longitude: number;
  timeZoneId: string;
  startDate: string;
  endDate: string;
  days: SoilMoistureDay[];
  averageMoisture: number | null;
  minMoisture: number | null;
  maxMoisture: number | null;
}

interface SoilMoistureToolResult {
  success: boolean;
  error?: string;
  uiData?: SoilMoistureUIData;
  // agentSummary is now a text string for LLM context (not used by UI)
  agentSummary?: string;
}

function SoilMoistureSkeleton() {
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

function getMoistureColor(moisture: number): string {
  if (moisture < 20) return "#ef4444"; // red - dry
  if (moisture < 30) return "#f97316"; // orange - moderately dry
  if (moisture < 40) return "#eab308"; // yellow - adequate
  if (moisture < 50) return "#22c55e"; // green - moist
  return "#3b82f6"; // blue - very moist/saturated
}

function getMoistureDescription(moisture: number): string {
  if (moisture < 10) return "Very Dry";
  if (moisture < 20) return "Dry";
  if (moisture < 30) return "Moderately Dry";
  if (moisture < 40) return "Adequate";
  if (moisture < 50) return "Moist";
  if (moisture < 60) return "Very Moist";
  return "Saturated";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "increasing") {
    return <TrendingUp className="h-4 w-4 text-blue-500" />;
  }
  if (trend === "decreasing") {
    return <TrendingDown className="h-4 w-4 text-orange-500" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

interface ChartDataPoint {
  date: string;
  fullDate: string;
  moisture: number | null;
}

const MemoizedSoilMoistureChart = memo(function MemoizedSoilMoistureChart({
  data,
}: {
  data: SoilMoistureUIData;
}) {
  // Transform data for the chart
  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.days.map((day) => {
      const date = new Date(day.startTime);
      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        moisture: day.soil_moisture,
      };
    });
  }, [data.days]);

  // Calculate trend
  const trend = useMemo(() => {
    if (data.days.length < 4) return "stable";
    const midpoint = Math.floor(data.days.length / 2);
    const firstHalf = data.days.slice(0, midpoint);
    const secondHalf = data.days.slice(midpoint);

    const firstAvg =
      firstHalf.reduce((sum, d) => sum + (d.soil_moisture ?? 0), 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, d) => sum + (d.soil_moisture ?? 0), 0) /
      secondHalf.length;

    const change = secondAvg - firstAvg;
    if (change > 3) return "increasing";
    if (change < -3) return "decreasing";
    return "stable";
  }, [data.days]);

  const avgMoisture = data.averageMoisture ?? 0;
  const moistureColor = getMoistureColor(avgMoisture);
  const moistureDesc = getMoistureDescription(avgMoisture);

  return (
    <div className="my-4 w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Droplets className="h-5 w-5 text-blue-500" />
        <h3 className="font-semibold">
          Soil Moisture{data.fieldName ? ` - ${data.fieldName}` : ""}
        </h3>
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.startDate} to {data.endDate}
          </span>
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
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as ChartDataPoint;
                const moisture = point.moisture ?? 0;
                return (
                  <div className="rounded-lg border bg-popover p-2 shadow-md">
                    <p className="text-xs text-muted-foreground">
                      {point.fullDate}
                    </p>
                    <p className="font-semibold" style={{ color: getMoistureColor(moisture) }}>
                      {moisture.toFixed(1)}% - {getMoistureDescription(moisture)}
                    </p>
                  </div>
                );
              }}
            />
            {/* Reference lines for moisture zones */}
            <ReferenceLine
              y={40}
              stroke="#22c55e"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={20}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="moisture"
              stroke={moistureColor}
              strokeWidth={2}
              dot={{ fill: moistureColor, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: moistureColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Average</p>
          <p
            className="text-xl font-bold"
            style={{ color: getMoistureColor(avgMoisture) }}
          >
            {avgMoisture.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">{moistureDesc}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-xl font-bold text-orange-500">
            {data.minMoisture?.toFixed(1) ?? "-"}%
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-xl font-bold text-blue-500">
            {data.maxMoisture?.toFixed(1) ?? "-"}%
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Dry (&lt;20%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Adequate (30-40%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Moist (40-50%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Very Moist (&gt;50%)
        </span>
      </div>
    </div>
  );
});

export const SoilMoistureToolUI: ToolCallMessagePartComponent = ({
  toolName,
  result,
  status,
}) => {
  if (toolName !== "getSoilMoisture") return null;

  const moistureResult = result as SoilMoistureToolResult | undefined;

  // Memoize the UI data to prevent unnecessary re-renders
  const stableData = useMemo(() => {
    if (!moistureResult?.success || !moistureResult.uiData) {
      return null;
    }
    return moistureResult.uiData;
  }, [moistureResult?.success, moistureResult?.uiData]);

  // Show skeleton during loading
  if (status?.type === "requires-action" || status?.type === "running") {
    return <SoilMoistureSkeleton />;
  }

  // Handle errors
  if (status?.type === "incomplete") {
    return (
      <div className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to get soil moisture data
        </p>
      </div>
    );
  }

  // Handle tool-level errors
  if (!moistureResult?.success) {
    return (
      <div className="my-4 rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {moistureResult?.error || "Unable to get soil moisture"}
        </p>
      </div>
    );
  }

  // Only render chart if we have uiData (includeDaily was true)
  if (!stableData) {
    return null;
  }

  return (
    <MemoizedSoilMoistureChart
      key={`soil-moisture-${stableData.latitude}-${stableData.longitude}-${stableData.startDate}`}
      data={stableData}
    />
  );
};
