// Fake Upstash (in-memory Redis over the REST pipeline API) and helpers for calling handlers like Vercel does.
export function fakeUpstash() {
  const store = new Map(); const state = { mode: "ok" };
  const handle = async (url, opts = {}) => {
    if (state.mode === "down") throw new Error("ECONNREFUSED");
    if (state.mode === "slow") await new Promise((r, j) => { const t = setTimeout(r, 4000); opts.signal && opts.signal.addEventListener("abort", () => { clearTimeout(t); j(new Error("aborted")); }); });
    if (opts.headers.Authorization !== "Bearer tok") return new Response("unauthorized", { status: 401 });
    const now = Date.now();
    const out = JSON.parse(opts.body).map(([c, k, ...a]) => {
      const e = store.get(k); if (e && e.exp < now) store.delete(k);
      if (c === "SET") { const nx = a.includes("NX"); if (nx && store.has(k)) return { result: null }; const ex = a.indexOf("EX"); store.set(k, { v: a[0], exp: ex >= 0 ? now + Number(a[ex + 1]) * 1000 : Infinity }); return { result: "OK" }; }
      if (c === "INCR") { const x = store.get(k) || { v: "0", exp: Infinity }; x.v = String(Number(x.v) + 1); store.set(k, x); return { result: Number(x.v) }; }
      if (c === "TTL") { const x = store.get(k); return { result: x ? Math.ceil((x.exp - now) / 1000) : -2 }; }
      if (c === "GET") { const x = store.get(k); return { result: x ? x.v : null }; }
      return { error: "unknown" };
    });
    return new Response(JSON.stringify(out), { status: 200 });
  };
  return { store, state, handle };
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
