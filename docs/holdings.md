# Holdings API Documentation

The Holdings API provides endpoints for managing investment holdings, tracking portfolio value, and analyzing investment trends.

**Base URL:** `/v1/holdings`

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
| month | number | No | Current month | Filter by month (1-12) |
| year | number | No | Current year | Filter by year |
| sortBy | string | No | created_at | Sort field: `created_at`, `updated_at`, `name`, `platform`, `invested_amount`, `current_value`, `holding_type` |
| order | string | No | desc | Sort order: `asc` or `desc` |

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
      "id": 1,
      "name": "Apple Inc.",
      "platform": "Robinhood",
      "holding_type": {
        "id": 1,
        "name": "Stock"
      },
      "currency": "USD",
      "invested_amount": 5000.00,
      "current_value": 5500.00,
      "units": 25,
      "avg_buy_price": 200.00,
      "current_price": 220.00,
      "month": 1,
      "year": 2026,
      "notes": "Long term holding",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-08T00:00:00Z"
    }
  ],
  "message": "Holdings fetched successfully"
}
```

---

### 2. Get Holdings Summary
Get a summary of holdings including total invested, current value, and performance metrics.

- **URL:** `/summary`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| month | number | No | Current month | Filter by month (1-12) |
| year | number | No | Current year | Filter by year |

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
    "total_invested": 25000.00,
    "total_current_value": 27500.00,
    "total_gain_loss": 2500.00,
    "total_gain_loss_percent": 10.0,
    "holdings_count": 10,
    "top_performer": {
      "name": "NVIDIA Corp",
      "gain_loss_percent": 25.5
    },
    "worst_performer": {
      "name": "Google",
      "gain_loss_percent": -2.3
    },
    "by_type": [
      {
        "holding_type": "Stock",
        "invested": 15000.00,
        "current_value": 16500.00,
        "gain_loss_percent": 10.0
      },
      {
        "holding_type": "Crypto",
        "invested": 5000.00,
        "current_value": 6000.00,
        "gain_loss_percent": 20.0
      }
    ]
  },
  "message": "Holdings summary fetched successfully"
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
| years | string | No | Last 5 years | Comma-separated list of years (e.g., "2024,2025,2026") |

**Example Request:**
```bash
curl -X GET "/v1/holdings/trends?years=2024,2025,2026" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "years": ["2024", "2025", "2026"],
    "monthly_totals": {
      "2024": {
        "1": { "invested": 20000, "current_value": 21000 },
        "2": { "invested": 20500, "current_value": 21800 },
        ...
      },
      "2025": { ... },
      "2026": { ... }
    },
    "yearly_performance": [
      { "year": 2024, "gain_loss_percent": 8.5 },
      { "year": 2025, "gain_loss_percent": 12.3 },
      { "year": 2026, "gain_loss_percent": 10.0 }
    ]
  },
  "message": "Holdings trends fetched successfully"
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
| fromMonth | number | No | Current month | Starting month (1-12) |
| fromYear | number | No | Current year | Starting year |
| toMonth | number | No | Current month | Ending month (1-12) |
| toYear | number | No | Current year | Ending year |

**Example Request:**
```bash
curl -X GET "/v1/holdings/compare?fromMonth=1&fromYear=2025&toMonth=12&toYear=2025" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "from": { "month": 1, "year": 2025 },
    "to": { "month": 12, "year": 2025 },
    "comparison": {
      "invested_change": 5000.00,
      "invested_change_percent": 25.0,
      "value_change": 7500.00,
      "value_change_percent": 30.0,
      "added_holdings": [
        { "name": "Tesla", "value": 1500.00 }
      ],
      "removed_holdings": [
        { "name": "Facebook", "value": 1000.00 }
      ],
      "top_gainers": [
        { "name": "NVIDIA", "change_percent": 35.0 }
      ],
      "top_losers": [
        { "name": "Google", "change_percent": -5.0 }
      ]
    }
  },
  "message": "Month comparison fetched successfully"
}
```

