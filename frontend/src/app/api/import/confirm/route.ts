import { NextResponse } from 'next/server';
import { extractCrmRecords, parseCsvBuffer } from '@/lib/server/importer';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No CSV file was uploaded. Use the "file" field.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rows = parseCsvBuffer(buffer);

    const result = await extractCrmRecords(rows);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'AI import failed',
      },
      { status: 500 }
    );
  }
}
