"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LogViewer } from "./components/LogViewer";
import { useLogger } from "./hooks/useLogger";

interface AuthState {
  connected: boolean;
  refreshToken?: string;
  organizations?: Array<{
    id: string;
    name: string;
    needsConnection: boolean;
  }>;
  connectionsUrl?: string | null;
  error?: string;
}

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>({ connected: false });
  const [loading, setLoading] = useState(false);
  const logger = useLogger();

  // Helper to get cookie value
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  // Check for callback results on mount
  useEffect(() => {
    logger.info("App initialized, checking for callback params...");
    
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const connectionsUrl = params.get("connectionsUrl");
    const orgs = params.get("organizations");
    const orgConnected = params.get("orgConnected");

    if (orgConnected === "true") {
      // User returning from org connection - orgs should now be available
      logger.success("Organization connection completed! You can now access your fields.");
      const tokenPreview = getCookie("jd_token_preview");
      setAuthState({
        connected: true,
        refreshToken: tokenPreview || "Token stored (httpOnly)",
        organizations: [],
        connectionsUrl: null, // Clear the connections URL
      });
      window.history.replaceState({}, "", "/");
    } else if (success === "true") {
      logger.success("OAuth callback successful!");
      const tokenPreview = getCookie("jd_token_preview");
      
      const parsedOrgs = orgs ? JSON.parse(orgs) : [];
      if (parsedOrgs.length > 0) {
        logger.info(`Found ${parsedOrgs.length} organization(s)`, parsedOrgs);
      }
      
      if (connectionsUrl) {
        logger.info("Organization connections required", { connectionsUrl });
      }
      
      setAuthState({
        connected: true,
        refreshToken: tokenPreview || "Token stored (httpOnly)",
        organizations: parsedOrgs,
        connectionsUrl: connectionsUrl || null,
      });
      // Clean up URL
      window.history.replaceState({}, "", "/");
    } else if (error) {
      logger.error(`OAuth callback error: ${error}`);
      setAuthState({ connected: false, error });
      window.history.replaceState({}, "", "/");
    } else {
      // Check if we have a token cookie
      const tokenPreview = getCookie("jd_token_preview");
      if (tokenPreview) {
        logger.info("Found existing token, restoring session");
        setAuthState({ connected: true, refreshToken: tokenPreview });
      } else {
        logger.info("No existing session found");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    logger.info("Initiating OAuth flow...");
    
    try {
      logger.request("GET", "/api/auth/connect");
      const response = await fetch("/api/auth/connect");
      const data = await response.json();
      
      logger.response(response.status, "/api/auth/connect", { url: data.url ? "received" : "missing", state: data.state });

      // Display server-side logs
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((serverLog: { type: "info" | "success" | "error"; message: string; details?: unknown }) => {
          logger.serverLog(serverLog.type, serverLog.message, serverLog.details);
        });
      }

      if (data.url) {
        logger.info("Received authorization URL, redirecting to John Deere...");
        logger.info(`State param: ${data.state.substring(0, 16)}...`);
        // Save state for verification
        localStorage.setItem("jd_oauth_state", data.state);
        // Redirect to John Deere
        window.location.href = data.url;
      } else {
        logger.error("Failed to get authorization URL from server");
        setAuthState({ connected: false, error: data.error || "Failed to get auth URL" });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Connection failed: ${errorMsg}`, err);
      setAuthState({
        connected: false,
        error: errorMsg,
      });
    }
    setLoading(false);
  };

  const handleDisconnect = () => {
    logger.info("Disconnecting from John Deere...");
    // Clear cookies
    document.cookie = "jd_refresh_token=; Max-Age=0; path=/";
    document.cookie = "jd_token_preview=; Max-Age=0; path=/";
    logger.success("Session cleared, cookies removed");
    setAuthState({ connected: false });
  };

  const handleOrgConnect = () => {
    if (authState.connectionsUrl) {
      logger.info("Redirecting to John Deere org connections page...", {
        url: authState.connectionsUrl,
      });
      window.location.href = authState.connectionsUrl;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 pb-64">
      <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 max-w-md w-full border border-slate-700">
        {/* Logo */}
        <div className="flex justify-center mb-6">
        <Image
            src="/acreblitz_favicon.png"
            alt="AcreBlitz"
            width={80}
            height={80}
            className="rounded-xl"
          />
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          JD OAuth Test
          </h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          Test John Deere Operations Center integration
        </p>

        {/* Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <span className="text-slate-300">Status</span>
            <span
              className={`px-2 py-1 rounded text-sm font-medium ${
                authState.connected
                  ? "bg-green-500/20 text-green-400"
                  : "bg-slate-600/50 text-slate-400"
              }`}
            >
              {authState.connected ? "Connected" : "Not Connected"}
            </span>
          </div>
        </div>

        {/* Error */}
        {authState.error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{authState.error}</p>
          </div>
        )}

        {/* Organizations needing connection */}
        {authState.connectionsUrl && (
          <div className="mb-6 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
            <p className="text-amber-400 text-sm mb-3">
              Organization access required. Click below to select which
              organizations to share.
            </p>
            <button
              onClick={handleOrgConnect}
              className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Complete Org Connection
            </button>
          </div>
        )}

        {/* Organizations List */}
        {authState.organizations && authState.organizations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-slate-300 text-sm font-medium mb-2">
              Organizations
            </h3>
            <div className="space-y-2">
              {authState.organizations.map((org) => (
                <div
                  key={org.id}
                  className="p-2 bg-slate-900/50 rounded-lg flex justify-between items-center"
                >
                  <span className="text-white text-sm">{org.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      org.needsConnection
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {org.needsConnection ? "Needs Setup" : "Ready"}
                  </span>
                </div>
              ))}
            </div>
        </div>
        )}

        {/* Action Buttons */}
        {authState.connected ? (
          <div className="space-y-3">
            <Link
              href="/fields"
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium block text-center"
            >
              View Fields on Map
            </Link>
            <Link
              href="/work-plans"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium block text-center"
            >
              View Work Plans
            </Link>
            <button
              onClick={handleDisconnect}
              className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            {loading ? "Loading..." : "Connect to John Deere"}
          </button>
        )}

        {/* Debug Info */}
        {authState.refreshToken && (
          <div className="mt-6 p-3 bg-slate-900/50 rounded-lg">
            <p className="text-slate-400 text-xs font-mono break-all">
              Token: {authState.refreshToken.substring(0, 20)}...
            </p>
          </div>
        )}
        </div>

      <p className="text-slate-500 text-xs mt-6">
        @acreblitz/platform-integrations test app
      </p>

      {/* Log Viewer */}
      <LogViewer logs={logger.logs} onClear={logger.clear} />
    </div>
  );
}
