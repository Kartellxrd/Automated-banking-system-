import { NextResponse } from 'next/server';

function retired() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy pay-period endpoint is retired. Pay periods are created as part of the protected Accountant payroll preparation workflow.',
    },
    { status: 410 }
  );
}

export const GET = retired;
export const POST = retired;
export const PATCH = retired;
export const DELETE = retired;
