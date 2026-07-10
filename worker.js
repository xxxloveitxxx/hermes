/**
 * Ouedkniss Scraper Worker for Cloudflare Workers
 * 
 * This worker fetches car data from Ouedkniss GraphQL API
 * and serves it at /cars and /regions endpoints.
 */

const OUEDKNISS_API = "https://api.ouedkniss.com/graphql";

const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64: x64) AppleWebKit/537.36",
  "Accept": "application/json",
  "Accept-Language": "fr-DZ,fr;q=0.9",
  "Origin": "https://www.ouedkniss.com",
  "Referer": "https://www.ouedkniss.com/",
};

const CAR_MAKES = [
  "Renault", "Peugeot", "Hyundai", "Kia", "Toyota", "Volkswagen",
  "Dacia", "Mercedes", "BMW", "Audi", "Seat", "Skoda", "Fiat",
  "Nissan", "Chevrolet", "Citroën", "Ford", "Opel", "Suzuki",
  "Mazda", "Honda", "Mitsubishi", "Land Rover"
];

const REGIONS = [
  { "id": 1, "slug": "alger", "name": "Alger" },
  { "id": 2, "slug": "oran", "name": "Oran" },
  { "id": 3, "slug": "constantine", "name": "Constantine" },
  { "id": 4, "slug": "annaba", "name": "Annaba" },
  { "id": 5, "slug": "setif", "name": "Sétif" },
  { "id": 6, "slug": "blida", "name": "Blida" },
  { "id": 7, "slug": "tizi-ouzou", "name": "Tizi Ouzou" },
  { "id": 8, "slug": "bejaia", "name": "Béjaïa" },
  { "id": 9, "slug": "tlemcen", "name": "Tlemcen" },
  { "id": 10, "slug": "batna", "name": "Batna" },
  { "id": 11, "slug": "djelfa", "name": "Djelfa" },
  { "id": 12, "slug": "ouargla", "name": "Ouargla" },
];

function getMakeFromTitle(title) {
  for (const make of CAR_MAKES) {
    if (title.toLowerCase().includes(make.toLowerCase())) {
      return make;
    }
  }
  return "";
}

async function fetchCars(params) {
  const page = parseInt(params.get("page") || "1");
  const count = parseInt(params.get("count") || "20");
  const query = params.get("q") || "";
  const region = params.get("region") || "";

  const graphqlQuery = {
    query: `query SearchQuery($q: String, $filter: SearchFilterInput) {
      search(q: $q, filter: $filter) {
        announcements {
          paginatorInfo {
            total
            perPage
            currentPage
            lastPage
          }
          data {
            id
            title
            description
            pricePreview
            priceUnit
            defaultMedia(size: ORIGINAL) {
              mediaUrl
              mimeType
              thumbnail
            }
            locations {
              location {
                address
                region {
                  slug
                  name
                }
              }
            }
          }
        }
      }
    }`,
    variables: {
      filter: {
        categorySlug: "automobiles_vehicules",
        page: page,
        count: count,
        orderByField: { field: "REFRESHED_AT", order: "DESC" },
      }
    }
  };

  if (query) {
    graphqlQuery.variables.q = query;
  }

  if (region) {
    graphqlQuery.variables.filter.regionIds = [region];
  }

  const response = await fetch(OUEDKNISS_API, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(graphqlQuery)
  });

  const data = await response.json();

  if (data.errors) {
    return { cars: [], total: 0, page: 1, perPage: count, lastPage: 1, source: "api" };
  }

  const searchData = data.data?.search?.announcements;
  if (!searchData) {
    return { cars: [], total: 0, page: 1, perPage: count, lastPage: 1, source: "api" };
  }

  const paginator = searchData.paginatorInfo || {};
  const carsData = searchData.data || [];

  const cars = carsData.map(ann => {
    let price = ann.pricePreview || 0;
    if (ann.priceUnit === "MILLION" && price > 0) {
      price = price * 1000;
    }

    const media = ann.defaultMedia || {};
    const picture = media.mediaUrl || "";

    const locations = ann.locations || [];
    let regionName = "";
    let regionSlug = "";
    let city = "";
    if (locations.length > 0) {
      const loc = locations[0].location || {};
      const regionInfo = loc.region || {};
      regionName = regionInfo.name || "";
      regionSlug = regionInfo.slug || "";
      city = loc.address || "";
    }

    return {
      id: String(ann.id || ""),
      title: ann.title || "",
      price: price,
      priceFormatted: price > 0 ? `${price.toLocaleString()} DA` : "Prix non specifie",
      description: ann.description || "",
      hasPictures: Boolean(picture),
      picture: picture,
      pictures: picture ? [picture] : [],
      make: getMakeFromTitle(ann.title || ""),
      region: regionName,
      regionSlug: regionSlug,
      city: city,
      createdAt: "il y a 2j",
      url: `https://www.ouedkniss.com/announce/${ann.id || ""}`,
    };
  });

  return {
    cars: cars,
    total: paginator.total || cars.length,
    page: paginator.currentPage || page,
    perPage: paginator.perPage || count,
    lastPage: paginator.lastPage || 1,
    source: "api"
  };
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (path === "/cars" || path.endsWith("/cars")) {
      const result = await fetchCars(url.searchParams);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (path === "/regions" || path.endsWith("/regions")) {
      return new Response(JSON.stringify({ regions: REGIONS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (path === "/health" || path.endsWith("/health")) {
      return new Response(JSON.stringify({ status: "ok", service: "ouedkniss-scraper" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Default: return API info
    return new Response(JSON.stringify({
      service: "Ouedkniss Scraper API",
      endpoints: ["/cars", "/regions", "/health"]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
};
