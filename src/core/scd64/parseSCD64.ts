import { SCD64_REGEX } from "./constants";

export function parseSCD64(checksum64: string): string[] {
  if (!SCD64_REGEX.test(checksum64)) {
    throw new Error("SCD64 checksums must be exactly 64 characters long.");
  }
  return checksum64.match(/.{8}/g) ?? [];
}

export function extractVersionByte(blocks: string[]): string {
  if (blocks.length === 0) return "";
  return blocks[0].slice(0, 2);
}
