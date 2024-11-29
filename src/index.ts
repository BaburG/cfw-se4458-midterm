import { drizzle } from "drizzle-orm/d1"
import { Hono } from 'hono'
import { bookings, listings, ratings } from './db/schema';
import { eq, lte, gte, and, not, or, isNull, sql } from 'drizzle-orm';
import { jwt, sign } from 'hono/jwt';
import openApiDocument from './openapi.json'; // Your OpenAPI JSON file


export type Env = {
  DB: D1Database;
};

const JWT_SECRET = "JWT-SECRET";

// Middleware for JWT
const authMiddleware = jwt({ secret: JWT_SECRET });

// Mock user database
const users = [
  { id: 1, username: "admin", password: "password123", role: "admin" },
  { id: 2, username: "host", password: "password123", role: "host" },
  { id: 3, username: "guest", password: "password123", role: "guest" },
];



const v1 = new Hono<{Bindings: Env}>()

v1.get('/all', async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(listings).all();
  return c.json(result);
})

v1.post('/auth', async (c) => {
  const { username, password } = await c.req.json();

  // Mock user validation
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return c.json({ error: "Invalid username or password" }, 401);
  }

  // Generate JWT
  const token = await sign({ id: user.id, role: user.role }, JWT_SECRET);

  return c.json({ message: "Authentication successful", token });
});

v1.post('/host/insert-listing', authMiddleware, async (c) => {
  try{
    console.log(await c.req.text());
    const { num_people, country, city, price } = await c.req.json();
    if (!num_people || !country || !city || !price) {
      return c.json({ error: "All fields are required" }, 400);
    }
    const parsedNumPeople = Number(num_people);
    const parsedPrice = Number(price);

    if (isNaN(parsedNumPeople) || isNaN(parsedPrice)) {
      return c.json({ error: "Invalid numeric values" }, 400);
    }

    const db = drizzle(c.env.DB);
    const result = await db.insert(listings).values({
      num_people: parsedNumPeople,
      country,
      city,
      price: parsedPrice,
    }).returning({ insertedID: listings.id });

    return c.json(result);

} catch (err) {
    console.error(err);
    return c.json({ 
      error: "Invalid request body",
      detail: err
     }, 400);
}
});

v1.get('/guest/query-listings', authMiddleware, async (c) => {
  try{
    console.log(await c.req.query());
    const { date_from, date_to, num_guest, country, city} = await c.req.query();
    

    if (!num_guest || !country || !city || !date_from || !date_to) {
      return c.json({ error: "All fields are required" }, 400);
    }
    const parsedNumGuest = Number(num_guest);
    if (isNaN(parsedNumGuest)) {
      return c.json({ error: "Invalid numeric values" }, 400);
    }

    const page = Number(c.req.query("page")) || 1; // Current page, default is 1
    const pageSize = Number(c.req.query("pageSize")) || 10; // Page size, default is 10
    const offset = (page - 1) * pageSize;

    const db = drizzle(c.env.DB);
    
    const availableBookings = await db
      .select({
        id: listings.id,
        num_people: listings.num_people,
        country: listings.country,
        city: listings.city,
        price: listings.price,
      })
      .from(listings)
      .leftJoin(bookings, eq(bookings.listingId, listings.id))
      .where(
        and(
          eq(listings.city, city),
          eq(listings.country, country),
          lte(parsedNumGuest, listings.num_people),
          or(
            isNull(bookings.id),
            not(and(
              lte(bookings.startDate, date_to),
              lte(date_from, bookings.endDate)))
          )
        )
      ).limit(pageSize).offset(offset);

    // Return the result
    return c.json(availableBookings);
  } catch (err) {
    console.error(err);
    return c.json({
      error: "Invalid request body",
      detail: err
    }, 400);
  }
});

v1.post("/guest/book", authMiddleware, async (c) => {
  try {
    // Parse and validate input
    const { date_from, date_to, names, listing_id } = await c.req.json();
    
    if (!date_from || !date_to || !names || !listing_id) {
      return c.json({ error: "All fields are required: date_from, date_to, names, listing_id" }, 400);
    }

    const parsedListingId = Number(listing_id);
    if (isNaN(parsedListingId)) {
      return c.json({ error: "Invalid listing_id" }, 400);
    }

    const db = drizzle(c.env.DB);

    // Check for conflicting bookings
    const conflictingBooking = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.listingId, parsedListingId),
          or(
            and(
              lte(bookings.startDate, date_to),
              gte(bookings.endDate, date_from)
            )
          )
        )
      )
      .limit(1);

    if (conflictingBooking.length > 0) {
      return c.json({ error: "The listing is not available for the selected dates" }, 400);
    }

    // Insert the new booking
    const newBooking = await db
      .insert(bookings)
      .values({
        listingId: parsedListingId,
        startDate: date_from,
        endDate: date_to,
      })
      .returning({
        id: bookings.id,
        listingId: bookings.listingId,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
      });

    // Return success response
    return c.json({
      message: "Booking created successfully",
      booking: newBooking[0], // Assuming Drizzle's `returning` provides the newly inserted booking
    });
  } catch (err) {
    console.error(err);
    return c.json({
      error: "Failed to create booking",
      detail: err,
    }, 500);
  }
});

