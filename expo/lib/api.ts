// API client for DzSwoopa backend (Cloudflare Worker → ouedkniss GraphQL)

import type { CarListResponse, CarFilters, Region, SortOption } from "@/types/car";

// Backend URL - set via environment variable or defaults to same origin
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
};

type FetchParams = {
  page?: number;
  count?: number;
  q?: string;
  region?: string;
  priceMin?: number;
  priceMax?: number;
  hasPictures?: boolean;
};

function filtersToParams(
  filters: CarFilters,
  page: number,
  count: number
): FetchParams {
  const params: FetchParams = { page, count };

  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.regionSlug) params.region = filters.regionSlug;
  if (filters.priceMin.trim()) {
    const v = parseInt(filters.priceMin, 10);
    if (!isNaN(v)) params.priceMin = v;
  }
  if (filters.priceMax.trim()) {
    const v = parseInt(filters.priceMax, 10);
    if (!isNaN(v)) params.priceMax = v;
  }
  if (filters.hasPictures) params.hasPictures = true;

  return params;
}

function buildUrl(params: FetchParams): string {
  const base = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(`${base}/cars`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function fetchCars(
  filters: CarFilters,
  page: number = 1,
  count: number = 20
): Promise<CarListResponse> {
  const params = filtersToParams(filters, page, count);
  const url = buildUrl(params);

  let lastError: Error;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(`Failed to load listings: ${resp.status} ${body.slice(0, 200)}`);
      }

      const data = (await resp.json()) as CarListResponse;

      // Client-side sort (API doesn't support sort param)
      if (filters.sortBy !== "newest" && data.cars.length > 0) {
        data.cars.sort((a, b) => {
          const pa = a.price ?? 0;
          const pb = b.price ?? 0;
          return filters.sortBy === "priceLow" ? pa - pb : pb - pa;
        });
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        // Exponential backoff
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelayMs
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

export async function fetchRegions(): Promise<Region[]> {
  const base = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const resp = await fetch(`${base}/regions`);
  if (!resp.ok) throw new Error("Failed to load regions");
  const data = (await resp.json()) as { regions: Region[] };
  return data.regions;
}

/** Format price in Algerian Dinar */
export function formatPrice(
  price: number | null,
  pricePreview: string | null,
  priceUnit: string | null
): string {
  if (price === null || price === 0) {
    if (pricePreview && String(pricePreview) !== "0") {
      return formatPreview(pricePreview, priceUnit);
    }
    return "Prix non spécifié";
  }
  // The API returns price in DA and priceUnit as "MILLION" etc.
  // If priceUnit is MILLION, show as "X M DA" for readability
  if (priceUnit === "MILLION" && price >= 1_000_000) {
    const millions = price / 1_000_000;
    const formatted = millions % 1 === 0
      ? millions.toFixed(0)
      : millions.toFixed(1);
    return `${formatted} M DA`;
  }
  const formatted = new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  return `${formatted} DA`;
}

function formatPreview(preview: string | number, unit: string | null): string {
  const num = typeof preview === "string" ? parseInt(preview, 10) : preview;
  if (isNaN(num) || num === 0) return "Prix non spécifié";
  if (unit === "MILLION") return `${num} M DA`;
  return `${num} ${unit ?? "DA"}`;
}

/** Format relative time from ISO string */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString("fr-DZ", { day: "numeric", month: "short" });
}

export function getCarMake(title: string): string {
  const lower = title.toLowerCase();
  // Try to extract make from title
  const makes = [
    "renault", "peugeot", "hyundai", "kia", "toyota", "volkswagen",
    "dacia", "mercedes", "bmw", "audi", "seat", "skoda", "fiat",
    "nissan", "chevrolet", "citroën", "citroen", "ford", "opel",
    "suzuki", "mazda", "honda", "mitsubishi", "land rover", "range rover",
  ];
  for (const make of makes) {
    if (lower.includes(make)) {
      return make.charAt(0).toUpperCase() + make.slice(1);
    }
  }
  return "Autre";
}

export type { SortOption };
