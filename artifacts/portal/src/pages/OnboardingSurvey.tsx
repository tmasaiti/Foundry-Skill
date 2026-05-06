import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const APPS = [
  "Active Directory", "Office 365", "Google Workspace", "Slack", "Zoom",
  "Salesforce", "AWS IAM", "Atlassian Cloud", "Dropbox", "Datadog", "PagerDuty", "Other",
];

const SOURCES = [
  "Active Directory", "SuccessFactors", "Office 365", "CSV / XLS import",
  "Google Workspace", "Workday", "Other",
];

const FEATURES = [
  "Single Sign-On (SSO)",
  "Automation & Workflows",
  "Multi-Factor Authentication",
  "Authentication Capabilities",
  "Identity Governance & Administration",
  "Other",
];

const TOTAL = 4;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: TOTAL }, (_, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
                done
                  ? "bg-primary text-primary-foreground"
                  : active
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </div>
            {n < TOTAL && (
              <div className={cn("h-px w-10 transition-colors", done ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-xs text-muted-foreground">{step} of {TOTAL}</span>
    </div>
  );
}

function MultiTile({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all",
              active
                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  active ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}
              >
                {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              {opt}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SingleTile({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              "rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all",
              active
                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active ? "border-primary" : "border-muted-foreground/40"
                )}
              >
                {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
              {opt}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingSurvey() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleApp(v: string) {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  function toggleFeature(v: string) {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  async function handleFinish() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    navigate("/getting-started");
  }

  const step1Valid = selectedApps.size > 0;
  const step2Valid = selectedSource !== "";
  const step3Valid = selectedFeatures.size > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Foundry IAM</span>
        </div>
        <button
          onClick={() => navigate("/getting-started")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip survey →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <ProgressBar step={step} />

          {/* Step 1 — Apps to integrate */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Which apps do you want to integrate first?</h2>
              <p className="text-sm text-muted-foreground mb-6">Select all that apply. We'll prioritise these in your getting-started checklist.</p>
              <MultiTile options={APPS} selected={selectedApps} onToggle={toggleApp} />
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — User source */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Where are your users imported from?</h2>
              <p className="text-sm text-muted-foreground mb-6">This helps us recommend the right provisioning pathway (SCIM, CSV, or manual).</p>
              <SingleTile options={SOURCES} selected={selectedSource} onSelect={setSelectedSource} />
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!step2Valid}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Features interested in */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">What features are you most interested in?</h2>
              <p className="text-sm text-muted-foreground mb-6">Select all that apply. We'll surface the most relevant setup steps first.</p>
              <MultiTile options={FEATURES} selected={selectedFeatures} onToggle={toggleFeature} />
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!step3Valid}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Free text */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">What do you want to solve with Foundry IAM?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Tell us in your own words. This helps our team understand your use case and reach out if there's a faster path to value.
              </p>
              <textarea
                rows={6}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. We need to replace our home-grown auth system and add SSO for enterprise customers. Currently manually provisioning users from Active Directory…"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <div className="flex items-center justify-between mt-1 mb-8">
                <span className="text-xs text-muted-foreground">Optional — press Finish to skip</span>
                <span className={`text-xs ${notes.length > 450 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {notes.length}/500
                </span>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  ) : (
                    <>Finish — take me to my dashboard <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
