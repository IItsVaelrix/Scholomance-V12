import { describe, expect, it } from "vitest";
import { compileInvestigationPlan } from "../../../codex/core/immunity/cleri-probe/planner.js";

describe("compileInvestigationPlan", () => {
  it("maps a listener hypothesis to a visible deterministic plan", () => {
    const plan = compileInvestigationPlan(
      "leaked event listener inside React useEffect",
      { paths: ["src"] }
    );
    expect(plan.pathologyClasses).toEqual(["LEAKED_LISTENER_SUBSCRIPTION"]);
    expect(plan.verifierIds).toEqual(["listener-lifecycle/v1"]);
    expect(plan.counterchecks).toContain("MATCHING_EFFECT_CLEANUP");
    expect(plan.paths).toEqual(["src"]);
  });

  it("marks unsupported hypotheses inconclusive before scanning", () => {
    const plan = compileInvestigationPlan("the UI feels haunted", {});
    expect(plan.supported).toBe(false);
    expect(plan.reasonCode).toBe("NO_REGISTERED_PATHOLOGY_CLASS");
  });

  it("normalizes Unicode, case, whitespace, and punctuation", () => {
    const a = compileInvestigationPlan("Event Listener Leak", {});
    const b = compileInvestigationPlan("  EVENT–LISTENER…leak!  ", {});
    expect(a.pathologyClasses).toEqual(b.pathologyClasses);
    expect(a.verifierIds).toEqual(b.verifierIds);
    expect(a.counterchecks).toEqual(b.counterchecks);
  });

  it("sorts all selected values", () => {
    const plan = compileInvestigationPlan(
      "leaked event listener inside React useEffect",
      { paths: ["b", "a"] }
    );
    expect(plan.pathologyClasses).toEqual(["LEAKED_LISTENER_SUBSCRIPTION"]);
    expect(plan.verifierIds).toEqual(["listener-lifecycle/v1"]);
    expect(plan.paths).toEqual(["a", "b"]);
    expect([...plan.counterchecks].sort()).toEqual(plan.counterchecks);
  });

  it("does not infer unsupported classes from vector proximity", () => {
    const plan = compileInvestigationPlan("haunted event ghost", {});
    expect(plan.supported).toBe(false);
    expect(plan.reasonCode).toBe("NO_REGISTERED_PATHOLOGY_CLASS");
  });

  it("normalizes absolute paths out of the plan", () => {
    const plan = compileInvestigationPlan(
      "event listener leak",
      { paths: ["/home/deck/project/src"] }
    );
    expect(plan.paths).toEqual(["home/deck/project/src"]);
  });

  it("emits the profile identity on every plan", () => {
    const plan = compileInvestigationPlan("event listener leak", {});
    expect(plan.profileId).toBe("scholomance/default");
    expect(plan.version).toBe("1.0.0");
  });

  it("returns a frozen plan object", () => {
    const plan = compileInvestigationPlan("event listener leak", {});
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.pathologyClasses)).toBe(true);
    expect(Object.isFrozen(plan.counterchecks)).toBe(true);
  });

  it("does not include an internal terms field in the plan", () => {
    const plan = compileInvestigationPlan("event listener leak", {});
    expect(plan.terms).toBeUndefined();
  });
});
