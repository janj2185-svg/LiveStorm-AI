export interface GiftEvent {
  event: string;
  cursor: string;
  gift_send_id: string | null;
  gift_version_id: string | null;
  combination_id: string | null;
  payload: Record<string, string | number | boolean | null | string[]>;
  occurred_at: string;
}

export interface EventReplayPage {
  items: GiftEvent[];
  next_cursor: string | null;
}

export interface WebSocketTicket {
  ticket: string;
  expiresInSeconds: number;
  issuedAtMs?: number;
}

export type NativeWebSocketFactory = (url: string, bearerToken: string) => WebSocket;

export interface EventClientOptions {
  apiBase: string;
  token: () => string | undefined | Promise<string | undefined>;
  fetcher?: typeof fetch;
  ticket?: () => Promise<WebSocketTicket>;
  nativeWebSocketFactory?: NativeWebSocketFactory;
}

export class EventCapabilityError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "EventCapabilityError";
  }
}

export class GiftEventClient {
  readonly #options: EventClientOptions;

  constructor(options: EventClientOptions) {
    this.#options = options;
  }

  async replay(cursor?: string, limit = 100, signal?: AbortSignal): Promise<EventReplayPage> {
    const token = await this.#requireToken();
    const url = new URL("/v1/gifts/events", this.#options.apiBase);
    if (cursor) url.searchParams.set("cursor", cursor);
    url.searchParams.set("limit", String(Math.min(500, Math.max(1, limit))));
    const response = await (this.#options.fetcher ?? fetch)(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      credentials: "omit",
      signal: signal ?? null
    });
    if (!response.ok) throw new Error(`Gift event replay failed with HTTP ${response.status}`);
    const value = await response.json() as EventReplayPage;
    if (!Array.isArray(value.items) || !("next_cursor" in value)) {
      throw new Error("Gift event replay returned an invalid response");
    }
    return value;
  }

  async connect(onEvent: (event: GiftEvent) => void, since?: string): Promise<WebSocket> {
    const token = await this.#requireToken();
    const url = new URL("/v1/ws/gifts", this.#options.apiBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    if (since) url.searchParams.set("since", since);

    if (this.#options.nativeWebSocketFactory) {
      const socket = this.#options.nativeWebSocketFactory(url.toString(), token);
      this.#bind(socket, onEvent);
      return socket;
    }

    const ticket = await this.#ticket(token);
    const expiresAt = (ticket.issuedAtMs ?? Date.now()) + ticket.expiresInSeconds * 1000;
    if (expiresAt <= Date.now()) {
      throw new EventCapabilityError("The WebSocket ticket expired before connection");
    }
    url.searchParams.set("ticket", ticket.ticket);
    const socket = new WebSocket(url);
    this.#bind(socket, onEvent);
    return socket;
  }

  async #ticket(token: string): Promise<WebSocketTicket> {
    const issuedAtMs = Date.now();
    if (this.#options.ticket) {
      const supplied = await this.#options.ticket();
      this.#validateTicket(supplied);
      return { ...supplied, issuedAtMs: supplied.issuedAtMs ?? issuedAtMs };
    }
    const url = new URL("/v1/gifts/events/ticket", this.#options.apiBase);
    const response = await (this.#options.fetcher ?? fetch)(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      body: null
    });
    if (!response.ok) throw new Error(`Gift WebSocket ticket request failed with HTTP ${response.status}`);
    const raw = await response.json() as unknown;
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      Object.keys(raw).some((key) => key !== "ticket" && key !== "expires_in_seconds")
    ) {
      throw new EventCapabilityError("Gift WebSocket ticket response is invalid");
    }
    const value = raw as { ticket?: unknown; expires_in_seconds?: unknown };
    const ticket: WebSocketTicket = {
      ticket: typeof value.ticket === "string" ? value.ticket : "",
      expiresInSeconds: typeof value.expires_in_seconds === "number" ? value.expires_in_seconds : 0,
      issuedAtMs
    };
    this.#validateTicket(ticket);
    return ticket;
  }

  #validateTicket(ticket: WebSocketTicket): void {
    if (
      !ticket.ticket ||
      !Number.isInteger(ticket.expiresInSeconds) ||
      ticket.expiresInSeconds <= 0 ||
      ticket.expiresInSeconds > 300
    ) {
      throw new EventCapabilityError("Gift WebSocket ticket response is invalid");
    }
  }

  async #requireToken(): Promise<string> {
    const token = await this.#options.token();
    if (!token) throw new EventCapabilityError("Authentication token is unavailable");
    return token;
  }

  #bind(socket: WebSocket, onEvent: (event: GiftEvent) => void): void {
    socket.addEventListener("message", (message) => {
      if (typeof message.data !== "string") return;
      const event = JSON.parse(message.data) as Partial<GiftEvent>;
      if (event.event === "heartbeat") return;
      if (typeof event.event === "string" && typeof event.cursor === "string") {
        onEvent(event as GiftEvent);
      }
    });
  }
}
