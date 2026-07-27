import { NextRequest } from 'next/server';
import { getWSManager, ensureWSConnected } from '@/lib/upstox-ws-manager';
import type { LiveTick } from '@/lib/upstox-ws-manager';

/**
 * GET /api/realtime?symbols=RELIANCE,NIFTY,BANKNIFTY
 *
 * Opens a Server-Sent Events (SSE) stream that pushes live ticks.
 * Connects to Upstox WebSocket on first call, reuses connection for all clients.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);

  const manager = getWSManager();

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ connected: manager.connected, authorized: !!manager.authorized })}\n\n`));

      // Send any cached ticks immediately
      if (symbols.length > 0) {
        for (const s of symbols) {
          const cached = manager.getTick(s);
          if (cached) {
            controller.enqueue(encoder.encode(`event: tick\ndata: ${JSON.stringify(cached)}\n\n`));
          }
        }
      }

      // Subscribe to requested symbols
      if (symbols.length > 0) {
        manager.subscribe(symbols);
      }

      // Connect to Upstox if not already
      ensureWSConnected();

      // Listen for new ticks
      const unsubTick = manager.onTick((tick: LiveTick) => {
        try {
          controller.enqueue(encoder.encode(`event: tick\ndata: ${JSON.stringify(tick)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Listen for status changes
      const unsubStatus = manager.onStatus((status) => {
        try {
          controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify(status)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Cleanup on close
      const cleanup = () => {
        unsubTick();
        unsubStatus();
      };

      // We can't detect ReadableStream abort natively, so we use
      // a heartbeat keep-alive and let the client reconnect if needed.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(heartbeat);
          cleanup();
        }
      }, 15000);

      // Store cleanup for the request abort signal
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
