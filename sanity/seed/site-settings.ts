// Seed for the siteSettings document, verbatim from the constants it replaced
// (src/lib/contact.ts, src/lib/nav-links.ts, the footer, the contact strip,
// src/lib/metadata.ts) on 2026-11-11. The address is the trade licence's,
// confirmed 2026-09-26. Instagram, Facebook and LinkedIn are the brand's own
// profiles and the hours are its own (Shivanshu, 2026-11-20). X has no
// profile yet: it stays marked pending, and says so.
import type { SiteSettings } from "../../src/sanity/types";

export const SITE_SETTINGS: SiteSettings = {
  contact: {
    phoneE164: "+971543755150",
    phoneDisplay: "+971 54 375 5150",
    whatsapp: "971543755150",
    email: "hello@smarthaus.ae",
    addressLines: [
      "The Iridium, 2nd Floor, Office 225,",
      "Umm Suqeim St, Al Barsha First,",
      "Dubai",
    ],
    mapsUrl: "https://maps.app.goo.gl/6TaV1nqiKs5StD566",
    locality: "Dubai, U.A.E.",
    // Shivanshu, 2026-11-20.
    hours: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    },
  },
  identity: {
    legalName: "Maple Technologies Security Systems LLC",
    tradingAs: "Smarthaus",
    tradeLicence: "897839",
    siraLicence: "SSP202210037219",
    licensingAuthority: "Dubai, UAE",
  },
  announcement: { call: "call us at", mail: "mail us at", whatsapp: "whatsapp at" },
  footer: {
    tagline: "Smarter living for a brighter tomorrow",
    parent: "Brand by Maple Technologies Security Systems LLC",
    parentHref: "https://www.mapletech.ae",
    newsletterTitle: "Stay up to date",
    newsletterSubtitle: "Subscribe to our newsletters",
    newsletterPlaceholder: "Enter email",
    newsletterSubmit: "Submit",
    newsletterNote: "Newsletter opens soon.",
    contactTitle: "Talk To Us",
    pagesTitle: "Pages",
    installTitle: "What we install",
    copyright: "© 2026. Maple Technologies Security Systems LLC. All rights reserved",
    credit: "Built by Qera Studio",
    creditHref: "https://www.qera.studio",
  },
  pageLinks: [
    { href: "/solutions", label: "Solutions" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQs" },
    { href: "/blog", label: "Articles" },
    { href: "/contact", label: "Contact" },
  ],
  installLinks: [
    { href: "/solutions", section: "smart-home-automation", label: "Smart home automation" },
    { href: "/solutions", section: "cctv-and-cameras", label: "CCTV and cameras" },
    { href: "/solutions", section: "video-intercom", label: "Video Intercom" },
    { href: "/solutions", section: "smart-locks-and-access", label: "Smart locks and access" },
    { href: "/solutions", section: "multiroom-audio", label: "Multiroom audio" },
    { href: "/solutions", section: "cabling-and-networks", label: "Cabling and networks" },
    { href: "/solutions", section: "care-plans", label: "Care plans" },
  ],
  legalLinks: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/accessibility", label: "Accessibility" },
    { href: "/cookie-preferences", label: "Cookie Preferences" },
    { href: "/sitemap.xml", label: "Sitemap" },
  ],
  socials: [
    { id: "whatsapp", label: "Smarthaus on WhatsApp", href: "https://wa.me/971543755150" },
    {
      id: "instagram",
      label: "Smarthaus on Instagram",
      href: "https://www.instagram.com/smarthaus.dxb/",
    },
    {
      id: "facebook",
      label: "Smarthaus on Facebook",
      href: "https://www.facebook.com/profile.php?id=61596663210810",
    },
    {
      id: "x",
      label: "Smarthaus on X (profile coming soon)",
      href: "https://x.com/",
      pending: true,
    },
    {
      id: "linkedin",
      label: "Smarthaus on LinkedIn",
      href: "https://www.linkedin.com/company/smarthaus-smart-home-automation",
    },
  ],
  solutionsMenu: {
    href: "/solutions",
    items: [
      {
        id: "cameras",
        label: "Cameras",
        image: {
          src: "/hero/navBar/cameras.jpg",
          width: 736,
          height: 1308,
          alt: "",
          stock: true,
        },
      },
      {
        id: "lighting",
        label: "Lighting",
        image: {
          src: "/hero/navBar/lighting.jpg",
          width: 736,
          height: 1104,
          alt: "",
          stock: true,
        },
      },
      {
        id: "audio",
        label: "Audio",
        image: {
          src: "/hero/navBar/audio.jpg",
          width: 736,
          height: 1104,
          alt: "",
          stock: true,
        },
      },
      {
        id: "ac",
        label: "AC",
        image: {
          src: "/hero/navBar/ac.jpg",
          width: 1080,
          height: 1350,
          alt: "",
          stock: true,
        },
      },
      {
        id: "garage",
        label: "Garage",
        image: {
          src: "/hero/navBar/garage.jpg",
          width: 736,
          height: 877,
          alt: "",
          stock: true,
        },
      },
      {
        id: "smart-lock",
        label: "Smart lock",
        image: {
          src: "/hero/navBar/smart_lock.jpg",
          width: 651,
          height: 678,
          alt: "",
          stock: true,
        },
      },
      {
        id: "wall-controller",
        label: "Wall controller",
        image: {
          src: "/hero/navBar/wall_controller.jpg",
          width: 736,
          height: 1104,
          alt: "",
          stock: true,
        },
      },
      {
        id: "curtains",
        label: "Curtains",
        image: {
          src: "/hero/navBar/curtains.jpg",
          width: 736,
          height: 1096,
          alt: "",
          stock: true,
        },
      },
    ],
  },
  seo: {
    defaultTitle: "Smarthaus | Home Automation and Security in Dubai",
    defaultDescription:
      "Cameras, entry, audio and home automation for Dubai villas, installed, connected and looked after by one licensed team. Book a site visit.",
    llmsSummary:
      "Smarthaus installs cameras, entry, audio and home automation for villas in Dubai, U.A.E. One licensed team installs the system, connects it and looks after it. Smarthaus is the home automation division of Maple Technologies, a SIRA-licensed security and technology company in Dubai.",
  },
};
