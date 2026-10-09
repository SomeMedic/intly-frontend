export type ProfileType = "career" | "freelance" | "mixed";

export type Seniority = "intern" | "junior" | "middle" | "senior" | "lead" | "principal";

export type ProfileSummary = {
  id: string;
  name: string;
  type: ProfileType;
  targetRole: string;
  seniority: Seniority | null;
  technologies: string[];
  activeSourceCount: number;
  matchPresetName: string;
  needsAttention?: Array<{
    id: string;
    label: string;
    href: string;
    severity: "info" | "warning" | "error";
  }>;
};
