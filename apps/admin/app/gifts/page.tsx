"use client";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
  StatusPill,
  useApiData,
} from "@/components/data-view";
import { formatNumber } from "@/lib/api";

type Gift = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_minor: number;
  tier: string;
  state: string;
  sold_count: number;
  supply_cap?: number | null;
  version_number: number;
};

type CatalogPage = { items: Gift[]; next_cursor?: string | null };

export default function GiftsPage() {
  const { data, error, loading, reload } = useApiData<CatalogPage>(
    "/v1/gifts/catalog?limit=100",
  );

  return (
    <>
      <PageIntro>
        Published gifts currently visible and eligible to the signed-in admin account. Prices are
        shown in the API&apos;s minor units.
      </PageIntro>

      {loading ? (
        <LoadingState label="Loading gift catalog…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} unavailableLabel="Gift catalog unavailable" />
      ) : !data?.items.length ? (
        <EmptyState title="No catalog gifts returned">
          The API returned no published gifts eligible for this account.
        </EmptyState>
      ) : (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Published catalog</h2>
              <p>GET /v1/gifts/catalog · {data.items.length} shown</p>
            </div>
            <button className="secondaryButton" type="button" onClick={reload}>
              Refresh
            </button>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Gift</th>
                  <th>Tier</th>
                  <th>Price</th>
                  <th>Sold</th>
                  <th>Version</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((gift) => (
                  <tr key={gift.id}>
                    <td>
                      <div className="primaryText">{gift.name}</div>
                      <div className="muted">{gift.slug}</div>
                    </td>
                    <td>{gift.tier}</td>
                    <td>{formatNumber(gift.price_minor)} minor</td>
                    <td>
                      {formatNumber(gift.sold_count)}
                      {gift.supply_cap ? ` / ${formatNumber(gift.supply_cap)}` : ""}
                    </td>
                    <td>v{gift.version_number}</td>
                    <td>
                      <StatusPill value={gift.state} />
                    </td>
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
