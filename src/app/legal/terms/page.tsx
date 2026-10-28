import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../legal-document";
import "../legal.css";

export const metadata: Metadata = {
  title: "Terms of Use | RentFlow Kenya",
  description: "Terms for using RentFlow's Kenya home-rental marketplace.",
};

const sections: LegalSection[] = [
  {
    heading: "About RentFlow",
    paragraphs: [
      "RentFlow is a platform for discovering residential rentals across Kenya, including different kinds of homes and rental durations. RentFlow provides search, saved-home, listing-management, and enquiry tools. It is not a landlord, tenant, estate agent, property manager, or party to a tenancy agreement.",
      "At present, renters can contact property managers through enquiries. RentFlow does not take rent, deposits, booking payments, or payments for a tenancy through the platform.",
    ],
  },
  {
    heading: "Who may use the service",
    paragraphs: [
      "You must provide accurate account information, keep your login credentials secure, and use the service lawfully. You are responsible for activity carried out through your account. Tell RentFlow promptly if you believe someone else has accessed it.",
    ],
    bullets: [
      "Renters may browse published listings, save homes, and send enquiries.",
      "Landlords and property managers may manage listings only for an organization they are authorized to represent.",
      "Platform administrators manage marketplace accounts and listing reviews.",
    ],
  },
  {
    heading: "Listings and rental decisions",
    paragraphs: [
      "A listing is supplied by its property manager. RentFlow may review, publish, pause, or remove listings, but a review is not a guarantee of ownership, authority, condition, availability, safety, price, or legal compliance.",
      "Rental details can change. Confirm the price, availability, terms, location, and the identity and authority of the person you deal with before making a decision. Any tenancy or short-term rental agreement is between the renter and the property provider.",
    ],
  },
  {
    heading: "Enquiries and communications",
    paragraphs: [
      "An enquiry lets a renter express interest and lets the property manager respond. Sending an enquiry does not reserve a home, create a tenancy, guarantee a response, or commit either party to rent. Do not send passwords, payment details, identity documents, or other sensitive information in an enquiry.",
      "Use respectful language and communicate only about the rental. RentFlow may limit or remove abusive, unlawful, misleading, or spam communications.",
    ],
  },
  {
    heading: "Landlord responsibilities",
    bullets: [
      "List only a home you are authorized to offer for rent, and keep its description, rental period, price, photos, and availability accurate.",
      "Comply with applicable Kenyan law, required permissions, safety obligations, and non-discrimination and consumer-protection requirements.",
      "Protect the privacy and safety of renters; do not publish personal contact, access, or occupancy details without a lawful basis.",
      "Respond to enquiries honestly and update or pause listings that are no longer available.",
    ],
  },
  {
    heading: "Safe use and prohibited conduct",
    paragraphs: [
      "Do not use RentFlow to defraud, harass, discriminate unlawfully, impersonate another person, infringe rights, interfere with the service, scrape data without permission, or upload harmful code. RentFlow may restrict access or remove content when reasonably needed to protect people, comply with law, or maintain the service.",
      "Never pay a deposit or rent solely because a listing or message appears on RentFlow. Independently verify the home and the property provider and use a written agreement and a payment method you trust.",
    ],
  },
  {
    heading: "Content and intellectual property",
    paragraphs: [
      "You retain rights in content you provide. You give RentFlow permission to host, display, and process that content as needed to operate, secure, and promote the service. You must have the rights and permissions needed to share listing text and images.",
      "RentFlow's software, name, and brand are protected by applicable intellectual-property laws. These terms do not transfer ownership of them to you.",
    ],
  },
  {
    heading: "Availability and liability",
    paragraphs: [
      "RentFlow is provided on an evolving basis and may be changed, interrupted, or discontinued. To the extent permitted by law, RentFlow does not guarantee uninterrupted access or the accuracy or availability of third-party listings, and is not responsible for negotiations, property conditions, payments made outside the platform, or agreements between renters and property providers.",
      "Nothing in these terms excludes liability or rights that cannot lawfully be excluded or limited under Kenyan law.",
    ],
  },
  {
    heading: "Suspension, changes, and governing law",
    paragraphs: [
      "RentFlow may suspend an account or listing for a suspected breach, safety concern, or legal requirement. We will update these terms when the service or law changes and show a revised update date. Continued use after an update means the revised terms apply to future use, subject to applicable law.",
      "These terms are intended to be governed by the laws of Kenya, subject to any mandatory consumer rights and dispute procedures that apply. Before launch, RentFlow must publish its verified legal entity, physical address, and working legal-notice contact details.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of use"
      summary="The ground rules for renters, property providers, and people managing the RentFlow marketplace."
      sections={sections}
    />
  );
}
