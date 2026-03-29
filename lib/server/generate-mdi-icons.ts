import { spawn } from "node:child_process";
import path from "node:path";

type GenerateMdiIconHeaderInput = {
  outputPath: string;
  widgetIcons: string[];
};

export async function generateMdiIconHeader(
  input: GenerateMdiIconHeaderInput,
) {
  const scriptPath = path.join(process.cwd(), "scripts", "generate-mdi-icons.cjs");
  const widgetIconsArg = input.widgetIcons.join(",");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath, "--output", input.outputPath, "--widget-icons", widgetIconsArg],
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
        new Error(log.trim() || `MDI icon generator exited with code ${code ?? 1}.`),
      );
    });
  });
}
