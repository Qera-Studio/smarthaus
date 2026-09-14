import { POSTER, POSTER_SIZE } from "./frames";
import { SERVICE_SHOTS } from "./scenes";
import styles from "./Hero.module.scss";
import { VillaCanvas } from "./VillaCanvas";

/**
 * The villa stage: a server-rendered poster and info panels, with a WebGL
 * canvas layered over them.
 *
 * Server Component. The poster is the page's LCP element and the fallback for
 * every device the canvas does not run on; the panels carry the copy.
 * VillaCanvas is the only client code, and it fades a live render in over the
 * poster once three.js and the model have loaded.
 *
 * The poster is r4_c4 from the old frame grid: the resting view, and the exact
 * angle the canvas rests at, so the hand-off is invisible.
 *
 * ## The panels are server-rendered on purpose
 *
 * AGENTS.md requires the service copy to be indexable and screen-reader
 * accessible, and its adaptive-loading rule is blunt: "All meaning lives in
 * HTML text." So every panel ships in the document whether or not WebGL ever
 * initialises, and the canvas only changes which one is visually foremost.
 */

/**
 * Panel copy, keyed by shot id.
 *
 * DELIBERATELY NEUTRAL, and placeholder. Under the AGENTS.md claims audit only
 * services Maple Technologies has actually delivered may be claimed, and of
 * these only security, access control and audio are confirmed. So each panel
 * describes what the automation DOES in the scene rather than what Smarthaus
 * guarantees, and none names a brand, a protocol or a response time.
 *
 * When Sanity lands these come from it, joined by `deviceId` per the scene
 * manifest contract, and nothing about this component changes. Do not
 * embellish here in the meantime.
 */
const PANELS: Record<string, { heading: string; body: string }> = {
  garage: {
    heading: "Gated entry",
    body: "The gate recognises you on approach and opens without a remote, a fob or a phone. It closes behind you on its own.",
  },
  climate: {
    heading: "Climate",
    body: "Rooms hold the temperature you set, adjusting as the sun moves round the house and stepping back when a room is empty.",
  },
  shading: {
    heading: "Curtains and shading",
    body: "Curtains and blinds move on a schedule, on a scene, or with the sun, keeping the afternoon heat out before the cooling has to work for it.",
  },
  lighting: {
    heading: "Lighting",
    body: "Lighting follows the time of day, warming as the evening comes in. Scenes cover the whole house rather than one switch at a time.",
  },
};

export function HeroStage() {
  return (
    <div className={styles.stage}>
      <VillaCanvas
        poster={
          /*
            A plain <img>, not next/image: this is already the encoded WebP the
            site serves at the one size it needs, and next/image would route it
            through the optimiser for nothing.

            Intrinsic size stated so the box is reserved before the bytes
            arrive — the crop is 2112 x 544, see scripts/hero-grid.sh.
          */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.poster}
            src={POSTER}
            width={POSTER_SIZE.width}
            height={POSTER_SIZE.height}
            fetchPriority="high"
            decoding="async"
            draggable={false}
            alt="Rendered front view of a two-storey villa with lit windows, palms either side"
          />
        }
        panels={
          <div className={styles.panels}>
            {SERVICE_SHOTS.map((shot) => {
              const panel = PANELS[shot.id];
              if (!panel) return null;
              return (
                <div
                  key={shot.id}
                  id={`shot-panel-${shot.id}`}
                  role="tabpanel"
                  aria-labelledby={`shot-tab-${shot.id}`}
                  className={styles.panel}
                  data-shot={shot.id}
                  // Never `hidden`, and never display:none. The canvas shows
                  // one at a time visually, but all of them stay in the
                  // accessibility tree and in the crawlable HTML: a tabpanel
                  // that is display:none is copy that does not exist as far as
                  // a search engine is concerned, and the adaptive-loading
                  // path has no canvas to reveal it.
                  tabIndex={0}
                >
                  <h2 className={styles.panelHeading}>{panel.heading}</h2>
                  <p className={styles.panelBody}>{panel.body}</p>
                </div>
              );
            })}
          </div>
        }
      />
      {/* Progressive blur along the bottom edge — see .blur in the SCSS. */}
      <div className={styles.blur} aria-hidden="true" />
    </div>
  );
}
