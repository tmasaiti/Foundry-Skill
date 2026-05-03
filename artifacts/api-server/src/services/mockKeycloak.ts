import { createHash, generateKeyPairSync, randomBytes } from "crypto";
import { makeId } from "../lib/ulid.js";

interface RealmConfig {
  realm: string;
  issuer: string;
  privateKey: string;
  publicKey: string;
  keyId: string;
}

const realms = new Map<string, RealmConfig>();

const BASE_URL = process.env.KC_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8080}`;

function getIssuer(realmName: string): string {
  return `${BASE_URL}/api/realms/${realmName}`;
}

export function createRealm(realmName: string): RealmConfig {
  if (realms.has(realmName)) return realms.get(realmName)!;
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keyId = randomBytes(8).toString("hex");
  const config: RealmConfig = {
    realm: realmName,
    issuer: getIssuer(realmName),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
    publicKey: publicKey.export({ type: "spki", format: "pem" }) as string,
    keyId,
  };
  realms.set(realmName, config);
  return config;
}

export function getRealm(realmName: string): RealmConfig | undefined {
  return realms.get(realmName);
}

export function getJwks(realmName: string): { keys: object[] } {
  const realm = realms.get(realmName);
  if (!realm) return { keys: [] };
  const { createPublicKey } = require("crypto");
  const pubKey = createPublicKey(realm.publicKey);
  const jwk = pubKey.export({ format: "jwk" });
  return {
    keys: [{ ...jwk, kid: realm.keyId, use: "sig", alg: "RS256" }],
  };
}

export function provisionRealm(tenantId: string, _ownerId: string): { realm: string; issuer: string } {
  const realmName = `tnt_${tenantId}`;
  const config = createRealm(realmName);
  return { realm: realmName, issuer: config.issuer };
}

export function createOidcClient(
  _realmName: string,
  _clientId: string,
  _type: string,
): { clientId: string; clientSecret?: string } {
  const secret = randomBytes(32).toString("hex");
  return { clientId: _clientId, clientSecret: _type === "confidential" ? secret : undefined };
}

export function rotateClientSecret(_realmName: string, _clientId: string): string {
  return randomBytes(32).toString("hex");
}

export function getOidcMetadata(realmName: string): Record<string, unknown> {
  const issuer = getIssuer(realmName);
  return {
    issuer,
    authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
    token_endpoint: `${issuer}/protocol/openid-connect/token`,
    userinfo_endpoint: `${issuer}/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
    jwks_uri: `${issuer}/protocol/openid-connect/certs`,
    grant_types_supported: ["authorization_code", "refresh_token", "client_credentials"],
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["openid", "profile", "email"],
  };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function createInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}
