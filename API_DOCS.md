# Backend API Documentation

## Authentication Endpoints

### POST /auth/register

Register new user

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@example.com",
    "password": "password123",
    "name": "Linh Nanny",
    "phone": "+84 98 765 4321",
    "role": "WORKER"
  }'
```

### POST /auth/login

Login user

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@example.com",
    "password": "password123"
  }'
```

### GET /auth/me

Get current user (requires JWT). If user has worker profile, response includes worker data and `worker.profilePhotoUrl` from latest `PROFILE_PHOTO` document.

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Example response:

```json
{
  "id": 12,
  "email": "worker@example.com",
  "name": "Worker A",
  "role": "WORKER",
  "worker": {
    "id": 21,
    "userId": 12,
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

---

## Workers Endpoints

### GET /workers

Get all approved workers

```bash
curl http://localhost:3000/workers
```

### GET /workers/:id

Get worker by ID

```bash
curl http://localhost:3000/workers/1
```

### POST /users/workers/profile

Create worker profile for current logged-in user (requires JWT).

Required fields: `jobTypes`, `languages`, `services`, `hourlyRate`, `dailyRate`.

```bash
curl -X POST http://localhost:3000/users/workers/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "employeeCode": "WK-2026-0001",
    "bio": "Patient and energetic nanny.",
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
    "experience": "3 years infant care"
  }'
```

### GET /users/workers/profile

Get current worker profile for logged-in user (requires JWT).

Response includes full worker information: `user`, `documents`, `references`, `trainingAttempts`, `reviews`, `interviews`, `bookings`, `contracts`, and `jobApplications`.

```bash
curl -X GET http://localhost:3000/users/workers/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### GET /workers/pending

Get pending worker approvals (requires JWT)

```bash
curl -X GET http://localhost:3000/workers/pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /workers/:id/approve

Approve worker (requires JWT)

```bash
curl -X POST http://localhost:3000/workers/1/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /workers/:id/reject

Reject worker (requires JWT)

```bash
curl -X POST http://localhost:3000/workers/1/reject \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /users/workers/:id/documents

Attach compliance document to worker profile (requires JWT)

```bash
curl -X POST http://localhost:3000/users/workers/1/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "PROFILE_PHOTO",
    "title": "Worker profile photo",
    "fileUrl": "https://cdn.example.com/workers/1/profile.jpg",
    "notes": "Uploaded from FE onboarding"
  }'
```

Use `type = PROFILE_PHOTO` for profile photo metadata.
For compliance documents, use types such as `ID_CARD_LEVEL_2`, `HEALTH_CERT`, `REFERENCE_LETTER`, etc.

### DELETE /users/workers/:workerId/documents/:docId

Delete one worker document (requires JWT).

```bash
curl -X DELETE http://localhost:3000/users/workers/1/documents/77 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Returns:
- `200` success (empty body)
- `404` if document not found for that worker

### POST /workers/:id/training-attempts

Submit training score (requires JWT)

```bash
curl -X POST http://localhost:3000/workers/1/training-attempts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "courseName": "Basic Infant Care 101",
    "score": 85
  }'
```

### POST /workers/:id/interviews

Schedule 2:1 interview (requires JWT)

```bash
curl -X POST http://localhost:3000/workers/1/interviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "familyId": 2,
    "scheduledAt": "2026-04-20T09:00:00.000Z",
    "notes": "Discuss allergy handling and routine"
  }'
```

---

## Families Endpoints

### GET /families

Get all families

```bash
curl http://localhost:3000/families
```

### GET /families/:id

Get family by ID

```bash
curl http://localhost:3000/families/1
```

### POST /families

Create family profile (requires JWT)

```bash
curl -X POST http://localhost:3000/families \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": 2,
    "numChildren": 2,
    "childrenAges": "3 years, 6 years",
    "specialRequirements": "Allergy to peanuts"
  }'
```

---

## Bookings Endpoints

### GET /bookings

Get all bookings

```bash
curl http://localhost:3000/bookings
```

### GET /bookings/:id

Get booking by ID

```bash
curl http://localhost:3000/bookings/1
```

### POST /bookings

Create booking (requires JWT)

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "familyId": 1,
    "workerId": 1,
    "date": "2026-04-10T14:00:00Z",
    "startTime": "14:00",
    "endTime": "17:00",
    "duration": 3,
    "service": "Babysitting",
    "rate": 250000
  }'
```

### POST /bookings/:id/confirm

Confirm booking (requires JWT)

```bash
curl -X POST http://localhost:3000/bookings/1/confirm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /bookings/:id/cancel

Cancel booking (requires JWT)

```bash
curl -X POST http://localhost:3000/bookings/1/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /bookings/:id/shift-report

Create/update post-shift report (requires JWT)

```bash
curl -X POST http://localhost:3000/bookings/1/shift-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activities": "Fed baby, nap routine, story time",
    "incidents": "No major incidents",
    "handoverNotes": "Please monitor hydration tonight"
  }'
```

---

## Users Endpoints

### GET /users

Get all users (requires JWT)

```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### GET /users/:id

Get user by ID (requires JWT)

```bash
curl -X GET http://localhost:3000/users/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Test Flow

1. **Register Worker**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker1@test.com",
    "password": "password123",
    "name": "Linh Nanny",
    "role": "WORKER"
  }'
```

2. **Register Family**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "family1@test.com",
    "password": "password123",
    "name": "John Family",
    "role": "FAMILY"
  }'
```

3. **Login & Get Token**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker1@test.com",
    "password": "password123"
  }'
```

Copy the `access_token` from response

4. **Create Worker Profile**

```bash
curl -X POST http://localhost:3000/workers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COPIED_TOKEN" \
  -d '{
    "userId": 1,
    "languages": ["English B2"],
    "services": ["Babysitting"],
    "hourlyRate": 250000,
    "dailyRate": 3500000
  }'
```

---

## Response Examples

### Success Response

```json
{
  "id": 1,
  "email": "worker@example.com",
  "name": "Linh Nanny",
  "role": "WORKER",
  "createdAt": "2026-04-07T23:25:00Z"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "User already exists",
  "error": "Bad Request"
}
```

---

## Status Codes

- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## Running Backend

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate deploy

# Run server
npm run start:dev

# Server runs on http://localhost:3000
```

---

## Environment Variables

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/nanny_marketplace_db"
JWT_SECRET="your-super-secret-key-change-in-production"
NODE_ENV="development"
PORT=3000
```

## Default Admin Account

- App bootstrap auto-creates admin account if missing.
- Email: `admin@gmail.com`
- Password: `Admin@123`
