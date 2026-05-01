# Holding types API

Read-only catalog of holding categories (stock, crypto, etc.). Data is **global**, not per user.

**Base URL:** `/api/holding-types`

**Implementation:** `holdingTypeController` → `HoldingService.getHoldingTypes()` (shared with the [Holdings](../holdings/README.md) module).

---

## Authentication

All routes require a Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### List holding types

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Required

**Response (200):** `message`: `"Holding types fetched successfully"`. `data` is an array of `{ id, code, name, notes }`.

```bash
curl -X GET /api/holding-types \
  -H "Authorization: Bearer <your_token>"
```

See **Get Holding Types** in [Holdings README](../holdings/README.md) for a fuller example payload.
