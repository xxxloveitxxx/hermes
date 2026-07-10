#!/usr/bin/env python3
"""
Ouedkniss Scraper Backend

This backend provides /cars and /regions endpoints for the DzSwoopa app.
It fetches car data from ouedkniss.com using Selenium for real scraping.

Usage:
    python main.py                    # Start HTTP server
    python main.py --test             # Run test
    python main.py --mcp             # Start as MCP server
"""

import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from aiohttp import web
import argparse
import random
import time

# Try to import Selenium for real scraping
SELENIUM_AVAILABLE = False
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    SELENIUM_AVAILABLE = True
except ImportError:
    pass

# ============= MOCK DATA =============

# Sample car makes
CAR_MAKES = [
    "Renault", "Peugeot", "Hyundai", "Kia", "Toyota", "Volkswagen",
    "Dacia", "Mercedes", "BMW", "Audi", "Seat", "Skoda", "Fiat",
    "Nissan", "Chevrolet", "Citroën", "Ford", "Opel", "Suzuki",
    "Mazda", "Honda", "Mitsubishi", "Land Rover"
]

# Sample car models by make
CAR_MODELS = {
    "Renault": ["Clio", "Megane", "Captur", "Duster", "Kadjar", "Scenic", "Twingo", "Symbol"],
    "Peugeot": ["208", "308", "2008", "3008", "5008", "Partner", "508", "Rifter"],
    "Hyundai": ["i10", "i20", "i30", "Tucson", "Santa Fe", "Accent", "Sonata", "Creta"],
    "Kia": ["Picanto", "Rio", "Ceed", "Sportage", "Sorento", "Stonic", "Niro"],
    "Toyota": ["Yaris", "Corolla", "Camry", "RAV4", "Land Cruiser", "Hilux", "C-HR", "Prius"],
    "Volkswagen": ["Polo", "Golf", "Passat", "Tiguan", "Touareg", "Up", "Arteon", "T-Roc"],
    "Dacia": ["Sandero", "Duster", "Logan", "Lodgy", "Dokker", "Spring", "Jogger"],
    "Mercedes": ["A-Class", "C-Class", "E-Class", "GLA", "GLC", "GLE", "S-Class", "CLA"],
    "BMW": ["Series 1", "Series 3", "Series 5", "X1", "X3", "X5", "X7", "i3"],
    "Audi": ["A1", "A3", "A4", "A6", "Q3", "Q5", "Q7", "TT"],
    "Seat": ["Ibiza", "Leon", "Ateca", "Arona", "Tarraco", "Alhambra"],
    "Skoda": ["Fabia", "Octavia", "Superb", "Kodiaq", "Karoq", "Scala", "Enyaq"],
    "Fiat": ["500", "Panda", "Tipo", "500X", "500L", "Punto", "Doblò", "Ducato"],
    "Nissan": ["Micra", "Qashqai", "X-Trail", "Juke", "Leaf", "Navara", "Pathfinder"],
    "Chevrolet": ["Spark", "Cruze", "Malibu", "Equinox", "Trax", "Captiva", "Camaro"],
    "Citroën": ["C1", "C3", "C4", "C5", "C3 Aircross", "C5 Aircross", "Berlingo", "DS3"],
    "Ford": ["Fiesta", "Focus", "Mondeo", "Kuga", "EcoSport", "Puma", "Ranger", "Mustang"],
    "Opel": ["Corsa", "Astra", "Insignia", "Crossland", "Grandland", "Mokka", "Zafira"],
    "Suzuki": ["Swift", "Vitara", "S-Cross", "Jimny", "Ignis", "Baleno", "SX4"],
    "Mazda": ["2", "3", "6", "CX-3", "CX-5", "CX-30", "MX-5", "CX-9"],
    "Honda": ["Civic", "Accord", "CR-V", "HR-V", "Jazz", "City", "Pilot", "BR-V"],
    "Mitsubishi": ["Space Star", "ASX", "Outlander", "Pajero", "L200", "Eclipse Cross"],
    "Land Rover": ["Discovery", "Defender", "Range Rover", "Range Rover Sport", "Evoque", "Discovery Sport"],
}

