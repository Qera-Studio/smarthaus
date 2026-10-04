import { HARDWARE_ITEMS } from "../../content/hardware";
import styles from "./Hardware.module.scss";
import { HardwareStage } from "./HardwareStage";

/**
 * The hardware section, between the Hero and the Process rail: what a
 * Smarthaus installation is made of, one component per slide.
 *
 * The heading and lead are static and server-rendered. The carousel below is
 * the one client island (HardwareStage), which still ships every slide's copy
 * in the HTML: only which one is visible is decided on the client.
 */
export function Hardware() {
  return (
    <section className={styles.hardware} aria-labelledby="hardware">
      <div className={styles.lead}>
        <h2 className={styles.leadHeading} id="hardware">
          One stop, full house
        </h2>
        <p className={styles.leadBody}>
          Cameras, locks, lighting, climate and sound on one system. The team that installs it is
          the team you call when something needs attention.
        </p>
      </div>

      <HardwareStage items={HARDWARE_ITEMS} />
    </section>
  );
}
