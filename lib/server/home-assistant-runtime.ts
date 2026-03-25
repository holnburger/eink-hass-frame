import { normalizeHomeAssistantConfig } from "@/lib/home-assistant";
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

export function getAppRuntimeInfo(): AppRuntimeInfo {
  const supervisorToken = getSupervisorToken();
  const defaultDeviceConfig = normalizeHomeAssistantConfig({
    url: readEnv("DEVICE_HOME_ASSISTANT_URL"),
    token: readEnv("DEVICE_HOME_ASSISTANT_TOKEN"),
  });

  return {
    ...DEFAULT_APP_RUNTIME_INFO,
    addonMode: isHomeAssistantAddonRuntime(),
    supervisorConnected: supervisorToken.length > 0,
    hasDeviceHomeAssistantDefaults:
      defaultDeviceConfig.url.length > 0 && defaultDeviceConfig.token.length > 0,
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

export function resolveDeviceHomeAssistantConfig(input: {
  url?: string;
  token?: string;
}) {
  const explicit = normalizeHomeAssistantConfig(input);
  if (explicit.url && explicit.token) {
    return explicit;
  }

  return normalizeHomeAssistantConfig({
    url: readEnv("DEVICE_HOME_ASSISTANT_URL"),
    token: readEnv("DEVICE_HOME_ASSISTANT_TOKEN"),
  });
}