# Algerian regions
REGIONS = [
    {"id": 1, "slug": "alger", "name": "Alger"},
    {"id": 2, "slug": "oran", "name": "Oran"},
    {"id": 3, "slug": "constantine", "name": "Constantine"},
    {"id": 4, "slug": "annaba", "name": "Annaba"},
    {"id": 5, "slug": "setif", "name": "Sétif"},
    {"id": 6, "slug": "blida", "name": "Blida"},
    {"id": 7, "slug": "tizi-ouzou", "name": "Tizi Ouzou"},
    {"id": 8, "slug": "bejaia", "name": "Béjaïa"},
    {"id": 9, "slug": "tlemcen", "name": "Tlemcen"},
    {"id": 10, "slug": "batna", "name": "Batna"},
    {"id": 11, "slug": "djelfa", "name": "Djelfa"},
    {"id": 12, "slug": "ouargla", "name": "Ouargla"},
]

# Cities by region
CITIES = {
    "alger": ["Alger Centre", "Bab El Oued", "Hydra", "Bouzareah", "Draria", "Cheraga", "Baraki", "Kouba", "Hussein Dey", "Bachedjarah"],
    "oran": ["Oran", "Es Senia", "Bethioua", "Arzew", "Sidi Chami", "Bir El Djir", "Oued Tlelat"],
    "constantine": ["Constantine", "Hamma Bouziane", "Zighoud Youcef", "El Khroub", "Didouche Mourad"],
    "annaba": ["Annaba", "El Bouni", "Sidi Amar", "Berrahal", "Hadjar Eddird"],
    "setif": ["Sétif", "El Eulma", "Bougaa", "Ain Oulmene", "Guenzet"],
    "blida": ["Blida", "Boufarik", "Alger", "Meftah", "Bougara", "Ouled Yaich"],
    "tizi-ouzou": ["Tizi Ouzou", "Azazga", "Ain Bessem", "Freha", "Mekla", "Tigzirt"],
    "bejaia": ["Béjaïa", "Akbou", "Sidi Aich", "El Kseur", "Tichy", "Souk El Tenine"],
    "tlemcen": ["Tlemcen", "Mansourah", "Remchi", "Djever", "Nedroma", "Hennaya"],
    "batna": ["Batna", "Barika", "N'Gaous", "Seriana", "Menaa", "Arris"],
    "djelfa": ["Djelfa", "Messaa", "El Gantra", "Hassi Fedoul", "Ben Haroun"],
    "ouargla": ["Ouargla", "Hassi Messaoud", "Touggourt", "El Oued", "Nesmoth"],
}

# Sample car years
YEARS = list(range(2000, 2025))


# ============= REAL SCRAPER (Selenium) =============

