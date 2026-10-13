import { useEffect, useRef } from 'react';
import type { LogEntry, StateResponse } from '../../shared/types';

type Handlers = {
  onState: (state: StateResponse) => void;
  onLog: (entry: LogEntry) => void;
  onConnection: (up: boolean) => void;
};

export function useEventStream(url: string, handlers: Handlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let es: EventSource | null = null;
    let timer: number | undefined;
    let attempt = 0;
    let closed = false;

    function connect() {
      es = new EventSource(url);
      es.onopen = () => {
        attempt = 0;
        handlersRef.current.onConnection(true);
      };
      es.onmessage = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            state?: StateResponse;
            entry?: LogEntry;
          };
          if (msg.type === 'state' && msg.state) {
            handlersRef.current.onState(msg.state);
          } else if (msg.type === 'log' && msg.entry) {
            handlersRef.current.onLog(msg.entry);
          }
        } catch {
          /* abaikan pesan rusak */
        }
      };
      es.onerror = () => {
        handlersRef.current.onConnection(false);
        es?.close();
        if (closed) return;
        attempt += 1;
        const delay = Math.min(5000, 1000 * attempt);
        timer = window.setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      closed = true;
      window.clearTimeout(timer);
      es?.close();
    };
  }, [url]);
}
