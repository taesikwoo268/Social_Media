import type { RealtimeClientEvent, RealtimeServerEvent } from "@circle/shared";
import { API_URL } from "../../api";

type EventListener = (event: RealtimeServerEvent) => void;
type StatusListener = (connected: boolean) => void;
type RequestEvent = Extract<RealtimeClientEvent, { requestId: string }>;
type PendingRequest = {
  resolve: (event: RealtimeServerEvent) => void;
  reject: (error: Error) => void;
  timeout: number;
};

export function chatSocketUrl() {
  const configuredSocketUrl = import.meta.env.VITE_WS_URL?.trim();
  if (configuredSocketUrl) return configuredSocketUrl.replace(/\/$/, "");

  if (/^https?:\/\//i.test(API_URL)) {
    const url = new URL(API_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
    return url.toString();
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${API_URL}/ws`;
}

export class ChatSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();
  private pending = new Map<string, PendingRequest>();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempt = 0;
  private stopped = true;

  get connected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.stopped = false;
    const socket = new WebSocket(chatSocketUrl());
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket) return;
      this.reconnectAttempt = 0;
      this.notifyStatus(true);
      this.heartbeatTimer = window.setInterval(() => {
        if (!this.connected) return;
        this.send({ type: "ping", requestId: crypto.randomUUID() });
      }, 25_000);
    });

    socket.addEventListener("message", (message) => {
      try {
        const event = JSON.parse(message.data) as RealtimeServerEvent;
        if ("requestId" in event && event.requestId) {
          const request = this.pending.get(event.requestId);
          if (request) {
            window.clearTimeout(request.timeout);
            this.pending.delete(event.requestId);
            if (event.type === "error") {
              request.reject(new Error(event.payload.message));
            } else {
              request.resolve(event);
            }
          }
        }
        for (const listener of this.listeners) listener(event);
      } catch {
        console.error("WebSocket trả về JSON không hợp lệ");
      }
    });

    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearHeartbeat();
      this.notifyStatus(false);
      this.rejectPending("Kết nối WebSocket đã bị đóng");
      if (!this.stopped) this.scheduleReconnect();
    });
  }

  send(event: RealtimeClientEvent) {
    if (!this.connected) throw new Error("WebSocket chưa kết nối");
    this.socket!.send(JSON.stringify(event));
  }

  request(event: RequestEvent) {
    return new Promise<RealtimeServerEvent>((resolve, reject) => {
      if (!this.connected) {
        reject(new Error("WebSocket chưa kết nối"));
        return;
      }
      const timeout = window.setTimeout(() => {
        this.pending.delete(event.requestId);
        reject(new Error("Máy chủ không phản hồi kịp thời"));
      }, 10_000);
      this.pending.set(event.requestId, { resolve, reject, timeout });
      try {
        this.send(event);
      } catch (error) {
        window.clearTimeout(timeout);
        this.pending.delete(event.requestId);
        reject(error);
      }
    });
  }

  subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.connected);
    return () => this.statusListeners.delete(listener);
  }

  disconnect() {
    this.stopped = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.clearHeartbeat();
    this.rejectPending("Đã đóng kết nối WebSocket");
    this.socket?.close(1000, "Client disconnected");
    this.socket = null;
    this.notifyStatus(false);
  }

  private notifyStatus(connected: boolean) {
    for (const listener of this.statusListeners) listener(connected);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private rejectPending(message: string) {
    for (const request of this.pending.values()) {
      window.clearTimeout(request.timeout);
      request.reject(new Error(message));
    }
    this.pending.clear();
  }

  private scheduleReconnect() {
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempt, 30_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }
}

export const chatSocket = new ChatSocket();
