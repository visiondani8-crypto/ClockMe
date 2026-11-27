// Local server for development and tests: serves the static site and runs the api/ functions
// the way Vercel does (Node (req, res) handlers with a parsed JSON body, or Web-standard POST/GET exports).
// No real secrets are needed: without keys the functions answer "not set up", as they would on Vercel.
//   PORT=8787 node scripts/serve.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8787);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".css": "text/css" };

async function readBody(req) { const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks); }

async function runApi(name, req, res) {
  let mod;
  try { mod = await import(pathToFileURL(join(root, "api", `${name}.js`)).href); }
  catch { res.writeHead(404).end(); return; }
  const raw = await readBody(req);
  const method = req.method.toUpperCase();
  if (typeof mod[method] === "function") {
    const request = new Request(`http://localhost:${port}${req.url}`, { method, headers: req.headers, body: ["GET", "HEAD"].includes(method) ? undefined : raw });
    const r = await mod[method](request);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  if (typeof mod.default !== "function") { res.writeHead(405).end(); return; }
  let body = undefined;
  if (raw.length && String(req.headers["content-type"] || "").includes("application/json")) { try { body = JSON.parse(raw.toString("utf8")); } catch { res.writeHead(400).end(); return; } }
  const shim = Object.assign(req, { body });
  const out = { statusCode: 200, headers: {} };
  const resShim = {
    setHeader: (k, v) => { out.headers[k] = v; },
    status(c) { out.statusCode = c; return resShim; },
    json(o) { res.writeHead(out.statusCode, { ...out.headers, "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(o)); return resShim; },
    end(d) { res.writeHead(out.statusCode, out.headers); res.end(d); return resShim; },
  };
  await mod.default(shim, resShim);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const api = url.pathname.match(/^\/api\/([a-z0-9-]+)$/);
    if (api) return await runApi(api[1], req, res);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    if (path.endsWith("/")) path += "index.html";
    const file = join(root, path);
    if (!file.startsWith(root) || /[/\\](node_modules|\.git|tests|scripts|src|config)[/\\]/.test(file.slice(root.length))) { res.writeHead(404).end(); return; }
    const s = await stat(file).catch(() => null);
    if (!s || !s.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch (e) {
    res.writeHead(500).end();
    console.error(e);
  }
}).listen(port, () => console.log(`ClockMe on http://localhost:${port}`));
