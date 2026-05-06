import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

interface PasswordStrength {
  minLength: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
}

function checkPassword(pw: string): PasswordStrength {
  return {
    minLength: pw.length >= 12,
    hasUpper: /[A-Z]/.test(pw),
    hasDigit: /[0-9]/.test(pw),
    hasSymbol: /[^A-Za-z0-9]/.test(pw),
  };
}

function StrengthRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      )}
      <span className={`text-xs ${ok ? "text-emerald-700" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = checkPassword(password);
  const passwordValid = Object.values(strength).every(Boolean);
  const passwordsMatch = password === confirmPw && confirmPw.length > 0;

  const canSubmit =
    fullName.trim().length >= 2 &&
    email.includes("@") &&
    orgName.trim().length >= 2 &&
    passwordValid &&
    passwordsMatch &&
    agreed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      sessionStorage.setItem("foundry_signup_email", email);
      setLocation("/verify-email");
    } catch {
      setError("We could not create your account. Try again in a few minutes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[42%] flex-col bg-[hsl(222_47%_11%)] px-12 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3 mb-16">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20">
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">Foundry IAM</span>
        </div>
        <div className="relative mt-auto max-w-sm">
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Ship auth in&nbsp;30&nbsp;minutes,<br />not&nbsp;30&nbsp;days.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Enterprise-grade identity management — without the ops overhead.
          </p>
          <div className="space-y-3">
            {[
              "Dedicated identity domain, zero shared infra",
              "OIDC, SAML 2.0, SCIM &amp; federation out of the box",
              "Audit logs &amp; SOC 2-ready from day one",
              "Usage-based billing — free up to 1,000 MAU",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-slate-300 text-sm" dangerouslySetInnerHTML={{ __html: f }} />
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-slate-700/60 grid grid-cols-3 gap-4">
            {[["99.9%", "uptime SLA"], ["<30ms", "auth latency"], ["SOC 2", "compliant"]].map(([v, l]) => (
              <div key={v}>
                <div className="text-lg font-semibold text-white">{v}</div>
                <div className="text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sign-up form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Foundry IAM</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Chen"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              />
            </div>

            {/* Work Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Work Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              />
              <p className="text-xs text-muted-foreground mt-1">Use your work email — personal domains (Gmail, Yahoo, etc.) are not accepted.</p>
            </div>

            {/* Organisation Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Organisation Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                autoComplete="organization"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              />
              <p className="text-xs text-muted-foreground mt-1">A dedicated identity workspace will be provisioned for this organisation.</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 12 characters"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <StrengthRow ok={strength.minLength} label="At least 12 characters" />
                  <StrengthRow ok={strength.hasUpper} label="One uppercase letter" />
                  <StrengthRow ok={strength.hasDigit} label="One number" />
                  <StrengthRow ok={strength.hasSymbol} label="One special character (!@#$…)" />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Confirm Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full rounded-lg border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                    confirmPw.length > 0 && !passwordsMatch
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:border-ring"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPw.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-sm text-foreground">
                I agree to the{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="mt-1 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : (
                <>Create account <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By creating an account, a dedicated identity workspace will be provisioned for your organisation.
            This takes approximately 30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
