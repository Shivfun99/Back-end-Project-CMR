# Mini Lead CRM Backend

A production-style Lead Management CRM backend built with Node.js, Express, TypeScript, Prisma, and SQLite.

## Features
- **Full CRUD for Leads**: Manage leads with fields like name, email, phone, status, and source.
- **Robust Status Transitions**: Managed through a state machine with strict transition rules.
- **Bulk Operations**: High-performance bulk creation and updates with partial success support.
- **Dual-Layer Caching**: In-memory cache with optional Redis support for high-performance lead retrieval.
- **Centralized Error Handling**: Standardized error responses and validation using Zod.
- **Clean Architecture**: Modular structure for scalability and maintainability.

## Tech Stack
- **Node.js & Express**: Core framework for building RESTful APIs.
- **TypeScript**: Static typing for better developer experience and reliability.
- **Prisma**: Type-safe ORM for database interactions.
- **SQLite**: Lightweight, file-based database (perfect for local development and assessment).
- **Zod**: Schema declaration and validation.
- **Redis (Optional)**: In-memory data structure store for caching.

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation
1. Clone the repository and navigate to the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the database:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Seed the database with sample data:
   ```bash
   npm run seed
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

### Leads CRUD
- **POST /leads**
  - **Description**: Create a new lead.
  - **Request**:
    ```json
    { "name": "John Doe", "email": "john@example.com", "phone": "1234567890", "source": "Web" }
    ```
  - **Response (201)**: `{ "id": "uuid", "name": "John Doe", ... }`

- **GET /leads**
  - **Description**: List all leads with filtering, search, and pagination.
  - **Query Params**: `status=NEW`, `search=john`, `sortBy=created_at`, `order=desc`, `page=1`, `limit=10`
  - **Response (200)**: `{ "total": 1, "page": 1, "limit": 10, "data": [...] }`

- **GET /leads/:id**
  - **Description**: Get a single lead (responses are cached).
  - **Response (200)**: `{ "id": "uuid", "name": "John Doe", ... }`

- **PUT /leads/:id**
  - **Description**: Update lead fields (status update NOT allowed here).
  - **Request**: `{ "name": "John Updated" }`
  - **Response (200)**: `{ ... updated lead ... }`

- **DELETE /leads/:id**
  - **Description**: Delete a lead and invalidate its cache.
  - **Response (204)**: No Content

### Status Management
- **PATCH /leads/:id/status**
  - **Description**: Transition lead status following state machine rules.
  - **Request**: `{ "status": "CONTACTED" }`
  - **Response (200)**: `{ ... updated lead ... }`
  - **Response (400)**: `{ "error": "Invalid status transition from NEW to CONVERTED" }`

**Transition Rules:**
- `NEW` -> `CONTACTED` -> `QUALIFIED` -> `CONVERTED`
- `LOST` can be reached from `NEW`, `CONTACTED`, or `QUALIFIED`.
- `CONVERTED` and `LOST` are terminal states.

### Bulk Operations
- **POST /leads/bulk**
  - **Description**: Create multiple leads. Validates each independently.
  - **Request**: `[{ "name": "L1", "email": "l1@ex.com" }, { "name": "L2", "email": "invalid-email" }]`
  - **Response (200)**:
    ```json
    {
      "total": 2, "successful": 1, "failed": 1,
      "results": [
        { "index": 0, "success": true, "lead": {...} },
        { "index": 1, "success": false, "error": "Invalid email format" }
      ]
    }
    ```

- **PUT /leads/bulk**
  - **Description**: Update multiple leads. (Status update not allowed).
  - **Request**: `[{ "id": "uuid1", "name": "New Name" }, { "id": "uuid2", "phone": "999" }]`
  - **Response (200)**: Partial success format as above.

## Design Decisions

### Status Transitions
Status transitions are restricted to a dedicated `PATCH` endpoint to ensure the state machine logic is centralized and never bypassed during regular updates. This prevents accidental status jumps and ensures data integrity.

### Handling Concurrency at Scale
In a high-concurrency production environment, I would:
1. **Database Transactions**: Wrap status transitions in a transaction.
2. **Optimistic Locking**: Add a `version` field to the Lead model. Each update would check if the version matches, preventing lost updates.
3. **Pessimistic Locking**: Use `SELECT ... FOR UPDATE` (if using PostgreSQL/MySQL) to lock the row during the transition process.

### Caching Strategy
The system uses a `CacheService` that abstracts the caching logic.
- It first attempts to use Redis if `REDIS_URL` is provided in `.env`.
- If Redis is unavailable or not configured, it falls back to a simple in-memory `Map`-based cache.
- Cache is invalidated on any `PUT`, `DELETE`, or `PATCH /status` operation for a specific lead.

### Production Readiness
For a true production environment:
- Replace SQLite with PostgreSQL for better concurrency and scaling.
- Implement Authentication (JWT/OAuth2).
- Add Request Logging (Winston/Pino) and Monitoring.
- Set up CI/CD pipelines and Dockerization.
- Add Unit and Integration tests.
