import { normalizeAppBasePath } from "@/lib/app-path";

function parseHeaderPath(value?: string | null) {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  try {
    return new URL(normalized).pathname;
  } catch {
    return "";
  }
}

function deriveIngressPathFromOriginalPath(
  originalPath: string,
  requestPath: string,
) {
  const normalizedOriginalPath = normalizeAppBasePath(originalPath);
  const normalizedRequestPath = normalizeAppBasePath(requestPath);

  if (!normalizedOriginalPath) {
    return "";
  }

  if (!normalizedRequestPath) {
    return normalizedOriginalPath;
  }

  if (!normalizedOriginalPath.endsWith(normalizedRequestPath)) {
    return "";
  }

  const basePath = normalizedOriginalPath.slice(
    0,
    normalizedOriginalPath.length - normalizedRequestPath.length,
  );
  return normalizeAppBasePath(basePath);
}

export function detectIngressPathFromHeaders(
  headers: Headers,
  requestUrl?: string,
) {
  const requestPath = parseHeaderPath(requestUrl);

  const headerIngressPath = normalizeAppBasePath(headers.get("x-ingress-path"));
  if (headerIngressPath) {
    return {
      path: headerIngressPath,
      source: "x-ingress-path",
    };
  }

  const forwardedPrefix = normalizeAppBasePath(
    headers.get("x-forwarded-prefix"),
  );
  if (forwardedPrefix) {
    return {
      path: forwardedPrefix,
      source: "x-forwarded-prefix",
    };
  }

  const originalUri = parseHeaderPath(headers.get("x-original-uri"));
  const ingressPathFromOriginalUri = deriveIngressPathFromOriginalPath(
    originalUri,
    requestPath,
  );
  if (ingressPathFromOriginalUri) {
    return {
      path: ingressPathFromOriginalUri,
      source: "x-original-uri",
    };
  }

  const forwardedUri = parseHeaderPath(headers.get("x-forwarded-uri"));
  const ingressPathFromForwardedUri = deriveIngressPathFromOriginalPath(
    forwardedUri,
    requestPath,
  );
  if (ingressPathFromForwardedUri) {
    return {
      path: ingressPathFromForwardedUri,
      source: "x-forwarded-uri",
    };
  }

  const refererPath = normalizeAppBasePath(parseHeaderPath(headers.get("referer")));
  if (refererPath) {
    return {
      path: refererPath,
      source: "referer",
    };
  }

  return {
    path: "",
    source: "",
  };
}
