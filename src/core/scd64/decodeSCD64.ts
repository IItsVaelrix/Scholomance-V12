import { parseSCD64, extractVersionByte } from "./parseSCD64";
import type { SCD64HoverDecodeResponse, SCD64RemediationHint } from "./types";
import { SCD64_SLOT_NAMES } from "./constants";
import { SCD64_GLOSSARY } from "./glossary";

// Optional: local override hints for known bugs, normally this would come from a DB
const LOCAL_HINTS: Record<string, SCD64RemediationHint[]> = {
  "01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C": [
    {
      kind: "BREAKPOINT",
      message: "Set breakpoint where TruesightPlugin computes global charStart.",
      file: "TruesightPlugin.jsx",
      symbol: "getGlobalCharStart",
      confidence: 0.95
    },
    {
      kind: "INSPECT",
      message: "Compare backend source-relative charStart with frontend Lexical sibling accumulation.",
      file: "compileVerseToIR.js",
      symbol: "charStart emission",
      confidence: 0.95
    },
    {
      kind: "AVOID",
      message: "Do not patch shouldColor() directly until coordinate authority is verified.",
      confidence: 0.9
    }
  ]
};

export function lookupSCD64BlocksInMCP(args: { versionByte: string; blocks: string[] }, checksum64: string): SCD64HoverDecodeResponse {
  let bugFamily = "UNKNOWN_FAMILY";
  let firstFoundSlot = SCD64_GLOSSARY.find(g => g.hexCode === args.blocks[0] || (g.versionByte === args.versionByte && g.hexCode.endsWith(args.blocks[0].slice(2))));
  
  if (firstFoundSlot) {
    bugFamily = firstFoundSlot.family;
  }

  const slots = args.blocks.map((hex, i) => {
    // Attempt to match exact hex or bug class hex
    let entry = SCD64_GLOSSARY.find(g => g.hexCode === hex && g.slotIndex === i);
    
    if (!entry && i === 0) {
      // Try version byte fallback
       entry = SCD64_GLOSSARY.find(g => g.versionByte === args.versionByte && g.hexCode.endsWith(hex.slice(2)) && g.slotIndex === i);
    }
    
    return {
      index: i,
      name: SCD64_SLOT_NAMES[i] || `SLOT_${i}`,
      hex,
      meaning: entry ? entry.humanMeaning : "Unknown code",
      categoryChecksum: entry ? entry.categoryChecksum : undefined
    };
  });

  return {
    valid: true,
    versionByte: args.versionByte,
    bugFamily,
    slots,
    remediationHints: LOCAL_HINTS[checksum64] || []
  };
}

export function decodeSCD64Hover(checksum64: string): SCD64HoverDecodeResponse {
  try {
    const blocks = parseSCD64(checksum64);
    const versionByte = extractVersionByte(blocks);

    return lookupSCD64BlocksInMCP({
      versionByte,
      blocks
    }, checksum64);
  } catch (err) {
    return {
      valid: false,
      versionByte: "",
      bugFamily: "",
      slots: []
    };
  }
}
