import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';

function movedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'The legacy rate-pairing compliance endpoint was retired. HR compliance is now derived from the employee master, assignments, rates and documents.',
      moved_to: '/dashboard/hr/employees',
    },
    { status: 410 }
  );
}

export async function GET() {
  const access = await requireHR('employees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  return movedResponse();
}

export async function POST() {
  const access = await requireHR('employees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  return movedResponse();
}