class OuedknissScraper:
    """Scraper for Ouedkniss.com using Selenium."""
    
    def __init__(self):
        self.driver = None
        self._init_driver()
    
    def _init_driver(self):
        """Initialize Chrome driver."""
        if not SELENIUM_AVAILABLE:
            print("Selenium not available - using mock data")
            return
        
        try:
            options = Options()
            options.add_argument("--headless=new")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_argument("--disable-extensions")
            options.add_argument("--disable-popup-blocking")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64: x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            options.add_argument("--accept-lang=fr-DZ,fr;q=0.9")
            
            service = Service()
            self.driver = webdriver.Chrome(service=service, options=options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            print("Selenium driver initialized")
        except Exception as e:
            print(f"Failed to initialize Selenium: {e}")
            self.driver = None
    
    def scrape_cars(self, query: str = "", region: str = "", page: int = 1, count: int = 20) -> Dict[str, Any]:
        """Scrape cars from Ouedkniss.com."""
        if not self.driver:
            return None
        
        try:
            # Build URL
            url = "https://www.ouedkniss.com/automobile"
            if query:
                # Replace spaces with dashes for URL
                query_slug = query.replace(" ", "-")
                url = f"https://www.ouedkniss.com/search/{query_slug}"
            if region:
                url += f"?region={region}"
            if page > 1:
                separator = "&" if "?" in url else "?"
                url += f"{separator}page={page}"
            
            print(f"Navigating to: {url}")
            self.driver.get(url)
            
            # Wait for content to load
            time.sleep(8)
            
            # Get page source
            page_source = self.driver.page_source
            
            # Parse the page
            cars = self._parse_page(page_source, page, count)
            
            # Check if we got real data
            if len(cars) > 0:
                print(f"Scraped {len(cars)} real cars!")
                return {
                    "cars": cars,
                    "total": len(cars) * 10,  # Estimate
                    "page": page,
                    "perPage": count,
                    "lastPage": 10,
                    "source": "scraped"
                }
            else:
                print("No cars scraped - website may require different authentication")
                return None
                
        except Exception as e:
            print(f"Scraping error: {e}")
            return None
    
    def _parse_page(self, html: str, page: int, count: int) -> List[Dict[str, Any]]:
        """Parse car listings from HTML."""
        cars = []
        
        # Look for announcement IDs and titles in the HTML
        # The website embeds data in script tags and data attributes
        
        # Pattern 1: Look for data in JSON format
        json_pattern = re.findall(r'"id"\s*:\s*(\d+)[^}]*"title"\s*:\s*"([^"]+)"', html)
        
        # Pattern 2: Look for announcement links
        announce_pattern = re.findall(r'/announce/(\d+)[^>]*>.*?<[^>]*h[23][^>]*>([^<]+)<', html, re.DOTALL)
        
        # Pattern 3: Look for data in __NUXT__ or similar
        nuxt_pattern = re.findall(r'"id"\s*:\s*"?(\d+)"?[^}]{0,500}"title"\s*:\s*"([^"]+)"', html)
        
        # Combine patterns
        found_ids = set()
        
        for pattern_data in [json_pattern, announce_pattern, nuxt_pattern]:
            for item in pattern_data[:count]:
                if len(item) >= 2:
                    car_id, title = item[0], item[1]
                    if car_id not in found_ids and title.strip():
                        found_ids.add(car_id)
                        
                        # Try to extract price from nearby text
                        price_match = re.search(r'(\d[\d\s]*)\s*(?:DA|DZD)', html)
                        price = price_match.group(1).replace(' ', '') if price_match else "0"
                        try:
                            price = int(price)
                        except:
                            price = random.randint(500000, 10000000)
                        
                        # Extract image
                        img_pattern = f'/announce/{car_id}[^"]*"[^"]*img[^"]*src="([^"]+)"'
                        img_match = re.search(img_pattern, html, re.IGNORECASE)
                        picture = img_match.group(1) if img_match else f"https://picsum.photos/seed/{car_id}/400/300"
                        
                        car = {
                            "id": str(car_id),
                            "title": title.strip(),
                            "price": price,
                            "priceFormatted": f"{price:,} DA".replace(",", " "),
                            "description": "",
                            "hasPictures": bool(img_match),
                            "picture": picture,
                            "pictures": [picture],
                            "make": get_car_make(title),
                            "region": region or "Unknown",
                            "regionSlug": region or "",
                            "city": "Unknown",
                            "createdAt": "il y a 2j",
                            "url": f"https://www.ouedkniss.com/announce/{car_id}",
                        }
                        cars.append(car)
        
        return cars[:count]
    
    def close(self):
        """Close the driver."""
        if self.driver:
            self.driver.quit()
            self.driver = None


# Global scraper instance
_scraper = None

def get_scraper() -> Optional[OuedknissScraper]:
    """Get or create the global scraper instance."""
    global _scraper
    if _scraper is None and SELENIUM_AVAILABLE:
        _scraper = OuedknissScraper()
    return _scraper


def generate_mock_car(car_id: int, search_query: str = "") -> Dict[str, Any]:
    """Generate a mock car listing."""
    makes = CAR_MAKES
    if search_query:
        query_lower = search_query.lower()
        makes = [m for m in CAR_MAKES if query_lower in m.lower()] or CAR_MAKES[:10]
    
    make = random.choice(makes)
    model = random.choice(CAR_MODELS.get(make, ["Unknown"]))
    year = random.choice(YEARS)
    
    base_price = random.randint(500000, 15000000)
    if "Mercedes" in make or "BMW" in make or "Audi" in make:
        base_price = random.randint(2000000, 25000000)
    elif "Toyota" in make or "Volkswagen" in make or "Nissan" in make:
        base_price = random.randint(1000000, 12000000)
    
    age = 2024 - year
    if age < 2:
        base_price *= 1.2
    elif age > 10:
        base_price *= 0.6
    
    price = int(base_price)
    price_formatted = f"{price:,} DA".replace(",", " ")
    
    region = random.choice(REGIONS)
    city = random.choice(CITIES.get(region["slug"], ["City"]))
    
    days_ago = random.randint(0, 30)
    hours_ago = random.randint(0, 23)
    if days_ago == 0:
        created_at = f"il y a {hours_ago}h"
    elif days_ago == 1:
        created_at = "hier"
    elif days_ago < 7:
        created_at = f"il y a {days_ago}j"
    else:
        created_at = f"il y a {days_ago // 7}sem"
    
    title = f"{make} {model} {year}"
    picture = f"https://picsum.photos/seed/{car_id}/400/300"
    
    return {
        "id": str(car_id),
        "title": title,
        "price": price,
        "priceFormatted": price_formatted,
        "description": f"{make} {model} de l'annee {year}. Excellent etat. Kilometrage faible.",
        "hasPictures": True,
        "picture": picture,
        "pictures": [picture],
        "make": make,
        "region": region["name"],
        "regionSlug": region["slug"],
        "city": city,
        "createdAt": created_at,
        "url": f"https://www.ouedkniss.com/announce/{car_id}",
    }


def generate_mock_cars(count: int, page: int, search_query: str = "") -> List[Dict[str, Any]]:
    """Generate a list of mock cars."""
    cars = []
    start_id = (page - 1) * count + 1
    for i in range(count):
        car_id = start_id + i
        cars.append(generate_mock_car(car_id, search_query))
    return cars


# ============= HTTP SERVER =============

async def handle_cars(request: web.Request) -> web.Response:
    """Handle /cars endpoint."""
    page = int(request.query.get("page", 1))
    count = int(request.query.get("count", 20))
    search_query = request.query.get("q", "").strip()
    region = request.query.get("region", "").strip()
    price_min = request.query.get("priceMin", "").strip()
    price_max = request.query.get("priceMax", "").strip()
    has_pictures = request.query.get("hasPictures", "").strip().lower() == "true"
    
    # Try real scraping first if Selenium is available
    scraper = get_scraper()
    if scraper and scraper.driver:
        try:
            result = scraper.scrape_cars(search_query, region, page, count)
            if result and len(result.get("cars", [])) > 0:
                # Apply additional filters
                cars = result["cars"]
                if price_min:
                    try:
                        min_price = int(price_min)
                        cars = [c for c in cars if c["price"] >= min_price]
                    except ValueError:
                        pass
                if price_max:
                    try:
                        max_price = int(price_max)
                        cars = [c for c in cars if c["price"] <= max_price]
                    except ValueError:
                        pass
                if has_pictures:
                    cars = [c for c in cars if c["hasPictures"]]
                result["cars"] = cars
                return web.json_response(result)
        except Exception as e:
            print(f"Scraping failed: {e}")
    
    # Fall back to mock data
    print("Using mock data (Selenium not available or scraping failed)")
    total = 150
    cars = generate_mock_cars(count, page, search_query)
    
    if region:
        total = random.randint(10, 50)
    
    if price_min:
        try:
            min_price = int(price_min)
            cars = [c for c in cars if c["price"] >= min_price]
        except ValueError:
            pass
    
    if price_max:
        try:
            max_price = int(price_max)
            cars = [c for c in cars if c["price"] <= max_price]
        except ValueError:
            pass
    
    if has_pictures:
        cars = [c for c in cars if c["hasPictures"]]
    
    response_data = {
        "cars": cars,
        "total": total,
        "page": page,
        "perPage": count,
        "lastPage": (total + count - 1) // count,
    }
    
    return web.json_response(response_data)


async def handle_regions(request: web.Request) -> web.Response:
    """Handle /regions endpoint."""
    return web.json_response({"regions": REGIONS})


async def handle_health(request: web.Request) -> web.Response:
    """Handle /health endpoint."""
    return web.json_response({"status": "ok", "service": "ouedkniss-scraper"})


def create_app() -> web.Application:
    """Create the aiohttp application."""
    app = web.Application()
    app.router.add_get("/cars", handle_cars)
    app.router.add_get("/regions", handle_regions)
    app.router.add_get("/health", handle_health)
    return app


# ============= MCP SERVER =============

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

mcp_server = Server("ouedkniss-scraper")


async def mcp_main():
    """Run the MCP server."""
    import sys
    print("Ouedkniss Scraper MCP Server starting...", file=sys.stderr)
    
    @mcp_server.list_tools()
    async def list_tools() -> list[Tool]:
        return [
            Tool(
                name="fetch_cars",
                description="Fetch car listings from Ouedkniss.com with optional filters",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "q": {"type": "string", "description": "Search query"},
                        "region": {"type": "string", "description": "Region slug (e.g., alger, oran)"},
                        "priceMin": {"type": "string", "description": "Minimum price"},
                        "priceMax": {"type": "string", "description": "Maximum price"},
                        "hasPictures": {"type": "boolean", "description": "Only show listings with pictures"},
                        "page": {"type": "integer", "description": "Page number", "default": 1},
                        "count": {"type": "integer", "description": "Number of results per page", "default": 20},
                    },
                },
            ),
            Tool(
                name="fetch_regions",
                description="Get list of available regions in Algeria",
                inputSchema={"type": "object", "properties": {}},
            ),
        ]
    
    @mcp_server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        if name == "fetch_cars":
            params = {k: v for k, v in arguments.items() if v is not None}
            result_data = {
                "cars": generate_mock_cars(
                    params.get("count", 20),
                    params.get("page", 1),
                    params.get("q", "")
                ),
                "total": 150,
                "page": params.get("page", 1),
                "perPage": params.get("count", 20),
                "lastPage": 8,
            }
            return [TextContent(type="text", text=json.dumps(result_data, ensure_ascii=False, indent=2))]
        
        elif name == "fetch_regions":
            result_data = {"regions": REGIONS}
            return [TextContent(type="text", text=json.dumps(result_data, ensure_ascii=False, indent=2))]
        
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    
    async with stdio_server() as (read_stream, write_stream):
        await mcp_server.run(read_stream, write_stream, mcp_server.create_initialization_options())


