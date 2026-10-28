import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeSearch } from "../app/home-search";
import Home from "../app/page";

describe("renter home page", () => {
  it("introduces a Kenya-wide rental search experience", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: "RentFlow home" }).querySelector("svg"),
    ).toHaveAttribute("viewBox", "0 0 40 40");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your next place is out there.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("One country. 47 counties. Your own way home."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find a place" })).toHaveAttribute(
      "href",
      "#find-a-home",
    );
    expect(
      screen.getByRole("heading", {
        name: "Find your next place from the comfort of home.",
      }),
    ).toBeInTheDocument();
  });

  it("offers all 47 counties and clearly identifies example inventory", () => {
    render(<HomeSearch />);

    expect(
      within(
        screen.getByRole("combobox", { name: "Choose a county" }),
      ).getAllByRole("option"),
    ).toHaveLength(48);
    expect(
      screen.getByRole("option", { name: "Nairobi City" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Mombasa" })).toBeInTheDocument();
    expect(screen.getByText("DESIGN PREVIEW · SAMPLE")).toBeInTheDocument();
    expect(
      screen.getByText(/not live listings or available rentals/),
    ).toBeInTheDocument();
  });

  it("filters sample homes by county without presenting them as live inventory", () => {
    render(<HomeSearch />);

    fireEvent.change(
      screen.getByRole("combobox", { name: "Choose a county" }),
      {
        target: { value: "Mombasa" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Find a home" }));

    expect(
      screen.getByRole("heading", { name: "A taste of Mombasa" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Slow mornings in Nyali")).toBeInTheDocument();
    expect(
      screen.queryByText("A bright place in Kilimani"),
    ).not.toBeInTheDocument();
  });

  it("keeps nightly and monthly budgets separate", () => {
    render(<HomeSearch />);

    fireEvent.change(
      screen.getByRole("combobox", { name: "Choose maximum budget" }),
      {
        target: { value: "night:10000" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Find a home" }));

    expect(screen.getByText("Slow mornings in Nyali")).toBeInTheDocument();
    expect(screen.getByText("A weekend above the city")).toBeInTheDocument();
    expect(
      screen.queryByText("A bright place in Kilimani"),
    ).not.toBeInTheDocument();
  });

  it("explains the three-step renter journey", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Choose your county" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Compare what matters" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Make your next move" }),
    ).toBeInTheDocument();
  });
});
