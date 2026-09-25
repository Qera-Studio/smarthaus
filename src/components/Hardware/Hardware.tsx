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
          Most villas in Dubai run on five apps, four installers and nobody to call when something
          stops working. Smarthaus puts your cameras, doors, audio and home controls on one system,
          built by one team and covered by one contract.
        </p>
      </div>

      <HardwareStage items={HARDWARE_ITEMS} />
    </section>
  );
}
