export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin || !configuredOrigin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(configuredOrigin).origin;
  } catch {
    return false;
  }
}