---

### 5. Get Holding Types
Retrieve all available holding types.

- **URL:** `/types`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/holdings/types \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Stock" },
    { "id": 2, "name": "ETF" },
    { "id": 3, "name": "Crypto" },
    { "id": 4, "name": "Bond" },
    { "id": 5, "name": "Mutual Fund" },
    { "id": 6, "name": "Real Estate" },
    { "id": 7, "name": "Commodity" }
  ],
  "message": "Holding types fetched successfully"
}
```

---

### 6. Get Single Holding
Retrieve a specific holding by ID.

- **URL:** `/:id`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/holdings/1 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Apple Inc.",
    "platform": "Robinhood",
    "holding_type": { "id": 1, "name": "Stock" },
    "currency": "USD",
    "invested_amount": 5000.00,
    "current_value": 5500.00,
    "units": 25,
    "avg_buy_price": 200.00,
    "current_price": 220.00,
    "last_updated": "2026-01-08T12:00:00Z",
    "notes": "Long term holding",
    "month": 1,
    "year": 2026,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-08T00:00:00Z"
  },
  "message": "Holding fetched successfully"
}
```

---

### 7. Create Holding
Create a new holding.

- **URL:** `/`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Apple Inc.",
  "platform": "Robinhood",
  "holding_type_id": 1,
  "currency": "USD",
  "invested_amount": 5000.00,
  "current_value": 5500.00,
  "units": 25,
  "avg_buy_price": 200.00,
  "current_price": 220.00,
  "notes": "Long term holding",
  "month": 1,
  "year": 2026
}
```

**Validation Rules:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| name | string | Yes | - |
| platform | string | Yes | - |
| holding_type_id | number | Yes | Valid holding type ID |
| currency | string | Yes | 3 character ISO code (e.g., USD) |
| invested_amount | number | Yes | - |
| current_value | number | Yes | - |
| units | number | No | - |
| avg_buy_price | number | No | - |
| current_price | number | No | - |
| notes | string | No | - |
| month | number | No | 1-12 |
| year | number | No | - |

**Example Request:**
```bash
curl -X POST /v1/holdings \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Apple Inc.", "platform": "Robinhood", "holding_type_id": 1, "currency": "USD", "invested_amount": 5000, "current_value": 5500}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    ...
  },
  "message": "Holding created successfully"
}
```

---

### 8. Duplicate Holdings
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

**Response (201):**
```json
{
  "success": true,
  "data": {
    "duplicated_count": 10,
    "holdings": [...]
  },
  "message": "Holdings duplicated successfully"
}
```

---

### 9. Update Holding
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

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    ...
  },
  "message": "Holding updated successfully"
}
```

---

### 10. Delete Holding
Delete a holding.

- **URL:** `/:id`
- **Method:** `DELETE`
- **Authentication:** Required

**Example Request:**
```bash
curl -X DELETE /v1/holdings/1 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Holding deleted successfully"
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Holding not found"
}
```

---

## Data Models

### Holding Object

| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique holding identifier |
| name | string | Name of the holding (e.g., stock symbol, crypto name) |
| platform | string | Trading platform (e.g., Robinhood, Binance) |
| holding_type | object | Type of holding (Stock, Crypto, ETF, etc.) |
| holding_type.id | number | Type ID |
| holding_type.name | string | Type name |
| currency | string | 3-character currency code |
| invested_amount | number | Total amount invested |
| current_value | number | Current market value |
| units | number | Number of units/shares |
| avg_buy_price | number | Average purchase price |
| current_price | number | Current market price |
| last_updated | string | Last price update timestamp |
| notes | string | User notes |
| month | number | Reporting month (1-12) |
| year | number | Reporting year |
| created_at | ISO 8601 | Creation timestamp |
| updated_at | ISO 8601 | Last update timestamp |

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

// Create a new holding
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
  return result.data;
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
- All monetary values are validated server-side
- Month/year filtering ensures data isolation
