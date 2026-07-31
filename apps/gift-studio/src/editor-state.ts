import type { RuntimeManifest } from "@sylora/gift-runtime";
import type { GiftAsset, GiftDefinition, GiftLifecycle, GiftVersion } from "./types";

export type SaveState = "clean" | "dirty" | "saving" | "saved" | "conflict" | "error";

export interface EditorState {
  definitionId: string | undefined;
  versionId: string | undefined;
  definition: GiftDefinition | undefined;
  manifest: RuntimeManifest | undefined;
  versionState: GiftLifecycle | undefined;
  etag: string | undefined;
  saveState: SaveState;
  lastSavedAt: string | undefined;
  error: string | undefined;
  assets: GiftAsset[];
  selectedPanel: string;
  revision: number;
}

export type EditorAction =
  | { type: "attach_ids"; definitionId?: string; versionId?: string }
  | { type: "definition_created"; definition: GiftDefinition }
  | { type: "definition_selected"; definition: GiftDefinition }
  | { type: "manifest_imported"; manifest: RuntimeManifest }
  | { type: "version_received"; version: GiftVersion; assets?: GiftAsset[]; etag?: string }
  | { type: "assets_received"; assets: GiftAsset[] }
  | { type: "save_started"; revision: number }
  | { type: "save_succeeded"; version: GiftVersion; revision: number; etag?: string; savedAt: string }
  | { type: "save_failed"; message: string; conflict: boolean }
  | { type: "asset_verified"; asset: GiftAsset }
  | { type: "select_panel"; panel: string }
  | { type: "error"; message: string }
  | { type: "clear_error" };

export const initialEditorState: EditorState = {
  definitionId: undefined,
  versionId: undefined,
  definition: undefined,
  manifest: undefined,
  versionState: undefined,
  etag: undefined,
  saveState: "clean",
  lastSavedAt: undefined,
  error: undefined,
  assets: [],
  selectedPanel: "manifest",
  revision: 0
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "attach_ids": {
      return {
        ...state,
        definitionId: action.definitionId ?? state.definitionId,
        versionId: action.versionId ?? state.versionId
      };
    }
    case "definition_created":
      return {
        ...state,
        definition: action.definition,
        definitionId: action.definition.id,
        versionId: undefined,
        manifest: undefined,
        versionState: undefined,
        assets: [],
        saveState: "clean",
        error: undefined
      };
    case "definition_selected":
      return {
        ...state,
        definition: action.definition,
        definitionId: action.definition.id,
        versionId: undefined,
        manifest: undefined,
        versionState: undefined,
        etag: undefined,
        assets: [],
        saveState: "clean",
        lastSavedAt: undefined,
        error: undefined
      };
    case "manifest_imported":
      return {
        ...state,
        manifest: action.manifest,
        revision: state.revision + 1,
        saveState: state.versionId ? "dirty" : "clean",
        error: undefined
      };
    case "version_received": {
      return {
        ...state,
        definitionId: action.version.gift_definition_id,
        versionId: action.version.id,
        manifest: action.version.runtime_manifest ?? undefined,
        versionState: action.version.state,
        saveState: action.version.runtime_manifest ? "saved" : "clean",
        assets: action.assets ?? state.assets,
        error: undefined,
        etag: action.etag
      };
    }
    case "save_started":
      return action.revision === state.revision ? { ...state, saveState: "saving", error: undefined } : state;
    case "save_succeeded": {
      const latest = action.revision === state.revision;
      return {
        ...state,
        manifest: latest ? action.version.runtime_manifest ?? state.manifest : state.manifest,
        versionState: action.version.state,
        saveState: latest ? "saved" : "dirty",
        lastSavedAt: action.savedAt,
        error: undefined,
        etag: action.etag
      };
    }
    case "save_failed":
      return {
        ...state,
        saveState: action.conflict ? "conflict" : "error",
        error: action.message
      };
    case "asset_verified":
      return {
        ...state,
        assets: [...state.assets.filter((asset) => asset.id !== action.asset.id), action.asset]
      };
    case "assets_received":
      return { ...state, assets: action.assets };
    case "select_panel":
      return { ...state, selectedPanel: action.panel };
    case "error":
      return { ...state, error: action.message };
    case "clear_error": {
      return { ...state, error: undefined };
    }
  }
}

export type WorkflowAction = "submit" | "validate" | "publish" | "retire" | "emergency_retire";

export function workflowAvailable(state: GiftLifecycle | undefined, action: WorkflowAction): boolean {
  switch (action) {
    case "submit": return state === "draft";
    case "validate":
    case "publish": return state === "review";
    case "retire":
    case "emergency_retire": return state === "published";
  }
}
