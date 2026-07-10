// functions/index.ts — DzSwoopa backend
// Scrapes ouedkniss.com automobile listings via their GraphQL API.

export type CarListing = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  pricePreview: string | null;
  priceUnit: string | null;
  oldPrice: number | null;
  oldPricePreview: string | null;
  priceType: string | null;
  exchangeType: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  cityName: string | null;
  regionName: string | null;
  categorySlug: string;
  storeName: string | null;
  storeVerified: boolean;
  isFromStore: boolean;
  likeCount: number;
  createdAt: string | null;
  description: string | null;
  year: string | null;
  mileage: string | null;
  fuel: string | null;
  gearbox: string | null;
  link: string;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const GRAPHQL_URL = "https://api.ouedkniss.com/graphql";

const SEARCH_QUERY = `query SearchQueryWithoutFilters($q: String, $filter: SearchFilterInput) {
  search(q: $q, filter: $filter) {
    announcements {
      data {
        id
        title
        slug
        createdAt: refreshedAt
        isFromStore
        hasDelivery
        deliveryType
        paymentMethod
        likeCount
        description
        status
        price
        pricePreview
        priceUnit
        oldPrice
        oldPricePreview
        priceType
        exchangeType
        cities {
          id
          name
          slug
          region { id name slug }
        }
        store { id name slug imageUrl isOfficial isVerified }
        defaultMedia { mediaUrl mimeType thumbnail }
        smallDescription {
          specification { codename }
          valueText
        }
      }
      paginatorInfo { lastPage hasMorePages }
    }
  }
}`;

/** Map of Algerian wilaya (region) IDs — slug-based, derived from ouedkniss filter data. */
const REGION_MAP: Record<string, string> = {
  adrar: "Adrar", chlef: "Chlef", laghouat: "Laghouat", oum: "Oum El Bouaghi",
  batna: "Batna", bejaia: "Béjaïa", biskra: "Biskra", bechar: "Béchar",
  blida: "Blida", bouira: "Bouira", tamanrasset: "Tamanrasset", tebessa: "Tébessa",
  tlemcen: "Tlemcen", tiaret: "Tiaret", tizi: "Tizi Ouzou", alger: "Alger",
  djelfa: "Djelfa", jijel: "Jijel", setif: "Sétif", saida: "Saïda",
  skikda: "Skikda", sidi: "Sidi Bel Abbès", annaba: "Annaba", guelma: "Guelma",
  constantine: "Constantine", medea: "Médéa", mostaganem: "Mostaganem",
  msila: "M'Sila", mascara: "Mascara", ouargla: "Ouargla", oran: "Oran",
  elbayadh: "El Bayadh", illizi: "Illizi", bordj: "Bordj Bou Arréridj",
  boumerdes: "Boumerdès", eltarf: "El Tarf", tindouf: "Tindouf",
  tissemsilt: "Tissemsilt", eloued: "El Oued", khenchela: "Khenchela",
  souk: "Souk Ahras", tipaza: "Tipaza", mila: "Mila", aindefla: "Aïn Defla",
  naama: "Naâma", ain: "Aïn Témouchent", ghardaia: "Ghardaïa", relizane: "Relizane",
};

async function fetchOuedkniss(body: unknown): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://www.ouedkniss.com",
    "Referer": "https://www.ouedkniss.com/automobiles",
    "Locale": "fr",
    "Accept-Language": "fr",
    "X-Referer": "https://www.ouedkniss.com/automobiles",
  };

  const resp = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error(`ouedkniss API error ${resp.status}: ${text.slice(0, 500)}`);
    throw new Error(`ouedkniss API returned ${resp.status}`);
  }

  const text = await resp.text();
  if (!text) {
    throw new Error("ouedkniss API returned empty response — likely IP-blocked");
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed.errors) {
      console.error("GraphQL errors:", JSON.stringify(parsed.errors).slice(0, 800));
    }
    return parsed;
  } catch {
    console.error("Non-JSON response:", text.slice(0, 500));
    throw new Error("ouedkniss API returned non-JSON response");
  }
}

