import { NextResponse } from 'next/server';
import { parseCsvBuffer } from '@/lib/server/importer';

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
    const headers = Object.keys(rows[0]);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        headers,
        rows,
        totalRows: rows.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Preview processing failed',
      },
      { status: 500 }
    );
  }
}
