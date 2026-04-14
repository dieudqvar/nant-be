# Nant-BE Client API Documentation (Updated)

This document is aligned with currently implemented NestJS controllers.

---

## 1. General

- Base URL (local): `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Auth header: `Authorization: Bearer <access_token>`

### Enums

| Enum | Values |
| :--- | :--- |
| Role | `ADMIN`, `WORKER`, `FAMILY` |
| JobType | `BABYSITTING`, `NANNY`, `MAID` |
| VerificationStatus | `PENDING`, `APPROVED`, `REJECTED` |
| WorkerDocumentType | `ID_CARD_LEVEL_2`, `HEALTH_CERT`, `ENGLISH_CERT`, `CPR_CERT`, `REFERENCE_LETTER`, `INTRO_VIDEO`, `PROFILE_PHOTO`, `OTHER` |
| JobPostingStatus | `OPEN`, `CLOSED`, `FILLED` |
| ApplicationStatus | `PENDING`, `REVIEWED`, `ACCEPTED`, `REJECTED` |
| BookingStatus | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |

---

## 2. Authentication

### `POST /auth/register`
Register account.

Body:
```json
{
  "email": "family@example.com",
  "password": "StrongPassword123!",
  "name": "Family Name",
  "phone": "0901234567",
  "role": "FAMILY"
}
```

### `POST /auth/login`
Login and receive token.

Body:
```json
{
  "email": "family@example.com",
  "password": "StrongPassword123!"
}
```

### `POST /auth/google/callback` (Recommended)
Google login endpoint for FE. FE obtains `idToken` from Google SDK, then sends it to backend for verification.

Body:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
  "role": "WORKER"
}
```

Notes:
- `idToken`: required
- `role`: optional, only used on first login when user does not exist yet
- supported values: `WORKER`, `FAMILY` (if omitted, backend defaults to `WORKER`)

Success response (`200`):
```json
{
  "access_token": "<jwt_token>",
  "user": {
    "id": 12,
    "email": "worker@example.com",
    "name": "Worker A",
    "role": "WORKER"
  }
}
```

Common error responses:
- `401 Invalid Google token`
- `401 Google email is not verified`
- `401 Google token audience mismatch`
- `401 Google token does not contain email`

### `GET /auth/google/callback` (Legacy - Deprecated)
Legacy query mode for backward compatibility only. New FE integrations should use `POST /auth/google/callback`.

Query example:
`/auth/google/callback?idToken=<google_id_token>&role=WORKER`

### `GET /auth/me` (Auth)
Get current user from token (includes worker profile photo URL if worker profile exists).

Success response (`200`) example:
```json
{
  "id": 12,
  "email": "worker@example.com",
  "name": "Worker A",
  "phone": "0901234567",
  "role": "WORKER",
  "createdAt": "2026-04-13T09:00:00.000Z",
  "updatedAt": "2026-04-13T09:00:00.000Z",
  "worker": {
    "id": 21,
    "userId": 12,
    "employeeCode": "WK-2026-0001",
    "bio": "Patient and energetic nanny with infant care experience.",
    "jobTypes": ["BABYSITTING", "NANNY"],
    "languages": ["Vietnamese", "English"],
    "services": ["Feeding", "Diapering"],
    "hourlyRate": 120000,
    "dailyRate": 900000,
    "travelRate": 100000,
    "nonSmoker": true,
    "hasReliableTransportation": true,
    "availability": ["Monday", "Tuesday"],
    "certifications": ["CPR", "First Aid"],
    "isApproved": false,
    "verificationStatus": "PENDING",
    "profilePhotoUrl": "https://nanny-asset.sgp1.cdn.digitaloceanspaces.com/workers/profile/1712999999999-avatar.jpg",
    "documents": [
      {
        "id": 77,
        "fileUrl": "https://nanny-asset.sgp1.cdn.digitaloceanspaces.com/workers/profile/1712999999999-avatar.jpg",
        "createdAt": "2026-04-13T09:10:00.000Z"
      }
    ]
  }
}
```

