"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { UnifiedWorkPlan } from "@acreblitz/platform-integrations";

interface WorkPlansResponse {
  workPlans: (UnifiedWorkPlan & { organizationName?: string })[];
  totalCount: number;
  organizations: Array<{ id: string; name: string }>;
  error?: string;
}

type PayloadModalType = "list" | "detail" | null;

const WORK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-blue-500/20 text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
};

const WORK_TYPE_LABELS: Record<string, string> = {
  tillage: "Tillage",
  seeding: "Seeding",
  application: "Application",
  harvest: "Harvest",
};

export default function WorkPlansPage() {
  const [workPlans, setWorkPlans] = useState<
    (UnifiedWorkPlan & { organizationName?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [rawListResponse, setRawListResponse] = useState<WorkPlansResponse | null>(null);
  const [payloadModal, setPayloadModal] = useState<PayloadModalType>(null);

  const fetchWorkPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set("year", filterYear.toString());
      if (filterStatus !== "all") params.set("workStatus", filterStatus);

      const url = `/api/work-plans${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      const data: WorkPlansResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch work plans");
      }

      setRawListResponse(data);
      setWorkPlans(data.workPlans);
      // Select first work plan if none selected
      if (data.workPlans.length > 0 && !selectedId) {
        setSelectedId(data.workPlans[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterStatus, selectedId]);

  useEffect(() => {
    fetchWorkPlans();
  }, [fetchWorkPlans]);

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh token");
      }

      await fetchWorkPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const selectedWorkPlan = useMemo(
    () => workPlans.find((wp) => wp.id === selectedId),
    [workPlans, selectedId]
  );

  // Get unique years for filter
  const availableYears = useMemo(() => {
    const years = new Set(workPlans.map((wp) => wp.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [workPlans]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-white">Work Plans</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Filters */}
            <select
              value={filterYear || ""}
              onChange={(e) =>
                setFilterYear(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600"
            >
              <option value="">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600"
            >
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <div className="text-sm text-slate-400">
              {loading ? "Loading..." : `${workPlans.length} work plans`}
            </div>
            {rawListResponse && (
              <button
                onClick={() => setPayloadModal("list")}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
              >
                View List Payload
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Sidebar - Work Plan List */}
        <aside className="w-80 bg-slate-800/50 border-r border-slate-700 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-700/50 rounded animate-pulse"
                />
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
          ) : workPlans.length === 0 ? (
            <div className="p-4 text-slate-500 text-center">
              No work plans found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {workPlans.map((wp) => {
                const statusInfo = WORK_STATUS_LABELS[wp.workStatus] || {
                  label: wp.workStatus,
                  color: "bg-slate-500/20 text-slate-400",
                };
                const isSelected = selectedId === wp.id;

                return (
                  <button
                    key={wp.id}
                    onClick={() => setSelectedId(wp.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-green-600/30 border border-green-500/50"
                        : "bg-slate-700/50 hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white text-sm truncate">
                          {WORK_TYPE_LABELS[wp.workType] || wp.workType}
                          {wp.workOrder && ` - ${wp.workOrder}`}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {wp.organizationName}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{wp.year}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      {wp.operations.length > 0 && (
                        <span className="text-xs text-slate-500">
                          {wp.operations.length} operation
                          {wp.operations.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto bg-slate-900/50">
          {selectedWorkPlan ? (
            <WorkPlanDetail
              workPlan={selectedWorkPlan}
              onViewPayload={() => setPayloadModal("detail")}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              {loading
                ? "Loading work plans..."
                : error
                  ? "Error loading work plans"
                  : "Select a work plan to view details"}
            </div>
          )}
        </div>
      </main>

      {/* Payload Modal */}
      {payloadModal && (
        <PayloadModal
          type={payloadModal}
          listPayload={rawListResponse}
          detailPayload={selectedWorkPlan}
          onClose={() => setPayloadModal(null)}
        />
      )}
    </div>
  );
}

interface WorkPlanDetailProps {
  workPlan: UnifiedWorkPlan & { organizationName?: string };
  onViewPayload: () => void;
}

function WorkPlanDetail({ workPlan, onViewPayload }: WorkPlanDetailProps) {
  const statusInfo = WORK_STATUS_LABELS[workPlan.workStatus] || {
    label: workPlan.workStatus,
    color: "bg-slate-500/20 text-slate-400",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-700 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {WORK_TYPE_LABELS[workPlan.workType] || workPlan.workType}
              {workPlan.workOrder && (
                <span className="text-slate-400 font-normal">
                  {" "}
                  - {workPlan.workOrder}
                </span>
              )}
            </h2>
            <p className="text-slate-400 mt-1">
              {workPlan.organizationName} • {workPlan.year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onViewPayload}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
            >
              View Payload
            </button>
            <span className={`px-3 py-1 rounded-lg text-sm ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {workPlan.instructions && (
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-slate-300 text-sm">{workPlan.instructions}</p>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Work Plan ID" value={workPlan.id} />
        {workPlan.fieldId && (
          <InfoCard label="Field ID" value={workPlan.fieldId} />
        )}
        {workPlan.sequenceNumber !== undefined && (
          <InfoCard
            label="Sequence Number"
            value={workPlan.sequenceNumber.toString()}
          />
        )}
      </div>

      {/* Operations */}
      {workPlan.operations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Operations</h3>
          <div className="space-y-3">
            {workPlan.operations.map((op, index) => (
              <div
                key={index}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
              >
                <div className="font-medium text-white mb-2">
                  {WORK_TYPE_LABELS[op.operationType] || op.operationType}
                </div>

                {op.inputs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">
                      Inputs
                    </div>
                    {op.inputs.map((input, inputIndex) => (
                      <div
                        key={inputIndex}
                        className="bg-slate-900/50 rounded p-3 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {input.product.inputType}
                          </span>
                          {input.product.varietySelectionMode !== "none" && (
                            <span className="text-xs text-slate-500">
                              Variety: {input.product.varietySelectionMode}
                            </span>
                          )}
                        </div>

                        {input.prescription && (
                          <div className="mt-2 text-slate-400">
                            {input.prescription.type === "fixed_rate" &&
                              input.prescription.fixedRate && (
                                <span>
                                  Fixed Rate: {input.prescription.fixedRate.value}{" "}
                                  {input.prescription.fixedRate.unit}
                                </span>
                              )}
                            {input.prescription.type === "variable_rate" && (
                              <span>Variable Rate Prescription</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments */}
      {workPlan.assignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Assignments</h3>
          <div className="space-y-2">
            {workPlan.assignments.map((assignment, index) => (
              <div
                key={index}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {assignment.machineId && (
                    <div>
                      <span className="text-slate-400">Machine: </span>
                      <span className="text-white">{assignment.machineId}</span>
                    </div>
                  )}
                  {assignment.operatorId && (
                    <div>
                      <span className="text-slate-400">Operator: </span>
                      <span className="text-white">{assignment.operatorId}</span>
                    </div>
                  )}
                </div>
                {assignment.implementIds && assignment.implementIds.length > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="text-slate-400">Implements: </span>
                    <span className="text-white">
                      {assignment.implementIds.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guidance Settings */}
      {workPlan.guidanceSettings && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Guidance Settings
          </h3>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            {workPlan.guidanceSettings.preferences && (
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-slate-400">Preference Mode: </span>
                  <span className="text-white">
                    {workPlan.guidanceSettings.preferences.preferenceMode}
                  </span>
                </div>
                {workPlan.guidanceSettings.preferences
                  .includeLatestFieldOperation !== undefined && (
                  <div>
                    <span className="text-slate-400">
                      Include Latest Field Operation:{" "}
                    </span>
                    <span className="text-white">
                      {workPlan.guidanceSettings.preferences
                        .includeLatestFieldOperation
                        ? "Yes"
                        : "No"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {workPlan.guidanceSettings.includedGuidance &&
              workPlan.guidanceSettings.includedGuidance.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                    Included Guidance
                  </div>
                  <div className="space-y-1">
                    {workPlan.guidanceSettings.includedGuidance.map(
                      (guidance, index) => (
                        <div
                          key={index}
                          className="text-sm flex items-center gap-2"
                        >
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {guidance.entityType}
                          </span>
                          {guidance.entityId && (
                            <span className="text-slate-400 text-xs truncate">
                              {guidance.entityId}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Metadata (collapsed by default) */}
      {workPlan.metadata && (
        <details className="group">
          <summary className="cursor-pointer text-slate-400 hover:text-white transition-colors text-sm">
            Show Metadata
          </summary>
          <pre className="mt-2 p-4 bg-slate-800/50 rounded-lg text-xs text-slate-400 overflow-x-auto">
            {JSON.stringify(workPlan.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
      <div className="text-xs text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-white text-sm mt-1 font-mono truncate">{value}</div>
    </div>
  );
}

interface PayloadModalProps {
  type: "list" | "detail";
  listPayload: WorkPlansResponse | null;
  detailPayload: (UnifiedWorkPlan & { organizationName?: string }) | undefined;
  onClose: () => void;
}

function PayloadModal({
  type,
  listPayload,
  detailPayload,
  onClose,
}: PayloadModalProps) {
  const payload = type === "list" ? listPayload : detailPayload;
  const title = type === "list" ? "List Work Plans Response" : "Work Plan Detail";

  const handleCopy = () => {
    if (payload) {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Copy JSON
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
            {payload ? JSON.stringify(payload, null, 2) : "No data available"}
          </pre>
        </div>
      </div>
    </div>
  );
}
