import { describe, expect, it } from "vitest";
import { decode, encode } from "next-auth/jwt";

const secret = "local-auth-session-test-secret-with-sufficient-entropy";
const salt = "authjs.session-token";
const sessionToken = {
  sub: "user-a",
  email: "user@example.test",
  sessionVersion: 2,
};

describe("Auth.js encrypted session cookies", () => {
  it("does not decode a missing session cookie", async () => {
    await expect(
      decode({ token: undefined, secret, salt }),
    ).resolves.toBeNull();
  });

  it("rejects expired encrypted session cookies", async () => {
    const token = await encode({
      token: sessionToken,
      secret,
      salt,
      maxAge: -60,
    });

    await expect(decode({ token, secret, salt })).rejects.toMatchObject({
      code: "ERR_JWT_EXPIRED",
    });
  });

  it("rejects a tampered encrypted session cookie", async () => {
    const token = await encode({
      token: sessionToken,
      secret,
      salt,
      maxAge: 60,
    });
    const parts = token.split(".");
    parts[3] = `${parts[3][0] === "A" ? "B" : "A"}${parts[3].slice(1)}`;

    await expect(
      decode({ token: parts.join("."), secret, salt }),
    ).rejects.toMatchObject({ code: "ERR_JWE_DECRYPTION_FAILED" });
  });

  it("decodes a valid encrypted cookie with its authenticated identity", async () => {
    const token = await encode({
      token: sessionToken,
      secret,
      salt,
      maxAge: 60,
    });

    await expect(decode({ token, secret, salt })).resolves.toMatchObject(
      sessionToken,
    );
  });
});
