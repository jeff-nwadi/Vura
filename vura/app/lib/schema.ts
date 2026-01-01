
import { pgTable, serial, text, real, timestamp, integer } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  wallImageUrl: text('wall_image_url'),
  referenceRatioPpi: real('reference_ratio_ppi'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const artPieces = pgTable('art_pieces', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id').references(() => rooms.id),
  imageUrl: text('image_url').notNull(),
  x: real('x').notNull(),
  y: real('y').notNull(),
  width: real('width').notNull(),
  height: real('height').notNull(),
  realWidthInches: real('real_width_inches'),
  realHeightInches: real('real_height_inches'),
});

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type ArtPiece = typeof artPieces.$inferSelect;
export type NewArtPiece = typeof artPieces.$inferInsert;
