CREATE TYPE "UserAccountType" AS ENUM ('RENTER', 'LANDLORD', 'PLATFORM_ADMIN');
CREATE TYPE "RentalPricePeriod" AS ENUM ('MONTHLY', 'NIGHTLY');
CREATE TYPE "RentalListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'REJECTED');
CREATE TYPE "RentalEnquiryStatus" AS ENUM ('NEW', 'RESPONDED', 'CLOSED');

ALTER TABLE "User"
ADD COLUMN "accountType" "UserAccountType" NOT NULL DEFAULT 'LANDLORD';

CREATE TABLE "RentalListing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "pricePeriod" "RentalPricePeriod" NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "furnished" BOOLEAN NOT NULL DEFAULT false,
    "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "RentalListingStatus" NOT NULL DEFAULT 'DRAFT',
    "moderationNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedRentalListing" (
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRentalListing_pkey" PRIMARY KEY ("userId", "listingId")
);

CREATE TABLE "RentalEnquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "RentalEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalListing_organizationId_status_idx" ON "RentalListing"("organizationId", "status");
CREATE INDEX "RentalListing_county_status_idx" ON "RentalListing"("county", "status");
CREATE INDEX "RentalListing_pricePeriod_price_status_idx" ON "RentalListing"("pricePeriod", "price", "status");
CREATE INDEX "RentalListing_createdAt_idx" ON "RentalListing"("createdAt");
CREATE INDEX "SavedRentalListing_listingId_idx" ON "SavedRentalListing"("listingId");
CREATE INDEX "SavedRentalListing_userId_createdAt_idx" ON "SavedRentalListing"("userId", "createdAt");
CREATE UNIQUE INDEX "RentalEnquiry_listingId_renterId_key" ON "RentalEnquiry"("listingId", "renterId");
CREATE INDEX "RentalEnquiry_renterId_createdAt_idx" ON "RentalEnquiry"("renterId", "createdAt");
CREATE INDEX "RentalEnquiry_listingId_status_idx" ON "RentalEnquiry"("listingId", "status");

ALTER TABLE "RentalListing" ADD CONSTRAINT "RentalListing_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalListing" ADD CONSTRAINT "RentalListing_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalListing" ADD CONSTRAINT "RentalListing_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedRentalListing" ADD CONSTRAINT "SavedRentalListing_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedRentalListing" ADD CONSTRAINT "SavedRentalListing_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "RentalListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalEnquiry" ADD CONSTRAINT "RentalEnquiry_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "RentalListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalEnquiry" ADD CONSTRAINT "RentalEnquiry_renterId_fkey"
FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
