import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';

export const listings = sqliteTable('listings',{
    id: integer('id', {mode: 'number'}).primaryKey({ autoIncrement: true}),
    num_people: integer('num_people', {mode : 'number'}).notNull(),
    country: text('country', {length: 256}).notNull(),
    city: text('city', {length: 256}).notNull(),
    price: integer('price', {mode: "number"}).notNull()
});

export const ratings = sqliteTable('ratings',{
    id: integer('id', {mode: 'number'}).primaryKey({ autoIncrement: true}),
    listingId: integer('booking_id', { mode: 'number' })
        .references(() => bookings.id)
        .notNull(),
    rating: integer('rating', { mode: 'number' }).notNull(),
});

export const bookings = sqliteTable('bookings', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    listingId: integer('listing_id', { mode: 'number' })
        .references(() => listings.id)
        .notNull(),
        startDate: text('start_date', { length: 10 }).notNull(), // Stores dates as 'YYYY-MM-DD'
    endDate: text('end_date', { length: 10 }).notNull(), // Stores dates as 'YYYY-MM-DD'
});