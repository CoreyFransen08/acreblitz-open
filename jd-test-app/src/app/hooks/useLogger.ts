"use client";

import { useState, useCallback } from "react";
import { LogEntry } from "../components/LogViewer";

export function useLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (
      type: LogEntry["type"],
      source: LogEntry["source"],
      message: string,
      details?: unknown
    ) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type,
        source,
        message,
        details,
      };
      setLogs((prev) => [...prev, entry]);
      return entry;
    },
    []
  );

  const info = useCallback(
    (message: string, details?: unknown) => addLog("info", "client", message, details),
    [addLog]
  );

  const success = useCallback(
    (message: string, details?: unknown) => addLog("success", "client", message, details),
    [addLog]
  );

  const error = useCallback(
    (message: string, details?: unknown) => addLog("error", "client", message, details),
    [addLog]
  );

  const request = useCallback(
    (method: string, url: string, details?: unknown) =>
      addLog("request", "client", `${method} ${url}`, details),
    [addLog]
  );

  const response = useCallback(
    (status: number, url: string, details?: unknown) =>
      addLog("response", "server", `${status} ${url}`, details),
    [addLog]
  );

  const serverLog = useCallback(
    (type: LogEntry["type"], message: string, details?: unknown) =>
      addLog(type, "server", message, details),
    [addLog]
  );

  const clear = useCallback(() => setLogs([]), []);

  return {
    logs,
    info,
    success,
    error,
    request,
    response,
    serverLog,
    clear,
  };
}

