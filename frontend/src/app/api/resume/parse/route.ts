import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // v1.1.1 uses a simple function call
    const data = await pdf(buffer);

    return NextResponse.json({
      text: data.text,
      pages: data.numpages
    });
  } catch (error: any) {
    console.error('Resume parsing error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF resume' }, { status: 500 });
  }
}
