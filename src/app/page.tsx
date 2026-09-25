import { Care } from "../components/Care";
import { Hero } from "../components/Hero";
import { HomeEnquiry } from "../components/HomeEnquiry";
import { Pricing } from "../components/Pricing";
import { Process } from "../components/Process";

export default function Home() {
  // The hero carries the page's h1. The sections between it and Process are
  // still to come.
  return (
    <>
      <Hero />
      <Process />
      {/* Price before maintenance: what a system costs, then what keeping it
          running costs, then the enquiry. */}
      <Pricing />
      <Care />
      {/* Last thing on the page, directly above the footer. */}
      <HomeEnquiry />
    </>
  );
}
