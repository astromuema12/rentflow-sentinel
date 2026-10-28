import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../legal-document";
import "../legal.css";

export const metadata: Metadata = {
  title: "Cookie Policy | RentFlow Kenya",
  description: "How essential cookies support secure RentFlow accounts.",
};

const sections: LegalSection[] = [
  {
    heading: "What cookies are",
    paragraphs: [
      "Cookies are small browser files used by websites to remember information or maintain a session. Similar technologies may store information in a browser for the same purpose.",
    ],
  },
  {
    heading: "What RentFlow uses today",
    paragraphs: [
      "When you sign in, RentFlow's authentication service uses protected, HTTP-only authentication cookies to complete sign-in and keep your account session secure. They are needed for authenticated features such as saved homes, rental enquiries, landlord tools, and administration. Production cookies are configured for secure transport.",
      "RentFlow also uses request-origin checks and server-side rate limits as security controls. The application does not currently include an advertising cookie, analytics tracker, or third-party marketing pixel.",
    ],
  },
  {
    heading: "Managing cookies",
    paragraphs: [
      "You can use browser settings to block or remove cookies. If you block the required authentication cookie, you may not be able to sign in or use account features. Your public browsing experience may still work.",
      "If RentFlow later adds optional analytics, personalization, or advertising technologies, this notice must be updated and any consent required by applicable law must be obtained before those technologies are used.",
    ],
  },
  {
    heading: "Updates and contact",
    paragraphs: [
      "This notice describes the current application configuration and may change as the service evolves. A verified legal and privacy contact must be published before launch; refer to the Privacy notice for details.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie notice"
      summary="RentFlow currently uses a strictly necessary authentication cookie and does not include advertising or analytics trackers."
      sections={sections}
    />
  );
}
