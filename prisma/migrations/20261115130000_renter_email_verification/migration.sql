ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "RenterEmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenterEmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RenterEmailVerificationToken_tokenHash_key"
ON "RenterEmailVerificationToken"("tokenHash");

CREATE INDEX "RenterEmailVerificationToken_email_consumedAt_idx"
ON "RenterEmailVerificationToken"("email", "consumedAt");

CREATE INDEX "RenterEmailVerificationToken_expiresAt_idx"
ON "RenterEmailVerificationToken"("expiresAt");
