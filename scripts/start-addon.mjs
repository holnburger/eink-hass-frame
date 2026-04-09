import { spawn } from "node:child_process";
import http from "node:http";
import { mkdir, readFile } from "node:fs/promises";

const DEFAULT_PORT = "8099";
const DEFAULT_INTERNAL_HOST = "127.0.0.1";
const DEFAULT_INTERNAL_PORT = "3000";
const DEFAULT_OPTIONS_PATH = "/data/options.json";
const DEFAULT_DATA_DIR = "/data/eink-hass-frame";
const DEFAULT_PLATFORMIO_CORE_DIR = "/data/.platformio";

const OPTION_ENV_MAP = {
  device_home_assistant_url: "DEVICE_HOME_ASSISTANT_URL",
  device_home_assistant_token: "DEVICE_HOME_ASSISTANT_TOKEN",
};

async function readAddonOptions() {
  const optionsPath = process.env.HASSIO_OPTIONS_PATH || DEFAULT_OPTIONS_PATH;

  try {
    const raw = await readFile(optionsPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function applyOptionToEnv(options, optionName, envName) {
  const value = options[optionName];
  if (typeof value !== "string") {
    return;
  }

  const normalized = value.trim();
  if (normalized.length > 0) {
    process.env[envName] = normalized;
  }
}

function normalizeIngressPath(value) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const normalized = (firstValue ?? "").trim();
  if (normalized.length === 0) {
    return "";
  }

  if (normalized === "/") {
    return "";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function parseHeaderPath(value) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const normalized = (firstValue ?? "").trim();
  if (normalized.length === 0) {
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

function deriveIngressPathFromOriginalPath(originalPath, requestPath) {
  const normalizedOriginalPath = normalizeIngressPath(originalPath);
  const normalizedRequestPath = normalizeIngressPath(requestPath);

  if (!normalizedOriginalPath) {
    return "";
  }

  if (!normalizedRequestPath || normalizedRequestPath === "/") {
    return normalizedOriginalPath;
  }

  if (!normalizedOriginalPath.endsWith(normalizedRequestPath)) {
    return "";
  }

  const basePath = normalizedOriginalPath.slice(
    0,
    normalizedOriginalPath.length - normalizedRequestPath.length,
  );
  return normalizeIngressPath(basePath);
}

function detectIngressPath(request) {
  const headerIngressPath = normalizeIngressPath(
    request.headers["x-ingress-path"],
  );
  if (headerIngressPath) {
    return {
      path: headerIngressPath,
      source: "x-ingress-path",
    };
  }

  const forwardedPrefix = normalizeIngressPath(
    request.headers["x-forwarded-prefix"],
  );
  if (forwardedPrefix) {
    return {
      path: forwardedPrefix,
      source: "x-forwarded-prefix",
    };
  }

  const originalUri = parseHeaderPath(request.headers["x-original-uri"]);
  const ingressPathFromOriginalUri = deriveIngressPathFromOriginalPath(
    originalUri,
    request.url ?? "/",
  );
  if (ingressPathFromOriginalUri) {
    return {
      path: ingressPathFromOriginalUri,
      source: "x-original-uri",
    };
  }

  const forwardedUri = parseHeaderPath(request.headers["x-forwarded-uri"]);
  const ingressPathFromForwardedUri = deriveIngressPathFromOriginalPath(
    forwardedUri,
    request.url ?? "/",
  );
  if (ingressPathFromForwardedUri) {
    return {
      path: ingressPathFromForwardedUri,
      source: "x-forwarded-uri",
    };
  }

  const refererPath = normalizeIngressPath(parseHeaderPath(request.headers.referer));
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

function shouldRewriteResponse(contentType) {
  const normalized = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return (
    normalized === "text/html" ||
    normalized === "text/css" ||
    normalized === "application/javascript" ||
    normalized === "text/javascript" ||
    normalized === "text/x-component"
  );
}

function stripIngressPathFromRequestUrl(requestUrl, ingressPath) {
  if (!ingressPath) {
    return requestUrl;
  }

  try {
    const parsed = new URL(requestUrl, "http://addon.local");
    const pathname = normalizeIngressPath(parsed.pathname);

    if (pathname === ingressPath) {
      parsed.pathname = "/";
    } else if (pathname.startsWith(`${ingressPath}/`)) {
      parsed.pathname = pathname.slice(ingressPath.length) || "/";
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return requestUrl;
  }
}

export function rewriteResponseBody(body, ingressPath) {
  if (!ingressPath) {
    return body;
  }

  const replacements = [
    ["/_next/", `${ingressPath}/_next/`],
    ["/api/", `${ingressPath}/api/`],
    ["/mock/", `${ingressPath}/mock/`],
    ["/favicon.ico", `${ingressPath}/favicon.ico`],
  ];

  let rewrittenBody = body;
  const placeholderByTargetPath = new Map();

  for (const [index, [sourcePath, targetPath]] of replacements.entries()) {
    const placeholder = `__EINK_HASS_FRAME_REWRITE_${index}__`;
    placeholderByTargetPath.set(placeholder, targetPath);
    rewrittenBody = rewrittenBody
      .replaceAll(`"${sourcePath}`, `"${placeholder}`)
      .replaceAll(`'${sourcePath}`, `'${placeholder}`)
      .replaceAll(`\\"${sourcePath}`, `\\"${placeholder}`)
      .replaceAll(`\\'${sourcePath}`, `\\'${placeholder}`)
      .replaceAll(`url("${sourcePath}`, `url("${placeholder}`)
      .replaceAll(`url('${sourcePath}`, `url('${placeholder}`)
      .replaceAll(`url(${sourcePath}`, `url(${placeholder}`);
  }

  for (const [placeholder, targetPath] of placeholderByTargetPath) {
    rewrittenBody = rewrittenBody.replaceAll(placeholder, targetPath);
  }

  return rewrittenBody;
}

function injectIngressBootstrapScript(body, ingressPath) {
  if (!ingressPath) {
    return body;
  }

  const scriptTag = `<script>window.__EINK_HASS_FRAME_BASE_PATH__=${JSON.stringify(ingressPath)};</script>`;
  if (body.includes(scriptTag)) {
    return body;
  }

  if (body.includes("</head>")) {
    return body.replace("</head>", `${scriptTag}</head>`);
  }

  if (body.includes("</body>")) {
    return body.replace("</body>", `${scriptTag}</body>`);
  }

  return `${scriptTag}${body}`;
}

function rewriteLocationHeader(location, ingressPath) {
  if (!ingressPath || typeof location !== "string") {
    return location;
  }

  return location.startsWith("/") && !location.startsWith("//")
    ? `${ingressPath}${location}`
    : location;
}

function startIngressProxyServer({
  listenPort,
  internalHost,
  internalPort,
}) {
  let lastLoggedIngressPath = "";
  const proxyServer = http.createServer((request, response) => {
    const ingressInfo = detectIngressPath(request);
    const ingressPath = ingressInfo.path;
    const proxiedRequestPath = stripIngressPathFromRequestUrl(
      request.url ?? "/",
      ingressPath,
    );
    const proxyHeaders = { ...request.headers };
    delete proxyHeaders["accept-encoding"];
    proxyHeaders.host = `${internalHost}:${internalPort}`;

    if (ingressPath && ingressPath !== lastLoggedIngressPath) {
      lastLoggedIngressPath = ingressPath;
      console.log(
        `ADDON_INGRESS_PATH DETECTED=${ingressPath} SOURCE=${ingressInfo.source}`,
      );
    }

    const proxyRequest = http.request(
      {
        hostname: internalHost,
        port: internalPort,
        method: request.method,
        path: proxiedRequestPath,
        headers: proxyHeaders,
      },
      (proxyResponse) => {
        const responseHeaders = { ...proxyResponse.headers };
        const contentTypeHeader = Array.isArray(responseHeaders["content-type"])
          ? responseHeaders["content-type"][0]
          : responseHeaders["content-type"];

        if (responseHeaders.location) {
          responseHeaders.location = rewriteLocationHeader(
            Array.isArray(responseHeaders.location)
              ? responseHeaders.location[0]
              : responseHeaders.location,
            ingressPath,
          );
        }

        if (
          request.method === "HEAD" ||
          !shouldRewriteResponse(contentTypeHeader) ||
          ingressPath.length === 0
        ) {
          response.writeHead(proxyResponse.statusCode ?? 502, responseHeaders);
          proxyResponse.pipe(response);
          return;
        }

        const chunks = [];
        proxyResponse.on("data", (chunk) => {
          chunks.push(
            typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk),
          );
        });
        proxyResponse.on("end", () => {
          const originalBody = Buffer.concat(chunks).toString("utf8");
          let rewrittenBody = rewriteResponseBody(originalBody, ingressPath);
          if (
            (contentTypeHeader ?? "").split(";")[0].trim().toLowerCase() ===
            "text/html"
          ) {
            rewrittenBody = injectIngressBootstrapScript(
              rewrittenBody,
              ingressPath,
            );
          }

          delete responseHeaders["content-length"];
          delete responseHeaders["content-encoding"];
          delete responseHeaders["transfer-encoding"];
          delete responseHeaders.etag;

          response.writeHead(proxyResponse.statusCode ?? 502, responseHeaders);
          response.end(rewrittenBody);
        });
      },
    );

    proxyRequest.on("error", (error) => {
      if (!response.headersSent) {
        response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      }
      response.end(`Add-on proxy error: ${String(error)}`);
    });

    request.pipe(proxyRequest);
  });

  proxyServer.listen(listenPort, "0.0.0.0", () => {
    console.log(
      `ADDON_PROXY_READY PORT=${listenPort} INTERNAL=${internalHost}:${internalPort}`,
    );
  });

  proxyServer.on("error", (error) => {
    console.error(`ADDON_PROXY_ERROR ${String(error)}`);
  });

  return proxyServer;
}

async function main() {
  const addonOptions = await readAddonOptions();

  process.env.HOME_ASSISTANT_ADDON ||= "1";
  process.env.EINK_HASS_FRAME_DATA_DIR ||= DEFAULT_DATA_DIR;
  process.env.PLATFORMIO_CORE_DIR ||= DEFAULT_PLATFORMIO_CORE_DIR;

  for (const [optionName, envName] of Object.entries(OPTION_ENV_MAP)) {
    applyOptionToEnv(addonOptions, optionName, envName);
  }

  await mkdir(process.env.EINK_HASS_FRAME_DATA_DIR, { recursive: true });
  await mkdir(process.env.PLATFORMIO_CORE_DIR, { recursive: true });

  const listenPort = (process.env.PORT || DEFAULT_PORT).trim() || DEFAULT_PORT;
  const internalHost =
    (process.env.ADDON_INTERNAL_HOST || DEFAULT_INTERNAL_HOST).trim() ||
    DEFAULT_INTERNAL_HOST;
  const internalPort =
    (process.env.ADDON_INTERNAL_PORT || DEFAULT_INTERNAL_PORT).trim() ||
    DEFAULT_INTERNAL_PORT;

  const childEnv = {
    ...process.env,
    HOSTNAME: internalHost,
    PORT: internalPort,
  };

  console.log(`ADDON_RUNTIME EXEC=${process.execPath}`);

  const child = spawn(process.execPath, ["server.js"], {
    stdio: "inherit",
    env: childEnv,
  });

  child.on("error", (error) => {
    console.error(`ADDON_CHILD_ERROR ${String(error)}`);
  });
  child.on("exit", (code, signal) => {
    console.log(`ADDON_CHILD_EXIT CODE=${code ?? ""} SIGNAL=${signal ?? ""}`);
  });

  const proxyServer = startIngressProxyServer({
    listenPort: Number.parseInt(listenPort, 10),
    internalHost,
    internalPort: Number.parseInt(internalPort, 10),
  });

  child.on("exit", (code, signal) => {
    proxyServer.close();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

process.on("SIGTERM", () => {
  console.log("ADDON_SIGNAL SIGTERM");
});

process.on("SIGINT", () => {
  console.log("ADDON_SIGNAL SIGINT");
});

process.on("exit", (code) => {
  console.log(`ADDON_PROCESS_EXIT CODE=${code}`);
});

process.on("uncaughtException", (error) => {
  console.error("ADDON_UNCAUGHT_EXCEPTION", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("ADDON_UNHANDLED_REJECTION", reason);
});

if (import.meta.main) {
  await main();
}
