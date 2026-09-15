import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';

export async function GET() {
  const access = await requireHR('employees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  return NextResponse.json(
    {
      success: false,
      error: 'The legacy compliance record detail endpoint was retired. Use the employee master and document vault.',
      moved_to: '/dashboard/hr/employees',
    },
    { status: 410 }
  );
}
