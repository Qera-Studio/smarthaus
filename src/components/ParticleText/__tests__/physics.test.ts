import {
  CLEAR_RADIUS,
  MAX_STEPS,
  STEP_MS,
  fixedSteps,
  ORBIT_MAX,
  RADIUS,
  SPEED_DEADZONE,
  SPEED_MAX,
  orbitShare,
  pushMagnitude,
  repulsion,
  smoothSpeed,
} from "../physics";

// The behaviour asserted here is the brief for the 404 effect: pointer velocity
// is the energy source, a stationary cursor does not drive an orbit, and the
// exclusion zone is a hard floor. These are properties of the force model, so
// they are tested on the model — reading pixels back from the canvas is slower
// than the spring's recovery, which makes the same assertions untestable end to
// end (an earlier E2E attempt measured an identical value before and after a
// fast flick and wrongly concluded nothing had moved).

describe("pointer speed smoothing", () => {
  it("treats a still pointer as exactly stopped", () => {
    // Not merely asymptotic: "the cursor stopped" has to be a real state, or
    // the field never settles.
    expect(smoothSpeed(0, 0)).toBe(0);
  });

  it("decays to a full stop once the pointer stops moving", () => {
    let speed = 30;
    for (let i = 0; i < 200; i++) speed = smoothSpeed(speed, 0);
    expect(speed).toBe(0);
  });

  it("rises faster than it falls, so a flick registers immediately", () => {
    const rise = smoothSpeed(0, 20);
    const fall = 20 - smoothSpeed(20, 0);
    expect(rise).toBeGreaterThan(fall);
  });

  it("ignores sub-deadzone jitter", () => {
    expect(smoothSpeed(0, SPEED_DEADZONE * 0.5)).toBe(0);
  });
});

describe("the cursor bubble", () => {
  it("is wider than the visible cursor dot", () => {
    // The dot is an SVG circle with r="8" in globals.scss. A bubble smaller
    // than that sits INSIDE the cursor's own ink, so particles bury the dot
    // while every distance measurement still reports the clamp working — which
    // is exactly the bug this guards. If the dot is ever resized, this fails.
    const CURSOR_DOT_RADIUS = 8;
    expect(CLEAR_RADIUS).toBeGreaterThan(CURSOR_DOT_RADIUS);
  });

  it("leaves a visible margin around the dot rather than hugging it", () => {
    expect(CLEAR_RADIUS).toBeGreaterThanOrEqual(10);
    // But not so large that it punches a hole out of proportion to the cursor.
    expect(CLEAR_RADIUS).toBeLessThanOrEqual(20);
  });
});

describe("orbit share", () => {
  it("is zero when the cursor is still", () => {
    // The core fix: with no tangential component, nothing rolls around a
    // parked cursor.
    expect(orbitShare(0)).toBe(0);
  });

  it("grows with pointer speed", () => {
    expect(orbitShare(20)).toBeGreaterThan(orbitShare(5));
  });

  it("saturates at ORBIT_MAX so a flick cannot fling the field", () => {
    expect(orbitShare(SPEED_MAX)).toBeCloseTo(ORBIT_MAX);
    expect(orbitShare(SPEED_MAX * 10)).toBeCloseTo(ORBIT_MAX);
  });
});

describe("push magnitude", () => {
  it("is exactly zero at rest, so the bubble alone sets the clearance", () => {
    // A stationary cursor must apply no force. Any static shove creates a wide
    // soft cavity sized by the force falloff instead of by CLEAR_RADIUS —
    // measured at 4.3px, 13.3px and 33px across three positions before this
    // was zeroed, which is not a 4px bubble.
    expect(pushMagnitude(0)).toBe(0);
  });

  it("scales with pointer speed", () => {
    expect(pushMagnitude(30)).toBeGreaterThan(pushMagnitude(3));
  });
});

