"use client";

import { useState } from "react";

import { useAuth } from "@/components/app-provider";
import { PageIntro, StatusPill } from "@/components/data-view";
import { API_BASE_URL } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function signOut() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <>
      <PageIntro>
        Runtime connection information for this browser session. The API base URL is set at build
        time and cannot be changed from the console.
      </PageIntro>

      <div className="splitGrid">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>API connection</h2>
              <p>Public client configuration</p>
            </div>
            <StatusPill value="active" />
          </div>
          <dl className="detailList">
            <div className="detailRow">
              <dt>Base URL</dt>
              <dd>{API_BASE_URL}</dd>
            </div>
            <div className="detailRow">
              <dt>Environment variable</dt>
              <dd className="codeText">NEXT_PUBLIC_SYLORA_API_BASE_URL</dd>
            </div>
            <div className="detailRow">
              <dt>Authentication</dt>
              <dd>Bearer access token · sessionStorage + memory</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Current session</h2>
              <p>GET /v1/auth/me</p>
            </div>
          </div>
          <dl className="detailList">
            <div className="detailRow">
              <dt>Email</dt>
              <dd>{user?.email || "Unavailable"}</dd>
            </div>
            <div className="detailRow">
              <dt>Roles</dt>
              <dd>{user?.roles?.join(", ") || "No roles returned"}</dd>
            </div>
            <div className="detailRow">
              <dt>Account status</dt>
              <dd>{user?.status || "Unknown"}</dd>
            </div>
            <div className="detailRow">
              <dt>Session</dt>
              <dd>
                <button
                  className="secondaryButton"
                  type="button"
                  onClick={() => void signOut()}
                  disabled={loggingOut}
                >
                  {loggingOut ? "Signing out…" : "Log out of SYLORA Admin"}
                </button>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
