import { HomeEnquiry } from "../components/HomeEnquiry";
import { Process } from "../components/Process";

export default function Home() {
  // The hero and the sections above Process are still to come. The heading is
  // present but visually hidden so the document keeps a valid outline — axe and
  // Lighthouse SEO both fail a page with no <h1>. Replace, don't add, when the
  // hero ships.
  return (
    <>
      <h1 className="visually-hidden">Smarthaus</h1>
      <Process />
      {/* Last thing on the page, directly above the footer. */}
      <HomeEnquiry />
    </>
  );
}
