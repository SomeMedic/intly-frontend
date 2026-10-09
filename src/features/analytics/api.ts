import { api } from "@/services/api";
import type { AnalyticsFilters, MarketAnalyticsPayload, PersonalAnalyticsPayload } from "./contracts";
import { buildAnalyticsQuery } from "./view-model";

export const analyticsApi = {
  personal: (filters: AnalyticsFilters) => api.get<PersonalAnalyticsPayload>(`/analytics/personal${buildAnalyticsQuery(filters)}`),
  market: (filters: AnalyticsFilters) => api.get<MarketAnalyticsPayload>(`/analytics/market${buildAnalyticsQuery(filters)}`),
  personalCsv: (filters: AnalyticsFilters) => api.download(`/analytics/personal/export.csv${buildAnalyticsQuery(filters)}`),
  marketCsv: (filters: AnalyticsFilters) => api.download(`/analytics/market/export.csv${buildAnalyticsQuery(filters)}`)
};
