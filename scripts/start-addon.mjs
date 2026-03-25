import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";

const DEFAULT_PORT = "8099";
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

  const port = (process.env.PORT || DEFAULT_PORT).trim() || DEFAULT_PORT;
  const child = spawn(
    "bun",
    ["run", "start", "--hostname", "0.0.0.0", "--port", port],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

await main();
