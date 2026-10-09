export type RagProfileOption = { id: string; name: string; isActive?: boolean };

export type RagProfileScope = {
  requestProfileId?: string;
  defaultProfileId?: string;
  defaultOptionLabel: string;
  showAllProfilesOption: boolean;
  scopeKey: string;
};

export function resolveRagProfileScope(input: {
  selectedProfileId: string;
  activeProfileId?: string | null;
  profiles: RagProfileOption[];
  allProfilesLabel: string;
  activeProfileLabel: string;
}): RagProfileScope {
  const selectedProfileId = input.selectedProfileId.trim();
  const activeProfileId = input.activeProfileId?.trim() ?? "";
  const validActiveProfile = activeProfileId ? input.profiles.find((profile) => profile.id === activeProfileId) : undefined;
  const defaultProfile = validActiveProfile ?? input.profiles.find((profile) => profile.isActive) ?? input.profiles[0];

  if (selectedProfileId === "all") {
    return {
      requestProfileId: undefined,
      defaultProfileId: defaultProfile?.id,
      defaultOptionLabel: defaultProfile ? `${input.activeProfileLabel}: ${defaultProfile.name}` : input.allProfilesLabel,
      showAllProfilesOption: Boolean(defaultProfile),
      scopeKey: "all"
    };
  }

  const explicitProfile = selectedProfileId ? input.profiles.find((profile) => profile.id === selectedProfileId) : undefined;
  const requestProfileId = explicitProfile?.id ?? defaultProfile?.id;
  return {
    requestProfileId,
    defaultProfileId: defaultProfile?.id,
    defaultOptionLabel: defaultProfile ? `${input.activeProfileLabel}: ${defaultProfile.name}` : input.allProfilesLabel,
    showAllProfilesOption: Boolean(defaultProfile),
    scopeKey: requestProfileId ? `profile:${requestProfileId}` : "all"
  };
}