function extractSpec(specs: any[], codename: string): string | null {
  const s = specs?.find(
    (d: any) => d?.specification?.codename === codename
  );
  const val = s?.valueText ?? null;
  if (val == null) return null;
  // valueText can be a string or an array of strings — normalize to string
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

function mapListing(raw: any): CarListing {
  const specs = raw.smallDescription ?? [];
  const city = raw.cities?.[0];
  const media = raw.defaultMedia;

  return {
    id: String(raw.id),
    slug: raw.slug ?? "",
    title: raw.title ?? "Sans titre",
    price: raw.price ?? null,
    pricePreview: raw.pricePreview != null ? String(raw.pricePreview) : null,
    priceUnit: raw.priceUnit ?? null,
    oldPrice: raw.oldPrice ?? null,
    oldPricePreview: raw.oldPricePreview ?? null,
    priceType: raw.priceType ?? null,
    exchangeType: raw.exchangeType ?? null,
    imageUrl: media?.mediaUrl ?? null,
    thumbnailUrl: media?.thumbnail ?? media?.mediaUrl ?? null,
    cityName: city?.name ?? null,
    regionName: city?.region?.name ?? null,
    categorySlug: raw.category?.slug ?? "automobiles",
    storeName: raw.store?.name ?? null,
    storeVerified: raw.store?.isVerified ?? false,
    isFromStore: raw.isFromStore ?? false,
    likeCount: raw.likeCount ?? 0,
    createdAt: raw.createdAt ?? null,
    description: raw.description ?? null,
    year: extractSpec(specs, "year") ?? extractSpec(specs, "annee"),
    mileage: extractSpec(specs, "mileage") ?? extractSpec(specs, "kilometrage"),
    fuel: extractSpec(specs, "fuel") ?? extractSpec(specs, "carburant"),
    gearbox: extractSpec(specs, "gearbox") ?? extractSpec(specs, "boite_vitesse"),
    link: `https://www.ouedkniss.com/announcements/${raw.id}/${raw.slug ?? ""}`,
  };
}

type SearchParams = {
  page?: number;
  count?: number;
  q?: string;
  categorySlug?: string;
  regionIds?: string[];
  priceMin?: number;
  priceMax?: number;
  hasPictures?: boolean;
  hasPrice?: boolean;
  exchange?: string | null;
  keywords?: string;
};

function buildFilter(params: SearchParams): any {
  // Start with minimal filter — only set fields the SPA actually sends
  const filter: any = {
    categorySlug: params.categorySlug ?? "automobiles_vehicules",
  };

  // Only add fields when they have meaningful values —
  // the GraphQL server applies defaults for omitted fields
  if (params.keywords) filter.keywords = params.keywords;
  if (params.regionIds && params.regionIds.length > 0) filter.regionIds = params.regionIds;
  if (params.priceMin != null || params.priceMax != null) {
    filter.priceRange = [params.priceMin ?? 0, params.priceMax ?? 999999999];
  }
  if (params.hasPictures) filter.hasPictures = "true";

  return filter;
}

async function scrapeCars(params: SearchParams): Promise<{
  cars: CarListing[];
  lastPage: number;
  hasMorePages: boolean;
}> {
  const variables = {
    q: params.q ?? "",
    filter: buildFilter(params),
  };

  const data = await fetchOuedkniss({
    operationName: "SearchQueryWithoutFilters",
    query: SEARCH_QUERY,
    variables,
  });

  if (data.errors) {
    const msg = data.errors[0]?.message ?? "GraphQL error";
    const ext = data.errors[0]?.extensions;
    console.error("GraphQL error:", msg, ext ? JSON.stringify(ext).slice(0, 500) : "");
    throw new Error(`${msg}${ext ? ` (${JSON.stringify(ext)})` : ""}`);
  }

  const result = data?.data?.search?.announcements;
  if (!result) {
    return { cars: [], lastPage: 0, hasMorePages: false };
  }

  const cars = (result.data ?? []).map(mapListing);
  const paginator = result.paginatorInfo ?? {};

  return {
    cars,
    lastPage: paginator.lastPage ?? 0,
    hasMorePages: paginator.hasMorePages ?? false,
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/ping") {
      return Response.json({ ok: true, now: new Date().toISOString() });
    }

    // GET /cars — scrape car listings from ouedkniss
    if (url.pathname === "/cars" && request.method === "GET") {
      try {
        const params: SearchParams = {
          page: parseInt(url.searchParams.get("page") ?? "1", 10),
          count: parseInt(url.searchParams.get("count") ?? "20", 10),
          q: url.searchParams.get("q") ?? undefined,
          categorySlug:
            url.searchParams.get("category") ?? "automobiles_vehicules",
          regionIds: url.searchParams.get("region")
            ? [url.searchParams.get("region")!]
            : undefined,
          priceMin: url.searchParams.get("priceMin")
            ? parseInt(url.searchParams.get("priceMin")!, 10)
            : undefined,
          priceMax: url.searchParams.get("priceMax")
            ? parseInt(url.searchParams.get("priceMax")!, 10)
            : undefined,
          hasPictures: url.searchParams.get("hasPictures") === "true",
          keywords: url.searchParams.get("keywords") ?? undefined,
        };

        const result = await scrapeCars(params);
        return Response.json(result, { headers: CORS });
      } catch (err: any) {
        console.error("scrapeCars error:", err.message);
        return Response.json(
          { error: err.message ?? "Failed to scrape listings" },
          { status: 502, headers: CORS }
        );
      }
    }

    // GET /regions — list of Algerian wilayas for filter UI
    if (url.pathname === "/regions" && request.method === "GET") {
      const regions = Object.entries(REGION_MAP).map(([slug, name]) => ({
        slug,
        name,
      }));
      return Response.json({ regions }, { headers: CORS });
    }

    return new Response("not found", { status: 404, headers: CORS });
  },
};
