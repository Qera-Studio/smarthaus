import { readFileSync } from "node:fs";

/** Pixel size from the file header: PNG's IHDR, or a JPEG's first SOF marker. */
export function pixelSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  if (bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  let at = 2;
  while (at < bytes.length) {
    const marker = bytes.readUInt16BE(at);
    const length = bytes.readUInt16BE(at + 2);
    // SOF0 to SOF15, less DHT (C4), JPG (C8) and DAC (CC), which share the range.
    if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error(`no size found in ${path}`);
}
