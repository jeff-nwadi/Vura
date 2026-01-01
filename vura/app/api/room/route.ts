import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { rooms, artPieces } from '@/app/lib/schema';
import { desc } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { name, wallImageUrl, ratio, artPieces: pieces } = await request.json();

    // 1. Insert Room
    const [newRoom] = await db.insert(rooms).values({
      name: name || 'Untitled Room',
      wallImageUrl,
      referenceRatioPpi: ratio,
    }).returning();

    const roomId = newRoom.id;

    // 2. Insert Art Pieces
    if (pieces && pieces.length > 0) {
       const piecesToInsert = pieces.map((art: any) => ({
          roomId,
          imageUrl: art.url,
          x: art.x,
          y: art.y,
          width: art.width,
          height: art.height,
          // We could calculate real dimensions here if we wanted to persist them
          // realWidthInches: ... 
       }));
       
       await db.insert(artPieces).values(piecesToInsert);
    }

    return NextResponse.json({ success: true, roomId });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to save room' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const result = await db.select().from(rooms).orderBy(desc(rooms.createdAt)).limit(5);
    return NextResponse.json(result);
  } catch (error) {
     console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}
