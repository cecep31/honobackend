# Reports API (super admin)

Aggregated analytics for dashboards: overview, users, posts, and engagement. **Super admin only.**

**Base URL:** `/api/reports`

---

## Authentication

Bearer token **and** super-admin role (same middleware as other admin routes).

```
Authorization: Bearer <admin_token>
```

---

## Shared query parameters

Several routes accept optional date filters (`src/modules/reports/validation/query.ts`):

| Param | Description |
|-------|-------------|
| `startDate` | ISO date string (optional) |
| `endDate` | ISO date string (optional) |
| `period` | `day` \| `week` \| `month` \| `year` — default **`month`** |

---

## Endpoints

### 1. Overview

- **URL:** `/overview`
- **Method:** `GET`
- **Query:** `startDate`, `endDate`, `period` (see above). Used for the **engagement** slice of the response.

**Response (200):** `data`: `{ overview, engagement }`, `message`: `"Overview report fetched successfully"`.

- `overview` — `ReportService.getOverviewStats()` (totals, new users/posts today, active users this week, etc.).
- `engagement` — `getEngagementMetrics` for the given date range.

---

### 2. User report

- **URL:** `/users`
- **Method:** `GET`
- **Query:** date range fields + `limit` (optional, default **10**, max **100**).

**Response (200):** `ReportService.getUserReport` payload; `message`: `"User report fetched successfully"`.

---

### 3. Post report

- **URL:** `/posts`
- **Method:** `GET`
- **Query:** date range + `limit` (optional, default **10**, max **100**) + optional `tagId` (number).

**Response (200):** `ReportService.getPostReport` payload; `message`: `"Post report fetched successfully"`.

---

### 4. Engagement metrics only

- **URL:** `/engagement`
- **Method:** `GET`
- **Query:** `startDate`, `endDate`, `period`.

**Response (200):** Engagement metrics object; `message`: `"Engagement metrics fetched successfully"`.

---

## Implementation

- **Controller:** `reportController.ts` — wires `ReportService` + `UserService` (for super-admin middleware).
- **Service:** `reportService.ts` — SQL aggregates over `users`, `posts`, `post_likes`, `post_comments`, `post_views`, tags, etc.

Errors follow the global API envelope. See `AGENTS.md`.
