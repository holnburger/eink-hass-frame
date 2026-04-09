import { spawn } from "node:child_process";
import path from "node:path";

type GenerateMdiIconHeaderInput = {
  outputPath: string;
  widgetIcons: string[];
};

async function runGeneratorScript(
  scriptName: string,
  args: string[] = [],
) {
  const scriptPath = path.join(process.cwd(), "scripts", scriptName);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath, ...args],
      {
        cwd: process.cwd(),
        env: process.env,
      },
    );

    let log = "";

    child.stdout.on("data", (chunk) => {
      log += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      log += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(log.trim() || `${scriptName} exited with code ${code ?? 1}.`),
      );
    });
  });
}

export async function generateMdiIconHeader(
  input: GenerateMdiIconHeaderInput,
) {
  const widgetIconsArg = input.widgetIcons.join(",");
  await runGeneratorScript("generate-mdi-icons.cjs", [
    "--output",
    input.outputPath,
    "--widget-icons",
    widgetIconsArg,
  ]);
}

export async function generateWeatherIconHeader() {
  await runGeneratorScript("generate-weather-icons.cjs");
}

export async function generateMediaCoverHeader() {
  await runGeneratorScript("generate-media-cover.cjs");
}
