'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Wifi, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export type NetworkCheckStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';

export interface NetworkMetrics {
  latencyMs: number;
  jitterMs: number;
  packetQuality: string;
  passed: boolean;
  status: NetworkCheckStatus;
  message: string;
}

interface NetworkJitterGaugeProps {
  autoStart?: boolean;
  onMetricsComplete?: (metrics: NetworkMetrics) => void;
}

export const NetworkJitterGauge: React.FC<NetworkJitterGaugeProps> = ({ autoStart = true, onMetricsComplete }) => {
  const [status, setStatus] = useState<NetworkCheckStatus>('PENDING');
  const [latency, setLatency] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onMetricsRef = useRef(onMetricsComplete);
  onMetricsRef.current = onMetricsComplete;

  const runPingTest = React.useCallback(async () => {
    setStatus('RUNNING');
    setError(null);
    setLatency(null);
    setJitter(null);
    onMetricsRef.current?.({
      latencyMs: 0,
      jitterMs: 0,
      packetQuality: 'Unavailable',
      passed: false,
      status: 'RUNNING',
      message: 'Measuring network round-trip & timing variation...',
    });

    // Five tiny, rate-limit-exempt probes to a route that does no database work,
    // so the measured RTT is the browser→API path only.
    const PING_COUNT = 5;
    const PING_TIMEOUT_MS = 2500;
    // Max allowable RTT threshold (3500ms allows mobile networks & Cloudflare tunnels to operate reliably)
    const MAX_ALLOWABLE_RTT_MS = 3500;

    const finish = (samples: number[]) => {
      const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      const variation = Math.round(
        samples.slice(1).reduce((sum, ping, i) => sum + Math.abs(ping - samples[i]), 0) / (samples.length - 1)
      );

      setLatency(avg);
      setJitter(variation);

      const passed = avg <= MAX_ALLOWABLE_RTT_MS;
      const finalStatus: NetworkCheckStatus = passed ? 'PASSED' : 'FAILED';
      const msg = passed
        ? `Network test complete – ${avg} ms RTT (Quality acceptable)`
        : `Network latency too high – ${avg} ms RTT (Exceeds ${MAX_ALLOWABLE_RTT_MS} ms limit)`;

      setStatus(finalStatus);

      onMetricsRef.current?.({
        latencyMs: avg,
        jitterMs: variation,
        packetQuality: 'HTTP reachability measured',
        passed,
        status: finalStatus,
        message: msg,
      });
    };

    const pings: number[] = [];
    try {
      for (let i = 0; i < PING_COUNT; i++) {
        const start = performance.now();
        const res = await apiFetch('/api/ping', {
          cache: 'no-store',
          signal: AbortSignal.timeout(PING_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`Ping returned HTTP ${res.status}`);
        await res.json().catch(() => undefined);
        pings.push(Math.round(performance.now() - start));

        // Publish live averages as samples arrive so the numbers show immediately
        // instead of leaving the card on "--" until all five probes finish.
        const partialAvg = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
        setLatency(partialAvg);
        if (pings.length > 1) {
          setJitter(
            Math.round(
              pings.slice(1).reduce((sum, ping, idx) => sum + Math.abs(ping - pings[idx]), 0) / (pings.length - 1)
            )
          );
        }
      }
      finish(pings);
    } catch (err) {
      // Partial data is still useful: a slow/failed probe after two good ones
      // should report a real measurement rather than force a full retry.
      if (pings.length >= 2) {
        finish(pings);
        return;
      }
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
      const errMsg = timedOut
        ? `Ping timed out after ${PING_TIMEOUT_MS} ms`
        : err instanceof Error
        ? err.message
        : 'Network test failed.';
      setError(errMsg);
      setStatus('ERROR');
      onMetricsRef.current?.({
        latencyMs: 0,
        jitterMs: 0,
        packetQuality: 'Error',
        passed: false,
        status: 'ERROR',
        message: `Network health check error: ${errMsg}`,
      });
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      void runPingTest();
    }
  }, [autoStart, runPingTest]);

  return (
    <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <Wifi
            className={`w-5 h-5 ${
              status === 'PASSED'
                ? 'text-accent-emerald'
                : status === 'FAILED' || status === 'ERROR'
                ? 'text-accent-rose'
                : 'text-accent-cyan animate-pulse'
            }`}
          />
          <div>
            <h3 className="text-sm font-bold text-ink">Network Reachability &amp; HTTP Timing</h3>
            <p className="text-[11px] text-ink-muted">
              {status === 'RUNNING'
                ? 'Measuring round-trip health timing...'
                : status === 'PASSED'
                ? `Test complete (${latency} ms RTT)`
                : status === 'FAILED'
                ? `High latency detected (${latency} ms RTT)`
                : status === 'ERROR'
                ? 'Network test unreachable'
                : 'Measurement pending'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void runPingTest()}
          disabled={status === 'RUNNING'}
          className="p-2 rounded-xl bg-inset border border-line disabled:opacity-50 hover:bg-surface-3 transition-colors cursor-pointer"
          title="Re-run network test"
        >
          <RefreshCw className={`w-4 h-4 ${status === 'RUNNING' ? 'animate-spin text-accent-cyan' : ''}`} />
        </button>
      </div>

      {error && <p className="text-xs text-accent-rose">Network test error: {error}</p>}

      <div className="flex gap-6 text-xs font-mono">
        <span className={latency !== null && latency > 3500 ? 'text-accent-rose font-bold' : 'text-ink-muted'}>
          Round trip: {latency === null ? '--' : `${latency} ms`}
        </span>
        <span className="text-ink-muted">Timing variation: {jitter === null ? '--' : `${jitter} ms`}</span>
      </div>
    </div>
  );
};
