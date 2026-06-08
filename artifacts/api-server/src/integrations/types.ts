export interface PlatformEvent {
  source: string;
  type: string;
  sessionId: number;
  userId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface Integration {
  id: string;
  name: string;
  tagline: string;
  description: string;
  available: boolean;
  stage: "live" | "beta" | "coming_soon";
  requiredFields?: string[];
  docsUrl?: string;
  color: string;
  roadmapStage?: 1 | 2 | 3;
}

export interface ConnectedIntegration extends Integration {
  connected: boolean;
  connectedAccount: string | null;
}