v1.post("/guest/rate", authMiddleware, async (c) => {
  try {
    // Parse and validate input
    const { booking_id, rating, comment } = await c.req.json();

    if (!booking_id || !rating || typeof comment === "undefined") {
      return c.json({ error: "All fields are required: booking_id, rating, comment" }, 400);
    }

    const parsedBookingId = Number(booking_id);
    const parsedRating = Number(rating);

    if (isNaN(parsedBookingId) || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return c.json({ error: "Invalid booking_id or rating. Rating must be a number between 1 and 5." }, 400);
    }

    const db = drizzle(c.env.DB);

    // Check if the booking exists
    const existingBooking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, parsedBookingId))
      .limit(1);

    if (existingBooking.length === 0) {
      return c.json({ error: "Booking not found" }, 404);
    }

    // Insert the rating and comment
    const newRating = await db
      .insert(ratings)
      .values({
        listingId: existingBooking[0].listingId, // Reference the listing associated with the booking
        rating: parsedRating,
      })
      .returning({
        id: ratings.id,
        listingId: ratings.listingId,
        rating: ratings.rating,
      });

    // Return success response
    return c.json({
      message: "Rating submitted successfully",
      rating: newRating[0],
      comment,
    });
  } catch (err) {
    console.error(err);
    return c.json({
      error: "Failed to submit rating",
      detail: err,
    }, 500);
  }
});


v1.get("/admin/listing-by-rating", authMiddleware, async (c) => {
  try {
    // Parse and validate input
    const { country, city, threshold, page, pageSize } = await c.req.query();

    if (!country || !city || !threshold) {
      return c.json({ error: "All fields are required: country, city, and threshold" }, 400);
    }

    const parsedThreshold = Number(threshold);
    if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 5) {
      return c.json({ error: "Invalid threshold. It must be a number between 0 and 5." }, 400);
    }

    // Parse page and pageSize, or set defaults
    const parsedPage = page ? Number(page) : 1; // Default to page 1
    const parsedPageSize = pageSize ? Number(pageSize) : 10; // Default to 10 items per page

    if (isNaN(parsedPage) || parsedPage < 1) {
      return c.json({ error: "Invalid page. It must be a positive integer." }, 400);
    }

    if (isNaN(parsedPageSize) || parsedPageSize < 1) {
      return c.json({ error: "Invalid pageSize. It must be a positive integer." }, 400);
    }

    const offset = (parsedPage - 1) * parsedPageSize;

    const db = drizzle(c.env.DB);

    // Query to get listings with average rating above the threshold
    const listingsByRating = await db
      .select({
        id: listings.id,
        country: listings.country,
        city: listings.city,
        price: listings.price,
        averageRating: sql`AVG(${ratings.rating})`.as("average_rating"),
      })
      .from(listings)
      .innerJoin(ratings, eq(listings.id, ratings.listingId))
      .where(
        and(
          eq(listings.country, country),
          eq(listings.city, city)
        )
      )
      .groupBy(listings.id)
      .having(sql`AVG(${ratings.rating}) > ${parsedThreshold}`)
      .orderBy(sql`AVG(${ratings.rating}) DESC`)
      .limit(parsedPageSize)
      .offset(offset);

    // Return the result
    return c.json({
      message: "Listings fetched successfully",
      listings: listingsByRating,
      pagination: {
        page: parsedPage,
        pageSize: parsedPageSize,
      },
    });
  } catch (err) {
    console.error(err);
    return c.json({
      error: "Failed to fetch listings by rating",
      detail: err,
    }, 500);
  }
});

const app = new Hono();

app.route('/v1', v1);

// Static Swagger UI HTML Template
const swaggerHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Swagger UI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>
`;

// Route to serve the Swagger UI
app.get('/docs', (c) => {
  c.header('Content-Type', 'text/html');
  return c.body(swaggerHtml);
});

app.get('/openapi.json', async (c) => { return c.json(openApiDocument)});


export default app;