import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { RuntimeManifest } from "@sylora/gift-runtime";
import { ApiProblem, GiftApiClient, MemoryToken } from "./api";
import type { LauncherSession } from "./auth";
import { AuthEntry } from "./AuthEntry";
import { DefinitionForm } from "./DefinitionForm";
import { EditorPanels } from "./EditorPanels";
import { editorReducer, initialEditorState, workflowAvailable, type WorkflowAction } from "./editor-state";
import { ProjectBrowser } from "./ProjectBrowser";
import type { Category, GiftDefinition, GiftLifecycle, GiftVersion, ValidationResult } from "./types";

const RuntimePreview = lazy(async () => {
  const module = await import("./RuntimePreview");
  return { default: module.RuntimePreview };
});

function errorMessage(cause: unknown): string {
  if (cause instanceof ApiProblem) {
    const code = cause.problem.code ? ` (${cause.problem.code})` : "";
    return `${cause.problem.title}${code}: ${cause.problem.detail}`;
  }
  return cause instanceof Error ? cause.message : "The operation failed.";
}

export default function App() {
  const token = useRef(new MemoryToken());
  const [api, setApi] = useState<GiftApiClient>();
  const [entryError, setEntryError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [definitions, setDefinitions] = useState<GiftDefinition[]>([]);
  const [versions, setVersions] = useState<GiftVersion[]>([]);
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const [validation, setValidation] = useState<ValidationResult>();
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [projectBusy, setProjectBusy] = useState(false);

  const acceptSession = useCallback((session: LauncherSession) => {
    try {
      setEntryError("");
      token.current.set(session.token);
      const client = new GiftApiClient(session.apiBase, token.current);
      setApi(client);
      dispatch({
        type: "attach_ids",
        ...(session.definitionId ? { definitionId: session.definitionId } : {}),
        ...(session.versionId ? { versionId: session.versionId } : {})
      });
      setProjectBusy(true);
      void Promise.all([client.categories(), client.definitions(undefined, 100)]).then(
        async ([loadedCategories, loadedDefinitions]) => {
          setCategories(loadedCategories);
          setDefinitions(loadedDefinitions);
          if (session.versionId) {
            const [versionResponse, assets] = await Promise.all([
              client.version(session.versionId),
              client.assets(session.versionId)
            ]);
            const definitionId = versionResponse.data.gift_definition_id;
            const [definition, loadedVersions] = await Promise.all([
              client.definition(definitionId),
              client.versions(definitionId)
            ]);
            setDefinitions((current) => current.some((item) => item.id === definition.id)
              ? current
              : [definition, ...current]);
            setVersions(loadedVersions);
            dispatch({ type: "definition_selected", definition });
            dispatch({
              type: "version_received",
              version: versionResponse.data,
              assets,
              ...(versionResponse.etag ? { etag: versionResponse.etag } : {})
            });
          } else if (session.definitionId) {
            const [definition, loadedVersions] = await Promise.all([
              client.definition(session.definitionId),
              client.versions(session.definitionId)
            ]);
            setDefinitions((current) => current.some((item) => item.id === definition.id)
              ? current
              : [definition, ...current]);
            setVersions(loadedVersions);
            dispatch({ type: "definition_selected", definition });
          }
        }
      ).catch((cause: unknown) => {
        dispatch({ type: "error", message: errorMessage(cause) });
      }).finally(() => setProjectBusy(false));
    } catch (cause) {
      token.current.clear();
      setEntryError(errorMessage(cause));
    }
  }, []);

  const save = useCallback(async () => {
    if (!api || !state.versionId || !state.manifest || state.saveState === "saving") return;
    if (state.versionState && state.versionState !== "draft") {
      dispatch({ type: "save_failed", conflict: true, message: "Only a backend draft version can be edited." });
      return;
    }
    const revision = state.revision;
    dispatch({ type: "save_started", revision });
    try {
      const response = await api.patchManifest(state.versionId, state.manifest, state.etag);
      dispatch({
        type: "save_succeeded",
        version: response.data,
        revision,
        savedAt: new Date().toISOString(),
        ...(response.etag ? { etag: response.etag } : {})
      });
    } catch (cause) {
      const conflict = cause instanceof ApiProblem && (cause.problem.status === 409 || cause.problem.status === 412);
      dispatch({ type: "save_failed", conflict, message: errorMessage(cause) });
    }
  }, [api, state.etag, state.manifest, state.revision, state.saveState, state.versionId, state.versionState]);

  useEffect(() => {
    if (state.saveState !== "dirty" || !state.versionId || !state.manifest) return;
    const timeout = window.setTimeout(() => void save(), 800);
    return () => window.clearTimeout(timeout);
  }, [save, state.manifest, state.saveState, state.versionId]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [save]);

  if (!api) return <AuthEntry onSession={acceptSession} externalError={entryError} />;

  const importManifest = (manifest: RuntimeManifest) => {
    setValidation(undefined);
    dispatch({ type: "manifest_imported", manifest });
  };

  const createVersion = async () => {
    if (!state.definitionId) return;
    setWorkflowBusy(true);
    try {
      const response = await api.createVersion(state.definitionId);
      setVersions((current) => [response.data, ...current]);
      dispatch({
        type: "version_received",
        version: response.data,
        assets: [],
        ...(response.etag ? { etag: response.etag } : {})
      });
      dispatch({ type: "select_panel", panel: "assets" });
    } catch (cause) {
      dispatch({ type: "error", message: errorMessage(cause) });
    } finally {
      setWorkflowBusy(false);
    }
  };

  const refreshDefinitions = async (filter: GiftLifecycle | undefined, limit: number) => {
    setProjectBusy(true);
    try {
      setDefinitions(await api.definitions(filter, limit));
    } catch (cause) {
      dispatch({ type: "error", message: errorMessage(cause) });
    } finally {
      setProjectBusy(false);
    }
  };

  const selectDefinition = async (definitionId: string) => {
    setProjectBusy(true);
    try {
      const [definition, loadedVersions] = await Promise.all([
        api.definition(definitionId),
        api.versions(definitionId)
      ]);
      setVersions(loadedVersions);
      dispatch({ type: "definition_selected", definition });
      setValidation(undefined);
    } catch (cause) {
      dispatch({ type: "error", message: errorMessage(cause) });
    } finally {
      setProjectBusy(false);
    }
  };

  const selectVersion = async (versionId: string) => {
    setProjectBusy(true);
    try {
      const [versionResponse, assets] = await Promise.all([
        api.version(versionId),
        api.assets(versionId)
      ]);
      dispatch({
        type: "version_received",
        version: versionResponse.data,
        assets,
        ...(versionResponse.etag ? { etag: versionResponse.etag } : {})
      });
      setValidation(undefined);
    } catch (cause) {
      dispatch({ type: "error", message: errorMessage(cause) });
    } finally {
      setProjectBusy(false);
    }
  };

  const runWorkflow = async (action: WorkflowAction) => {
    if (!state.versionId) return;
    if (action === "emergency_retire" && !window.confirm("Emergency retirement stops new deliveries and is audited. Continue?")) {
      return;
    }
    setWorkflowBusy(true);
    dispatch({ type: "clear_error" });
    try {
      if (action === "validate") {
        setValidation(await api.validate(state.versionId));
        return;
      }
      let version: GiftVersion;
      if (action === "submit") version = await api.submit(state.versionId);
      else if (action === "publish") version = await api.publish(state.versionId);
      else if (action === "retire") version = await api.retire(state.versionId);
      else version = await api.emergencyRetire(state.versionId);
      dispatch({ type: "version_received", version });
      setVersions((current) => current.map((item) => item.id === version.id ? version : item));
    } catch (cause) {
      dispatch({ type: "error", message: errorMessage(cause) });
    } finally {
      setWorkflowBusy(false);
    }
  };

  const saveText = state.saveState === "saved"
    ? `Saved to backend${state.lastSavedAt ? ` · ${new Date(state.lastSavedAt).toLocaleTimeString()}` : ""}`
    : state.saveState === "dirty"
      ? "Unsaved changes"
      : state.saveState === "saving"
        ? "Saving to backend…"
        : state.saveState === "conflict"
          ? "Save conflict"
          : state.versionId
            ? state.saveState
            : "No backend version";

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div className="studio-brand"><div className="brand-mark small">S</div><div><strong>Gift Studio</strong><span>RuntimeManifest v1.0</span></div></div>
        <div className="project-identity">
          <span>{state.definition?.name ?? "Attached authoring session"}</span>
          <small>Definition {state.definitionId ?? "not created"} · Version {state.versionId ?? "not created"}</small>
        </div>
        <div className="save-indicator" data-state={state.saveState}><i />{saveText}</div>
        <button type="button" onClick={() => void save()} disabled={!state.versionId || !state.manifest || state.saveState === "saving"}>Save now</button>
        <button className="quiet" type="button" onClick={() => {
          token.current.clear();
          setApi(undefined);
        }}>End session</button>
      </header>

      <ProjectBrowser
        definitions={definitions}
        versions={versions}
        definitionId={state.definitionId}
        versionId={state.versionId}
        busy={projectBusy}
        onRefresh={refreshDefinitions}
        onDefinition={selectDefinition}
        onVersion={selectVersion}
      />

      <DefinitionForm
        api={api}
        categories={categories}
        onCategory={(category) => setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))}
        onDefinition={(definition) => {
          setDefinitions((current) => [definition, ...current.filter((item) => item.id !== definition.id)]);
          setVersions([]);
          dispatch({ type: "definition_created", definition });
        }}
      />

      {state.error && <div className="global-error" role="alert"><strong>Backend operation failed</strong><span>{state.error}</span><button type="button" onClick={() => dispatch({ type: "clear_error" })}>Dismiss</button></div>}

      <main className="workspace">
        <EditorPanels
          selected={state.selectedPanel}
          onSelect={(panel) => dispatch({ type: "select_panel", panel })}
          manifest={state.manifest}
          onManifest={importManifest}
          assets={state.assets}
          onAsset={(asset) => dispatch({ type: "asset_verified", asset })}
          versionId={state.versionId}
          api={api}
        />
        <Suspense fallback={<section className="viewport-pane"><div className="empty-stage"><p>Loading verified runtime…</p></div></section>}>
          <RuntimePreview manifest={state.manifest} assets={state.assets} api={api} />
        </Suspense>
      </main>

      <footer className="workflow-bar" aria-label="Publication workflow">
        <div>
          <span className="eyebrow">Backend lifecycle</span>
          <strong>{state.versionState ?? "No version"}</strong>
        </div>
        {!state.versionId && (
          <button className="primary" type="button" disabled={!state.definitionId || workflowBusy} onClick={() => void createVersion()}>
            Create empty draft version
          </button>
        )}
        <button type="button" disabled={!workflowAvailable(state.versionState, "submit") || workflowBusy || !state.manifest || state.saveState !== "saved"} onClick={() => void runWorkflow("submit")}>Submit review</button>
        <button type="button" disabled={!workflowAvailable(state.versionState, "validate") || workflowBusy} onClick={() => void runWorkflow("validate")}>Validate</button>
        <button className="primary" type="button" disabled={!workflowAvailable(state.versionState, "publish") || workflowBusy} onClick={() => void runWorkflow("publish")}>Publish</button>
        <button type="button" disabled={!workflowAvailable(state.versionState, "retire") || workflowBusy} onClick={() => void runWorkflow("retire")}>Retire</button>
        <button className="danger" type="button" disabled={!workflowAvailable(state.versionState, "emergency_retire") || workflowBusy} onClick={() => void runWorkflow("emergency_retire")}>Emergency retire</button>
        {validation && <span className="validation-result">{validation.valid ? "Validation passed" : "Validation failed"} · {validation.checks.length} checks</span>}
        <small>Review, publish, and moderation permissions are enforced by backend RBAC.</small>
      </footer>
    </div>
  );
}
