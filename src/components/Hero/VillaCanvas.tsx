"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LANDING, SERVICE_SHOTS, shotById } from "./scenes";
import { ServiceTabs } from "./ServiceTabs";
import styles from "./Hero.module.scss";

/** Where the exported model lives. Dropped in by scripts/export-villa.py. */
const MODEL = "/hero/villa.glb";

/** How fast the resting camera chases the cursor. Per-frame lerp factor. */
const EASE = 0.08;

/**
 * The lens the shot list was composed against: a 32-degree vertical field in
 * the hero's 16:4 band. Every offset in scenes.ts is a standoff at this lens,
 * and `size()` below keeps the HORIZONTAL field it implies constant at every
 * other aspect ratio.
 */
const BASE_FOV = 32;
const BASE_ASPECT = 2112 / 544;

type Connection = { saveData?: boolean; effectiveType?: string };

/**
 * A handle onto the running scene, so React can drive the tour without
 * re-running the effect that built it.
 */
type Engine = {
  flyTo: (id: string) => void;
  dispose: () => void;
};

/**
 * The villa, as real geometry, plus the drone tour.
 *
 * ## Why this replaced a frame grid
 *
 * The first version cross-faded 45 pre-rendered viewpoints on pointer move. A
 * cross-fade between two DIFFERENT viewpoints is a double exposure: at 50%
 * every vertical edge doubles, and the camera moved ~8px per step, well above
 * the ~2px where a dissolve reads as blur. No frame count fixes that — opacity
 * is the wrong operator for rotation. One villa and one moving camera removes
 * it by construction, and buys the drone tour for free.
 *
 * ## Two modes
 *
 * At REST the camera sits at the landing shot and the cursor nudges it a few
 * degrees — the subtle parallax the hero has always had.
 *
 * On TOUR the cursor is ignored and the drone flies a shot list: in towards
 * the villa, up and around to a device, then plays that device's automation.
 * The villa turns underneath the camera at the same time, on the same clock,
 * so the two read as one gesture. See tour.ts.
 *
 * Nothing here is scroll-driven. Entering is a click, leaving is a click or
 * Escape, exactly as asked.
 *
 * ## Why three.js is allowed
 *
 * See the three.js section in AGENTS.md. Briefly: the ban assumed a 10MB
 * textured scene. The v2 model is 474k triangles across 17 untextured
 * materials, 2.6MB Draco-compressed and 1.4MB over gzip.
 *
 * That is heavier than the v1 model the exception was argued on (30k
 * triangles, 304KB), and the margin is worth watching rather than assuming:
 * the geometry now carries applied bevels, and `trim` alone is 186k triangles.
 * A re-export with bevels left as modifiers would take it back under 100k at
 * no visible cost at hero scale.
 *
 * What still holds: the poster below is never removed, three.js and the model
 * are in no initial chunk, and every gate that skipped the old frame grid
 * (touch, reduced motion, Save-Data, 2g/3g) still loads none of it.
 */
