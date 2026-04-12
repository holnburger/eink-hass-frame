import { normalizeAppBasePath } from "@/lib/app-path";
import {
  normalizeHomeAssistantConfig,
  normalizeHomeAssistantUrl,
} from "@/lib/home-assistant";
import {
  DEFAULT_APP_RUNTIME_INFO,
  type AppRuntimeInfo,
} from "@/lib/runtime-info";

const SUPERVISOR_CORE_API_BASE_URL = "http://supervisor/core/api";
const SUPERVISOR_CORE_INFO_URL = "http://supervisor/core/info";
const SUPERVISOR_NETWORK_INFO_URL = "http://supervisor/network/info";

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

function getSupervisorHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function normalizeIpv4Address(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const [address] = trimmed.split("/", 1);
  return address?.trim() ?? "";
}

function readNetworkInterfaceAddress(candidate: unknown) {
  if (!candidate || typeof candidate !== "object") {
    return "";
  }

  const record = candidate as Record<string, unknown>;
  const ipv4 =
    record.ipv4 && typeof record.ipv4 === "object"
      ? (record.ipv4 as Record<string, unknown>)
      : null;
  return normalizeIpv4Address(ipv4?.ip_address);
}

function detectPrimaryHostAddress(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const interfaces = Array.isArray((payload as Record<string, unknown>).interfaces)
    ? ((payload as Record<string, unknown>).interfaces as unknown[])
    : [];

  const preferred = interfaces.find((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }
    const record = candidate as Record<string, unknown>;
    return (
      record.primary === true &&
      record.enabled !== false &&
      record.connected !== false &&
      readNetworkInterfaceAddress(record).length > 0
    );
  });
  if (preferred) {
    return readNetworkInterfaceAddress(preferred);
  }

  const connected = interfaces.find((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }
    const record = candidate as Record<string, unknown>;
    return (
      record.enabled !== false &&
      record.connected !== false &&
      readNetworkInterfaceAddress(record).length > 0
    );
  });

  return connected ? readNetworkInterfaceAddress(connected) : "";
}

function normalizeCorePort(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 8123;
  }
  return parsed;
}

function formatHomeAssistantUrl(options: {
  host: string;
  port: number;
  ssl: boolean;
}) {
  const protocol = options.ssl ? "https" : "http";
  const defaultPort = options.ssl ? 443 : 80;
  const suffix = options.port === defaultPort ? "" : `:${options.port}`;
  return `${protocol}://${options.host}${suffix}`;
}

async function fetchJson(url: string, token: string) {
  const response = await fetch(url, {
    headers: getSupervisorHeaders(token),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function detectAddonHomeAssistantUrl() {
  const supervisorToken = getSupervisorToken();
  if (supervisorToken.length === 0) {
    return "";
  }

  try {
    const config = (await fetchJson(
      `${SUPERVISOR_CORE_API_BASE_URL}/config`,
      supervisorToken,
    )) as Record<string, unknown>;
    const internalUrl = normalizeHomeAssistantUrl(config.internal_url);
    if (internalUrl.length > 0) {
      return internalUrl;
    }
  } catch {
    // Fall through to the Supervisor network-based fallback.
  }

  try {
    const [coreInfo, networkInfo] = (await Promise.all([
      fetchJson(SUPERVISOR_CORE_INFO_URL, supervisorToken),
      fetchJson(SUPERVISOR_NETWORK_INFO_URL, supervisorToken),
    ])) as [Record<string, unknown>, Record<string, unknown>];
    const host = detectPrimaryHostAddress(networkInfo);
    if (!host) {
      return "";
    }

    return formatHomeAssistantUrl({
      host,
      port: normalizeCorePort(coreInfo.port),
      ssl: coreInfo.ssl === true,
    });
  } catch {
    return "";
  }
}

export function isHomeAssistantAddonRuntime() {
  return (
    readEnv("HOME_ASSISTANT_ADDON") === "1" ||
    readEnv("SUPERVISOR_TOKEN").length > 0
  );
}

export function getSupervisorToken() {
  return readEnv("SUPERVISOR_TOKEN");
}

export async function getAppRuntimeInfo(input?: {
  ingressPath?: string;
}): Promise<AppRuntimeInfo> {
  const supervisorToken = getSupervisorToken();
  const configuredDeviceUrl = normalizeHomeAssistantUrl(
    readEnv("DEVICE_HOME_ASSISTANT_URL"),
  );
  const configuredDeviceToken = readEnv("DEVICE_HOME_ASSISTANT_TOKEN");
  const addonMode = isHomeAssistantAddonRuntime();
  const detectedDeviceUrl =
    configuredDeviceUrl.length === 0 && addonMode
      ? await detectAddonHomeAssistantUrl()
      : "";
  const defaultDeviceConfig = normalizeHomeAssistantConfig({
    url: configuredDeviceUrl || detectedDeviceUrl,
    token: configuredDeviceToken,
  });

  return {
    ...DEFAULT_APP_RUNTIME_INFO,
    addonMode,
    supervisorConnected: supervisorToken.length > 0,
    hasDeviceHomeAssistantDefaults:
      defaultDeviceConfig.url.length > 0 && defaultDeviceConfig.token.length > 0,
    ingressPath: normalizeAppBasePath(input?.ingressPath),
    deviceHomeAssistantUrl: defaultDeviceConfig.url,
    deviceHomeAssistantUrlSource:
      configuredDeviceUrl.length > 0
        ? "configured"
        : detectedDeviceUrl.length > 0
          ? "detected"
          : "",
  };
}

export function resolveServerHomeAssistantConnection(input: {
  url?: string;
  token?: string;
}) {
  const explicit = normalizeHomeAssistantConfig(input);
  if (explicit.url && explicit.token) {
    return explicit;
  }

  const supervisorToken = getSupervisorToken();
  if (supervisorToken.length > 0) {
    return {
      url: SUPERVISOR_CORE_API_BASE_URL,
      token: supervisorToken,
    };
  }

  throw new Error("Home Assistant URL and token are required.");
}

export async function resolveDeviceHomeAssistantConfig(input: {
  url?: string;
  token?: string;
  manualUrlOverride?: boolean;
}) {
  const explicitUrl = normalizeHomeAssistantUrl(input.url);
  const explicitToken =
    typeof input.token === "string" ? input.token.trim() : "";
  const manualUrlOverride = input.manualUrlOverride === true;
  const configuredUrl = normalizeHomeAssistantUrl(
    readEnv("DEVICE_HOME_ASSISTANT_URL"),
  );
  const configuredToken = readEnv("DEVICE_HOME_ASSISTANT_TOKEN");
  const detectedUrl =
    configuredUrl.length === 0 && isHomeAssistantAddonRuntime()
      ? await detectAddonHomeAssistantUrl()
      : "";

  const resolvedUrl = isHomeAssistantAddonRuntime()
    ? manualUrlOverride && explicitUrl
      ? explicitUrl
      : configuredUrl || detectedUrl || explicitUrl
    : explicitUrl || configuredUrl;
  const resolvedToken = explicitToken || configuredToken;

  return normalizeHomeAssistantConfig({
    url: resolvedUrl,
    token: resolvedToken,
  });
}
