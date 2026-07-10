# Ouedkniss Car Scraper Backend

This backend provides API endpoints for scraping car listings from Ouedkniss.com. It was created to work with the DzSwoopa app hosted at `https://yo.realbadman2270.workers.dev/`.

## API Endpoints

### GET /cars
Fetch car listings with optional filters.

**Query Parameters:**
- `q` - Search query (e.g., "renault", "clio")
- `region` - Region slug (e.g., "alger", "oran")
- `priceMin` - Minimum price
- `priceMax` - Maximum price
- `hasPictures` - Filter by pictures (true/false)
- `page` - Page number (default: 1)
- `count` - Results per page (default: 20)

**Response:**
```json
{
  "cars": [
    {
      "id": "1",
      "title": "Renault Clio 2019",
      "price": 2500000,
      "priceFormatted": "2 500 000 DA",
      "description": "...",
      "hasPictures": true,
      "picture": "https://...",
      "pictures": ["https://..."],
      "make": "Renault",
      "region": "Alger",
      "regionSlug": "alger",
      "city": "Alger Centre",
      "createdAt": "il y a 2j",
      "url": "https://www.ouedkniss.com/announce/1"
    }
  ],
  "total": 150,
  "page": 1,
  "perPage": 20,
  "lastPage": 8
}
```

### GET /regions
Get list of available regions in Algeria.

**Response:**
```json
{
  "regions": [
    {"id": 1, "slug": "alger", "name": "Alger"},
    {"id": 2, "slug": "oran", "name": "Oran"},
    ...
  ]
}
```

### GET /health
Health check endpoint.

## Running the Backend

### Local Development
```bash
# Install dependencies
pip install aiohttp

# Run server
python main.py --port 8080

# Test mode
python main.py --test

# Run as MCP server
python main.py --mcp
```

### Deployment Options

#### Option 1: Run on a VPS/Server
```bash
python main.py --host 0.0.0.0 --port 8080
```

#### Option 2: Deploy to Railway
1. Create a `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "command": "pip install -r requirements.txt"
  },
  "deploy": {
    "command": "python main.py"
  }
}
```

#### Option 3: Deploy to Render
1. Create a `render.yaml`:
```yaml
services:
  - type: web
    name: ouedkniss-scraper
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python main.py
```

#### Option 4: Deploy to Fly.io
```bash
fly launch
fly deploy
```

## Configuring the App

Once the backend is deployed, you need to configure the DzSwoopa app to use it:

1. **For local development:**
   Set the environment variable before building the app:
   ```bash
   EXPO_PUBLIC_SCRAPER_URL=http://localhost:8080
   expo start
   ```

2. **For production:**
   Update the Cloudflare Worker configuration with your backend URL:
   - Option A: Set the `EXPO_PUBLIC_SCRAPER_URL` environment variable in your deployment
   - Option B: Modify the Cloudflare Worker to use your backend URL

## Note on Data

The backend currently uses mock data for testing purposes. The Ouedkniss.com GraphQL API requires authentication/session cookies to return results, which makes direct scraping difficult.

To enable real data scraping:
1. Implement authentication with Ouedkniss.com
2. Extract session cookies from a logged-in browser
3. Add the cookies to the HTTP requests

## Files

- `main.py` - Main backend server
- `pyproject.toml` - Python project configuration
