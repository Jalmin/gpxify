# API Endpoint: [METHOD] /api/[path]

---

## Overview

| Attribut | Valeur |
|----------|--------|
| **Method** | GET / POST / PUT / PATCH / DELETE |
| **Path** | `/api/v1/[resource]` |
| **Auth Required** | Yes / No |
| **Rate Limit** | X requests/minute |

---

## Description

[Description détaillée de ce que fait cet endpoint]

### Use Cases
- [Use case 1]
- [Use case 2]

---

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` ou `multipart/form-data` |
| `Authorization` | No | `Bearer <token>` |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | [Description] |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page |

### Request Body

```json
{
  "field1": "string",
  "field2": 123,
  "field3": {
    "nested": "value"
  }
}
```

#### Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `field1` | string | Yes | max 255 chars | [Description] |
| `field2` | integer | No | 1-100 | [Description] |
| `field3` | object | No | - | [Description] |

---

## Response

### Success (200 OK)

```json
{
  "data": {
    "id": "abc123",
    "field1": "value",
    "created_at": "2026-01-26T12:00:00Z"
  },
  "meta": {
    "processing_time_ms": 42
  }
}
```

### Success (201 Created)

```json
{
  "data": {
    "id": "new-id-123",
    "url": "https://example.com/resource/new-id-123"
  }
}
```

### Success (204 No Content)

[Aucun body retourné]

---

## Errors

### 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field1": "Field is required"
    }
  }
}
```

### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 429 Too Many Requests

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retry_after": 60
    }
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Examples

### cURL

```bash
curl -X POST https://api.gpxify.com/api/v1/resource \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  -d '{
    "field1": "value",
    "field2": 42
  }'
```

### JavaScript (Axios)

```javascript
const response = await axios.post('/api/v1/resource', {
  field1: 'value',
  field2: 42
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

console.log(response.data);
```

### Python (requests)

```python
import requests

response = requests.post(
    'https://api.gpxify.com/api/v1/resource',
    json={
        'field1': 'value',
        'field2': 42
    },
    headers={
        'Authorization': f'Bearer {token}'
    }
)

print(response.json())
```

---

## Implementation Notes

### Backend (FastAPI)

```python
@router.post(
    "/resource",
    response_model=ResourceResponse,
    status_code=201,
    summary="Create a new resource",
    responses={
        400: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    }
)
async def create_resource(
    request: ResourceCreateRequest,
    service: ResourceService = Depends()
) -> ResourceResponse:
    """Create a new resource."""
    return await service.create(request)
```

### Pydantic Schema

```python
class ResourceCreateRequest(BaseModel):
    field1: str = Field(..., max_length=255)
    field2: int = Field(default=None, ge=1, le=100)

class ResourceResponse(BaseModel):
    id: str
    field1: str
    created_at: datetime
```

---

## Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial version |
| YYYY-MM-DD | Added field2 parameter |
