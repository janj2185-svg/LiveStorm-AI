"use client";

import { useCallback, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { GlassCard } from "@/components/GlassCard";
import { Select, TextInput } from "@/components/Field";
import { ReasonModal } from "@/components/ReasonModal";
import { StatusPill } from "@/components/StatusPill";
import { Table, tableStyles } from "@/components/Table";
import { adminApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/format";
import { useAuthedQuery } from "@/lib/use-authed-query";
import type { AdminUser, UserStatus } from "@/lib/types";

import styles from "./users.module.css";

type StatusFilter = UserStatus | "";

export default function UsersPage() {
  const { callWithAuth } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [pendingAction, setPendingAction] = useState<
    { user: AdminUser; action: "suspend" | "restore" } | null
  >(null);

  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  const { data, loading, error, reload } = useAuthedQuery(
    useCallback(
      (token) => adminApi.users(token, { q: query || undefined, status, cursor }),
      [query, status, cursor],
    ),
  );

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setCursorStack([null]);
    reload();
  };

  const handleNextPage = () => {
    if (data?.next_cursor) {
      setCursorStack((stack) => [...stack, data.next_cursor]);
    }
  };

  const handlePrevPage = () => {
    setCursorStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  };

  const runAction = async (user: AdminUser, action: "suspend" | "restore", reason: string) => {
    await callWithAuth((token) =>
      action === "suspend"
        ? adminApi.suspendUser(token, user.id, reason)
        : adminApi.restoreUser(token, user.id, reason),
    );
    reload();
  };

  return (
    <AppShell title="Users" description="Search accounts and manage suspensions.">
      <form className={styles.toolbar} onSubmit={handleSearch}>
        <div className={styles.searchInput}>
          <TextInput
            placeholder="Search by email, handle, or display name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className={styles.statusSelect}>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setCursorStack([null]);
            }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </Select>
        </div>
        <Button type="submit" variant="gold">
          Search
        </Button>
      </form>

      <GlassCard padding="none">
        {loading ? (
          <LoadingState label="Loading users…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No users found"
            detail="Try a different search term or status filter."
          />
        ) : (
          <div style={{ padding: "0.5rem 0" }}>
            <Table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.emailCell}>
                        <span>{user.email}</span>
                        {user.profile?.handle ? (
                          <span className={styles.handle}>@{user.profile.handle}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <StatusPill label={user.status} />
                    </td>
                    <td>
                      <div className={styles.roleTags}>
                        {user.roles.length ? (
                          user.roles.map((role) => (
                            <span key={role} className={styles.roleTag}>
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className={tableStyles.muted}>none</span>
                        )}
                      </div>
                    </td>
                    <td className={tableStyles.mono}>{formatDateTime(user.created_at)}</td>
                    <td>
                      <div className={tableStyles.actionsCell}>
                        {user.status === "suspended" ? (
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => setPendingAction({ user, action: "restore" })}
                          >
                            Restore
                          </Button>
                        ) : user.status === "active" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setPendingAction({ user, action: "suspend" })}
                          >
                            Suspend
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </GlassCard>

      <div className={styles.pagination}>
        <Button variant="ghost" size="sm" onClick={handlePrevPage} disabled={cursorStack.length <= 1}>
          ← Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNextPage} disabled={!data?.next_cursor}>
          Next →
        </Button>
      </div>

      {pendingAction ? (
        <ReasonModal
          title={pendingAction.action === "suspend" ? "Suspend account" : "Restore account"}
          description={`This action affects ${pendingAction.user.email} and is recorded in the audit log.`}
          confirmLabel={pendingAction.action === "suspend" ? "Suspend" : "Restore"}
          confirmVariant={pendingAction.action === "suspend" ? "danger" : "gold"}
          minLength={5}
          maxLength={1000}
          onSubmit={(reason) => runAction(pendingAction.user, pendingAction.action, reason)}
          onClose={() => setPendingAction(null)}
        />
      ) : null}
    </AppShell>
  );
}
