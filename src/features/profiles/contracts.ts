export const DEFAULT_WEIGHTS = { skills: 35, seniority: 10, money: 15, remoteLocation: 15, employment: 10, freshness: 10, source: 5 };
export type ProfileRecord = {
  id: string; userId: string; name: string; kind: "career" | "freelance" | "mixed"; isActive: boolean;
  targetRoles: string[]; seniority: string[]; technologies: string[]; locations: string[];
  remotePreferences: string[]; employmentTypes: string[]; sourceIds: string[];
  compensationPreferences: { min?: number; max?: number; currency?: string; period?: string };
  matchWeights: typeof DEFAULT_WEIGHTS; aiPreferences: Record<string, unknown>;
  structuredExperienceSummary: string;
};
export type PublicSource = { id: string; name: string; group: "web" | "telegram" | "vk"; status: string; healthState: string; types: string[] };
