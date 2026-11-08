import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyAccess, onRequest } from "../../functions/api/[[path]].js";
const b64 = (value) =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
test("Cloudflare gateway requires configuration and rejects unsigned access", async () => {
  const request = new Request("https://workspace.example/api/workspace");
  assert.equal((await onRequest({ request, env: {} })).status, 503);
  const env = {
    TOM_BACKEND_URL: "https://hub.example",
    TOM_HUB_TOKEN: "fixture-only",
    ACCESS_TEAM_DOMAIN: "fixture.cloudflareaccess.com",
    ACCESS_AUD: "workspace",
  };
  assert.equal((await onRequest({ request, env })).status, 401);
  assert.equal(await verifyAccess("not.a.jwt", env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD), false);
});
test("Access verifier accepts signed intended audience and rejects tampering or expiry", async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid: "fixture-key" };
  const claims = {
    iss: "https://fixture.cloudflareaccess.com",
    aud: ["workspace"],
    exp: Date.now() / 1000 + 60,
  };
  async function sign(payload) {
    const text = `${b64({ alg: "RS256", kid: "fixture-key" })}.${b64(payload)}`;
    return `${text}.${Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(text))).toString("base64url")}`;
  }
  const fetcher = async (url) => {
    assert.equal(url, "https://fixture.cloudflareaccess.com/cdn-cgi/access/certs");
    return Response.json({ keys: [jwk] });
  };
  const token = await sign(claims);
  assert.equal(
    await verifyAccess(token, "fixture.cloudflareaccess.com", "workspace", fetcher),
    true,
  );
  assert.equal(await verifyAccess(token, "fixture.cloudflareaccess.com", "other", fetcher), false);
  assert.equal(
    await verifyAccess(
      await sign({ ...claims, exp: 1 }),
      "fixture.cloudflareaccess.com",
      "workspace",
      fetcher,
    ),
    false,
  );
  const parts = token.split(".");
  parts[1] = b64({ ...claims, aud: ["attacker"] });
  assert.equal(
    await verifyAccess(parts.join("."), "fixture.cloudflareaccess.com", "attacker", fetcher),
    false,
  );
});
