import { useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function useRescueReportStream(enabled, handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    let retryTimer;
    let controller;
    const reconnect = () => {
      if (active) retryTimer = window.setTimeout(connect, 3000);
    };
    const connect = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(`${API_URL}/reports/stream`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('rv_token') || ''}` },
          signal: controller.signal
        });
        if (response.status === 401 || response.status === 403) {
          handlersRef.current.onError(new Error('Sign in with an approved rescue-team account to receive live reports.'));
          return;
        }
        if (!response.ok || !response.body) throw new Error(`Live report stream returned ${response.status}`);

        handlersRef.current.onReady();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary;
          while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
            const delimiter = buffer.slice(boundary).match(/^\r?\n\r?\n/)[0];
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + delimiter.length);
            const data = frame.split(/\r?\n/)
              .filter(line => line.startsWith('data:'))
              .map(line => line.slice(5).trimStart())
              .join('\n');
            if (!data) continue;
            try {
              const event = JSON.parse(data);
              if (event.type === 'report') handlersRef.current.onReport(event.report, event.action);
            } catch {
              handlersRef.current.onError(new Error('Received an unreadable live report update.'));
            }
          }
        }
        reconnect();
      } catch (error) {
        if (active && !controller.signal.aborted) {
          handlersRef.current.onError(error);
          reconnect();
        }
      }
    };

    connect();
    return () => {
      active = false;
      window.clearTimeout(retryTimer);
      controller?.abort();
    };
  }, [enabled]);
}
