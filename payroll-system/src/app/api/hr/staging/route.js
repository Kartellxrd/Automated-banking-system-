import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';

function movedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'HR payroll staging was retired. HR now ends at roster approval; Accountant prepares payroll from HR-approved attendance.',
      moved_to: '/dashboard/hr/rosters',
    },
    { status: 410 }
  );
}

export async function GET() {
  const access = await requireHR('rosters.review');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  return movedResponse();
}

export async function POST() {
  const access = await requireHR('rosters.approve');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  return movedResponse();
}
