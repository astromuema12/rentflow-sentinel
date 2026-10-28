export type RentalCardListing = {
  id: string;
  title: string;
  county: string;
  town: string;
  neighborhood: string;
  price: string;
  pricePeriod: "MONTHLY" | "NIGHTLY";
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  imageUrls: string[];
};
