export type AnalyticsKind = "personal" | "market";
export type AnalyticsPeriod = "7d" | "30d" | "90d" | "custom";
export type AnalyticsOpportunityType = "all" | "vacancy" | "freelance" | "tender";

export type AnalyticsFilters = {
  period: AnalyticsPeriod;
  from?: string;
  to?: string;
  profileId?: string;
  type?: AnalyticsOpportunityType;
  sourceIds?: string[];
  includeClosed?: boolean;
  sourceGroups?: string[];
  locations?: string[];
  countriesAllowed?: string[];
  technologies?: string[];
  seniority?: string;
  remoteType?: string;
  role?: string;
  currency?: string;
  moneyPeriod?: string;
  moneyKind?: string;
  comparePrevious?: boolean;
  scope?: AnalyticsKind;
};

export type AnalyticsRow = Record<string, string | number | null | undefined>;

export type PersonalAnalyticsPayload = {
  filters: Record<string, unknown>;
  totals: {
    found: number;
    tracked: number;
    reviewed: number;
    responsesSent: number;
    replies: number;
    interviewsNegotiations: number;
    offersWon: number;
    conversionRate: number | null;
    avgMatchScore: number | null;
    avgAiScore: number | null;
  };
  funnel: AnalyticsRow[];
  funnels?: Array<{ type: Exclude<AnalyticsOpportunityType, "all">; stages: AnalyticsRow[] }>;
  scoreBands?: { match: AnalyticsRow[]; ai: AnalyticsRow[] };
  currentPipeline: AnalyticsRow[];
  timeseries: AnalyticsRow[];
  sources: AnalyticsRow[];
  technologies: AnalyticsRow[];
  compensation: { comparableCount: number; missingCount: number; coverage: number | null; byCurrency: AnalyticsRow[]; byTypeCurrencyPeriodKind?: AnalyticsRow[] };
  geography: { locations: AnalyticsRow[]; remoteTypes: AnalyticsRow[]; countries?: AnalyticsRow[] };
  counterparts: AnalyticsRow[];
  profiles: AnalyticsRow[];
};

export type MarketAnalyticsPayload = {
  filters: Record<string, unknown>;
  totals: {
    opportunities: number;
    active: number;
    closedExpiredRemoved: number;
    numericMoneyCoverage: number | null;
    sourceCount: number;
  };
  volume: { byType: AnalyticsRow[]; byStatus: AnalyticsRow[]; timeseries: AnalyticsRow[]; sourceGroups?: AnalyticsRow[]; seniority?: AnalyticsRow[] };
  roles: AnalyticsRow[];
  technologies: AnalyticsRow[];
  compensation: { comparableCount: number; missingCount: number; coverage: number | null; byCurrency: AnalyticsRow[]; byTypeCurrencyPeriodKind?: AnalyticsRow[] };
  geography: { locations: AnalyticsRow[]; remoteTypes: AnalyticsRow[]; countries?: AnalyticsRow[] };
  sources: AnalyticsRow[];
  counterparts: AnalyticsRow[];
  comparison?: { previousFrom: string; previousTo: string; previousCount: number; growthRate: number | null };
};
