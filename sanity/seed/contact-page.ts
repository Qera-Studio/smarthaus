// Seed for the contactPage document, verbatim from src/app/contact/page.tsx
// and ContactForm.tsx on 2026-11-11.
//
// Every answer is confirmed (2026-11-19): the visit is free and the founding
// year is 2019, as /faq says, so /contact emits its questions as FAQPage
// structured data.
import type { ContactPage } from "../../src/sanity/types";

export const CONTACT_PAGE: ContactPage = {
  seo: {
    title: "Book a site visit in Dubai | Smarthaus",
    absolute: true,
    description:
      "Book a site visit with Smarthaus. Tell us about your home and we will call you back during business hours. Dubai, U.A.E.",
    index: true,
  },
  title: "Book a site visit",
  standfirst: "Tell us a little about your home and we’ll call you back during business hours.",
  formHeading: "Book a visit",
  channelsHeading: "Get In Touch",
  channels: {
    phone: "Phone",
    email: "Email",
    whatsapp: "Whatsapp",
    whatsappMessage: "Hi, I would like to talk about smart home automation.",
  },
  locationHeading: "Location",
  locationPhoto: {
    src: "/contact-location.jpg",
    width: 3024,
    height: 4032,
    alt: "Downtown Dubai at dusk, looking along Sheikh Zayed Road towards the Burj Khalifa",
  },
  directions: "Get directions",
  faqHeading: "Frequently Asked Questions",
  faqs: [
    {
      question: "Is the visit an obligation?",
      answer:
        "No. The site visit is free. If you decide not to go ahead, you keep the report and owe us nothing.",
    },
    {
      question: "What happens during the visit?",
      answer:
        "A technician and a technical lead spend about 90 minutes in your home. They check your cabling, network and any systems you already have, go room by room to see what is possible, and ask how you actually use the house. You will have a fixed, itemised proposal within 48 hours.",
    },
    {
      question: "Do I need to be renovating?",
      answer:
        "No. Most of our work happens in homes people are living in. Some things need new cabling, and we will tell you exactly which ones before you commit to anything.",
    },
    {
      question: "Is Smarthaus a new company?",
      answer:
        "No. Smarthaus is the home division of Maple Technologies Security Systems LLC, a SIRA-licensed Dubai company operating since 2019. Same team, same licence, same accountability.",
    },
    {
      question: "Do you work outside Dubai?",
      answer:
        "We work across Dubai. If you are in Abu Dhabi or Sharjah, tell us anyway and we will be straight with you about whether we can look after you properly.",
    },
  ],
  form: {
    name: { label: "Name", placeholder: "enter full name" },
    email: { label: "Email", placeholder: "enter email" },
    phone: { label: "Phone (UAE mobile)", placeholder: "enter phone number" },
    community: { label: "Community", placeholder: "eg. Dubai Hills" },
    interest: { label: "What are you looking?" },
    message: { label: "Message", placeholder: "enter message" },
    submit: "Book a site visit",
    sending: "Sending",
    failedMessage: "Hi, I tried the enquiry form on your site and it did not send.",
    sentMessage: "Hi, I just booked a site visit through your website.",
  },
};
