# Exchange Rates API Documentation

The Exchange Rates API provides foreign exchange rates backed by Yahoo Finance,
cached for 15 minutes (mirrors the echobackend `/api/exchange-rates` endpoint).

**Base URL:** `/api/exchange-rates`

---

## Authentication

All endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get Exchange Rate
Retrieve the exchange rate between two currencies.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | string (3 letters) | Yes | Source currency code, e.g. `USD` |
| to | string (3 letters) | Yes | Target currency code, e.g. `IDR` |

**Example Request:**
```bash
curl -X GET "/api/exchange-rates?from=USD&to=IDR" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "from": "USD",
    "to": "IDR",
    "symbol": "USDIDR=X",
    "rate": 16250.5,
    "source": "Yahoo Finance",
    "cached": false,
    "fetchedAt": "2026-07-25T12:00:00.000Z"
  },
  "message": "Exchange rate fetched successfully",
  "timestamp": "2026-07-25T12:00:00.000Z"
}
```

**Notes:**
- Results are cached for 15 minutes; cached responses return `"cached": true`.
- If the direct pair is unavailable, the inverse pair is used and the rate inverted.
- Identical `from` / `to` currencies return a rate of `1`.
