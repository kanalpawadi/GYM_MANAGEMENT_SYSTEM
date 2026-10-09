# RV-Fitness Gym API Specification (`/api/v1/*`)

All API requests accept and return JSON format. Errors follow the standard format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description"
  }
}
```

---

## 1. Public Endpoints

### `POST /api/v1/leads`
Submits a lead inquiry form. Validates 10-digit Indian phone numbers and checks honeypot field.
- **Body**: `{ "name": "string", "phone": "string", "email"?: "string", "notes"?: "string", "website_honeypot"?: "string" }`
- **Response**: `{ "success": true, "message": "string", "data": {...} }`

### `POST /api/v1/trial-bookings`
Books a 1-day free gym trial pass.
- **Body**: `{ "name": "string", "phone": "string", "preferred_date": "YYYY-MM-DD", "preferred_slot": "string" }`
- **Response**: `{ "success": true, "message": "string", "data": {...} }`

### `GET /api/v1/plans`
Returns all active membership plans.

### `GET /api/v1/classes`
Returns weekly class timetable.

### `GET /api/v1/trainers`
Returns active certified trainers list.

---

## 2. Authenticated Member Endpoints

### `GET /api/v1/me` & `PATCH /api/v1/me`
Retrieves or updates member profile details, emergency contact, and health notes.

### `POST /api/v1/memberships/checkout`
Creates a Razorpay order for membership purchase/renewal.
- **Body**: `{ "plan_id": "string", "coupon_code"?: "string" }`
- **Response**: `{ "success": true, "order_id": "string", "amount": number, "key": "string" }`

### `POST /api/v1/payments/webhook`
Razorpay webhook endpoint. Verifies `x-razorpay-signature` header (HMAC SHA256) and idempotently activates membership, generating a GST Invoice number.

---

## 3. Cron & System Endpoints

### `POST /api/v1/cron/expiry-check`
Runs daily status update to mark expired memberships. Protected by `x-cron-secret` header.
