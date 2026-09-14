import {
  ANIMATIONS,
  LANDING,
  SERVICE_SHOTS,
  SHOTS,
  droneEase,
  flightDuration,
  lerpAngle,
  shotById,
} from "../scenes";

describe("the shot list", () => {
  it("has unique ids and deviceIds", () => {
    // Both are join keys: the id addresses a tab and a URL hash, the deviceId
    // joins to hotspot copy in Sanity. A duplicate in either silently sends a
    // reader to the wrong place.
    const ids = SHOTS.map((s) => s.id);
    const devices = SHOTS.map((s) => s.deviceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(devices).size).toBe(devices.length);
  });

  it("starts at the landing, which is not a tab", () => {
    expect(SHOTS[0]).toBe(LANDING);
    expect(LANDING.id).toBe("landing");
    expect(SERVICE_SHOTS).toHaveLength(SHOTS.length - 1);
    expect(SERVICE_SHOTS.map((s) => s.id)).not.toContain("landing");
  });

  it("rests the landing dead front and level, matching the poster", () => {
    // The poster is a Cycles render at azimuth 0, elevation 0. If the landing
    // shot drifts off that, the hand-off from poster to canvas becomes a jump.
    expect(LANDING.target).toEqual([0, 0, 0]);
    expect(LANDING.offset[0]).toBe(0);
    expect(LANDING.modelYaw).toBe(0);
  });

  it("gives every shot a label and a positive duration", () => {
    for (const shot of SHOTS) {
      expect(shot.label.trim()).not.toBe("");
      expect(shot.duration).toBeGreaterThan(0);
    }
  });

  it("names an animation that exists, wherever one is named", () => {
    // A shot pointing at a missing animation lands the camera and then plays
    // nothing, which looks like a bug rather than a design.
    for (const shot of SHOTS) {
      if (shot.animation) expect(ANIMATIONS[shot.animation]).toBeDefined();
    }
  });

  it("finds shots by id, and nothing by a bad one", () => {
    expect(shotById("garage")?.label).toBe("Garage");
    expect(shotById("nope")).toBeUndefined();
  });

  it("leaves no animation stranded without a shot to play it", () => {
    // The inverse of the check above, and the one that catches a REMOVED tab:
    // deleting a shot but leaving its animation behind is dead config that
    // looks live. Both directions have to hold or the table rots.
    const used = new Set(SHOTS.map((s) => s.animation).filter(Boolean));
    expect(Object.keys(ANIMATIONS).sort()).toEqual([...used].sort());
  });
});

describe("the animation table", () => {
  it("gives every step a prefix, a duration and a real axis", () => {
    for (const steps of Object.values(ANIMATIONS)) {
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.prefix.trim()).not.toBe("");
        expect(step.duration).toBeGreaterThan(0);
        expect(["x", "y", "z"]).toContain(step.axis);
      }
    }
  });

  it("makes the gate reversible", () => {
    // Reversible actions are the reason real geometry beats pre-rendered
    // clips: AGENTS.md notes a video needs a second render to play backwards.
    const gate = ANIMATIONS["garage"]!;
    expect(gate.some((s) => s.pingPong)).toBe(true);
  });
});

describe("droneEase", () => {
  it("runs from 0 to 1 and is symmetric about the midpoint", () => {
    expect(droneEase(0)).toBe(0);
    expect(droneEase(1)).toBe(1);
    expect(droneEase(0.5)).toBeCloseTo(0.5, 5);
    // A drone accelerates and decelerates the same way.
    expect(droneEase(0.25) + droneEase(0.75)).toBeCloseTo(1, 5);
  });

  it("clamps out-of-range input", () => {
    expect(droneEase(-1)).toBe(0);
    expect(droneEase(2)).toBe(1);
  });

  it("starts and ends slowly", () => {
    // The point of the curve: no lurch off the mark, no slam into the stop.
    expect(droneEase(0.1)).toBeLessThan(0.1);
    expect(droneEase(0.9)).toBeGreaterThan(0.9);
  });
});

describe("lerpAngle", () => {
  it("takes the short way round the circle", () => {
    // 350 -> 10 is 20 degrees forwards, not 340 backwards. A plain lerp spins
    // the villa almost all the way round.
    expect(lerpAngle(350, 10, 1)).toBeCloseTo(370, 5);
    expect(lerpAngle(10, 350, 1)).toBeCloseTo(-10, 5);
  });

  it("interpolates normally within a half turn", () => {
    expect(lerpAngle(0, 90, 0.5)).toBeCloseTo(45, 5);
    expect(lerpAngle(-20, 20, 0.5)).toBeCloseTo(0, 5);
  });
});

describe("flightDuration", () => {
  it("takes longer for a longer flight", () => {
    const landingToLighting = flightDuration(LANDING, shotById("lighting")!);
    const climateToShading = flightDuration(shotById("climate")!, shotById("shading")!);
    // Landing to the roof crosses the whole model; two interior shots are a
    // few metres apart.
    expect(landingToLighting).toBeGreaterThan(climateToShading);
  });

  it("is always a sane, finite number of milliseconds", () => {
    for (const from of SHOTS) {
      for (const to of SHOTS) {
        const ms = flightDuration(from, to);
        expect(Number.isFinite(ms)).toBe(true);
        expect(ms).toBeGreaterThan(300);
        expect(ms).toBeLessThan(8000);
      }
    }
  });
});
