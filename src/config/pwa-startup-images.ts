export type Orientation = "portrait" | "landscape";

export type StartupTarget = {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly orientation: Orientation;
  readonly pixelRatio: number;
};

export const PWA_STARTUP_IMAGE_BACKGROUND = "#1b1009";

export const PWA_STARTUP_IMAGE_TARGETS: readonly StartupTarget[] = [
  {
    name: "iphone-se",
    width: 640,
    height: 1136,
    orientation: "portrait",
    pixelRatio: 2,
  },
  {
    name: "iphone-8",
    width: 750,
    height: 1334,
    orientation: "portrait",
    pixelRatio: 2,
  },
  {
    name: "iphone-8-plus",
    width: 1242,
    height: 2208,
    orientation: "portrait",
    pixelRatio: 3,
  },
  {
    name: "iphone-11-pro",
    width: 1125,
    height: 2436,
    orientation: "portrait",
    pixelRatio: 3,
  },
  {
    name: "iphone-14",
    width: 1170,
    height: 2532,
    orientation: "portrait",
    pixelRatio: 3,
  },
  {
    name: "iphone-14-plus",
    width: 1284,
    height: 2778,
    orientation: "portrait",
    pixelRatio: 3,
  },
  {
    name: "iphone-14-pro-max",
    width: 1290,
    height: 2796,
    orientation: "portrait",
    pixelRatio: 3,
  },
  {
    name: "ipad-10-2",
    width: 1620,
    height: 2160,
    orientation: "portrait",
    pixelRatio: 2,
  },
  {
    name: "ipad-11",
    width: 1668,
    height: 2388,
    orientation: "portrait",
    pixelRatio: 2,
  },
  {
    name: "ipad-12-9",
    width: 2048,
    height: 2732,
    orientation: "portrait",
    pixelRatio: 2,
  },
  {
    name: "iphone-11-pro",
    width: 2436,
    height: 1125,
    orientation: "landscape",
    pixelRatio: 3,
  },
  {
    name: "iphone-14",
    width: 2532,
    height: 1170,
    orientation: "landscape",
    pixelRatio: 3,
  },
  {
    name: "iphone-14-plus",
    width: 2778,
    height: 1284,
    orientation: "landscape",
    pixelRatio: 3,
  },
  {
    name: "iphone-14-pro-max",
    width: 2796,
    height: 1290,
    orientation: "landscape",
    pixelRatio: 3,
  },
  {
    name: "ipad-10-2",
    width: 2160,
    height: 1620,
    orientation: "landscape",
    pixelRatio: 2,
  },
  {
    name: "ipad-11",
    width: 2388,
    height: 1668,
    orientation: "landscape",
    pixelRatio: 2,
  },
  {
    name: "ipad-12-9",
    width: 2732,
    height: 2048,
    orientation: "landscape",
    pixelRatio: 2,
  },
];

export const getPwaStartupImageFileName = (target: StartupTarget): string =>
  `${target.name}-${target.orientation}-${target.width}x${target.height}@${target.pixelRatio}x.png`;

export const getPwaStartupImageHref = (target: StartupTarget): string =>
  `/startup/${getPwaStartupImageFileName(target)}`;

export const getAppleStartupImageMedia = (target: StartupTarget): string => {
  const deviceWidth = target.orientation === "portrait" ? target.width / target.pixelRatio : target.height / target.pixelRatio;
  const deviceHeight = target.orientation === "portrait" ? target.height / target.pixelRatio : target.width / target.pixelRatio;

  return [
    "screen",
    `(device-width: ${deviceWidth}px)`,
    `(device-height: ${deviceHeight}px)`,
    `(-webkit-device-pixel-ratio: ${target.pixelRatio})`,
    `(orientation: ${target.orientation})`,
  ].join(" and ");
};
