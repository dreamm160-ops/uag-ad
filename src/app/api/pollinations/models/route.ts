import { NextResponse } from 'next/server';

import { fetchPollinationsModelOptions } from '@/lib/pollinations-models';

export async function GET() {
  try {
    const result = await fetchPollinationsModelOptions();

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
