// src/lib/rate-limit.ts

type Bucket = { count: number; resetAt: number };

const g = globalThis as any;
if (!g.__RL_BUCKETS) g.__RL_BUCKETS = new Map<string, Bucket>();
const BUCKETS: Map<string, Bucket> = g.__RL_BUCKETS;

/** Извлекаем IP из заголовков (Vercel/проксі) */
export function ipFromRequest(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  const ip = xf?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  return ip || "0.0.0.0";
}

/** Простой in-memory лимитер на инстанс (достаточно для MVP) */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}
