import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Legacy sandbox payout execution has been retired. Use the protected CEO approval workflow and Payment Center.',
    },
    { status: 410 }
  );
}
