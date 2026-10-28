import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../legal-document";
import "../legal.css";

export const metadata: Metadata = {
  title: "Rental Listing Standards | RentFlow Kenya",
  description:
    "Standards for accurate, respectful, and safer home rental listings on RentFlow.",
};

const sections: LegalSection[] = [
  {
    heading: "Homes and rental arrangements",
    paragraphs: [
      "RentFlow is for homes to rent across Kenya, not only holiday or short-stay accommodation. Listings may describe apartments, houses, bedsitters, studios, rooms, shared homes, and other residential spaces, with the rental duration and price stated clearly.",
      "A listing must represent a real home the provider is currently authorized to offer. If it is a room in a shared home, say so plainly and describe shared facilities accurately.",
    ],
  },
  {
    heading: "Accurate, complete details",
    bullets: [
      "Use a clear title and description that reflect the actual home and its condition.",
      "Select the correct county, town, and neighbourhood; do not publish a private street address or precise access instructions in a public listing.",
      "State whether rent is monthly, weekly, nightly, or uses another clearly explained period. Do not present a deposit or one-time charge as recurring rent.",
      "Describe bedrooms, bathrooms, furnishing, utilities, shared spaces, accessibility, and house rules accurately where relevant.",
      "Keep pricing, availability, and photos current. Remove or pause a home that is no longer available.",
    ],
  },
  {
    heading: "Photos and ownership",
    paragraphs: [
      "Use recent images of the actual property where possible. Do not use images you do not have permission to publish, misleading edits, stock images represented as the home, or images that expose residents, children, documents, keys, security systems, or private belongings without appropriate consent.",
      "Do not publish another person's phone number, identity details, or contact information without permission and a lawful reason.",
    ],
  },
  {
    heading: "Fair and lawful treatment",
    paragraphs: [
      "Listings and rental decisions must comply with Kenyan law and may not unlawfully discriminate, intimidate, exploit, or mislead. Do not use discriminatory eligibility rules or language targeting protected characteristics.",
      "Providers are responsible for obtaining required ownership or agency authority, licences, permissions, and safety compliance. Publication on RentFlow is not a verification or certification of those matters.",
    ],
  },
  {
    heading: "Trust and renter safety",
    bullets: [
      "Do not request a fee merely to view a home or use RentFlow.",
      "Do not pressure renters to transfer money before they have independently verified the property, provider, and written rental terms.",
      "Keep enquiries on the platform where practical and never request passwords, one-time codes, or payment-card details in a message.",
      "Report suspected fraud, duplicate listings, unsafe content, or unauthorized property offers through a RentFlow reporting channel once that channel is published.",
    ],
  },
  {
    heading: "Review and enforcement",
    paragraphs: [
      "Listings are subject to review before they become visible to renters. RentFlow may request changes, reject, pause, or remove a listing where it appears inaccurate, unsafe, unauthorized, unlawful, or inconsistent with these standards. Review does not guarantee a home's safety, quality, availability, or legal status.",
      "A property provider may correct and resubmit a rejected listing. RentFlow should publish a working channel for appeals and reports before public launch.",
    ],
  },
];

export default function ListingStandardsPage() {
  return (
    <LegalDocument
      title="Rental listing standards"
      summary="Practical standards for every kind of residential rental on RentFlow—from a bedsitter or room to a family home or furnished short stay."
      sections={sections}
    />
  );
}
