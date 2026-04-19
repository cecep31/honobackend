# Holdings API Documentation

The Holdings API provides endpoints for managing investment holdings, tracking portfolio value, and analyzing investment trends.

**Base URL:** `/v1/holdings`

**Holding types (global catalog, not under `/holdings`):** `GET /v1/holding-types`

**Note:** Holding `id` values are `bigint` in the database and are serialized as **strings** in JSON responses.

---

## Authentication

All endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get All Holdings
Retrieve all holdings for the authenticated user with optional filtering and sorting.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| month | string (digits) | No | — | Filter by month (1-12), e.g. `month=3` |
| year | string (digits) | No | — | Filter by year |
| sortBy | string | No | created_at | Sort field: `created_at`, `updated_at`, `name`, `platform`, `invested_amount`, `current_value`, `holding_type` |
| order | string | No | desc | Sort order: `asc` or `desc` |

Omitting `month` / `year` returns holdings for **all** periods for the user (not only the current month/year).

**Example Request:**
```bash
curl -X GET "/v1/holdings?month=1&year=2026&sortBy=current_value&order=desc" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apple Inc.",
      "symbol": "AAPL",
      "platform": "Robinhood",
      "holding_type_id": 1,
      "holding_type": {
        "id": 1,
        "code": "STOCK",
        "name": "Stock",
        "notes": null
      },
      "currency": "USD",
      "invested_amount": "5000.00",
      "current_value": "5500.00",
      "gain_amount": "500.00",
      "gain_percent": "10.00",
      "units": "25",
      "avg_buy_price": "200.00000000",
      "current_price": "220.00000000",
      "last_updated": "2026-01-08T12:00:00.000Z",
      "notes": "Long term holding",
      "month": 1,
      "year": 2026,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-08T00:00:00.000Z"
    }
  ],
  "message": "Holdings fetched successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

Numeric columns from PostgreSQL are often returned as **strings** to preserve decimal precision.

---

### 2. Get Holdings Summary
Get a summary of holdings including total invested, current value, and performance metrics.

- **URL:** `/summary`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| month | string (digits) | No | — | Filter by month (1-12) |
| year | string (digits) | No | — | Filter by year |

Omitting both aggregates across **all** of the user’s holdings (all months/years).

**Example Request:**
```bash
curl -X GET "/v1/holdings/summary?month=1&year=2026" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalInvested": 25000,
    "totalCurrentValue": 27500,
    "totalProfitLoss": 2500,
    "totalProfitLossPercentage": 10,
    "holdingsCount": 10,
    "typeBreakdown": [
      {
        "name": "Stock",
        "invested": 15000,
        "current": 16500,
        "profitLoss": 1500,
        "profitLossPercentage": 10
      }
    ],
    "platformBreakdown": [
      {
        "name": "Robinhood",
        "invested": 25000,
        "current": 27500,
        "profitLoss": 2500,
        "profitLossPercentage": 10
      }
    ]
  },
  "message": "Holdings summary fetched successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 3. Get Holdings Trends
Get historical trends of holdings over multiple years.

- **URL:** `/trends`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| years | string | No | — | Comma-separated years (e.g. `2024,2025,2026`). If omitted, **all** years for the user are included. |

**Example Request:**
```bash
curl -X GET "/v1/holdings/trends?years=2024,2025,2026" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):** Array of monthly buckets, sorted by year then month.

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01",
      "invested": 20000,
      "current": 21000,
      "profitLoss": 1000,
      "profitLossPercentage": 5
    }
  ],
  "message": "Holdings trends fetched successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 4. Compare Months
Compare holdings between two different months.

- **URL:** `/compare`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| fromMonth | string (digits) | No | See below | “From” month (1-12) |
| fromYear | string (digits) | No | See below | “From” year |
| toMonth | string (digits) | No | Current calendar month | “To” month (1-12) |
| toYear | string (digits) | No | Current calendar year | “To” year |

**Defaults:** `toMonth` / `toYear` default to the current date. If both `fromMonth` and `fromYear` are omitted, the “from” period is the **month immediately before** the “to” period. If only one of `fromMonth` / `fromYear` is sent, the missing part defaults to the corresponding part of the “to” period.

**Example Request:**
```bash
curl -X GET "/v1/holdings/compare?fromMonth=1&fromYear=2025&toMonth=12&toYear=2025" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):** Compares two summary snapshots (same shape as `GET /summary`) plus diffs and per-type / per-platform breakdown deltas.

