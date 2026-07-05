import sharp from "sharp";

export type ChromaKeyConfig = {
  enabled: boolean;
  keyColor: string;
  tolerance: number;
  edgeSoftness: number;
  maxRemainingNearKeyPixelRatio: number;
  maxKeyedPixelRatio: number;
  mode: "apparel_chroma_key_v1";
};

export type ChromaKeyEvidence = {
  keyColor: string;
  tolerance: number;
  edgeSoftness: number;
  transparentPixelRatio: number;
  keyedPixelRatio: number;
  remainingNearKeyPixelRatio: number;
  hasAlpha: boolean;
  width: number;
  height: number;
  spillDetected: boolean;
  overcutDetected: boolean;
};

export type ChromaKeyResult = {
  png: Buffer;
  evidence: ChromaKeyEvidence;
};

export const defaultPodChromaKeyConfig: ChromaKeyConfig = {
  enabled: true,
  keyColor: "#FF00FF",
  tolerance: 54,
  edgeSoftness: 18,
  maxRemainingNearKeyPixelRatio: 0.015,
  maxKeyedPixelRatio: 0.93,
  mode: "apparel_chroma_key_v1"
};

export function isApparelPrintTarget(printTarget = "") {
  return /^apparel_/i.test(printTarget) || /tee|shirt|hoodie|apparel/i.test(printTarget);
}

export function shouldUseChromaKeyForPrintTarget(input: { printTarget?: string; transparentIntent?: boolean }) {
  return input.transparentIntent === true && isApparelPrintTarget(input.printTarget ?? "apparel_front_square");
}

export function normalizeHexColor(value: string) {
  const cleaned = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(cleaned)) {
    return `#${cleaned.split("").map((part) => `${part}${part}`).join("").toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  throw new Error("invalid_chroma_key_color");
}

function parseHexColor(value: string) {
  const normalized = normalizeHexColor(value);
  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
    normalized
  };
}

function distance(red: number, green: number, blue: number, key: { red: number; green: number; blue: number }) {
  return Math.sqrt((red - key.red) ** 2 + (green - key.green) ** 2 + (blue - key.blue) ** 2);
}

export async function createTransparentPrintPngFromChromaKey(
  inputBytes: Buffer | Uint8Array,
  keyColor = defaultPodChromaKeyConfig.keyColor,
  tolerance = defaultPodChromaKeyConfig.tolerance,
  options: Partial<Pick<ChromaKeyConfig, "edgeSoftness" | "maxKeyedPixelRatio" | "maxRemainingNearKeyPixelRatio">> = {}
): Promise<ChromaKeyResult> {
  const key = parseHexColor(keyColor);
  const safeTolerance = Math.max(0, Math.min(Number(tolerance), 255));
  const edgeSoftness = Math.max(0, Math.min(Number(options.edgeSoftness ?? defaultPodChromaKeyConfig.edgeSoftness), 255));
  const raw = await sharp(Buffer.from(inputBytes), { failOn: "warning" })
    .autoOrient()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const data = Buffer.from(raw.data);
  const pixels = raw.info.width * raw.info.height;
  let keyed = 0;
  let transparent = 0;
  let remainingNearKey = 0;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 255;
    const colorDistance = distance(red, green, blue, key);
    if (colorDistance <= safeTolerance) {
      data[index + 3] = 0;
      keyed += 1;
      transparent += 1;
      continue;
    }
    if (edgeSoftness > 0 && colorDistance <= safeTolerance + edgeSoftness) {
      const ramp = (colorDistance - safeTolerance) / edgeSoftness;
      const softenedAlpha = Math.max(0, Math.min(255, Math.round(alpha * ramp)));
      data[index + 3] = softenedAlpha;
      if (softenedAlpha < 16) {
        keyed += 1;
        transparent += 1;
      } else {
        remainingNearKey += 1;
      }
      continue;
    }
    if (alpha < 16) transparent += 1;
  }

  const png = await sharp(data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const keyedPixelRatio = pixels ? keyed / pixels : 0;
  const remainingNearKeyPixelRatio = pixels ? remainingNearKey / pixels : 0;
  const transparentPixelRatio = pixels ? transparent / pixels : 0;
  return {
    png,
    evidence: {
      keyColor: key.normalized,
      tolerance: safeTolerance,
      edgeSoftness,
      transparentPixelRatio,
      keyedPixelRatio,
      remainingNearKeyPixelRatio,
      hasAlpha: true,
      width: raw.info.width,
      height: raw.info.height,
      spillDetected: remainingNearKeyPixelRatio > (options.maxRemainingNearKeyPixelRatio ?? defaultPodChromaKeyConfig.maxRemainingNearKeyPixelRatio),
      overcutDetected: keyedPixelRatio > (options.maxKeyedPixelRatio ?? defaultPodChromaKeyConfig.maxKeyedPixelRatio)
    }
  };
}
