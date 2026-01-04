"use client";

import { useState } from "react";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "error" | "request" | "response";
  source: "client" | "server";
  message: string;
  details?: unknown;
}

interface LogViewerProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogViewer({ logs, onClear }: LogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<LogEntry["type"] | "all">("all");

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.type === filter);

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "text-blue-400";
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "request":
        return "text-amber-400";
      case "response":
        return "text-purple-400";
      default:
        return "text-slate-400";
    }
  };

  const getTypeBadge = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "bg-blue-500/20 text-blue-400";
      case "success":
        return "bg-green-500/20 text-green-400";
      case "error":
        return "bg-red-500/20 text-red-400";
      case "request":
        return "bg-amber-500/20 text-amber-400";
      case "response":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span className="font-semibold">Console</span>
            <span className="text-slate-500">({logs.length})</span>
          </button>

          {isExpanded && (
            <div className="flex items-center gap-1">
              {(["all", "info", "request", "response", "success", "error"] as const).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-colors ${
                      filter === type
                        ? "bg-slate-700 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {type}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <button
            onClick={onClear}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Log Content */}
      {isExpanded && (
        <div className="h-48 overflow-y-auto p-2 space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-8">
              No logs to display
            </div>
          ) : (
            filteredLogs.map((log) => (
              <LogLine key={log.id} log={log} getTypeColor={getTypeColor} getTypeBadge={getTypeBadge} formatTime={formatTime} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function LogLine({
  log,
  getTypeColor,
  getTypeBadge,
  formatTime,
}: {
  log: LogEntry;
  getTypeColor: (type: LogEntry["type"]) => string;
  getTypeBadge: (type: LogEntry["type"]) => string;
  formatTime: (date: Date) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group">
      <div
        className={`flex items-start gap-2 px-2 py-1 rounded hover:bg-slate-800/50 ${
          log.details !== undefined && log.details !== null ? "cursor-pointer" : ""
        }`}
        onClick={() => (log.details !== undefined && log.details !== null) && setExpanded(!expanded)}
      >
        <span className="text-slate-600 flex-shrink-0">
          {formatTime(log.timestamp)}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider flex-shrink-0 ${getTypeBadge(log.type)}`}
        >
          {log.type}
        </span>
        <span className="text-slate-500 flex-shrink-0">[{log.source}]</span>
        <span className={`${getTypeColor(log.type)} break-all`}>
          {log.message}
        </span>
        {log.details !== undefined && log.details !== null && (
          <svg
            className={`w-3 h-3 text-slate-600 flex-shrink-0 ml-auto transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </div>
      {expanded && log.details !== undefined && log.details !== null && (
        <pre className="ml-24 px-2 py-2 bg-slate-800/80 rounded text-slate-400 overflow-x-auto text-[11px] mt-1 mb-2">
          {typeof log.details === "string"
            ? log.details
            : JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

