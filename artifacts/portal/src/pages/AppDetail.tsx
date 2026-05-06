import { useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { CodeBlock } from "@/components/CodeBlock";
import { DetailNav } from "@/components/DetailNav";
import { MOCK_APPS, MOCK_WORKSPACES, MOCK_AUDIT_LOGS } from "@/lib/mockData";
import { AlertTriangle, RefreshCw, ExternalLink, Info, Clock, User, Activity } from "lucide-react";

const SNIPPET_LANGS = [
  { id: "nodejs",  label: "Node.js" },
  { id: "python",  label: "Python"  },
  { id: "go",      label: "Go"      },
  { id: "java",    label: "Java"    },
  { id: "swift",   label: "Swift"   },
  { id: "csharp",  label: "C#"      },
  { id: "php",     label: "PHP"     },
];

function getSnippets(app: typeof MOCK_APPS[0]) {
  return {
    nodejs: `import { expressjwt as jwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'

export const authMiddleware = jwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: '${app.oidc.jwks_uri}',
    cache: true,
    rateLimit: true,
  }),
  audience: '${app.oidc.client_id}',
  issuer: '${app.oidc.issuer}',
  algorithms: ['RS256'],
})

// req.auth.sub         → user ID
// req.auth.realm_roles → assigned roles`,
    python: `from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
import httpx

JWKS_URI = "${app.oidc.jwks_uri}"
ISSUER = "${app.oidc.issuer}"
AUDIENCE = "${app.oidc.client_id}"

security = HTTPBearer()

def get_current_user(token = Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            get_jwks(),
            algorithms=["RS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401)`,
    go: `package middleware

import (
  "context"
  "net/http"
  "github.com/lestrrat-go/jwx/v2/jwk"
  "github.com/lestrrat-go/jwx/v2/jwt"
)

const jwksURI = "${app.oidc.jwks_uri}"
const issuer = "${app.oidc.issuer}"

func AuthMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    keySet, _ := jwk.Fetch(context.Background(), jwksURI)
    tokenStr := r.Header.Get("Authorization")[7:]
    token, err := jwt.Parse([]byte(tokenStr), jwt.WithKeySet(keySet))
    if err != nil {
      http.Error(w, "Unauthorized", 401)
      return
    }
    ctx := context.WithValue(r.Context(), "user", token)
    next.ServeHTTP(w, r.WithContext(ctx))
  })
}`,
    java: `import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;

public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String JWKS_URI = "${app.oidc.jwks_uri}";
    private static final String ISSUER   = "${app.oidc.issuer}";
    private static final String AUDIENCE = "${app.oidc.client_id}";

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        try {
            Claims claims = Jwts.parserBuilder()
                .setSigningKeyResolver(new JwksSigningKeyResolver(JWKS_URI))
                .requireIssuer(ISSUER)
                .requireAudience(AUDIENCE)
                .build()
                .parseClaimsJws(header.substring(7))
                .getBody();

            req.setAttribute("userId", claims.getSubject());
            chain.doFilter(req, res);
        } catch (JwtException e) {
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED);
        }
    }
}`,
    swift: `import Foundation

struct JWTValidator {
    static let jwksURI  = "${app.oidc.jwks_uri}"
    static let issuer   = "${app.oidc.issuer}"
    static let audience = "${app.oidc.client_id}"

    /// Fetches JWKS and validates the token's claims.
    /// Use JWTDecode.swift or AppAuth for production signature verification.
    static func validate(token: String,
                         completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let url = URL(string: jwksURI) else { return }

        URLSession.shared.dataTask(with: url) { data, _, error in
            if let error = error { completion(.failure(error)); return }
            guard let data = data else { return }

            let parts = token.components(separatedBy: ".")
            guard parts.count == 3,
                  let padded = parts[1].base64Padded,
                  let payloadData = Data(base64Encoded: padded),
                  let payload = try? JSONSerialization.jsonObject(
                      with: payloadData) as? [String: Any]
            else { completion(.failure(URLError(.badServerResponse))); return }

            let iss = payload["iss"] as? String
            let aud = payload["aud"] as? String
            let exp = payload["exp"] as? TimeInterval ?? 0

            guard iss == issuer,
                  aud == audience,
                  exp > Date().timeIntervalSince1970
            else { completion(.failure(URLError(.userAuthenticationRequired))); return }

            completion(.success(payload)) // payload["sub"] → user ID
        }.resume()
    }
}

private extension String {
    var base64Padded: String? {
        let r = count % 4
        return r == 0 ? self : self + String(repeating: "=", count: 4 - r)
    }
}`,
    csharp: `using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // OIDC discovery is used to fetch signing keys automatically
        options.Authority       = "${app.oidc.issuer}";
        options.MetadataAddress = "${app.oidc.issuer}/.well-known/openid-configuration";

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidIssuer              = "${app.oidc.issuer}",
            ValidateAudience         = true,
            ValidAudience            = "${app.oidc.client_id}",
            ValidateLifetime         = true,
            ValidAlgorithms          = new[] { SecurityAlgorithms.RsaSha256 },
            RequireSignedTokens      = true,
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

// In your controller:
// [Authorize]
// public IActionResult Protected() {
//     var userId = User.FindFirst("sub")?.Value;
//     return Ok(userId);
// }`,
    php: `<?php
// Requires: composer require firebase/php-jwt

require 'vendor/autoload.php';

use Firebase\\JWT\\JWT;
use Firebase\\JWT\\JWK;

const JWKS_URI = '${app.oidc.jwks_uri}';
const ISSUER   = '${app.oidc.issuer}';
const AUDIENCE = '${app.oidc.client_id}';

function validateBearerToken(): object {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($header, 'Bearer ')) {
        http_response_code(401);
        exit(json_encode(['error' => 'Missing bearer token']));
    }

    $token = substr($header, 7);
    $jwks  = json_decode(file_get_contents(JWKS_URI), true);
    $keys  = JWK::parseKeySet($jwks);

    try {
        $decoded = JWT::decode($token, $keys);
    } catch (\\Exception $e) {
        http_response_code(401);
        exit(json_encode(['error' => 'Invalid token']));
    }

    if ($decoded->iss !== ISSUER || $decoded->aud !== AUDIENCE) {
        http_response_code(401);
        exit(json_encode(['error' => 'Token audience or issuer mismatch']));
    }

    return $decoded; // $decoded->sub → user ID
}

// Usage:
$user = validateBearerToken();
echo "Hello, " . $user->sub;`,
  };
}

function OidcField({ label, value, mono = false, copy = true }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 py-3 border-b border-border/60 last:border-0">
      <dt className="w-full sm:w-52 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={`text-sm text-foreground truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
        {copy && <CopyButton text={value} />}
        {value.startsWith("https://") && (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground ml-0.5">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </dd>
    </div>
  );
}

export default function AppDetail() {
  const { appId } = useParams();
  const [activeLang, setActiveLang] = useState("nodejs");
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotated, setRotated] = useState(false);

  const appIndex = MOCK_APPS.findIndex((a) => a.id === appId);
  const app = appIndex !== -1 ? MOCK_APPS[appIndex] : undefined;
  if (!app) return (
    <Layout title="App Not Found">
      <p className="text-muted-foreground">App not found. <Link href="/apps" className="text-primary hover:underline">Back to apps</Link></p>
    </Layout>
  );

  const prevApp = appIndex > 0 ? MOCK_APPS[appIndex - 1] : null;
  const nextApp = appIndex < MOCK_APPS.length - 1 ? MOCK_APPS[appIndex + 1] : null;

  const ws = MOCK_WORKSPACES.find(w => w.id === app.workspace_id);
  const snippets = getSnippets(app);
  const appLogs = MOCK_AUDIT_LOGS.filter(l => l.resource_id === app.id).slice(0, 3);
  const appWithExtras = app as typeof app & { error_reason?: string; error_since?: string };
  const isError = app.status === "error";
  const isProvisioning = app.status === "provisioning";

  return (
    <Layout
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: app.name },
      ]}
      title={app.name}
      actions={
        <div className="flex items-center gap-2">
          {app.type === "confidential" && (
            <button
              onClick={() => setRotateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Rotate Secret
            </button>
          )}
          <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Edit App
          </button>
        </div>
      }
    >
      <DetailNav
        backHref="/apps"
        backLabel="All Apps"
        prevHref={prevApp ? `/apps/${prevApp.id}` : null}
        nextHref={nextApp ? `/apps/${nextApp.id}` : null}
        prevLabel={prevApp?.name}
        nextLabel={nextApp?.name}
      />

      {/* Error callout — shown above everything else when the app is failing */}
      {isError && appWithExtras.error_reason && (
        <div className="mb-5 rounded-xl border border-l-4 border-red-200 border-l-red-500 bg-red-50/70 px-4 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">Authentication is failing — action required</p>
            <p className="text-sm text-red-700 mt-1">{appWithExtras.error_reason}</p>
            {appWithExtras.error_since && (
              <p className="text-xs text-red-600 mt-1.5">
                Error began: {new Date(appWithExtras.error_since).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-red-700 font-medium">Recommended fixes:</span>
              <span className="text-xs text-red-700">1. Verify the JWKS endpoint is reachable from your service network</span>
              <span className="text-xs text-red-700">2. Check firewall rules allowing outbound HTTPS to the issuer domain</span>
              <span className="text-xs text-red-700">3. If the secret was recently rotated, update the secret in your service config</span>
            </div>
          </div>
        </div>
      )}

      {isProvisioning && (
        <div className="mb-5 rounded-xl border border-l-4 border-blue-200 border-l-blue-400 bg-blue-50/60 px-4 py-3 flex items-center gap-3">
          <Activity className="h-4 w-4 text-blue-600 shrink-0 animate-pulse" />
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Realm is provisioning.</span>{" "}
            OIDC endpoints will be available in approximately 2 minutes. No action needed.
          </p>
        </div>
      )}

      {/* App identity header — Q1+Q2: what is it, what state is it in */}
      <div className={`rounded-xl border bg-card px-5 py-4 mb-6 ${isError ? "border-red-200" : "border-border"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h2 className="text-lg font-bold text-foreground">{app.name}</h2>
              <StatusBadge status={app.status} dot />
              <StatusBadge status={app.type} />
              <StatusBadge status={app.pkce} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Workspace: <Link href={`/workspaces/${ws?.id}`} className="text-primary hover:underline">{ws?.name}</Link></span>
              <span>Token TTL: {app.access_token_seconds / 60}m access / {app.refresh_token_seconds / 86400}d refresh</span>
            </div>
          </div>
        </div>

        {/* Usage stats — operational context visible without navigating */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/60">
          <div>
            <div className="text-xs text-muted-foreground">Logins (30d)</div>
            <div className="text-xl font-semibold text-foreground">{app.logins_30d.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Active sessions</div>
            <div className={`text-xl font-semibold ${isError ? "text-red-600" : "text-foreground"}`}>{app.active_sessions}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Redirect URIs</div>
            <div className="text-xl font-semibold text-foreground">{app.redirect_uris.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last login</div>
            <div className="text-sm font-medium text-foreground mt-0.5">
              {app.last_login_at
                ? new Date(app.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : <span className="text-muted-foreground italic">No logins yet</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── OIDC Configuration — always visible, never collapsed (§6C) ─────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div>
            <h3 className="text-sm font-semibold text-foreground">OIDC Configuration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Use these endpoints to integrate this app with your services</p>
          </div>
          <CopyButton
            text={JSON.stringify(app.oidc, null, 2)}
            className="text-xs"
          />
        </div>
        <div className="px-5">
          <dl>
            <OidcField label="Client ID" value={app.oidc.client_id} mono />
            {app.type === "confidential" && <OidcField label="Client Secret" value="sk_live_••••••••••••••••••" copy={false} />}
            <OidcField label="Issuer" value={app.oidc.issuer} mono />
            <OidcField label="Authorization endpoint" value={app.oidc.authorization_endpoint} mono />
            <OidcField label="Token endpoint" value={app.oidc.token_endpoint} mono />
            <OidcField label="JWKS URI" value={app.oidc.jwks_uri} mono />
            <OidcField label="Well-known config" value={`${app.oidc.issuer}/.well-known/openid-configuration`} mono />
          </dl>
        </div>
      </div>

      {/* ── App Configuration — always visible ──────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">App Configuration</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Redirect URIs, allowed origins, scopes, and token lifetimes</p>
        </div>
        <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Redirect URIs</div>
            <div className="space-y-1.5">
              {app.redirect_uris.map((u) => (
                <div key={u} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <span className="text-xs font-mono text-foreground flex-1 truncate">{u}</span>
                  <CopyButton text={u} size="sm" />
                </div>
              ))}
              {app.post_logout_redirect_uris.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-3 mb-1.5">Post-logout redirect URIs</div>
                  {app.post_logout_redirect_uris.map((u) => (
                    <div key={u} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                      <span className="text-xs font-mono text-foreground flex-1 truncate">{u}</span>
                      <CopyButton text={u} size="sm" />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Scopes</div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {app.scopes.map((s) => (
                <span key={s} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-mono text-primary">{s}</span>
              ))}
            </div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Token Lifetimes</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Access token</span>
                <span className="font-medium text-foreground">{app.access_token_seconds}s ({app.access_token_seconds / 60} min)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Refresh token</span>
                <span className="font-medium text-foreground">{app.refresh_token_seconds}s ({app.refresh_token_seconds / 86400} days)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Integration Snippets — always visible, language toggle preserved ──── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">Integration Snippets</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Copy into your backend service to validate JWTs from this app</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-1 mb-4 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
            <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700">These snippets validate signed RS256 JWTs. Replace <code className="bg-blue-100 px-1 rounded">audience</code> if your service uses a different client ID.</p>
          </div>
          <div className="flex gap-1 mb-4">
            {SNIPPET_LANGS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveLang(id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeLang === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <CodeBlock
            code={snippets[activeLang as keyof typeof snippets]}
            language={activeLang}
            title={`${SNIPPET_LANGS.find(l => l.id === activeLang)?.label} — JWT validation middleware`}
          />
        </div>
      </div>

      {/* ── Lineage — who created this, when, what happened (§detached records) ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">App Lineage</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Provenance and recent history for this app</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Created by</div>
              <div className="text-sm font-medium text-foreground">{app.created_by}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Created at</div>
              <div className="text-sm font-medium text-foreground">
                {new Date(app.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Workspace</div>
              <div className="text-sm font-medium text-foreground">{ws?.name ?? "—"}</div>
            </div>
          </div>
        </div>
        {appLogs.length > 0 ? (
          <div className="px-5 py-3 space-y-2.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent audit events</div>
            {appLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${log.severity === "high" ? "bg-red-100 text-red-700" : log.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {log.action}
                </span>
                <span className="text-xs text-muted-foreground">{log.actor_email}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            ))}
            <Link href="/audit-logs" className="text-xs text-primary hover:underline block mt-1">View full audit trail →</Link>
          </div>
        ) : (
          <div className="px-5 py-3 text-xs text-muted-foreground italic">No audit events recorded for this app yet.</div>
        )}
      </div>

      {/* Rotate secret modal */}
      {rotateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Rotate client secret?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This immediately invalidates the current secret. Any service using it will fail authentication until updated with the new secret.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 mb-5">
              <strong>Impact:</strong> {app.active_sessions} active sessions are unaffected (they hold valid tokens). New authentication attempts will fail until you deploy the new secret to your service.
            </div>
            {rotated && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 mb-5 font-mono break-all">
                New secret: sk_live_a7f3b2c9d8e1f4a6b3c7d2e5f8a1b4c7d3e6f9a2b5c8
                <CopyButton text="sk_live_a7f3b2c9d8e1f4a6b3c7d2e5f8a1b4c7d3e6f9a2b5c8" className="ml-2" />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRotateOpen(false); setRotated(false); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              {!rotated && (
                <button onClick={() => setRotated(true)} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-opacity">
                  Rotate now
                </button>
              )}
              {rotated && <button onClick={() => { setRotateOpen(false); setRotated(false); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Done — secret copied?</button>}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
