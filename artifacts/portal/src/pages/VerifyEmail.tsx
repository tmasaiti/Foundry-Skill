import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Mail, RefreshCcw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function VerifyEmail() {
  const [location] = useLocation();
  const isExpired = location.includes("error=link_expired");
  const email = sessionStorage.getItem("foundry_signup_email") ?? "your work email";

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [resendCooldown]);

  function handleResend() {
    if (resendCooldown > 0) return;
    setResendSent(true);
    setResendCooldown(60);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-semibold text-foreground">Foundry IAM</span>
      </div>

      <div className="w-full max-w-md">
        {isExpired && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Verification link expired</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Verification links are valid for 24 hours. Request a new one below.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-1">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-foreground mb-6 break-all">{email}</p>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-left mb-6">
            <p className="text-xs font-medium text-foreground mb-1">What to do next</p>
            <ol className="space-y-1">
              {[
                "Open the email from Foundry IAM",
                "Click the verification link",
                "You'll be taken to the getting-started survey",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            {resendSent && resendCooldown > 0 ? (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Email resent — check your inbox
              </div>
            ) : null}

            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className="h-4 w-4" />
              {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend verification email"}
            </button>

            <p className="text-xs text-muted-foreground">
              Wrong email?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Start over
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Demo — skip verification</p>
          <p className="text-xs text-muted-foreground mb-2">
            In the demo environment, email verification is bypassed. Go straight to the onboarding survey.
          </p>
          <Link href="/onboarding/survey">
            <button className="w-full rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
              Continue to survey →
            </button>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Verification links expire after 24 hours.{" "}
          <a href="#" className="hover:underline">Need help?</a>
        </p>
      </div>
    </div>
  );
}