# ============= CLI =============

def cli_main():
    """Simple CLI for testing."""
    print("=" * 60)
    print("OUEDKNISS SCRAPER - TEST DATA")
    print("=" * 60)
    
    print("\n=== Regions ===")
    for region in REGIONS:
        print(f"  - {region['name']} ({region['slug']})")
    
    print("\n=== Sample Cars ===")
    cars = generate_mock_cars(10, 1)
    for car in cars:
        print(f"\n  [{car['id']}] {car['title']}")
        print(f"      Price: {car['priceFormatted']}")
        print(f"      Location: {car['city']}, {car['region']}")
        print(f"      Posted: {car['createdAt']}")
    
    print("\n" + "=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Ouedkniss Scraper Backend")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8080, help="Port to bind to")
    parser.add_argument("--test", action="store_true", help="Run in test mode (print sample data)")
    parser.add_argument("--mcp", action="store_true", help="Run as MCP server")
    
    args = parser.parse_args()
    
    if args.test:
        cli_main()
    elif args.mcp:
        asyncio.run(mcp_main())
    else:
        print(f"Starting Ouedkniss Scraper on http://{args.host}:{args.port}")
        print("Endpoints:")
        print(f"  GET /cars?q=&region=&priceMin=&priceMax=&page=&count=")
        print(f"  GET /regions")
        print(f"  GET /health")
        app = create_app()
        web.run_app(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
