import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../legal-document";
import "../legal.css";

export const metadata: Metadata = {
  title: "Rental Marketplace Disclaimer | RentFlow Kenya",
  description:
    "Important information about rental listings, property providers, and decisions made through RentFlow.",
};

const sections: LegalSection[] = [
  {
    heading: "A discovery and enquiry service",
    paragraphs: [
      "RentFlow helps people discover homes for rent across Kenya and helps property providers manage listings and renter enquiries. It is an online marketplace, not a landlord, tenant, letting agent, property manager, conveyancer, insurer, or party to a rental agreement.",
      "RentFlow currently provides listing discovery, saving, and enquiry features. It does not process rent, deposits, booking payments, or tenancy agreements through the platform.",
    ],
  },
  {
    heading: "Listings are provided by property managers",
    paragraphs: [
      "Listing descriptions, photos, prices, locations, availability, and statements about ownership or authority are provided by property managers. RentFlow may review listings against its standards but does not independently certify a property's title, condition, safety, amenities, availability, or legal compliance.",
      "A listing being visible, approved, or saved is not a recommendation, endorsement, reservation, or guarantee by RentFlow.",
    ],
  },
  {
    heading: "Check before you commit",
    bullets: [
      "Verify the property provider's identity and authority to offer the home.",
      "View or independently verify the home and its condition, facilities, location, and current availability.",
      "Confirm rent, the period it covers, any deposit or additional charges, and all tenancy conditions in writing.",
      "Do not transfer money based only on a listing, message, or request received online.",
      "Do not share passwords, one-time codes, or sensitive financial information in an enquiry.",
    ],
  },
  {
    heading: "No professional advice",
    paragraphs: [
      "RentFlow content is general platform information, not legal, financial, valuation, safety, or tenancy advice. Get advice from an appropriately qualified professional for decisions that require it.",
      "Nothing in this disclaimer limits a consumer right or legal responsibility that cannot lawfully be limited under Kenyan law.",
    ],
  },
  {
    heading: "Report a concern",
    paragraphs: [
      "If you encounter a suspected scam, unsafe listing, or inaccurate property information, do not proceed with payment or share further sensitive information. RentFlow must publish a verified reporting and support contact before public launch; the contact details should be added here when established.",
    ],
  },
];

export default function DisclaimerPage() {
  return (
    <LegalDocument
      title="Marketplace disclaimer"
      summary="What RentFlow does—and what renters and property providers should verify themselves—when using a rental discovery platform."
      sections={sections}
    />
  );
}
