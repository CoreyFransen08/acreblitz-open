"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";

interface Organization {
  id: string;
  name: string;
}

interface ConnectionStatus {
  connected: boolean;
  organizations: Organization[];
  expiresAt?: string;
  lastUsedAt?: string;
}

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();

    // Check URL params for connection result
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      // Remove the param from URL
      window.history.replaceState({}, "", window.location.pathname);
      checkConnection();
    }
    if (params.get("error")) {
      const error = params.get("error");
      const errorDesc = params.get("error_description");
      console.error("Connection error:", error, errorDesc);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to check connection:", error);
      setStatus({ connected: false, organizations: [] });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/auth/connect");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to initiate connection:", error);
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/auth/disconnect", { method: "POST" });
      setStatus({ connected: false, organizations: [] });
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        Checking connection...
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium">
            {status.organizations.length > 0
              ? status.organizations.map((o) => o.name).join(", ")
              : "Connected"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isConnecting} size="sm">
      {isConnecting ? "Connecting..." : "Connect John Deere"}
    </Button>
  );
}
