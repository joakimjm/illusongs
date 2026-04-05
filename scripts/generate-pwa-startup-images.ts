import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  PWA_STARTUP_IMAGE_TARGETS,
  type Orientation,
  type StartupTarget,
  getPwaStartupImageFileName,
} from "../src/config/pwa-startup-images";

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "startup");
const PORTRAIT_SOURCE = path.join(PROJECT_ROOT, "assets", "splash-portrait.webp");
const LANDSCAPE_SOURCE = path.join(PROJECT_ROOT, "assets", "splash-landscape.webp");

const getSourcePath = (orientation: Orientation): string =>
  orientation === "portrait" ? PORTRAIT_SOURCE : LANDSCAPE_SOURCE;

const getCropStrategy = (orientation: Orientation) => {
  if (orientation === "landscape") {
    return "attention";
  }

  return "north";
};

const renderTarget = async (target: StartupTarget): Promise<string> => {
  const sourcePath = getSourcePath(target.orientation);
  const outputPath = path.join(OUTPUT_DIR, getPwaStartupImageFileName(target));

  await sharp(sourcePath)
    .resize({
      width: target.width,
      height: target.height,
      fit: "cover",
      position: getCropStrategy(target.orientation),
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      quality: 100,
    })
    .toFile(outputPath);

  return outputPath;
};

const main = async (): Promise<void> => {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const outputPaths = await Promise.all(PWA_STARTUP_IMAGE_TARGETS.map(renderTarget));

  outputPaths.forEach((outputPath) => {
    process.stdout.write(`${path.relative(PROJECT_ROOT, outputPath)}\n`);
  });
};

main().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
