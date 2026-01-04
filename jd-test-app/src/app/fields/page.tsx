"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { UnifiedField, GeoJSONGeometry } from "@acreblitz/platform-integrations";

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(
  () => import("@acreblitz/react-components").then((mod) => mod.Map),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-slate-800 animate-pulse flex items-center justify-center">
      <span className="text-slate-500">Loading map...</span>
    </div>
  );
}

interface FieldsResponse {
  fields: UnifiedField[];
  totalCount: number;
  organizations: Array<{ id: string; name: string }>;
  error?: string;
}

export default function FieldsPage() {
  const [fields, setFields] = useState<UnifiedField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fields");
      const data: FieldsResponse = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch fields");
      }
      
      setFields(data.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh token");
      }
      
      // Try fetching fields again after refresh
      await fetchFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  // Convert fields to GeoJSON FeatureCollection
  const geoJSON = useMemo(() => {
    const features = fields
      .filter((f) => f.boundary?.geometry)
      .map((field) => ({
        type: "Feature" as const,
        geometry: field.boundary!.geometry as GeoJSONGeometry,
        properties: {
          id: field.id,
          name: field.name,
          area: field.area?.value,
          areaUnit: field.area?.unit,
          organization: field.organizationName,
          farm: field.farmName,
        },
      }));

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [fields]);

  // Calculate map bounds from fields
  const mapBounds = useMemo(() => {
    if (geoJSON.features.length === 0) return undefined;
    
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    
    geoJSON.features.forEach((feature) => {
      const coords = extractCoordinates(feature.geometry);
      coords.forEach(([lng, lat]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });
    
    // Add padding
    const latPad = (maxLat - minLat) * 0.1;
    const lngPad = (maxLng - minLng) * 0.1;
    
    return [
      [minLat - latPad, minLng - lngPad],
      [maxLat + latPad, maxLng + lngPad],
    ] as [[number, number], [number, number]];
  }, [geoJSON]);

  const fieldsWithBoundaries = fields.filter((f) => f.boundary?.geometry);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-white">My Fields</h1>
          </div>
          <div className="text-sm text-slate-400">
            {loading ? "Loading..." : `${fieldsWithBoundaries.length} fields with boundaries`}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Sidebar - Field List */}
        <aside className="w-80 bg-slate-800/50 border-r border-slate-700 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-700/50 rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 space-y-3">
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400 text-sm mb-3">{error}</p>
                <div className="space-y-2">
                  <button
                    onClick={handleRefreshToken}
                    disabled={refreshing}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
                  >
                    {refreshing ? "Refreshing..." : "Refresh Token & Retry"}
                  </button>
                  <Link 
                    href="/" 
                    className="block w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium text-center transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          ) : fields.length === 0 ? (
            <div className="p-4 text-slate-500 text-center">
              No fields found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={`p-3 rounded-lg transition-colors ${
                    field.boundary?.geometry
                      ? "bg-slate-700/50 hover:bg-slate-700"
                      : "bg-slate-800/30 opacity-60"
                  }`}
                >
                  <div className="font-medium text-white text-sm">{field.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">
                      {field.organizationName}
                    </span>
                    {field.area?.value != null && (
                      <span className="text-xs text-green-400">
                        {field.area.value.toFixed(1)} {field.area.unit}
                      </span>
                    )}
                  </div>
                  {!field.boundary?.geometry && (
                    <span className="text-xs text-amber-500">No boundary</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          {!loading && !error && geoJSON.features.length > 0 ? (
            <Map
              key="fields-map"
              bounds={mapBounds}
              height="100%"
              initialGeoJSON={geoJSON}
              showLayerControl={true}
              showZoomControl={true}
              eventHandlers={{
                onReady: (map) => {
                  console.log("Map ready, displaying", geoJSON.features.length, "fields");
                },
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              {loading ? (
                <MapSkeleton />
              ) : error ? (
                <div className="text-slate-500">Connect to view fields on map</div>
              ) : (
                <div className="text-slate-500">No fields with boundaries to display</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper to extract all coordinates from a GeoJSON geometry
function extractCoordinates(geometry: GeoJSONGeometry): [number, number][] {
  const coords: [number, number][] = [];
  
  function extract(arr: unknown) {
    if (!Array.isArray(arr)) return;
    if (arr.length >= 2 && typeof arr[0] === "number" && typeof arr[1] === "number") {
      coords.push([arr[0], arr[1]]);
    } else {
      arr.forEach(extract);
    }
  }
  
  if ("coordinates" in geometry) {
    extract(geometry.coordinates);
  }
  
  return coords;
}

