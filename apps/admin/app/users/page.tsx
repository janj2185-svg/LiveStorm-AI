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

type AdminUser = {
  id: string;
  email: string;
  status: string;
  roles?: string[];
  created_at: string;
  profile?: { display_name?: string; handle?: string } | null;
};

type UserPage = { items: AdminUser[]; next_cursor?: string | null };

export default function UsersPage() {
  const { data, error, loading, reload } = useApiData<UserPage>("/v1/admin/users?limit=100");

  return (
    <>
      <PageIntro>
        Accounts returned by the protected admin user directory. Visibility follows the signed-in
        administrator&apos;s API permissions.
      </PageIntro>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} unavailableLabel="User directory unavailable" />
      ) : !data?.items.length ? (
        <EmptyState title="No users returned">
          The admin API returned an empty user collection.
        </EmptyState>
      ) : (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Accounts</h2>
              <p>GET /v1/admin/users · {data.items.length} shown</p>
            </div>
            <button className="secondaryButton" type="button" onClick={reload}>
              Refresh
            </button>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="primaryText">{user.profile?.display_name || user.email}</div>
                      <div className="muted">
                        {user.profile?.display_name ? user.email : user.profile?.handle || user.id}
                      </div>
                    </td>
                    <td>
                      <StatusPill value={user.status} />
                    </td>
                    <td>{user.roles?.length ? user.roles.join(", ") : "No roles"}</td>
                    <td>{formatDate(user.created_at)}</td>
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
