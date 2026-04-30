export type RentListingInput = {
  title: string;
  city: string;
  monthlyRent: number;
  depositAmount: number;
  visitPossible: boolean;
  paymentBeforeVisit: boolean;
  landlordVerified: boolean;
  sensitiveDocsEarly: boolean;
  signedLease: boolean;
  description: string;
};

export type RiskLevel = "Low risk" | "Medium risk" | "High risk";

export type RiskAnalysis = {
  score: number;
  level: RiskLevel;
  redFlags: string[];
  recommendations: string[];
};

export type SavedListing = RentListingInput &
  RiskAnalysis & {
    id: string;
    createdAt: string;
    budgetStatus: "Affordable" | "Stretch" | "Over budget";
    monthlyIncome: number;
    estimatedUtilities: number;
    housingCostRatio: number;
    report: string;
  };

const TYPICAL_STUDENT_RENT_BY_CITY: Record<string, number> = {
  paris: 850,
  lyon: 650,
  lille: 550,
  toulouse: 600,
  bordeaux: 650,
  marseille: 620,
  madrid: 700,
  barcelona: 850,
  berlin: 800,
  amsterdam: 1100,
  london: 1200,
  dublin: 1000,
  newyork: 1400,
  boston: 1300,
};

export function normalizeCity(city: string) {
  return city.toLowerCase().replace(/[^a-z]/g, "");
}

export function getTypicalStudentRent(city: string) {
  return TYPICAL_STUDENT_RENT_BY_CITY[normalizeCity(city)] ?? 700;
}

export function analyzeListing(input: RentListingInput): RiskAnalysis {
  let score = 0;
  const redFlags: string[] = [];

  if (input.paymentBeforeVisit) {
    score += 30;
    redFlags.push("Payment is requested before any in-person or live virtual visit.");
  }

  if (!input.visitPossible) {
    score += 25;
    redFlags.push("The property cannot be visited before committing.");
  }

  if (!input.landlordVerified) {
    score += 20;
    redFlags.push("The landlord or agent identity has not been verified.");
  }

  if (input.sensitiveDocsEarly) {
    score += 20;
    redFlags.push("Sensitive documents are requested too early in the process.");
  }

  if (!input.signedLease) {
    score += 20;
    redFlags.push("There is no signed lease agreement in place.");
  }

  if (input.monthlyRent > 0 && input.depositAmount > input.monthlyRent * 2) {
    score += 15;
    redFlags.push("The deposit is higher than two months of rent.");
  }

  const typicalRent = getTypicalStudentRent(input.city);
  if (input.monthlyRent > 0 && input.monthlyRent < typicalRent * 0.7) {
    score += 15;
    redFlags.push("The rent is far below the typical student price for this city.");
  }

  if (input.description.trim().length < 80) {
    score += 10;
    redFlags.push("The listing description is missing important detail.");
  }

  const cappedScore = Math.min(score, 100);
  const level = getRiskLevel(cappedScore);
  const recommendations = buildRecommendations(level, redFlags.length);

  return {
    score: cappedScore,
    level,
    redFlags,
    recommendations,
  };
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) {
    return "Low risk";
  }

  if (score <= 60) {
    return "Medium risk";
  }

  return "High risk";
}

export function calculateBudgetStatus(
  monthlyIncome: number,
  rent: number,
  utilities: number,
) {
  const housingCost = rent + utilities;
  const ratio = monthlyIncome > 0 ? housingCost / monthlyIncome : 1;

  if (ratio <= 0.35) {
    return {
      label: "Affordable" as const,
      ratio,
      summary: "Housing costs stay within a healthy student budget range.",
    };
  }

  if (ratio <= 0.5) {
    return {
      label: "Stretch" as const,
      ratio,
      summary: "This listing may work, but it could limit flexibility for food, transport, and emergencies.",
    };
  }

  return {
    label: "Over budget" as const,
    ratio,
    summary: "This listing is likely to put strong pressure on your monthly budget.",
  };
}

function buildRecommendations(level: RiskLevel, redFlagCount: number) {
  const base = [
    "Verify the landlord identity using official contact details and proof of ownership or agency authority.",
    "Never transfer money before a verified visit and signed lease.",
    "Use a secure payment method with a clear transaction record.",
  ];

  if (level === "Low risk") {
    return [
      ...base,
      "Keep copies of the listing, messages, and lease for your records.",
    ];
  }

  if (level === "Medium risk") {
    return [
      ...base,
      "Ask for a live video walkthrough if an in-person visit is difficult.",
      `Investigate the ${redFlagCount} flagged issue${redFlagCount === 1 ? "" : "s"} before proceeding.`,
    ];
  }

  return [
    ...base,
    "Pause the application until the red flags are resolved.",
    "Cross-check the address, photos, and contact details on trusted housing platforms.",
    "Consider reporting the listing to the platform or your university housing office.",
  ];
}

export function buildSafetyReport(
  listing: RentListingInput,
  analysis: RiskAnalysis,
  income: number,
  utilities: number,
) {
  const budget = calculateBudgetStatus(income, listing.monthlyRent, utilities);

  return [
    "RentShield Safety Report",
    `Title: ${listing.title || "Untitled listing"}`,
    `City: ${listing.city || "Unknown city"}`,
    `Monthly rent: ${formatCurrency(listing.monthlyRent)}`,
    `Deposit: ${formatCurrency(listing.depositAmount)}`,
    `Risk score: ${analysis.score}/100`,
    `Risk level: ${analysis.level}`,
    `Budget status: ${budget.label}`,
    `Housing cost ratio: ${Math.round(budget.ratio * 100)}%`,
    "",
    "Red flags:",
    ...(analysis.redFlags.length
      ? analysis.redFlags.map((flag, index) => `${index + 1}. ${flag}`)
      : ["None detected by the rule-based checker."]),
    "",
    "Recommendations:",
    ...analysis.recommendations.map(
      (recommendation, index) => `${index + 1}. ${recommendation}`,
    ),
  ].join("\n");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
