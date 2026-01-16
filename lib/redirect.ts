const ALLOWED_HOSTS = [
  /^[\w-]+\.example\.com$/,
  /^[\w-]+\.example\.cn$/,
  /^[\w-]+\.localtest\.me$/,
]

export function isAllowedRedirect(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return ALLOWED_HOSTS.some((re) => re.test(hostname))
  } catch {
    return false
  }
}

export function getSafeReturnTo(returnTo: string | null, fallback = "/"): string {
  if (!returnTo) return fallback
  return isAllowedRedirect(returnTo) ? returnTo : fallback
}
