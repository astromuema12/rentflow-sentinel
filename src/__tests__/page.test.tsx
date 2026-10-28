import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../app/page";

describe("workspace home", () => {
  it("explains the first-run state without inventing financial totals", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Reconciliation, without the guesswork.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("AWAITING FIRST IMPORT")).toBeInTheDocument();
    expect(
      screen.getByText("No records have been imported yet."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("provides an in-page getting started link", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: "Getting started" }),
    ).toHaveAttribute("href", "#getting-started");
    expect(
      screen.getByRole("link", { name: "See how to get started" }),
    ).toHaveAttribute("href", "#getting-started");
    expect(
      screen.getByRole("heading", { name: "Start with the records you have" }),
    ).toBeInTheDocument();
  });
});
