import { AZIMUTH, ELEVATION_MAX, ELEVATION_MIN, REST_ANGLES, anglesFor } from "../camera";

describe("anglesFor", () => {
  it("rests dead centre with the camera level", () => {
    expect(anglesFor(0.5, 1)).toEqual({ azimuth: 0, elevation: 0 });
    expect(REST_ANGLES).toEqual({ azimuth: 0, elevation: 0 });
  });

  it("sweeps the full azimuth range across the viewport", () => {
    expect(anglesFor(0, 1).azimuth).toBe(-AZIMUTH);
    expect(anglesFor(1, 1).azimuth).toBe(AZIMUTH);
  });

  it("lifts the camera towards the top of the viewport, never below ground", () => {
    expect(anglesFor(0.5, 0).elevation).toBe(ELEVATION_MAX);
    expect(anglesFor(0.5, 1).elevation).toBe(ELEVATION_MIN);
    // One-sided: nothing in the range can produce a negative elevation.
    for (let y = 0; y <= 1; y += 0.1) {
      expect(anglesFor(0.5, y).elevation).toBeGreaterThanOrEqual(0);
    }
  });

  it("is continuous — unlike the frame grid it replaces", () => {
    // The old grid quantised to 9 columns; adjacent pixels gave the same frame
    // or jumped a whole degree. This must vary smoothly.
    const a = anglesFor(0.5, 1).azimuth;
    const b = anglesFor(0.501, 1).azimuth;
    expect(b).not.toBe(a);
    expect(Math.abs(b - a)).toBeLessThan(0.05);
  });

  it("clamps input a pixel past the edge", () => {
    expect(anglesFor(-0.2, 1.4).azimuth).toBe(-AZIMUTH);
    expect(anglesFor(1.4, -0.2).elevation).toBe(ELEVATION_MAX);
  });
});
