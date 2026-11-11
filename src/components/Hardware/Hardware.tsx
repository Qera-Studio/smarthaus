import { Words } from "../Words";
import { getHomePage } from "../../sanity/content";
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
export async function Hardware() {
  const { hardware } = await getHomePage();
  return (
    <section className={styles.hardware} aria-labelledby="hardware">
      <div className={styles.lead}>
        <h2 className={styles.leadHeading} id="hardware" data-reveal="" data-reveal-words="">
          <Words text={hardware.heading} />
        </h2>
        <p className={styles.leadBody} data-reveal="">
          {hardware.lead}
        </p>
      </div>

      <HardwareStage items={hardware.items} href={hardware.href} />
    </section>
  );
}