export function VillaCanvas({
  poster,
  panels,
}: {
  poster: React.ReactNode;
  /** Server-rendered info panels, one per service. Indexable copy. */
  panels?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(LANDING.id);

  const flyTo = useCallback((id: string) => {
    setActive(id);
    engineRef.current?.flyTo(id);
  }, []);

  // Which panel is visually foremost. Written as a data attribute rather than
  // by mounting one panel, because every panel must stay in the DOM: the copy
  // is indexable and is the only version of it on the no-canvas path.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    for (const panel of host.querySelectorAll<HTMLElement>("[data-shot]")) {
      if (panel.dataset["shot"] === active) panel.dataset["active"] = "";
      else delete panel.dataset["active"];
    }
  }, [active]);

  // MOVE FOCUS WITH THE TOUR.
  //
  // The trigger is the villa hit area, which unmounts the moment the tour
  // opens — so without this, focus falls back to <body> and a keyboard reader
  // is left in a full-screen scene with nothing focused, needing to Tab in
  // from the top of the document to reach the rail. Entering sends focus to
  // the selected tab; leaving hands it back to the trigger.
  //
  // Guarded on `ready`: with no canvas there is no tour and neither element
  // exists.
  const wasTouring = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    if (!host) return;
    const touring = active !== LANDING.id;

    if (touring && !wasTouring.current) {
      host.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
    } else if (!touring && wasTouring.current) {
      host.querySelector<HTMLElement>(`.${styles.enter}`)?.focus();
    }
    wasTouring.current = touring;
  }, [active, ready]);

  // Publish the tour state onto the <section>, which is server-rendered and so
  // cannot carry it as a prop.
  //
  // The whole hero reacts to this, not just the canvas: entering the tour
  // fades the heading, the lede, the CTAs and the byline away and grows the
  // stage to fill the section, so the flat page is left behind as the camera
  // flies in. All of that is in Hero.module.scss under .hero[data-touring];
  // this effect only flips the flag.
  useEffect(() => {
    const section = hostRef.current?.closest<HTMLElement>("[data-hero]");
    if (!section) return;
    if (active !== LANDING.id) section.dataset["touring"] = "";
    else delete section.dataset["touring"];
  }, [active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Gates. All of them leave the poster exactly as served and load nothing.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    // Gated in JS as well as CSS: the _reset.scss reduced-motion block zeroes
    // CSS durations and has no effect on a rAF loop. Same trap as
    // ParticleText and ProcessFallback.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (connection?.saveData || /(^|[^4-9])[23]g$/.test(connection?.effectiveType ?? "")) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      // Dynamic import: three.js, the loader and the whole tour are their own
      // chunk, fetched after the page is interactive and never counted against
      // the initial JS.
      const [
        { PerspectiveCamera, Scene, Vector3, WebGLRenderer },
        { GLTFLoader },
        { DRACOLoader },
        { addLighting, configureRenderer },
        { anglesFor, REST_ANGLES },
        { Flight, ShellFader, ShotResolver, applyState, restState },
        { bindAnimation },
        { toRadians: degToRad },
      ] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/loaders/DRACOLoader.js"),
        import("./villa"),
        import("./camera"),
        import("./tour"),
        import("./automations"),
        import("./scenes"),
      ]);
      if (disposed) return;

      const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      // Capped at 2: beyond that the pixel cost doubles for no visible gain on
      // a model with no texture detail to resolve.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      configureRenderer(renderer);
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.className = styles.canvas ?? "";

      const scene = new Scene();
      addLighting(scene);
      const camera = new PerspectiveCamera(32, 1, 0.1, 500);

      // DRACO IS REQUIRED, NOT OPTIONAL.
      //
      // The v2 export declares KHR_draco_mesh_compression in
      // `extensionsRequired`, so GLTFLoader refuses the file outright without
      // a decoder — it rejects with "No DRACOLoader instance provided" rather
      // than falling back, which is correct: the vertex data genuinely is not
      // readable without it.
      //
      // The decoder is served from our own origin (public/draco/), never a
      // CDN: the CSP is default-src 'self' and a CDN would mean allowing a
      // third-party origin for one file. Only the .wasm and its wrapper are
      // copied, NOT the 512KB pure-JS decoder — anything that can run WebGL2
      // can run wasm, so the JS path is dead weight. 248KB, fetched once and
      // cached, and only on devices that passed every gate above.
      //
      // It needs 'wasm-unsafe-eval' in script-src; that directive ships in
      // next.config.ts alongside this, per the AGENTS.md rule that a CSP
      // change lands in the same change as the dependency that needs it.
      const draco = new DRACOLoader();
      draco.setDecoderPath("/draco/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);

      let gltf;
      try {
        gltf = await loader.loadAsync(MODEL);
      } catch (error) {
        // No model, a 404, or a decode failure: keep the poster. Reported
        // because everything here runs outside React's error boundary, so an
        // unlogged failure is a silent poster with no clue why.
        console.error("[hero] villa model failed to load", error);
        draco.dispose();
        renderer.dispose();
        return;
      }
      if (disposed) {
        draco.dispose();
        renderer.dispose();
        return;
      }

      const model = gltf.scene;
      scene.add(model);

      const resolver = new ShotResolver(model);
      const fader = new ShellFader(model);
      const pivot = resolver.pivot;

      // --- Tour state ------------------------------------------------------
      let current = LANDING;
      let state = restState(resolver, LANDING);
      let flight: InstanceType<typeof Flight> | null = null;
      let flightStart = 0;
      let automation: ReturnType<typeof bindAnimation> = null;
      let automationStart = 0;
      // Cursor nudge, only meaningful at rest on the landing shot.
      let wantAz = REST_ANGLES.azimuth;
      let wantEl = REST_ANGLES.elevation;
      let az = wantAz;
      let el = wantEl;

      const size = () => {
        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;

        // HOLD THE HORIZONTAL FIELD, NOT THE VERTICAL ONE.
        //
        // three's `fov` is the VERTICAL angle, so a camera at a fixed distance
        // keeps its vertical framing and loses horizontal reach as the box
        // gets taller. That is exactly backwards for this hero: the shots are
        // composed against a wide subject, and the stage changes shape
        // dramatically when the tour opens — from the 16:4 band to the full
        // section, roughly 3:2. Measured: every shot that read correctly in
        // the band arrived far too close at full height.
        //
        // So the horizontal angle is the constant and the vertical is derived
        // from the current aspect. A wide box behaves exactly as before; a
        // tall one opens up vertically instead of cropping in.
        // CLAMPED, because holding the horizontal field alone goes too far the
        // other way. The band's 32 degrees at 16:4 implies a 96-degree
        // horizontal lens, which at phone aspect would resolve to a 127-degree
        // vertical one: barrel-wide, and the villa would bend at the edges.
        // 64 degrees vertical is about the widest that still reads as
        // architectural photography rather than as a fisheye.
        const horizontal = 2 * Math.atan(Math.tan((BASE_FOV * Math.PI) / 360) * BASE_ASPECT);
        const derived = (2 * Math.atan(Math.tan(horizontal / 2) / camera.aspect) * 180) / Math.PI;
        camera.fov = Math.min(64, Math.max(BASE_FOV, derived));
        camera.updateProjectionMatrix();
      };
      size();
      host.appendChild(renderer.domElement);

      let frame = 0;
      let running = false;

      const draw = (now: number) => {
        if (flight) {
          const elapsed = now - flightStart;
          state = flight.sample(elapsed);
          if (elapsed >= flight.duration) {
            flight = null;
            // The automation starts only once the camera has settled, so the
            // gate is never opening while the drone is still moving toward it.
            if (current.animation) {
              automation?.reset();
              automation = bindAnimation(model, current.animation);
              automationStart = now;
            }
          }
        } else if (current.id === LANDING.id) {
          // At rest on the landing: the cursor nudge, eased.
          az += (wantAz - az) * EASE;
          el += (wantEl - el) * EASE;
          const base = restState(resolver, LANDING);
          const radius = base.position.distanceTo(base.target);
          const a = degToRad(az);
          const e = degToRad(el);
          state = {
            ...base,
            position: new Vector3(
              base.target.x + radius * Math.sin(a) * Math.cos(e),
              base.target.y + radius * Math.sin(e),
              base.target.z + radius * Math.cos(a) * Math.cos(e),
            ),
          };
        }

        applyState(state, camera, model, pivot, fader);

        if (automation) {
          const elapsed = now - automationStart;
          automation.sample(elapsed);
          if (elapsed >= automation.duration) {
            // Held at its end pose rather than reset: a gate that snaps shut
            // the instant it finishes opening reads as a glitch.
            automation.sample(automation.duration);
            automation = null;
          }
        }

        renderer.render(scene, camera);
        frame = requestAnimationFrame(draw);
      };

      const run = () => {
        if (running) return;
        running = true;
        frame = requestAnimationFrame(draw);
      };
      const stop = () => {
        if (!running) return;
        running = false;
        cancelAnimationFrame(frame);
        frame = 0;
      };

      const onMove = (event: PointerEvent) => {
        // Ignored on tour: the drone owns the camera then.
        if (current.id !== LANDING.id || flight) return;
        const next = anglesFor(
          event.clientX / window.innerWidth,
          event.clientY / window.innerHeight,
        );
        wantAz = next.azimuth;
        wantEl = next.elevation;
      };
      const onLeave = () => {
        wantAz = REST_ANGLES.azimuth;
        wantEl = REST_ANGLES.elevation;
      };

      let listening = false;
      const listen = () => {
        if (listening) return;
        listening = true;
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("mouseleave", onLeave);
        run();
      };
      const unlisten = () => {
        if (!listening) return;
        listening = false;
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("mouseleave", onLeave);
        stop();
      };

      // Alive only while the hero is on screen. No scroll listener.
      const io = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) listen();
        else unlisten();
      });
      io.observe(host);

      const ro = new ResizeObserver(size);
      ro.observe(host);

      // Render one frame before revealing, so the canvas never appears blank
      // over the poster it replaces.
      applyState(state, camera, model, pivot, fader);
      renderer.render(scene, camera);
      setReady(true);

      engineRef.current = {
        flyTo: (id: string) => {
          const next = shotById(id);
          if (!next || next.id === current.id) return;
          automation?.reset();
          automation = null;
          // Starting from the LIVE state, not from the previous shot's rest
          // pose: interrupting a flight mid-air must continue from where the
          // camera actually is, or it snaps back before setting off.
          flight = new Flight(resolver, current, next, state);
          flightStart = performance.now();
          current = next;
          run();
        },
        dispose: () => {},
      };

      cleanup = () => {
        engineRef.current = null;
        io.disconnect();
        ro.disconnect();
        unlisten();
        automation?.reset();
        fader.dispose();
        // Terminates the decoder's worker. Without this every hero unmount
        // leaks one.
        draco.dispose();
        renderer.domElement.remove();
        renderer.dispose();
        model.traverse((node) => {
          const mesh = node as { geometry?: { dispose(): void }; material?: unknown };
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
          else (material as { dispose?: () => void })?.dispose?.();
        });
      };
    };

    // After the page is interactive, so the model and three.js never compete
    // with the poster's fetch or with hydration.
    //
    // The catch is load-bearing, not defensive dressing: everything inside
    // start() runs outside React's error boundary, so an exception here would
    // otherwise be swallowed by the promise and leave the poster up with no
    // clue why. Reporting it keeps the fallback silent for the READER while
    // remaining visible to anyone with a console open.
    const handle = window.setTimeout(() => {
      start().catch((error: unknown) => {
        console.error("[hero] villa canvas failed to start", error);
      });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(handle);
      cleanup?.();
    };
  }, []);

  const touring = active !== LANDING.id;

  return (
    <div
      ref={hostRef}
      className={styles.canvasHost}
      data-ready={ready || undefined}
      data-touring={touring || undefined}
    >
      {poster}

      {/*
        The villa itself is the affordance: clicking the render enters the
        tour. There is no button over it, because the hero's own "Explore
        Villa" CTA already offers that action in words — a second, centred
        button under the villa said the same thing twice and read as an
        unfinished control.

        This is a real <button> wrapping the stage rather than a click handler
        on the canvas: the canvas is aria-hidden and cannot be focused or
        announced, so "click the picture" is not an affordance a keyboard or
        screen-reader user has. Its accessible name says what it does; it is
        visually transparent, so only the render is seen.
      */}
      {ready && !touring ? (
        <button type="button" className={styles.enter} onClick={() => flyTo(SERVICE_SHOTS[0]!.id)}>
          <span className="visually-hidden">Explore the villa</span>
        </button>
      ) : null}

      {ready ? (
        <div
          className={styles.explorer}
          hidden={!touring}
          // presentation, not an interactive role: this <div> is a positioning
          // layer that happens to catch a bubbled key, NOT a control. It has
          // no label, takes no focus, and every actual control inside it is a
          // real <button>. The lint rule cannot tell the two apart, so the
          // role says which this is.
          role="presentation"
          // Escape leaves the tour from ANYWHERE inside it, not only from the
          // tab rail. The rail has its own handler for the case where focus is
          // on a tab; this catches the rest — the Back button, the panels, or
          // focus simply left where the trigger put it — so a keyboard reader
          // is never stranded in a full-screen scene with no way out.
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            flyTo(LANDING.id);
          }}
        >
          <ServiceTabs active={active} onSelect={flyTo} onExit={() => flyTo(LANDING.id)} />
          <button type="button" className={styles.exit} onClick={() => flyTo(LANDING.id)}>
            Back to the villa
          </button>
        </div>
      ) : null}

      {/* Server-rendered, always in the DOM: the copy is indexable and
          readable whether or not the canvas ever runs. */}
      {panels}
    </div>
  );
}
