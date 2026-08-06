"use client";

import Link from "next/link";

import {
  ErrorState,
  LoadingState,
  PageIntro,
  StatusPill,
  useApiData,
} from "@/components/data-view";
import { API_BASE_URL } from "@/lib/api";

type HealthResponse = { status: string };

const quickLinks = [
  { href: "/users", label: "Users", detail: "Accounts, roles and status", mark: "◇" },
  { href: "/moderation", label: "Moderation", detail: "Open trust and safety reports", mark: "△" },
  { href: "/ai", label: "AI systems", detail: "Providers and real usage records", mark: "⌁" },
  { href: "/live", label: "Live", detail: "Sessions and platform health", mark: "◎" },
];

export default function DashboardPage() {
  const { data, error, loading, reload } = useApiData<HealthResponse>("/health/ready");

  return (
    <>
      <PageIntro>
        A live operational entry point for SYLORA. Health shown here comes directly from the
        configured FastAPI deployment.
      </PageIntro>

      <div className="splitGrid">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>API readiness</h2>
              <p>GET /health/ready</p>
            </div>
            {data ? <StatusPill value={data.status} /> : null}
          </div>
          {loading ? (
            <LoadingState label="Probing API health…" />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} unavailableLabel="API health unavailable" />
          ) : (
            <dl className="detailList">
              <div className="detailRow">
                <dt>Deployment</dt>
                <dd>{API_BASE_URL}</dd>
              </div>
              <div className="detailRow">
                <dt>Readiness</dt>
                <dd>{data?.status || "No status returned"}</dd>
              </div>
              <div className="detailRow">
                <dt>Source</dt>
                <dd>Database and Redis readiness probe</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="quickGrid" aria-label="Quick links">
          {quickLinks.map((item) => (
            <Link key={item.href} className="quickLink" href={item.href}>
              <span aria-hidden="true">{item.mark}</span>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
