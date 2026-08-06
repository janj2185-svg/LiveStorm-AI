export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

export const API_V1 = `${API_BASE_URL}/v1`;

export const SESSION_STORAGE_KEY = "sylora_admin_session_v1";