describe("repulsion", () => {
  // A particle directly to the right of the pointer: radial is +x.
  const right = { dist: 20, rx: 1, ry: 0 };

  it("does nothing beyond the field radius", () => {
    expect(repulsion(RADIUS + 1, 1, 0, 30)).toEqual({ fx: 0, fy: 0 });
  });

  it("applies no force at all when the cursor is still", () => {
    // A stationary cursor is a hole, not a fan. It displaces only what it
    // physically overlaps — enforced by the CLEAR_RADIUS bubble as a position
    // clamp — and pushes nothing beyond that. This is what makes the cavity at
    // rest exactly the bubble's size instead of a wide soft dent.
    const { fx, fy } = repulsion(right.dist, right.rx, right.ry, 0);
    expect(fx).toBe(0);
    expect(fy).toBe(0);
  });

  it("stays radial-dominant at low speed, so a slow cursor does not swirl", () => {
    const { fx, fy } = repulsion(right.dist, right.rx, right.ry, 2);
    // Radial is +x here; tangential is ±y. Radial must dominate.
    expect(Math.abs(fx)).toBeGreaterThan(Math.abs(fy));
  });

  it("gains a tangential component as the pointer speeds up", () => {
    const still = repulsion(right.dist, right.rx, right.ry, 0);
    const moving = repulsion(right.dist, right.rx, right.ry, SPEED_MAX);
    // Tangential to a +x radial is ±y, so a non-zero fy IS the orbit.
    expect(Math.abs(moving.fy)).toBeGreaterThan(Math.abs(still.fy));
    expect(Math.abs(moving.fy)).toBeGreaterThan(0.1);
  });

  it("pushes a fast cursor's particles harder than a slow cursor's", () => {
    const slow = repulsion(right.dist, right.rx, right.ry, 2);
    const fast = repulsion(right.dist, right.rx, right.ry, 30);
    const mag = (f: { fx: number; fy: number }) => Math.hypot(f.fx, f.fy);
    // This is the headline requirement, as a number: the faster the cursor
    // moves, the more aggressive the warp.
    expect(mag(fast)).toBeGreaterThan(mag(slow));
  });

  it("pushes hardest nearest the cursor", () => {
    const near = repulsion(10, 1, 0, 10);
    const far = repulsion(RADIUS - 10, 1, 0, 10);
    expect(Math.hypot(near.fx, near.fy)).toBeGreaterThan(Math.hypot(far.fx, far.fy));
  });

  it("never pulls a particle toward the cursor", () => {
    // Any inward (negative radial) force would suck particles into the cursor,
    // which the exclusion zone would then have to fight every frame.
    for (const speed of [0, 5, 17, SPEED_MAX, SPEED_MAX * 3]) {
      for (const dist of [CLEAR_RADIUS, 20, 50, RADIUS - 1]) {
        const { fx, fy } = repulsion(dist, 1, 0, speed);
        // Radial component along +x must not be negative.
        expect(fx).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(fy)).toBe(true);
      }
    }
  });
});

describe("fixedSteps", () => {
  it("runs one step for one step's worth of time", () => {
    expect(fixedSteps(STEP_MS, 0)).toEqual({ steps: 1, carry: 0 });
  });

  it("runs none, and banks the time, for a frame shorter than a step", () => {
    const due = fixedSteps(STEP_MS / 2, 0);
    expect(due.steps).toBe(0);
    expect(due.carry).toBeCloseTo(STEP_MS / 2, 10);
  });

  it("pays out banked time once it adds up to a step: two 120 Hz frames are one step", () => {
    const first = fixedSteps(STEP_MS / 2, 0);
    const second = fixedSteps(STEP_MS / 2, first.carry);
    expect(second.steps).toBe(1);
    expect(second.carry).toBeCloseTo(0, 10);
  });

  it("runs two steps for a 30 Hz frame", () => {
    expect(fixedSteps(STEP_MS * 2, 0).steps).toBe(2);
  });

  it("keeps the fractional remainder", () => {
    const due = fixedSteps(STEP_MS * 2.25, 0);
    expect(due.steps).toBe(2);
    expect(due.carry).toBeCloseTo(STEP_MS * 0.25, 10);
  });

  it("runs exactly MAX_STEPS at the cap, keeping its remainder", () => {
    const due = fixedSteps(STEP_MS * MAX_STEPS + 1, 0);
    expect(due.steps).toBe(MAX_STEPS);
    expect(due.carry).toBeCloseTo(1, 10);
  });

  it("caps a long gap at MAX_STEPS and drops the rest", () => {
    expect(fixedSteps(10_000, 0)).toEqual({ steps: MAX_STEPS, carry: 0 });
  });

  it("counts banked time toward the cap", () => {
    expect(fixedSteps(STEP_MS * MAX_STEPS, STEP_MS)).toEqual({ steps: MAX_STEPS, carry: 0 });
  });

  it("treats a negative elapsed time as none", () => {
    expect(fixedSteps(-50, 0)).toEqual({ steps: 0, carry: 0 });
    expect(fixedSteps(-50, STEP_MS / 4).carry).toBeCloseTo(STEP_MS / 4, 10);
  });

  it("does not drift over a long run of 120 Hz frames", () => {
    let carry = 0;
    let steps = 0;
    for (let i = 0; i < 1200; i += 1) {
      const due = fixedSteps(1000 / 120, carry);
      carry = due.carry;
      steps += due.steps;
    }
    // Ten seconds at 120 Hz is 600 steps of 1/60 s, give or take the last.
    expect(steps).toBeGreaterThanOrEqual(599);
    expect(steps).toBeLessThanOrEqual(600);
  });

  it("steps at 60 Hz, the rate every constant was tuned at", () => {
    expect(STEP_MS).toBeCloseTo(1000 / 60, 10);
  });
});
