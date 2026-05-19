import { useEffect, useRef } from 'react';

type Handler = (event: string, data: unknown) => void;

export function useWebSocket(onMessage: Handler) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    let ws: WebSocket;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${location.host}/ws`);

      ws.onmessage = (e) => {
        try {
          const { event, data } = JSON.parse(e.data as string) as { event: string; data: unknown };
          handlerRef.current(event, data);
        } catch { /* ignore malformed frames */ }
      };

      ws.onclose = () => {
        if (!destroyed) setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      destroyed = true;
      ws?.close();
    };
  }, []);
}