```json
{
  "success": true,
  "data": {
    "fromMonth": { "month": 1, "year": 2025 },
    "toMonth": { "month": 12, "year": 2025 },
    "summary": {
      "from": { "totalInvested": 0, "totalCurrentValue": 0, "totalProfitLoss": 0, "totalProfitLossPercentage": 0, "holdingsCount": 0, "typeBreakdown": [], "platformBreakdown": [] },
      "to": { "totalInvested": 10000, "totalCurrentValue": 11000, "totalProfitLoss": 1000, "totalProfitLossPercentage": 10, "holdingsCount": 3, "typeBreakdown": [], "platformBreakdown": [] },
      "investedDiff": 10000,
      "currentValueDiff": 11000,
      "profitLossDiff": 1000,
      "holdingsCountDiff": 3,
      "investedDiffPercentage": 0,
      "currentValueDiffPercentage": 0,
      "holdingsCountDiffPercentage": 0
    },
    "typeComparison": [],
    "platformComparison": []
  },
  "message": "Month comparison fetched successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

`typeComparison` and `platformComparison` entries include `name`, `from` / `to` breakdown objects, `investedDiff`, `currentValueDiff`, and related percentage fields.

---

### 5. Get Monthly Series

Time series of totals per month over a configurable range. Missing months in the range are returned with zeros.

- **URL:** `/monthly`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| startMonth | string (digits) | No | Current month | Range endpoint (1-12) |
| startYear | string (digits) | No | Current year | Range endpoint year |
| endMonth | string (digits) | No | 11 months before start | Other range endpoint (1-12); if omitted with `endYear`, computed from start |
| endYear | string (digits) | No | Derived | Other range endpoint year |

If `endMonth` / `endYear` are omitted, the range is a **12-month window**: from `startMonth`/`startYear` backward through the previous 11 months.

**Example Request:**
```bash
curl -X GET "/v1/holdings/monthly?startYear=2026&startMonth=4&endYear=2025&endMonth=5" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "month": 5,
      "year": 2025,
      "date": "2025-05",
      "totalCurrentValue": 12000,
      "totalInvested": 10000,
      "holdingsCount": 4
    }
  ],
  "message": "Holdings monthly data fetched successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 6. Get Holding Types
Retrieve all available holding types (global catalog, not nested under user holdings).

- **URL:** `/v1/holding-types` (base path `/`, i.e. `GET /v1/holding-types`)
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/holding-types \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "code": "STOCK", "name": "Stock", "notes": null }
  ],
  "message": "Holding types fetched successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 7. Get Single Holding
Retrieve a specific holding by ID.

- **URL:** `/:id`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/holdings/1 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):** Same row shape as list items (`holding_type` relation included; numeric columns often as strings).

```json
{
  "success": true,
  "data": {
    "id": "1",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apple Inc.",
    "symbol": "AAPL",
    "platform": "Robinhood",
    "holding_type_id": 1,
    "holding_type": { "id": 1, "code": "STOCK", "name": "Stock", "notes": null },
    "currency": "USD",
    "invested_amount": "5000.00",
    "current_value": "5500.00",
    "gain_amount": "500.00",
    "gain_percent": "10.00",
    "units": "25",
    "avg_buy_price": "200.00000000",
    "current_price": "220.00000000",
    "last_updated": "2026-01-08T12:00:00.000Z",
    "notes": "Long term holding",
    "month": 1,
    "year": 2026,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-08T00:00:00.000Z"
  },
  "message": "Holding fetched successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 8. Create Holding
Create a new holding.

- **URL:** `/`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Apple Inc.",
  "symbol": "AAPL",
  "platform": "Robinhood",
  "holding_type_id": 1,
  "currency": "USD",
  "invested_amount": 5000.00,
  "current_value": 5500.00,
  "units": 25,
  "avg_buy_price": 200.00,
  "current_price": 220.00,
  "last_updated": "2026-01-08T12:00:00.000Z",
  "notes": "Long term holding",
  "month": 1,
  "year": 2026
}
```

**Validation Rules:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| name | string | Yes | - |
| symbol | string \| null | No | Ticker or symbol; used by `POST /sync` when set |
| platform | string | Yes | - |
| holding_type_id | number | Yes | Valid holding type ID |
| currency | string | Yes | Exactly 3 characters (e.g. USD) |
| invested_amount | number | Yes | ≥ 0 |
| current_value | number | Yes | ≥ 0 |
| units | number \| null | No | - |
| avg_buy_price | number \| null | No | - |
| current_price | number \| null | No | - |
| last_updated | string \| null | No | ISO timestamp string |
| notes | string \| null | No | - |
| month | number | Yes | 1-12 |
| year | number | Yes | ≥ 2000 (DB check) |

**Example Request:**
```bash
curl -X POST /v1/holdings \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Apple Inc.","platform":"Robinhood","holding_type_id":1,"currency":"USD","invested_amount":5000,"current_value":5500,"month":1,"year":2026}'
```

**Response (201):** `data` is an **array** of inserted rows returned by Drizzle (typically one element).

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Apple Inc.",
      "month": 1,
      "year": 2026
    }
  ],
  "message": "Holding created successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 9. Sync Current Month Prices

Fetches latest prices for all holdings in the **current calendar month/year** that have a non-null `symbol`, updates `current_price`, `current_value` (as `units * price` when `units` is set), and `last_updated`.

