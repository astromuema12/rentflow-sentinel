import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../legal-document";
import "../legal.css";

export const metadata: Metadata = {
  title: "Acceptable Use | RentFlow Kenya",
  description:
    "Rules that help keep RentFlow's rental marketplace useful, lawful, and safer.",
};

const sections: LegalSection[] = [
  {
    heading: "Use RentFlow for genuine rental activity",
    paragraphs: [
      "Use RentFlow to discover residential rentals, publish homes you are authorized to offer, and communicate about genuine rental interest. Respect other people, their homes, and their personal information.",
    ],
  },
  {
    heading: "Do not mislead or defraud",
    bullets: [
      "Do not publish a fake, duplicated, unavailable, or unauthorized property listing.",
      "Do not misstate the property's price, rental period, location, condition, facilities, availability, or your authority to represent it.",
      "Do not impersonate a renter, property owner, property manager, organization, or RentFlow employee.",
      "Do not use RentFlow to solicit advance payments through deceptive claims or impersonated listings.",
    ],
  },
  {
    heading: "Respectful and fair communication",
    paragraphs: [
      "Do not harass, threaten, exploit, unlawfully discriminate against, or send abusive or unwanted messages to another person. Do not use the platform to publish private information, intimate images, personal contact details, or access information without lawful authority and consent.",
    ],
  },
  {
    heading: "Protect accounts and the service",
    bullets: [
      "Do not share passwords, session cookies, or one-time sign-in codes.",
      "Do not attempt to access another account, organization, listing, enquiry, or administrative area without permission.",
      "Do not probe, disrupt, overload, reverse engineer, scrape, or bypass security or access controls.",
      "Do not upload malware, harmful code, or content that infringes another person's rights.",
    ],
  },
  {
    heading: "Enforcement and reports",
    paragraphs: [
      "RentFlow may investigate reports and restrict accounts or remove content where reasonably necessary to protect users, comply with law, or enforce these rules. Restrictions do not replace any rights or remedies available under Kenyan law.",
      "A verified channel for reporting abuse and appealing moderation decisions must be published before public launch.",
    ],
  },
];

export default function AcceptableUsePage() {
  return (
    <LegalDocument
      title="Acceptable use"
      summary="A few clear standards help renters and property providers use RentFlow with honesty, respect, and care."
      sections={sections}
    />
  );
}
