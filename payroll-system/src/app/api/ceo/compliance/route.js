import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Legacy hardcoded CEO compliance endpoint retired. Compliance data will be rebuilt from live audit and workforce records.',
    },
    { status: 410 }
  );
}