Notes:
- `password` is never returned.
- `worker` can be `null` when user has not created worker profile.
- `worker.profilePhotoUrl` is derived from latest `PROFILE_PHOTO` document.

### `POST /auth/forgot-password`
Request a password reset link. An email with a reset link will be sent if the address is registered.

Body:
```json
{
  "email": "user@example.com"
}
```

Success response (`200`):
```json
{
  "message": "If that email exists, a reset link has been sent."
}
```

Notes:
- Always returns `200` regardless of whether the email exists (prevents email enumeration).
- Reset link format: `{APP_URL}/reset-password?token=<jwt_token>`
- Token expires in **15 minutes**.

---

### `POST /auth/reset-password`
Set a new password using the token received via email.

Body:
```json
{
  "token": "<token_from_email_link>",
  "newPassword": "NewPass@123"
}
```

Success response (`200`):
```json
{
  "message": "Password has been reset successfully."
}
```

Error responses:
- `400 Invalid token` — token is malformed or missing
- `400 Reset link is invalid or has expired` — token expired (>15 min) or already used
- `404 User not found`

Notes:
- `newPassword` minimum length: **6 characters**.
- After a successful reset the token is **immediately invalid** — cannot be reused.
- If the user requests multiple reset links only the **latest** link is valid; earlier tokens are invalidated automatically.

---

### FE integration flow (Google)
1. FE logs user in with Google and gets `idToken`.
2. FE calls `POST /auth/google/callback` with JSON body.
3. FE stores `access_token` from response.
4. FE includes `Authorization: Bearer <access_token>` for protected APIs.

### FE integration flow (Forgot password)
1. User submits email on "Forgot password" screen → FE calls `POST /auth/forgot-password`.
2. User opens email, clicks link → FE extracts `token` from query string.
3. User submits new password → FE calls `POST /auth/reset-password` with `{ token, newPassword }`.
4. On success, redirect user to login.

---


## 3. Uploads

### `POST /uploads/presign` (Auth)
Generate a temporary signed URL so FE can upload files directly to DigitalOcean Spaces.

Headers:
- `Authorization: Bearer <access_token>`

Body:
```json
{
  "filename": "avatar.jpg",
  "contentType": "image/jpeg",
  "folder": "workers/profile"
}
```

Response `201`:
```json
{
  "uploadUrl": "https://nanny-asset.sgp1.digitaloceanspaces.com/...",
  "fileUrl": "https://nanny-asset.sgp1.cdn.digitaloceanspaces.com/workers/profile/1712999999999-uuid-avatar.jpg",
  "key": "workers/profile/1712999999999-uuid-avatar.jpg",
  "expiresIn": 3600
}
```

FE flow:
1. Call `POST /uploads/presign`.
2. Upload directly to `uploadUrl` with HTTP `PUT` and matching `Content-Type`.
3. Save `fileUrl` to worker profile/document APIs.

---

## 4. Users / Workers

### `GET /users/:id` (Auth)
Get user detail (includes worker/family relation if available).

### `GET /users/workers/list`
Get approved workers (paginated).

Query:
- `page` (default `1`)
- `limit` (default `10`)

### `GET /users/workers/profile` (Auth)
Get current logged-in user's worker profile.

Required headers:
- `Authorization: Bearer <access_token>`

Success response (`200`):
- Full worker profile with nested:
  - `user` (no password)
  - `documents`
  - `references`
  - `trainingAttempts`
  - `reviews` (includes `family.user`, `booking`)
  - `interviews` (includes `family.user`)
  - `bookings` (includes `family.user`, `payment.breakdown`, `review`, `contract.acceptances`, `shiftReport`)
  - `contracts` (includes `family.user`, `booking`, `acceptances`)
  - `jobApplications` (includes `jobPosting.family.user`)

Common errors:
- `401` Missing/invalid token
- `404` Worker profile not found

### `POST /users/workers/profile` (Auth)
Create worker profile for current logged-in user.

Purpose:
- Save worker profile information (text/structured data).
- For files (avatar, ID, certificates, intro video), FE uploads file to storage first and then calls document API with `fileUrl`.

