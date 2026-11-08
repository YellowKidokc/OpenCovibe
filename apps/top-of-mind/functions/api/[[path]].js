// Cloudflare Pages gateway. Provider keys remain exclusively in the Rust backend.
// Cloudflare Access JWTs are cryptographically verified before forwarding any request.
const keyCache = new Map();
function decode(segment) {
  const raw = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export async function verifyAccess(token, team, audience, fetcher = fetch) {
  if (!token || !audience || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team || "")) return false;
  try {
    const [header64, payload64, signature64, extra] = token.split(".");
    if (!header64 || !payload64 || !signature64 || extra) return false;
    const header = JSON.parse(new TextDecoder().decode(decode(header64)));
    const claims = JSON.parse(new TextDecoder().decode(decode(payload64)));
    const issuer = `https://${team}`;
    const now = Date.now() / 1000;
    if (
      header.alg !== "RS256" ||
      claims.iss !== issuer ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= now ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now)) ||
      !Array.isArray(claims.aud) ||
      !claims.aud.includes(audience)
    )
      return false;
    let entry = keyCache.get(team);
    if (!entry || entry.expires < now) {
      const response = await fetcher(`${issuer}/cdn-cgi/access/certs`, { redirect: "error" });
      if (!response.ok) return false;
      entry = { keys: (await response.json()).keys, expires: now + 600 };
      if (!Array.isArray(entry.keys)) return false;
      keyCache.set(team, entry);
    }
    const jwk = entry.keys.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return false;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decode(signature64),
      new TextEncoder().encode(`${header64}.${payload64}`),
    );
  } catch {
    return false;
  }
}
const error = (message, status) =>
  Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
export async function onRequest({ request, env }) {
  if (!env.TOM_BACKEND_URL || !env.TOM_HUB_TOKEN || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD)
    return error("The hosted workspace is not configured yet.", 503);
  if (
    !(await verifyAccess(
      request.headers.get("Cf-Access-Jwt-Assertion"),
      env.ACCESS_TEAM_DOMAIN,
      env.ACCESS_AUD,
    ))
  )
    return error("Sign in through Cloudflare Access to use this workspace.", 401);
  if (!["GET", "POST"].includes(request.method)) return error("Method not allowed.", 405);
  try {
    const base = new URL(env.TOM_BACKEND_URL);
    if (
      base.protocol !== "https:" ||
      base.pathname !== "/" ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    )
      return error("Invalid backend configuration.", 503);
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, base.origin);
    const body = request.method === "POST" ? await request.arrayBuffer() : undefined;
    if (body?.byteLength > 10_000_000) return error("Request is too large.", 413);
    const response = await fetch(target, {
      method: request.method,
      redirect: "manual",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.TOM_HUB_TOKEN}` },
      body,
    });
    if (response.status >= 300 && response.status < 400)
      return error("Backend redirects are not supported.", 502);
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return error("The workspace backend could not be reached.", 502);
  }
}
