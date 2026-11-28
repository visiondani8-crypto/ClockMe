// Fake Upstash (in-memory Redis over the REST pipeline API) and helpers for calling handlers like Vercel does.
export function fakeUpstash() {
  const store = new Map(); const state = { mode: "ok" };
  const handle = async (url, opts = {}) => {
    if (state.mode === "down") throw new Error("ECONNREFUSED");
    if (state.mode === "slow") await new Promise((r, j) => { const t = setTimeout(r, 4000); opts.signal && opts.signal.addEventListener("abort", () => { clearTimeout(t); j(new Error("aborted")); }); });
    if (opts.headers.Authorization !== "Bearer tok") return new Response("unauthorized", { status: 401 });
    const now = Date.now();
    if (state.mode === "error") return new Response(JSON.stringify(JSON.parse(opts.body).map(() => ({ error: "ERR fake failure" }))), { status: 200 });
    const out = JSON.parse(opts.body).map(([c, k, ...a]) => {
      const e = store.get(k); if (e && e.exp < now) store.delete(k);
      if (c === "SET") { const nx = a.includes("NX"); if (nx && store.has(k)) return { result: null }; const ex = a.indexOf("EX"); store.set(k, { v: a[0], exp: ex >= 0 ? now + Number(a[ex + 1]) * 1000 : Infinity }); return { result: "OK" }; }
      if (c === "INCR") { const x = store.get(k) || { v: "0", exp: Infinity }; x.v = String(Number(x.v) + 1); store.set(k, x); return { result: Number(x.v) }; }
      if (c === "TTL") { const x = store.get(k); return { result: x ? Math.ceil((x.exp - now) / 1000) : -2 }; }
      if (c === "GET") { const x = store.get(k); return { result: x ? x.v : null }; }
      // Sorted sets, as Redis orders them: by score, then by member.
      const zs = () => { let x = store.get(k); if (!x) { x = { z: new Map(), exp: Infinity }; store.set(k, x); } return x; };
      const ordered = (x) => [...x.z].sort((p, q) => p[1] - q[1] || (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0));
      if (c === "ZADD") { const x = zs(); const isNew = !x.z.has(a[1]); x.z.set(a[1], Number(a[0])); return { result: isNew ? 1 : 0 }; }
      if (c === "ZREMRANGEBYRANK") { const x = store.get(k); if (!x) return { result: 0 }; const o = ordered(x); const n = o.length; const s0 = (v) => (v < 0 ? n + v : v); const lo = Math.max(0, s0(Number(a[0]))), hi = s0(Number(a[1])); const gone = hi < lo ? [] : o.slice(lo, hi + 1); for (const [m] of gone) x.z.delete(m); return { result: gone.length }; }
      if (c === "ZRANGE") { const x = store.get(k); if (!x) return { result: [] }; let o = ordered(x); if (a.includes("REV")) o = o.reverse(); o = o.slice(Number(a[0]), Number(a[1]) + 1); return { result: a.includes("WITHSCORES") ? o.flatMap(([m, sc]) => [m, String(sc)]) : o.map(([m]) => m) }; }
      if (c === "EXPIRE") { const x = store.get(k); if (!x) return { result: 0 }; x.exp = now + Number(a[0]) * 1000; return { result: 1 }; }
      return { error: "unknown" };
    });
    return new Response(JSON.stringify(out), { status: 200 });
  };
  return { store, state, handle };
  // state.mode: "ok", "down" (connection refused), "slow" (4 s), or "error" (every command answers an error)
}
export function mkRes() {
  const r = { code: 0, h: {}, body: null };
  r.setHeader = (k, v) => { r.h[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.end = () => r;
  return r;
}
export const SITE = { host: "clockme-two.vercel.app", origin: "https://clockme-two.vercel.app" };
export async function call(handler, method, body, headers = {}) {
  const res = mkRes(); await handler({ method, headers: { ...SITE, "x-real-ip": "1.2.3.4", ...headers }, body }, res); return res;
}
// A well-formed /api/read-rota request body (the app sends only these fields; the server writes the prompt).
export const ROTA = { rota: { name: "Sam", text: "Mon 9-5", today: "2026-11-27", todayDay: 5, weekStart: "2026-11-23", weekStartDay: 1 } };
