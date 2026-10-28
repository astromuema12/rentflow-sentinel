import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../legal-document";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy | RentFlow Kenya",
  description:
    "How RentFlow handles account, rental enquiry, and marketplace information.",
};

const sections: LegalSection[] = [
  {
    heading: "Who is responsible for your information",
    paragraphs: [
      "RentFlow provides tools for finding and managing homes for rent across Kenya. The legal identity and registered contact details of the data controller must be completed here by RentFlow before public launch. This draft is not a substitute for the notices and registrations required by Kenyan data-protection law.",
    ],
  },
  {
    heading: "Information we handle",
    bullets: [
      "Account details such as your name, email address, and password hash.",
      "Renter activity such as homes you save and enquiries you send; property managers can see enquiries about their organization's listings.",
      "Landlord listing details, listing review decisions, and responses to renter enquiries.",
      "Security and account administration information, including rate-limit records and session version changes.",
      "If a password reset is requested, the reset flow processes the account email and a time-limited, single-use token.",
    ],
  },
  {
    heading: "Why information is used",
    paragraphs: [
      "Information is used to create and secure accounts, provide home search and listing features, deliver renter enquiries to the relevant property manager, support listing review, prevent abuse, maintain platform security, and meet legal obligations. The applicable lawful basis for each use must be confirmed and documented by RentFlow before launch.",
      "RentFlow does not currently collect rent, deposits, or booking payments through the platform.",
    ],
  },
  {
    heading: "Who may receive information",
    paragraphs: [
      "A property manager can see the contact details and message included in an enquiry sent about a listing they manage. RentFlow administrators may access account and listing information when operating, securing, or moderating the service.",
      "Service providers may process information for hosting, database, authentication, and password-reset email functions. RentFlow should list its actual providers, their roles, locations, and any cross-border safeguards before launch. We do not sell personal information.",
    ],
  },
  {
    heading: "Retention and security",
    paragraphs: [
      "Passwords are stored as bcrypt hashes rather than readable passwords. Sessions use protected authentication cookies, and account suspension or password reset invalidates existing sessions.",
      "RentFlow should retain information only for as long as needed for the stated purpose, applicable legal requirements, and legitimate security or dispute needs, then delete or de-identify it securely. A specific retention schedule and account-deletion process must be published before launch.",
      "We use technical and organizational safeguards, but no internet service can promise absolute security. Use a unique password and contact RentFlow if you suspect account misuse.",
    ],
  },
  {
    heading: "Your privacy rights",
    paragraphs: [
      "Subject to applicable Kenyan law, you may have rights to be informed, access your personal information, request correction or deletion, object to or restrict certain processing, and complain to the Office of the Data Protection Commissioner. The availability and limits of each right depend on the circumstances and law.",
      "A verified privacy contact and a practical way to submit and track a request must be added by RentFlow before launch. Do not send identity documents or sensitive details through a public enquiry form.",
    ],
  },
  {
    heading: "Children and changes",
    paragraphs: [
      "RentFlow is intended for adults arranging or managing rental housing and is not designed for children. If you believe a child has provided personal information, contact the verified privacy contact once it is published.",
      "We may update this notice when the service or applicable law changes. The date at the top indicates when this text was last reviewed.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy notice"
      summary="A clear account of the information RentFlow uses to help renters and property providers manage the rental journey."
      sections={sections}
    />
  );
}
