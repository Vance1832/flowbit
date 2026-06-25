"use client";

import { useEffect, useRef, useState } from "react";

import { API_BASE_URL, getStoredAccessToken } from "@/lib/api/client";

function notificationSocketUrl(token: string) {
  // http(s)://host -> ws(s)://host. The JWT rides on the query string because
  // browsers can't set headers on the WebSocket handshake.
  const base = API_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "");
  return `${base}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

/**
 * Holds a WebSocket to the notification stream and calls `onPush` whenever the
 * server signals a change, so the caller refetches. Reconnects with capped
 * backoff; if the socket never connects (e.g. a WSGI-only deployment) the
 * caller's polling fallback keeps working. Returns `connected` so callers can
 * pause polling while the live stream is healthy.
 */
export function useNotificationSocket(onPush: () => void) {
  const onPushRef = useRef(onPush);
  useEffect(() => {
    onPushRef.current = onPush;
  }, [onPush]);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let disposed = false;
    let backoff = 1_000;

    function scheduleReconnect() {
      if (disposed) return;
      reconnectTimer = window.setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 30_000);
    }

    function connect() {
      if (disposed) return;
      const token = getStoredAccessToken();
      if (!token) {
        // Not authenticated yet — check again shortly.
        reconnectTimer = window.setTimeout(connect, 3_000);
        return;
      }
      try {
        socket = new WebSocket(notificationSocketUrl(token));
      } catch {
        scheduleReconnect();
        return;
      }
      socket.onopen = () => {
        backoff = 1_000;
        setConnected(true);
      };
      socket.onmessage = () => {
        onPushRef.current();
      };
      socket.onerror = () => {
        socket?.close();
      };
      socket.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null; // don't reconnect on intentional teardown
        socket.close();
      }
    };
  }, []);

  return { connected };
}