Required headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body fields:

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `jobTypes` | `JobType[]` | Yes | Allowed: `BABYSITTING`, `NANNY`, `MAID` |
| `languages` | `string[]` | Yes | Example: `["Vietnamese", "English"]` |
| `services` | `string[]` | Yes | Example: `["Feeding", "Light cleaning"]` |
| `hourlyRate` | `number` | Yes | VND/hour |
| `dailyRate` | `number` | Yes | VND/day |
| `employeeCode` | `string` | No | Internal worker code |
| `bio` | `string` | No | Short self-introduction |
| `travelRate` | `number` | No | VND for travel/transport |
| `nonSmoker` | `boolean` | No | Default backend value if omitted |
| `hasReliableTransportation` | `boolean` | No | Has own/reliable transport |
| `availability` | `string[]` | No | Example weekdays/shifts |
| `certifications` | `string[]` | No | Example: `CPR`, `First Aid` |
| `experience` | `string` | No | Human-readable experience summary |

Body example (full):
```json
{
  "employeeCode": "WK-2026-0001",
  "bio": "Patient and energetic nanny with infant care experience.",
  "jobTypes": ["BABYSITTING", "NANNY"],
  "languages": ["Vietnamese", "English"],
  "services": ["Feeding", "Diapering", "Light housework"],
  "hourlyRate": 120000,
  "dailyRate": 900000,
  "travelRate": 100000,
  "nonSmoker": true,
  "hasReliableTransportation": true,
  "availability": ["Monday", "Tuesday", "Wednesday"],
  "certifications": ["CPR", "First Aid"],
  "experience": "3 years caring for infants and toddlers"
}
```

Success response (`201`) example:
```json
{
  "id": 21,
  "userId": 12,
  "employeeCode": "WK-2026-0001",
  "bio": "Patient and energetic nanny with infant care experience.",
  "jobTypes": ["BABYSITTING", "NANNY"],
  "languages": ["Vietnamese", "English"],
  "services": ["Feeding", "Diapering", "Light housework"],
  "hourlyRate": 120000,
  "dailyRate": 900000,
  "travelRate": 100000,
  "nonSmoker": true,
  "hasReliableTransportation": true,
  "availability": ["Monday", "Tuesday", "Wednesday"],
  "certifications": ["CPR", "First Aid"],
  "experience": "3 years caring for infants and toddlers",
  "isApproved": false,
  "verificationStatus": "PENDING",
  "user": {
    "id": 12,
    "email": "worker@example.com",
    "name": "Nguyen Linh",
    "phone": "0901234567",
    "role": "WORKER"
  }
}
```

Common errors:
- `400` Validation failed (missing required fields, wrong enum/type)
- `400` Worker profile already exists for this user
- `401` Missing/invalid token

### `POST /users/workers/:id/documents` (Auth)
Create worker document metadata.

Use cases:
- Upload profile photo metadata (`type = PROFILE_PHOTO`)
- Upload compliance docs (`ID_CARD_LEVEL_2`, `HEALTH_CERT`, etc.)

Flow:
1. FE uploads file to S3/Cloudinary/Firebase/etc.
2. FE gets public or signed URL.
3. FE calls this API with `fileUrl`.

Body:
```json
{
  "type": "PROFILE_PHOTO",
  "title": "Worker profile photo",
  "fileUrl": "https://storage.example.com/workers/21/profile.jpg",
  "issuedAt": "2026-01-01T00:00:00Z",
  "expiresAt": "2036-01-01T00:00:00Z",
  "notes": "Optional note"
}
```

Field notes:
- `type` (required): enum `WorkerDocumentType`
- `title` (required): human-readable title for FE/Admin
- `fileUrl` (required): URL returned from your storage upload flow
- `issuedAt` (optional): ISO datetime
- `expiresAt` (optional): ISO datetime
- `notes` (optional): additional metadata