- **URL:** `/sync`
- **Method:** `POST`
- **Authentication:** Required
- **Body:** None

**Example Request:**
```bash
curl -X POST /v1/holdings/sync \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "syncedCount": 5,
    "month": 4,
    "year": 2026
  },
  "message": "Prices synced successfully for current month",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

If there are no holdings with symbols for the current period, `data` is an empty array `[]` (same `message`, `request_id`, and `timestamp` fields).

---

### 10. Duplicate Holdings
Duplicate all holdings from one month to another.

- **URL:** `/duplicate`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "fromMonth": 1,
  "fromYear": 2025,
  "toMonth": 2,
  "toYear": 2025,
  "overwrite": false
}
```

**Validation Rules:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| fromMonth | number | Yes | 1-12 |
| fromYear | number | Yes | 1900-2100 |
| toMonth | number | Yes | 1-12 |
| toYear | number | Yes | 1900-2100 |
| overwrite | boolean | No | Default: false |

**Example Request:**
```bash
curl -X POST /v1/holdings/duplicate \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"fromMonth": 1, "fromYear": 2025, "toMonth": 2, "toYear": 2025}'
```

**Response (201):** `data` is an **array** of newly inserted holding rows (new IDs).

```json
{
  "success": true,
  "data": [
    { "id": "42", "month": 2, "year": 2025, "name": "Apple Inc." }
  ],
  "message": "Holdings duplicated successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 11. Update Holding
Update an existing holding.

- **URL:** `/:id`
- **Method:** `PUT`
- **Authentication:** Required
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Updated Name",
  "current_value": 6000.00,
  "current_price": 240.00,
  "notes": "Updated notes"
}
```

**Example Request:**
```bash
curl -X PUT /v1/holdings/1 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"current_value": 6000, "current_price": 240}'
```

**Response (200):** `data` is an **array** of updated rows (Drizzle `.returning()`).

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "current_value": "6000.00",
      "current_price": "240.00000000"
    }
  ],
  "message": "Holding updated successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

### 12. Delete Holding
Delete a holding.

- **URL:** `/:id`
- **Method:** `DELETE`
- **Authentication:** Required

**Example Request:**
```bash
curl -X DELETE /v1/holdings/1 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):** `data` is an **array** of deleted rows.

```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "Apple Inc." }
  ],
  "message": "Holding deleted successfully",
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

## Error Responses

Errors follow the global API shape: `success`, `message`, `error` (optional `code` and `details`), `request_id`, `timestamp`. See `src/utils/error.ts` and `AGENTS.md`.

**400 Bad Request (validation):**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALID_001",
    "details": [{ "field": "month", "message": "Invalid input" }]
  },
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": { "code": "AUTH_001" },
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Holding not found",
  "error": { "code": "DB_001" },
  "request_id": "...",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

---

## Data Models

### Holding Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique holding identifier (`bigint`, JSON string) |
| user_id | string (UUID) | Owner |
| name | string | Display name |
| symbol | string \| null | Optional ticker (used by price sync) |
| platform | string | Trading platform (e.g. Robinhood, Binance) |
| holding_type_id | number | FK to `holding_types` |
| holding_type | object \| null | Joined type: `id`, `code`, `name`, `notes` |
| currency | string | 3-character currency code |
| invested_amount | string \| number | Total invested (often a decimal string from DB) |
| current_value | string \| number | Current value |
| gain_amount | string \| number | Generated: `current_value - invested_amount` |
| gain_percent | string \| number | Generated return % |
| units | string \| number \| null | Position size |
| avg_buy_price | string \| number \| null | Average cost |
| current_price | string \| number \| null | Last known price |
| last_updated | string \| null | ISO timestamp |
| notes | string \| null | User notes |
| month | number | Reporting month (1-12) |
| year | number | Reporting year |
| created_at | string | Creation timestamp |
| updated_at | string | Last update timestamp |

---

## Implementation Example

### JavaScript/TypeScript

```typescript
// Fetch holdings with filters
async function getHoldings(filters: HoldingsFilters): Promise<Holding[]> {
  const params = new URLSearchParams();
  if (filters.month) params.append('month', filters.month.toString());
  if (filters.year) params.append('year', filters.year.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.order) params.append('order', filters.order);

  const response = await fetch(`/v1/holdings?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
}

// Create a new holding (API returns an array from Drizzle `.returning()`)
async function createHolding(data: HoldingCreate): Promise<Holding> {
  const response = await fetch('/v1/holdings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  return result.data[0];
}

// Duplicate holdings to new month
async function duplicateHoldings(data: DuplicateHoldingPayload): Promise<DuplicateResult> {
  const response = await fetch('/v1/holdings/duplicate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  return result.data;
}
```

---

## Security Notes

- All endpoints require authentication
- Users can only access their own holdings
- Amounts are validated server-side (non-negative checks in the database)
- Optional `month` / `year` query parameters scope list and aggregate endpoints; omitting them includes all periods for the user
