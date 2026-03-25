export type AppRuntimeInfo = {
  addonMode: boolean;
  supervisorConnected: boolean;
  hasDeviceHomeAssistantDefaults: boolean;
};

export const DEFAULT_APP_RUNTIME_INFO: AppRuntimeInfo = {
  addonMode: false,
  supervisorConnected: false,
  hasDeviceHomeAssistantDefaults: false,
};
