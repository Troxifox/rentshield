"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeListing,
  buildSafetyReport,
  calculateBudgetStatus,
  formatCurrency,
  getTypicalStudentRent,
  type RentListingInput,
  type RiskLevel,
  type SavedListing,
} from "@/lib/rentshield";

const STORAGE_KEY = "rentshield.savedListings";

const sampleListing: RentListingInput = {
  title: "Sunny studio near campus",
  city: "Paris",
  monthlyRent: 540,
  depositAmount: 1400,
  visitPossible: false,
  paymentBeforeVisit: true,
  landlordVerified: false,
  sensitiveDocsEarly: true,
  signedLease: false,
  description:
    "Cozy furnished studio available immediately. Fast move-in preferred. Contact only by private messaging. Limited detail provided and no clear lease terms listed yet.",
};

const initialForm: RentListingInput = {
  title: "",
  city: "",
  monthlyRent: 0,
  depositAmount: 0,
  visitPossible: true,
  paymentBeforeVisit: false,
  landlordVerified: true,
  sensitiveDocsEarly: false,
  signedLease: true,
  description: "",
};

type BudgetForm = {
  monthlyIncome: number;
  estimatedUtilities: number;
};

const initialBudget: BudgetForm = {
  monthlyIncome: 1500,
  estimatedUtilities: 120,
};

const proofPoints = [
  { value: "0-100", label: "rule-based risk score" },
  { value: "Local", label: "browser-only saved comparisons" },
  { value: "3-way", label: "affordability signal for students" },
];

