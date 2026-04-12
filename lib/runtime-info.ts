export type AppRuntimeInfo = {
  addonMode: boolean;
  supervisorConnected: boolean;
  hasDeviceHomeAssistantDefaults: boolean;
  ingressPath: string;
  deviceHomeAssistantUrl: string;
  deviceHomeAssistantUrlSource: "configured" | "detected" | "";
};

export const DEFAULT_APP_RUNTIME_INFO: AppRuntimeInfo = {
  addonMode: false,
  supervisorConnected: false,
  hasDeviceHomeAssistantDefaults: false,
  ingressPath: "",
  deviceHomeAssistantUrl: "",
  deviceHomeAssistantUrlSource: "",
};
