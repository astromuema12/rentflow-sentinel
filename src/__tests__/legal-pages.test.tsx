import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AcceptableUsePage from "@/app/legal/acceptable-use/page";
import CookiesPage from "@/app/legal/cookies/page";
import DisclaimerPage from "@/app/legal/disclaimer/page";
import ListingStandardsPage from "@/app/legal/listing-standards/page";
import PrivacyPage from "@/app/legal/privacy/page";
import TermsPage from "@/app/legal/terms/page";

const legalPages = [
  {
    title: "Terms of use",
    Component: TermsPage,
    requiredContent: "RentFlow does not take rent",
  },
  {
    title: "Privacy notice",
    Component: PrivacyPage,
    requiredContent: "Office of the Data Protection Commissioner",
  },
  {
    title: "Cookie notice",
    Component: CookiesPage,
    requiredContent: "authentication cookies",
  },
  {
    title: "Marketplace disclaimer",
    Component: DisclaimerPage,
    requiredContent: "not a landlord",
  },
  {
    title: "Acceptable use",
    Component: AcceptableUsePage,
    requiredContent: "Do not publish a fake",
  },
  {
    title: "Rental listing standards",
    Component: ListingStandardsPage,
    requiredContent: "not only holiday or short-stay accommodation",
  },
];

describe("public legal pages", () => {
  it.each(legalPages)(
    "renders $title with a legal-review notice and links to the full policy suite",
    ({ title, Component, requiredContent }) => {
      render(<Component />);

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByText(requiredContent, { exact: false })).toBeVisible();
      expect(
        screen.getByText("Publication check required"),
      ).toBeInTheDocument();

      const legalNavigation = screen.getByRole("navigation", {
        name: "Legal navigation",
      });
      expect(within(legalNavigation).getAllByRole("link")).toHaveLength(6);
      expect(
        within(legalNavigation).getByRole("link", { name: "Acceptable use" }),
      ).toHaveAttribute("href", "/legal/acceptable-use");
      expect(
        within(legalNavigation).getByRole("link", { name: "Disclaimer" }),
      ).toHaveAttribute("href", "/legal/disclaimer");
    },
  );
});
