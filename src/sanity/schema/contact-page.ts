// /contact, and the enquiry form's labels, which the homepage form shares.
// The form's error and confirmation messages stay in code beside the
// validation that produces them, and so do the interest options: they are a
// closed set the server action checks, and reading them from Sanity would put
// a second network call on the path every lead takes.
import { list, obj, pic, singleton, str, txt, type SchemaField } from "./primitives";

const field = (name: string, title: string): SchemaField =>
  obj(name, title, [str("label", "Label"), str("placeholder", "Placeholder")]);

export const contactPage = singleton("contactPage", "Contact page", [
  { name: "seo", title: "Search and sharing", type: "seo", validation: (rule) => rule.required() },
  str("title", "Heading"),
  txt("standfirst", "Standfirst"),
  str("formHeading", "Form section heading"),
  str("channelsHeading", "Channels section heading"),
  obj("channels", "Channel labels", [
    str("phone", "Phone"),
    str("email", "Email"),
    str("whatsapp", "WhatsApp"),
    txt("whatsappMessage", "WhatsApp message, pre-filled"),
  ]),
  str("locationHeading", "Location section heading"),
  pic("locationPhoto", "Location photo"),
  str("directions", "Directions button"),
  str("faqHeading", "Questions heading"),
  list(
    "faqs",
    "Questions",
    obj("faq", "Question", [str("question", "Question"), txt("answer", "Answer")]),
  ),
  obj("form", "Enquiry form", [
    field("name", "Name field"),
    field("email", "Email field"),
    field("phone", "Phone field"),
    field("community", "Community field"),
    obj("interest", "Interest field", [str("label", "Label")]),
    field("message", "Message field"),
    str("submit", "Send button"),
    str("sending", "Send button, while sending"),
    txt("failedMessage", "WhatsApp message after a failed send"),
    txt("sentMessage", "WhatsApp message after a send"),
  ]),
]);
