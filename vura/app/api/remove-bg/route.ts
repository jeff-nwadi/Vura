import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // FREE TIER / FALLBACK BEHAVIOUR
    // Since we don't have a valid API Key for Remove.bg or Replicate currently,
    // we will return the original image as-is.
    // Ideally, we would use a client-side library like @imgly/background-removal for a truly free solution.

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Str = buffer.toString('base64');
    const dataUrl = `data:${image.type};base64,${base64Str}`;
    
    return NextResponse.json({ success: true, url: dataUrl });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
