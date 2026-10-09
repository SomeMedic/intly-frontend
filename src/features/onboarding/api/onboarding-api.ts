import { api } from "@/services/api";
import type { ProfileType } from "@/types";

export type OnboardingState = {
  minimumComplete: boolean;
  checklist: Record<string, unknown>;
};

export type OnboardingPatch = Partial<OnboardingState> & Record<string, unknown>;

export type CreateOnboardingProfileRequest = {
  name: string;
  kind: ProfileType;
  targetRoles?: string[];
  technologies?: string[];
};

export type CreatedProfile = {
  id: string;
  name: string;
  kind: ProfileType;
};

export const onboardingApi = {
  get: () => api.get<OnboardingState>("/me/onboarding"),
  patch: (body: OnboardingPatch) => api.patch<OnboardingState>("/me/onboarding", body),
  createProfile: (body: CreateOnboardingProfileRequest) => api.post<CreatedProfile>("/profiles", body)
};
