function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Rejects cross-origin state-changing requests.
 *
 * The browser's Origin header is authoritative, but it can legitimately differ
 * from NEXT_PUBLIC_APP_URL: preview deployments, custom domains, localhost vs
 * 127.0.0.1, or a stale environment variable all change the origin users see.
 * Accept the origin of the actual request in addition to the configured app URL
 * so valid same-origin submissions (such as account registration) are not
 * rejected by a configuration mismatch.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (!origin) {
    // Some browsers omit Origin on same-origin POSTs. Sec-Fetch-Site is set by
    // the browser and cannot be forged by a cross-site page, so it is a safe
    // fallback. Older clients without either header are rejected.
    const fetchSite = request.headers.get("sec-fetch-site");
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const allowedOrigins = new Set<string>();
  const requestOrigin = normalizeOrigin(request.url);
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);

  if (requestOrigin) allowedOrigins.add(requestOrigin);
  if (configuredOrigin) allowedOrigins.add(configuredOrigin);

  return allowedOrigins.has(origin);
}

export async function parseJsonRequest(
  request: Request,
): Promise<{ data: unknown } | { response: Response }> {
  try {
    return { data: await request.json() };
  } catch {
    return {
      response: Response.json(
        { error: "Invalid request body." },
        { status: 400 },
      ),
    };
  }
}
