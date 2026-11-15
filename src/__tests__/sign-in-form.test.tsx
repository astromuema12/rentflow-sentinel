import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));

import { SignInForm } from "@/app/sign-in/sign-in-form";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({
    error: "CredentialsSignin",
    url: null,
  });
});

describe("sign-in form", () => {
  it("shows failed credentials inline and re-enables submission", async () => {
    render(<SignInForm />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "person@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "incorrect-password" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Sign in" }).closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in failed. Check your details and try again.",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(mocks.signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ redirect: false, redirectTo: "/dashboard" }),
    );
  });
});