Success response (`201`) example:
```json
{
  "id": 77,
  "workerId": 21,
  "type": "PROFILE_PHOTO",
  "title": "Worker profile photo",
  "fileUrl": "https://storage.example.com/workers/21/profile.jpg",
  "issuedAt": null,
  "expiresAt": null,
  "notes": "Optional note",
  "createdAt": "2026-04-13T07:05:00.000Z"
}
```

Common errors:
- `400` Invalid payload/date format/worker id
- `401` Missing or invalid token
- `403` No permission

### `GET /users/workers/:id/documents` (Auth)
Get worker documents.

### `DELETE /users/workers/:workerId/documents/:docId` (Auth)
Delete one worker document.

Path params:
- `workerId` (number): worker id
- `docId` (number): document id

Success response:
- `200` with empty body

Common errors:
- `401` Missing or invalid token
- `404` Worker document not found

### `POST /users/workers/:id/training-attempts` (Auth)
Submit training score.

Body:
```json
{
  "courseName": "Basic Safety",
  "score": 95
}
```

### `POST /users/workers/:id/interviews` (Auth)
Create interview session.

Body:
```json
{
  "familyId": 1,
  "scheduledAt": "2026-05-20T09:00:00Z",
  "notes": "2:1 interview"
}
```

### Admin-only worker endpoints
- `GET /users` (Auth + `ADMIN`)
- `GET /users/workers/pending` (Auth + `ADMIN`)
- `POST /users/workers/:id/approve` (Auth + `ADMIN`)
- `POST /users/workers/:id/reject` (Auth + `ADMIN`)

---

## 4. Families / Job Postings

### `GET /families`
List families (paginated).

### `GET /families/:id`
Get family detail.

### `POST /families` (Auth)
Create family profile manually.

Body:
```json
{
  "userId": 1,
  "passportNumber": "B1234567",
  "currentAddress": "123 Street, District 1",
  "numChildren": 2,
  "childrenAges": "2 years, 5 years"
}
```

### `GET /families/job-postings`
List job postings (paginated).

Query:
- `page` (default `1`)
- `limit` (default `10`)
- `status` (`OPEN` | `CLOSED` | `FILLED`)

### `GET /families/job-postings/:id`
Get job posting detail.

Response: full `JobPosting` with nested `family` and `applications`.

Example response:
```json
{
  "id": 12,
  "familyId": 3,
  "title": "Need Nanny for Toddler",
  "description": "Full-day care",
  "jobType": "BABYSITTING",
  "location": "Ho Chi Minh City",
  "hourlyRateMin": 80000,
  "hourlyRateMax": 120000,
  "status": "OPEN",
  "family": {
    "id": 3,
    "user": {
      "name": "Family A",
      "email": "family@example.com",
      "phone": "0901234567"
    }
  },
  "applications": [
    {
      "id": 101,
      "workerId": 20,
      "status": "PENDING",
      "worker": {
        "id": 20,
        "user": {
          "name": "Worker A",
          "email": "worker@example.com"
        }
      }
    }
  ]
}
```

### `POST /families/job-postings` (Auth + `FAMILY`)
Create job posting. Backend takes family ownership from JWT user.

Notes:
- `familyId` is not required in body.
- If family profile does not exist, backend auto-creates it by JWT user.

Body (minimal):
```json
{
  "title": "Need Nanny for Toddler",
  "description": "Looking for someone energetic",
  "jobType": "BABYSITTING",
  "location": "Ho Chi Minh City"
}
```

Body (with optional fields):
```json
{
  "title": "Need Nanny for Toddler",
  "description": "Looking for someone energetic",
  "jobType": "BABYSITTING",
  "location": "Ho Chi Minh City",
  "numChildren": 1,
  "childrenAges": "2 years",
  "hourlyRateMin": 80000,
  "hourlyRateMax": 120000,
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T00:00:00Z",
  "startTime": "08:00",
  "endTime": "17:00",
  "requirements": "Non-smoker, CPR preferred",
  "familyProfile": {
    "passportNumber": "B1234567",
    "currentAddress": "123 Street, District 1",
    "numChildren": 1,
    "childrenAges": "2 years",
    "allergies": "Peanut allergy",
    "specialInstructions": "No TV after 8PM",
    "specialRequirements": "Need basic English communication"
  }
}
```

