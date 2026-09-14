import { Care } from "../components/Care";
import { Hero } from "../components/Hero";
import { HomeEnquiry } from "../components/HomeEnquiry";
import { Process } from "../components/Process";

export default function Home() {
  // The hero carries the page's h1. The sections between it and Process are
  // still to come.
  return (
    <>
      <Hero />
      <Process />
      <Care />
      {/* Last thing on the page, directly above the footer. */}
      <HomeEnquiry />
    </>
  );
}
