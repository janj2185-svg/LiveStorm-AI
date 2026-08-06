"use client";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
  StatusPill,
  useApiData,
} from "@/components/data-view";
import { formatDate } from "@/lib/api";

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  evidence?: string | null;
  status: string;
  created_at: string;
};

type ReportPage = { items: Report[]; next_cursor?: string | null };

export default function ModerationPage() {
  const { data, error, loading, reload } = useApiData<ReportPage>(
    "/v1/social/moderation/reports?limit=100",
  );

  return (
    <>
      <PageIntro>
        Open and in-review content reports from the real trust and safety queue. No local or
        generated reports are shown.
      </PageIntro>

      {loading ? (
        <LoadingState label="Loading moderation reports…" />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={reload}
          unavailableLabel="Moderation endpoint unavailable"
        />
      ) : !data?.items.length ? (
        <EmptyState title="The queue is clear">
          The moderation API returned no open or reviewing reports.
        </EmptyState>
      ) : (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Active reports</h2>
              <p>GET /v1/social/moderation/reports · {data.items.length} shown</p>
            </div>
            <button className="secondaryButton" type="button" onClick={reload}>
              Refresh
            </button>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Target</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((report) => (
                  <tr key={report.id}>
                    <td className="codeText">{report.id}</td>
                    <td>
                      <div className="primaryText">{report.target_type}</div>
                      <div className="codeText">{report.target_id}</div>
                    </td>
                    <td>{report.reason}</td>
                    <td>
                      <StatusPill value={report.status} />
                    </td>
                    <td>{formatDate(report.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
