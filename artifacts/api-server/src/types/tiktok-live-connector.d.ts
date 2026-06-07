declare module "tiktok-live-connector" {
  import { EventEmitter } from "events";

  interface WebcastPushConnectionOptions {
    processInitialData?: boolean;
    enableExtendedGiftInfo?: boolean;
    enableWebsocketUpgrade?: boolean;
    requestPollingIntervalMs?: number;
  }

  class WebcastPushConnection extends EventEmitter {
    constructor(username: string, options?: WebcastPushConnectionOptions);
    connect(): Promise<{ roomId: string; upgradeToWebsocket: boolean }>;
    disconnect(): void;
    on(event: "gift", listener: (data: Record<string, unknown>) => void): this;
    on(event: "chat", listener: (data: Record<string, unknown>) => void): this;
    on(event: "like", listener: (data: Record<string, unknown>) => void): this;
    on(event: "follow", listener: (data: Record<string, unknown>) => void): this;
    on(event: "share", listener: (data: Record<string, unknown>) => void): this;
    on(event: "roomUser", listener: (data: Record<string, unknown>) => void): this;
    on(event: "error", listener: (err: unknown) => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export { WebcastPushConnection };
}
