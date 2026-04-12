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

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
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
  const defaultDeviceConfig = normalizeHomeAssistantConfig({
    url: configuredDeviceUrl,
    token: configuredDeviceToken,
  });

  return {
    ...DEFAULT_APP_RUNTIME_INFO,
    addonMode: isHomeAssistantAddonRuntime(),
    supervisorConnected: supervisorToken.length > 0,
    hasDeviceHomeAssistantDefaults:
      defaultDeviceConfig.url.length > 0 &&
      defaultDeviceConfig.token.length > 0,
    ingressPath: normalizeAppBasePath(input?.ingressPath),
    deviceHomeAssistantUrl: defaultDeviceConfig.url,
    deviceHomeAssistantUrlSource:
      configuredDeviceUrl.length > 0 ? "configured" : "",
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

  const resolvedUrl = isHomeAssistantAddonRuntime()
    ? manualUrlOverride && explicitUrl
      ? explicitUrl
      : configuredUrl || explicitUrl
    : explicitUrl || configuredUrl;
  const resolvedToken = explicitToken || configuredToken;

  return normalizeHomeAssistantConfig({
    url: resolvedUrl,
    token: resolvedToken,
  });
}
