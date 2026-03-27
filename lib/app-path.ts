const RESERVED_BROWSER_PATH_PREFIXES = ["/_next", "/api", "/mock"];

declare global {
  interface Window {
    __EINK_HASS_FRAME_BASE_PATH__?: string;
  }
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function normalizeAppBasePath(value?: string | null) {
  const normalized = (value ?? "").trim();
  if (!normalized || normalized === "/") {
    return "";
  }

  if (normalized.startsWith("/")) {
    return trimTrailingSlash(normalized);
  }

  try {
    return trimTrailingSlash(new URL(normalized).pathname);
  } catch {
    return "";
  }
}

export function resolveAppPath(path: string, basePath?: string | null) {
  if (!path.startsWith("/")) {
    return path;
  }

  const normalizedBasePath = normalizeAppBasePath(basePath);
  if (!normalizedBasePath) {
    return path;
  }

  if (
    path === normalizedBasePath ||
    path.startsWith(`${normalizedBasePath}/`)
  ) {
    return path;
  }

  return `${normalizedBasePath}${path}`;
}

function isReservedBrowserPath(pathname: string) {
  return RESERVED_BROWSER_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getBrowserAppBasePath(explicitBasePath?: string | null) {
  const normalizedExplicitBasePath = normalizeAppBasePath(explicitBasePath);
  if (normalizedExplicitBasePath) {
    return normalizedExplicitBasePath;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const bootstrappedBasePath = normalizeAppBasePath(
    window.__EINK_HASS_FRAME_BASE_PATH__,
  );
  if (bootstrappedBasePath) {
    return bootstrappedBasePath;
  }

  const pathname = normalizeAppBasePath(window.location.pathname);
  if (!pathname || isReservedBrowserPath(pathname)) {
    return "";
  }

  return pathname;
}
