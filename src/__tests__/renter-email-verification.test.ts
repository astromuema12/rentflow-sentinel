import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  sendRenterVerificationEmail: vi.fn(),
  consumeRateLimit: vi.fn(),
  createRateLimitKey: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));
vi.mock("@/lib/auth/authorization", () => ({
  authorizationErrorResponse: () =>
    Response.json(
      { error: "The request could not be completed." },
      { status: 500 },
    ),
}));
vi.mock("@/lib/auth/email", () => ({
  EmailDeliveryError: class EmailDeliveryError extends Error {},
  sendRenterVerificationEmail: mocks.sendRenterVerificationEmail,
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  createRateLimitKey: mocks.createRateLimitKey,
}));

import { POST as registerRenter } from "@/app/api/auth/renter-registration/route";
import { POST as confirmRenterEmail } from "@/app/api/auth/renter-email-verification/confirm/route";
import { UserAccountType } from "@prisma/client";

const database = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  renterEmailVerificationToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(),
};

function request(path: string, body: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const registration = {
  email: "renter@example.test",
  firstName: "Amina",
  lastName: "Njoroge",
};

const password = "a-secure-renter-password-123";
const token = "A".repeat(43);
const storedToken = {
  id: "verification-a",
  email: registration.email,
  firstName: registration.firstName,
  lastName: registration.lastName,
  tokenHash: "stored-hash",
  expiresAt: new Date(Date.now() + 60_000),
  consumedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.AUTH_SECRET = "test-secret-with-adequate-entropy";
  process.env.AUTH_TRUST_PROXY = "false";
  process.env.AUTH_TRUST_HOST = "false";
  mocks.getPrisma.mockReturnValue(database);
  mocks.sendRenterVerificationEmail.mockResolvedValue(undefined);
  mocks.consumeRateLimit.mockResolvedValue(true);
  mocks.createRateLimitKey.mockImplementation(
    (scope: string, value: string) => `${scope}:${value}`,
  );
  database.user.findUnique.mockResolvedValue(null);
  database.user.create.mockResolvedValue({ id: "renter-a" });
  database.user.updateMany.mockResolvedValue({ count: 1 });
  database.renterEmailVerificationToken.findUnique.mockResolvedValue(null);
  database.renterEmailVerificationToken.create.mockResolvedValue({
    id: "verification-a",
  });
  database.renterEmailVerificationToken.deleteMany.mockResolvedValue({
    count: 0,
  });
  database.renterEmailVerificationToken.updateMany.mockResolvedValue({
    count: 1,
  });
  database.auditEvent.create.mockResolvedValue({ id: "audit-a" });
  database.$transaction.mockImplementation(
    async (operation: (transaction: typeof database) => unknown) =>
      operation(database),
  );
});

describe("renter email verification", () => {
  it("sends a one-time verification link without creating an account first", async () => {
    const response = await registerRenter(
      request("/api/auth/renter-registration", registration),
    );

    expect(response.status).toBe(202);
    expect(database.user.create).not.toHaveBeenCalled();
    expect(database.renterEmailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: registration.email,
          firstName: registration.firstName,
          lastName: registration.lastName,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.sendRenterVerificationEmail).toHaveBeenCalledWith(
      registration.email,
      registration.firstName,
      expect.stringMatching(/^http:\/\/localhost:3000\/verify-email\?/),
    );
  });

  it("returns the same response for an already verified email", async () => {
    database.user.findUnique.mockResolvedValue({
      accountType: UserAccountType.RENTER,
      isActive: true,
      emailVerifiedAt: new Date(),
    });

    const response = await registerRenter(
      request("/api/auth/renter-registration", registration),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toHaveProperty("message");
    expect(mocks.sendRenterVerificationEmail).not.toHaveBeenCalled();
    expect(database.renterEmailVerificationToken.create).not.toHaveBeenCalled();
  });

  it("creates a verified renter only after the email token is accepted", async () => {
    database.renterEmailVerificationToken.findUnique
      .mockResolvedValueOnce(storedToken)
      .mockResolvedValueOnce(storedToken);

    const response = await confirmRenterEmail(
      request("/api/auth/renter-email-verification/confirm", {
        token,
        password,
      }),
    );

    expect(response.status).toBe(200);
    expect(database.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: registration.email,
        firstName: registration.firstName,
        lastName: registration.lastName,
        accountType: UserAccountType.RENTER,
        emailVerifiedAt: expect.any(Date),
        passwordHash: expect.any(String),
      }),
      select: { id: true },
    });
    expect(database.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
      password,
    );
    expect(database.renterEmailVerificationToken.updateMany).toHaveBeenCalled();
    expect(database.auditEvent.create).toHaveBeenCalled();
  });

  it("replaces credentials for a legacy unverified renter who proves email control", async () => {
    database.renterEmailVerificationToken.findUnique
      .mockResolvedValueOnce(storedToken)
      .mockResolvedValueOnce(storedToken);
    database.user.findUnique.mockResolvedValue({
      id: "legacy-renter",
      accountType: UserAccountType.RENTER,
      isActive: true,
      emailVerifiedAt: null,
    });

    const response = await confirmRenterEmail(
      request("/api/auth/renter-email-verification/confirm", {
        token,
        password,
      }),
    );

    expect(response.status).toBe(200);
    expect(database.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "legacy-renter",
        accountType: UserAccountType.RENTER,
        isActive: true,
        emailVerifiedAt: null,
      },
      data: expect.objectContaining({
        emailVerifiedAt: expect.any(Date),
        sessionVersion: { increment: 1 },
        passwordHash: expect.any(String),
      }),
    });
    expect(database.user.create).not.toHaveBeenCalled();
  });

  it("rejects expired links and leaves user records unchanged", async () => {
    database.renterEmailVerificationToken.findUnique.mockResolvedValue({
      ...storedToken,
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await confirmRenterEmail(
      request("/api/auth/renter-email-verification/confirm", {
        token,
        password,
      }),
    );

    expect(response.status).toBe(400);
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.user.create).not.toHaveBeenCalled();
  });
});
