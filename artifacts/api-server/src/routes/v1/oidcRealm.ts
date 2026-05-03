import { Router } from "express";
import { getOidcMetadata, getRealm } from "../../services/mockKeycloak.js";

const router = Router();

router.get("/realms/:realmName/.well-known/openid-configuration", (req, res) => {
  const metadata = getOidcMetadata(req.params.realmName);
  res.json(metadata);
});

router.get("/realms/:realmName/protocol/openid-connect/certs", (req, res) => {
  const realm = getRealm(req.params.realmName);
  if (!realm) {
    res.status(404).json({ error: "Realm not found" });
    return;
  }
  const { createPublicKey } = require("crypto");
  try {
    const pubKey = createPublicKey(realm.publicKey);
    const jwk = pubKey.export({ format: "jwk" }) as Record<string, string>;
    res.json({
      keys: [{ ...jwk, kid: realm.keyId, use: "sig", alg: "RS256" }],
    });
  } catch {
    res.status(500).json({ error: "Failed to export key" });
  }
});

router.post("/realms/:realmName/protocol/openid-connect/token", (req, res) => {
  res.json({
    error: "not_implemented",
    error_description: "Token endpoint is handled by the IAM engine. Use the OIDC flow via your app.",
  });
});

export default router;
