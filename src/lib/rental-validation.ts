import { RentalListingStatus, RentalPricePeriod } from "@prisma/client";
import { z } from "zod";
import { KENYAN_COUNTIES } from "./rental-counties";

const imageUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  });

export const rentalListingInputSchema = z.object({
  title: z.string().trim().min(5).max(90),
  description: z.string().trim().min(30).max(2000),
  county: z.enum(KENYAN_COUNTIES),
  town: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().min(2).max(100),
  price: z.coerce.number().finite().positive().max(10_000_000),
  pricePeriod: z.nativeEnum(RentalPricePeriod),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(1).max(20),
  furnished: z.boolean(),
  imageUrls: z.array(imageUrlSchema).max(5),
});

export const landlordListingStatusSchema = z.object({
  status: z.enum([
    RentalListingStatus.DRAFT,
    RentalListingStatus.PENDING_REVIEW,
    RentalListingStatus.PAUSED,
  ]),
});

export const adminListingReviewSchema = z
  .object({
    status: z.enum([
      RentalListingStatus.PUBLISHED,
      RentalListingStatus.PENDING_REVIEW,
      RentalListingStatus.REJECTED,
      RentalListingStatus.PAUSED,
    ]),
    moderationNote: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.status === RentalListingStatus.REJECTED &&
      (value.moderationNote?.length ?? 0) < 2
    ) {
      context.addIssue({
        code: "custom",
        path: ["moderationNote"],
        message: "A brief rejection reason is required.",
      });
    }
  });

export const rentalEnquiryInputSchema = z.object({
  message: z.string().trim().min(10).max(1500),
});

export const rentalEnquiryResponseSchema = z.object({
  response: z.string().trim().min(2).max(1500),
});

export const renterRegistrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(72),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});
