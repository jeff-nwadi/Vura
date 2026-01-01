CREATE TABLE "art_pieces" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer,
	"image_url" text NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"width" real NOT NULL,
	"height" real NOT NULL,
	"real_width_inches" real,
	"real_height_inches" real
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"wall_image_url" text,
	"reference_ratio_ppi" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "art_pieces" ADD CONSTRAINT "art_pieces_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;