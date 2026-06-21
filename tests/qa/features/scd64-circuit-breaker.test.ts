import { describe, it, expect } from "vitest";
import { evaluateSCD64CircuitBreaker } from "../../../src/core/scd64/circuitBreaker";

describe("evaluateSCD64CircuitBreaker", () => {
  it("activates for known fatal signature and FATAL_PRESENTATION_DESYNC severity", () => {
    const breaker = evaluateSCD64CircuitBreaker({
      checksum64: "01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C",
      bugFamily: "COLOR_DRAGON",
      severity: "FATAL_PRESENTATION_DESYNC"
    });
    
    expect(breaker.active).toBe(true);
    expect(breaker.affectedFeature).toBe("TRUESIGHT_COLORING");
    expect(breaker.diagnosticMode).toBe("DIAGNOSE_ONLY");
    expect(breaker.checksum64).toBe("01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C");
  });

  it("does not activate for known fatal signature with different severity", () => {
    const breaker = evaluateSCD64CircuitBreaker({
      checksum64: "01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C",
      bugFamily: "COLOR_DRAGON",
      severity: "LOW"
    });
    
    expect(breaker.active).toBe(false);
  });

  it("does not activate for unknown signature", () => {
    const breaker = evaluateSCD64CircuitBreaker({
      checksum64: "02861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C",
      bugFamily: "RESONANCE_GHOST",
      severity: "FATAL_PRESENTATION_DESYNC"
    });
    
    expect(breaker.active).toBe(false);
  });
});