const sectorTags = [
  "Cybersecurity and Privacy",
  "Financial Technology",
  "Web and Mobile Development",
  "Data Science and Analytics",
  "Product Management and Strategy",
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getRiskClasses(level: RiskLevel) {
  if (level === "Low risk") {
    return {
      badge:
        "border border-emerald-300/30 bg-emerald-400/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
      accent: "from-emerald-400 via-teal-300 to-cyan-300",
      soft: "border-emerald-400/18 bg-emerald-400/10 text-emerald-100",
      halo: "shadow-[0_0_0_10px_rgba(16,185,129,0.10)]",
      chip: "bg-emerald-100 text-emerald-700",
    };
  }

  if (level === "Medium risk") {
    return {
      badge:
        "border border-amber-300/30 bg-amber-400/15 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
      accent: "from-amber-400 via-orange-300 to-yellow-200",
      soft: "border-amber-400/18 bg-amber-400/10 text-amber-100",
      halo: "shadow-[0_0_0_10px_rgba(245,158,11,0.10)]",
      chip: "bg-amber-100 text-amber-700",
    };
  }

  return {
    badge:
      "border border-rose-300/30 bg-rose-400/15 text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
    accent: "from-rose-500 via-orange-400 to-amber-300",
    soft: "border-rose-400/18 bg-rose-400/10 text-rose-100",
    halo: "shadow-[0_0_0_10px_rgba(244,63,94,0.10)]",
    chip: "bg-rose-100 text-rose-700",
  };
}

export function RentShieldApp() {
  const [form, setForm] = useState<RentListingInput>(initialForm);
  const [budget, setBudget] = useState<BudgetForm>(initialBudget);
  const [savedListings, setSavedListings] = useState<SavedListing[]>([]);
  const [copied, setCopied] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SavedListing[];
      setSavedListings(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedListings));
  }, [isHydrated, savedListings]);

  const analysis = useMemo(() => analyzeListing(form), [form]);
  const budgetStatus = useMemo(
    () =>
      calculateBudgetStatus(
        budget.monthlyIncome,
        form.monthlyRent,
        budget.estimatedUtilities,
      ),
    [budget, form.monthlyRent],
  );

  const report = useMemo(
    () =>
      buildSafetyReport(
        form,
        analysis,
        budget.monthlyIncome,
        budget.estimatedUtilities,
      ),
    [analysis, budget.estimatedUtilities, budget.monthlyIncome, form],
  );

  const riskClasses = getRiskClasses(analysis.level);
  const typicalRent = getTypicalStudentRent(form.city);
  const riskPercent = Math.max(analysis.score, 4);
  const coverageAngle = Math.max(analysis.score * 3.6, 8);
  const affordabilityTone =
    budgetStatus.label === "Affordable"
      ? "bg-emerald-100 text-emerald-700"
      : budgetStatus.label === "Stretch"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  function updateField<K extends keyof RentListingInput>(
    key: K,
    value: RentListingInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function saveCurrentListing() {
    const identifier =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;

    const entry: SavedListing = {
      ...form,
      ...analysis,
      id: identifier,
      createdAt: new Date().toISOString(),
      budgetStatus: budgetStatus.label,
      monthlyIncome: budget.monthlyIncome,
      estimatedUtilities: budget.estimatedUtilities,
      housingCostRatio: budgetStatus.ratio,
      report,
    };

    setSavedListings((current) => [entry, ...current].slice(0, 8));
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function loadSample() {
    setForm(sampleListing);
    setBudget({
      monthlyIncome: 1450,
      estimatedUtilities: 110,
    });
  }

  function clearAll() {
    setForm(initialForm);
    setBudget(initialBudget);
  }

  function loadSavedListing(listing: SavedListing) {
    setForm({
      title: listing.title,
      city: listing.city,
      monthlyRent: listing.monthlyRent,
      depositAmount: listing.depositAmount,
      visitPossible: listing.visitPossible,
      paymentBeforeVisit: listing.paymentBeforeVisit,
      landlordVerified: listing.landlordVerified,
      sensitiveDocsEarly: listing.sensitiveDocsEarly,
      signedLease: listing.signedLease,
      description: listing.description,
    });
    setBudget({
      monthlyIncome: listing.monthlyIncome,
      estimatedUtilities: listing.estimatedUtilities,
    });
  }

  function removeSavedListing(id: string) {
    setSavedListings((current) => current.filter((listing) => listing.id !== id));
  }

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-4rem] h-[30rem] w-[30rem] rounded-full bg-cyan-300/18 blur-3xl" />
        <div className="absolute right-[-8rem] top-20 h-[28rem] w-[28rem] rounded-full bg-orange-300/18 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-teal-300/14 blur-3xl" />
        <div className="grid-fade absolute inset-0 opacity-45" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center justify-between rounded-full border border-white/10 bg-slate-950/55 px-4 py-3 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white">
              RentShield
            </div>
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 sm:inline-flex">
              Student rental scam prevention
            </span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <TopPill text="No AI" />
            <TopPill text="Local storage" />
            <TopPill text="Explainable score" />
          </div>
        </nav>

        <section className="mb-6 overflow-hidden rounded-[38px] border border-slate-800 bg-slate-950 text-white shadow-[0_34px_100px_-42px_rgba(15,23,42,0.95)]">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.15),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%)]" />
            <div className="relative grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-10">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100">
                    Security-first housing checks
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
                    Trusted student rental screening
                  </span>
                </div>

                <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold leading-[0.96] tracking-tight text-white sm:text-5xl lg:text-[4.4rem]">
                  Beautiful risk intelligence for student rentals.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  RentShield turns common rental scam patterns into a crisp,
                  modern decision experience with transparent scoring, budget
                  context, and side-by-side listing comparison.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <ActionButton
                    label="Load sample listing"
                    onClick={loadSample}
                    className="bg-white text-slate-950 hover:bg-slate-100"
                  />
                  <ActionButton
                    label="Save current listing"
                    onClick={saveCurrentListing}
                    className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  />
                  <ActionButton
                    label={copied ? "Report copied" : "Copy safety report"}
                    onClick={copyReport}
                    className="border border-orange-300/25 bg-orange-300/10 text-orange-100 hover:bg-orange-300/15"
                  />
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-3">
                  {proofPoints.map((item) => (
                    <HeroStatCard
                      key={item.label}
                      value={item.value}
                      label={item.label}
                    />
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[32px] border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
                  <div className="rounded-[26px] border border-white/8 bg-slate-950/55 p-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                          Live command center
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-white">
                          {analysis.score}
                          <span className="ml-1 text-lg text-slate-500">/100</span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-semibold",
                          riskClasses.badge,
                        )}
                      >
                        {analysis.level}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
                      <div className="flex items-center justify-center">
                        <div
                          className={cn(
                            "relative flex h-40 w-40 items-center justify-center rounded-full bg-black/20",
                            riskClasses.halo,
                          )}
                          style={{
                            background: `conic-gradient(from 180deg, ${
                              analysis.level === "Low risk"
                                ? "#22c55e"
                                : analysis.level === "Medium risk"
                                  ? "#f59e0b"
                                  : "#f43f5e"
                            } ${coverageAngle}deg, rgba(255,255,255,0.08) ${coverageAngle}deg)`,
                          }}
                        >
                          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/10 bg-slate-950">
                            <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                              Score
                            </span>
                            <span className="mt-2 text-4xl font-semibold text-white">
                              {analysis.score}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <InsightRow
                          title="Typical student rent"
                          value={formatCurrency(typicalRent)}
                          detail={`Benchmark for ${form.city || "selected city"}`}
                        />
                        <InsightRow
                          title="Budget pressure"
                          value={`${Math.round(budgetStatus.ratio * 100)}%`}
                          detail={budgetStatus.summary}
                        />
                        <InsightRow
                          title="Red flags detected"
                          value={`${analysis.redFlags.length}`}
                          detail="Triggered by the current rule set"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <SurfaceCard className="p-6 sm:p-8">
              <SectionTitle
                eyebrow="Rental Checker"
                title="Analyze every listing like a careful tenant advocate."
                subtitle="Each answer updates a transparent score, a city benchmark, and specific risk explanations."
              />

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <InputField
                  label="Listing title"
                  value={form.title}
                  onChange={(value) => updateField("title", value)}
                  placeholder="Bright studio near engineering campus"
                />
                <InputField
                  label="City"
                  value={form.city}
                  onChange={(value) => updateField("city", value)}
                  placeholder="Paris"
                />
                <NumberField
                  label="Monthly rent"
                  value={form.monthlyRent}
                  onChange={(value) => updateField("monthlyRent", value)}
                />
                <NumberField
                  label="Deposit amount"
                  value={form.depositAmount}
                  onChange={(value) => updateField("depositAmount", value)}
                />
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <ToggleField
                  label="Is a visit possible?"
                  checked={form.visitPossible}
                  onChange={(value) => updateField("visitPossible", value)}
                  positiveLabel="Yes"
                  negativeLabel="No"
                />
                <ToggleField
                  label="Is payment requested before visit?"
                  checked={form.paymentBeforeVisit}
                  onChange={(value) => updateField("paymentBeforeVisit", value)}
                  positiveLabel="Yes"
                  negativeLabel="No"
                />
                <ToggleField
                  label="Is the landlord identity verified?"
                  checked={form.landlordVerified}
                  onChange={(value) => updateField("landlordVerified", value)}
                  positiveLabel="Yes"
                  negativeLabel="No"
                />
                <ToggleField
                  label="Are sensitive documents requested early?"
                  checked={form.sensitiveDocsEarly}
                  onChange={(value) => updateField("sensitiveDocsEarly", value)}
                  positiveLabel="Yes"
                  negativeLabel="No"
                />
                <ToggleField
                  label="Is there a signed lease?"
                  checked={form.signedLease}
                  onChange={(value) => updateField("signedLease", value)}
                  positiveLabel="Yes"
                  negativeLabel="No"
                />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Listing description
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={6}
                  placeholder="Paste the original description or summarize the most important information about the listing."
                  className="field-textarea"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton
                  label="Save to dashboard"
                  onClick={saveCurrentListing}
                  className="bg-slate-950 text-white hover:bg-slate-800"
                />
                <ActionButton
                  label="Reset form"
                  onClick={clearAll}
                  className="border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                />
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6 sm:p-8">
              <SectionTitle
                eyebrow="Budget Calculator"
                title="Check whether the listing is realistic for a student budget."
                subtitle="This adds financial context so suspiciously cheap or financially risky options stand out faster."
              />

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <NumberField
                  label="Monthly income"
                  value={budget.monthlyIncome}
                  onChange={(value) =>
                    setBudget((current) => ({ ...current, monthlyIncome: value }))
                  }
                />
                <NumberField
                  label="Estimated utilities"
                  value={budget.estimatedUtilities}
                  onChange={(value) =>
                    setBudget((current) => ({
                      ...current,
                      estimatedUtilities: value,
                    }))
                  }
                />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="premium-panel rounded-[30px] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Affordability status
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-3xl font-semibold text-slate-50">
                      {budgetStatus.label}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-sm font-semibold",
                        affordabilityTone,
                      )}
                    >
                      {Math.round(budgetStatus.ratio * 100)}% ratio
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {budgetStatus.summary}
                  </p>
                </div>

                <div className="rounded-[30px] bg-slate-950 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Cost snapshot
                  </p>
                  <div className="mt-4 space-y-3">
                    <CostLine
                      label="Monthly rent"
                      value={formatCurrency(form.monthlyRent)}
                    />
                    <CostLine
                      label="Estimated utilities"
                      value={formatCurrency(budget.estimatedUtilities)}
                    />
                    <CostLine
                      label="Total housing cost"
                      value={formatCurrency(
                        form.monthlyRent + budget.estimatedUtilities,
                      )}
                    />
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </div>

          <div className="space-y-6 xl:sticky xl:top-5 xl:self-start">
            <SurfaceCard className="overflow-hidden p-0">
              <div className="bg-slate-950 px-6 py-6 text-white sm:px-7">
                <SectionTitle
                  eyebrow="Decision Panel"
                  title="Understand the risk at a glance."
                  subtitle="A focused summary layout keeps the score, signals, and next steps easy to read."
                  inverse
                />

                <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Scam risk score</p>
                      <p className="mt-1 text-5xl font-semibold tracking-tight text-white">
                        {analysis.score}
                        <span className="text-2xl text-slate-500">/100</span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold",
                        riskClasses.badge,
                      )}
                    >
                      {analysis.level}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Confidence from rule triggers</span>
                      <span>{analysis.score}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all",
                          riskClasses.accent,
                        )}
                        style={{ width: `${riskPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniMetric label="Flags" value={`${analysis.redFlags.length}`} />
                    <MiniMetric
                      label="Budget"
                      value={budgetStatus.label.replace(" ", "\u00a0")}
                    />
                    <MiniMetric label="Baseline" value={formatCurrency(typicalRent)} />
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6 sm:px-7">
                <div>
                  <PanelHeader
                    title="Red flags"
                    meta={`${analysis.redFlags.length} triggered`}
                  />
                  <div className="mt-3 space-y-3">
                    {analysis.redFlags.length ? (
                      analysis.redFlags.map((flag, index) => (
                        <FlagCard
                          key={flag}
                          index={index + 1}
                          text={flag}
                          className={riskClasses.soft}
                        />
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-200">
                        No major rule violations were triggered by the current
                        input.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <PanelHeader
                    title="Safety recommendations"
                    meta="Best next steps"
                  />
                  <div className="mt-3 space-y-3">
                    {analysis.recommendations.map((recommendation, index) => (
                      <RecommendationCard
                        key={recommendation}
                        index={index + 1}
                        text={recommendation}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6 sm:p-7">
              <SectionTitle
                eyebrow="Comparison Dashboard"
                title="Compare which listing deserves more trust."
                subtitle="Everything is stored locally, so your saved comparisons stay fast, private, and easy to revisit."
              />

              <div className="mt-6 flex flex-wrap gap-2">
                {sectorTags.map((tag) => (
                  <SectorTag key={tag} text={tag} />
                ))}
              </div>

              <div className="mt-6 space-y-4">
                {savedListings.length ? (
                  savedListings.map((listing) => (
                    <SavedListingCard
                      key={listing.id}
                      listing={listing}
                      onLoad={() => loadSavedListing(listing)}
                      onCopy={() => navigator.clipboard.writeText(listing.report)}
                      onRemove={() => removeSavedListing(listing.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
                    Saved listings appear here once you start analyzing and storing
                    properties for comparison.
                  </div>
                )}
              </div>
            </SurfaceCard>
          </div>
        </section>
      </div>
    </main>
  );
}

function TopPill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
      {text}
    </span>
  );
}

function SurfaceCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-[34px] border border-white/10 bg-slate-950/50 shadow-[0_26px_60px_-34px_rgba(0,0,0,0.6)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
  inverse,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  inverse?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.24em]",
          inverse ? "text-slate-400" : "text-slate-500",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "font-display mt-3 max-w-xl text-[1.9rem] font-semibold leading-[1.02] tracking-tight",
          inverse ? "text-white" : "text-slate-50",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-3 max-w-2xl text-sm leading-6",
          inverse ? "text-slate-300" : "text-slate-300",
        )}
      >
        {subtitle}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-5 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      {label}
    </button>
  );
}

function HeroStatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{label}</p>
    </div>
  );
}

function InsightRow({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/15 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-300">{title}</p>
          <p className="mt-2 text-base font-semibold text-white">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {title}
      </h3>
      <span className="text-xs font-medium text-slate-400">{meta}</span>
    </div>
  );
}

function FlagCard({
  index,
  text,
  className,
}: {
  index: number;
  text: string;
  className: string;
}) {
  return (
    <div className={cn("rounded-[24px] border px-4 py-4", className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-xs font-bold text-white ring-1 ring-white/10">
          {index}
        </span>
        <p className="text-sm leading-6">{text}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ index, text }: { index: number; text: string }) {
  return (
    <div className="premium-panel rounded-[24px] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
          {index}
        </span>
        <p className="text-sm leading-6 text-slate-200">{text}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SectorTag({ text }: { text: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 shadow-[0_8px_20px_-18px_rgba(0,0,0,0.32)]">
      {text}
    </div>
  );
}

function SavedListingCard({
  listing,
  onLoad,
  onCopy,
  onRemove,
}: {
  listing: SavedListing;
  onLoad: () => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const riskClasses = getRiskClasses(listing.level);

  return (
    <div className="premium-panel rounded-[28px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-50">
            {listing.title || "Untitled listing"}
          </p>
          <p className="mt-1 text-sm text-slate-500">{listing.city}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            riskClasses.chip,
          )}
        >
          {listing.level}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CompactMetric label="Rent" value={formatCurrency(listing.monthlyRent)} />
        <CompactMetric
          label="Deposit"
          value={formatCurrency(listing.depositAmount)}
        />
        <CompactMetric label="Budget" value={listing.budgetStatus} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton
          label="Load"
          onClick={onLoad}
          className="bg-slate-950 px-4 py-2 text-xs text-white hover:bg-slate-800"
        />
        <ActionButton
          label="Copy report"
          onClick={onCopy}
          className="border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 hover:bg-white/10"
        />
        <ActionButton
          label="Remove"
          onClick={onRemove}
          className="border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs text-rose-200 hover:bg-rose-400/15"
        />
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">
        {label}
      </span>
      <input
        type="number"
        min="0"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="field-input"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  positiveLabel,
  negativeLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  positiveLabel: string;
  negativeLabel: string;
}) {
  return (
    <div className="premium-panel rounded-[28px] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-6 text-slate-200">{label}</p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
            checked
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-white/5 text-slate-400",
          )}
        >
          {checked ? positiveLabel : negativeLabel}
        </span>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/20 p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            checked ? "bg-teal-300 text-slate-950" : "text-slate-400",
          )}
        >
          {positiveLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            !checked ? "bg-teal-300 text-slate-950" : "text-slate-400",
          )}
        >
          {negativeLabel}
        </button>
      </div>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function CostLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
