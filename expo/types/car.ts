// Core types for DzSwoopa car listings

export type CarListing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  pricePreview: string | null;
  priceUnit: string | null;
  oldPrice: number | null;
  oldPricePreview: string | null;
  priceType: string | null;
  exchangeType: string | null;
  isFromStore: boolean;
  hasDelivery: boolean;
  likeCount: number;
  createdAt: string | null;
  status: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  cityName: string | null;
  regionId: string | null;
  regionName: string | null;
  regionSlug: string | null;
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  storeImageUrl: string | null;
  storeIsOfficial: boolean;
  storeVerified: boolean;
  categorySlug: string;
  link: string;
};

export type CarListResponse = {
  cars: CarListing[];
  lastPage: number;
  hasMorePages: boolean;
};

export type Region = {
  slug: string;
  name: string;
};

export type CarFilters = {
  q: string;
  regionSlug: string | null;
  priceMin: string;
  priceMax: string;
  hasPictures: boolean;
  sortBy: SortOption;
};

export type SortOption = "newest" | "priceLow" | "priceHigh";

export const DEFAULT_FILTERS: CarFilters = {
  q: "",
  regionSlug: null,
  priceMin: "",
  priceMax: "",
  hasPictures: false,
  sortBy: "newest",
};

// Popular car makes in Algeria for quick filtering
export const POPULAR_MAKES: string[] = [
  "Renault",
  "Peugeot",
  "Hyundai",
  "Kia",
  "Toyota",
  "Volkswagen",
  "Dacia",
  "Mercedes",
  "BMW",
  "Audi",
  "Seat",
  "Skoda",
  "Fiat",
  "Nissan",
  "Chevrolet",
  "Citroën",
  "Ford",
  "Opel",
  "Suzuki",
  "Mazda",
];
