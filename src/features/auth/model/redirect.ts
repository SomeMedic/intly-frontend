export const authPublicRoutes = ["/login", "/forgot-password", "/reset-password", "/activate"] as const;
export const defaultAuthenticatedRoute = "/dashboard";

export function isPublicAuthRoute(pathname: string) {
  return authPublicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function currentReturnTo(pathname: string, searchParams?: URLSearchParams | ReadonlyURLSearchParamsLike | null) {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function safeReturnTo(value: string | null | undefined, fallback = defaultAuthenticatedRoute) {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return fallback;

  try {
    const parsed = new URL(candidate, "http://intly.local");
    if (parsed.origin !== "http://intly.local") return fallback;
    const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (safePath.startsWith("//")) return fallback;
    if (isPublicAuthRoute(parsed.pathname)) return fallback;
    return safePath;
  } catch {
    return fallback;
  }
}

type ReadonlyURLSearchParamsLike = Pick<URLSearchParams, "toString">;
