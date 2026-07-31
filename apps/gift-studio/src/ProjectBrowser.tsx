import { useState } from "react";
import type { GiftDefinition, GiftLifecycle, GiftVersion } from "./types";

interface ProjectBrowserProps {
  definitions: GiftDefinition[];
  versions: GiftVersion[];
  definitionId: string | undefined;
  versionId: string | undefined;
  busy: boolean;
  onRefresh: (state: GiftLifecycle | undefined, limit: number) => Promise<void>;
  onDefinition: (definitionId: string) => Promise<void>;
  onVersion: (versionId: string) => Promise<void>;
}

export function ProjectBrowser(props: ProjectBrowserProps) {
  const [filter, setFilter] = useState<GiftLifecycle | "">("");
  const [limit, setLimit] = useState(100);

  return (
    <section className="project-browser" aria-labelledby="projects-heading">
      <div className="project-browser-title">
        <span className="eyebrow">Real authoring projects</span>
        <strong id="projects-heading">{props.definitions.length} definitions</strong>
      </div>
      <label>Lifecycle
        <select value={filter} onChange={(event) => setFilter(event.target.value as GiftLifecycle | "")}>
          <option value="">All states</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="retired">Retired</option>
        </select>
      </label>
      <label>Limit
        <input type="number" min="1" max="200" value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
      </label>
      <button type="button" disabled={props.busy} onClick={() => void props.onRefresh(filter || undefined, limit)}>
        Refresh
      </button>
      <label className="project-select">Definition
        <select
          value={props.definitionId ?? ""}
          disabled={props.busy}
          onChange={(event) => {
            if (event.target.value) void props.onDefinition(event.target.value);
          }}
        >
          <option value="">Select an authored definition</option>
          {props.definitions.map((definition) => (
            <option value={definition.id} key={definition.id}>
              {definition.name} · {definition.state} · {definition.slug}
            </option>
          ))}
        </select>
      </label>
      <label className="version-select">Version
        <select
          value={props.versionId ?? ""}
          disabled={!props.definitionId || props.busy}
          onChange={(event) => {
            if (event.target.value) void props.onVersion(event.target.value);
          }}
        >
          <option value="">Select a version</option>
          {props.versions.map((version) => (
            <option value={version.id} key={version.id}>
              v{version.version_number} · {version.state} · {version.runtime_manifest ? "manifest" : "empty draft"}
            </option>
          ))}
        </select>
      </label>
      {props.busy && <span className="project-loading" role="status">Loading authoring data…</span>}
    </section>
  );
}