### `POST /families/job-postings/:id/close` (Auth)
Set job posting status to `CLOSED`.

### `GET /families/job-postings/:id/recommended-workers`
Get suggested workers for a specific job posting.

Query:
- `limit` (default `10`, min `1`, max `50`)
- `includeApplied` (`true`/`false`, default `false`)
- `minScore` (default `0`, min `0`, max `120`)

Example:
`GET /families/job-postings/12/recommended-workers?limit=8&includeApplied=false&minScore=40`

Example response:
```json
{
  "jobPostingId": 12,
  "totalCandidates": 2,
  "includeApplied": false,
  "minScore": 40,
  "data": [
    {
      "workerId": 20,
      "userId": 15,
      "name": "Worker A",
      "email": "worker.a@example.com",
      "phone": "0901234567",
      "jobTypes": ["BABYSITTING"],
      "rating": 4.8,
      "reviewCount": 12,
      "hourlyRate": 100000,
      "dailyRate": 850000,
      "nonSmoker": true,
      "hasReliableTransportation": true,
      "trainingPassed": true,
      "score": 87,
      "scoreBreakdown": {
        "jobType": 40,
        "rate": 20,
        "trust": 20,
        "training": 10,
        "rating": 14,
        "requirements": 5
      }
    }
  ]
}
```

---

## 5. Applications

### `POST /applications` (Auth)
Worker applies for a job posting.

Body:
```json
{
  "jobPostingId": 1,
  "workerId": 5,
  "coverLetter": "I am interested because..."
}
```

### `GET /applications/job-posting/:id` (Auth + `ADMIN` | `FAMILY`)
Get all applications for a job posting, including full worker profile info.

Response includes per application:
- `coverLetter`, `status`, `createdAt`
- `worker`: all profile fields (`bio`, `experience`, `jobTypes`, `languages`, `services`, `hourlyRate`, `dailyRate`, `rating`, `reviewCount`, `profilePhotoUrl`, `availability`, `certifications`, `nonSmoker`, `hasReliableTransportation`, ...)
  - `user`: `id`, `name`, `email`, `phone`
  - `documents`: list of `WorkerDocument` (fileUrl, type, verificationStatus, ...)
  - `references`: list of `WorkerReference` (name, relation, phone, notes, ...)
  - `reviews`: list of reviews with `rating`, `comment`, and family name who wrote it

### `GET /applications/worker/:id` (Auth)
Get all applications by worker.

### `GET /applications/:id` (Auth)
Get one application detail.

### `PATCH /applications/:id/status` (Auth + `ADMIN`)
Update application status.

Body:
```json
{
  "status": "ACCEPTED"
}
```

---

## 6. Bookings

### `GET /bookings`
Get bookings list (paginated).

### `GET /bookings/:id`
Get booking detail.

### `POST /bookings` (Auth)
Create booking.

Body:
```json
{
  "familyId": 1,
  "workerId": 5,
  "date": "2026-05-20T00:00:00Z",
  "startTime": "08:00",
  "endTime": "17:00",
  "duration": 9,
  "service": "BABYSITTING",
  "rate": 100000,
  "notes": "Please come 10 minutes early"
}
```

### `POST /bookings/:id/confirm` (Auth)
Confirm booking.

### `POST /bookings/:id/cancel` (Auth)
Cancel booking.

### `POST /bookings/:id/shift-report` (Auth)
Create or update shift report.

Body:
```json
{
  "activities": "Played games, fed lunch",
  "incidents": "None",
  "handoverNotes": "Baby slept at 11 AM"
}
```

---

## 7. Pagination / Errors

Paginated response shape:
```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "lastPage": 10
  }
}
```

Validation error shape:
```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

---

## 8. Not Available Yet (Do Not Call)

These are not exposed in controller routes yet:

- `GET /families/job-postings/:id/matching-candidates`

If FE needs suggestion nanny now, use `GET /users/workers/list` as temporary source.

