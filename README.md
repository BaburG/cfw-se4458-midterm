
# CFW SE4458 Midterm Project

### Overview

This project is a rental service API for managing **listings**, **bookings**, and **ratings**. It includes functionality for hosts to list properties, guests to book and rate them, and admins to analyze listings based on ratings.

---

### Development

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Generate database migrations**

   ```bash
   bun run db:generate
   ```

3. **Create the D1 Database**

   ```bash
   bunx wrangler d1 create cfw-bun-hono-drizzle-d1
   ```

4. **Add D1 database credentials to `wrangler.toml`**

5. **Run the local SQLite database**

   ```bash
   bun run db:up
   ```

6. **Apply migrations to the local database**

   ```bash
   bunx wrangler d1 execute cfw-bun-hono-drizzle-d1 --local --file=./drizzle/migrations/<migration file name>
   ```

7. **Start the development server**

   ```bash
   bun run dev
   ```

---

### Production

1. **Apply migrations to the D1 database on Cloudflare**

   ```bash
   bunx wrangler d1 execute cfw-bun-hono-drizzle-d1 --remote --file=./drizzle/migrations/<migration file name>
   ```

2. **Deploy the application**

   ```bash
   bun run deploy
   ```

---

### Routes

| **Route**                       | **Description**                                                                                 |
|----------------------------------|---------------------------------------------------------------------------------------------|
| `GET /v1/all`                      | Retrieve all listings.                                                                      |
| `POST /v1/auth`                    | Authenticate a user and return a JWT.                                                      |
| `POST /v1/host/insert-listing`     | Add a new listing (requires authentication as `host`).                                      |
| `GET /v1/guest/query-listings`     | Search for available listings based on filters like city, country, number of guests, and dates. |
| `POST /v1/guest/book`              | Book a listing (requires authentication as `guest`).                                        |
| `POST /v1/guest/rate`              | Rate a booking with a score between 1-5 (requires authentication as `guest`).               |
| `GET /v1/admin/listing-by-rating`  | Fetch listings with an average rating above a certain threshold (requires authentication as `admin`). |

---

### Documentation

- **Swagger Docs**: [https://cfw-se4458-midterm.babur-g.workers.dev/docs](https://cfw-se4458-midterm.babur-g.workers.dev/docs)
- **YouTube Presentation & Explanation**: [YouTube Link](#) *(replace `#` with your link)*
- **ER Diagram**: [ER Diagram Link](#) *(replace `#` with your link)*

---

### Features

- **JWT Authentication**: Users are authenticated via JSON Web Tokens.
- **Role-Based Access Control**: Hosts, guests, and admins have distinct capabilities.
- **Pagination**: Routes like `/guest/query-listings` and `/admin/listing-by-rating` support pagination.

For more details, refer to the Swagger documentation or the linked YouTube presentation.
