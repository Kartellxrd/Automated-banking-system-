import { NextResponse } from 'next/server';
import { requireCEO } from '@/lib/auth/requireCEO';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const CEO_VISIBLE_STATUSES = [
  'ready_for_ceo',
  'approved_by_ceo',
  'rejected_by_ceo',
  'executing',
  'paid',
  'partial_failed',
  'failed',
];

export async function GET() {
  const access = await requireCEO('payroll.view_approved');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const db = createSupabaseAdminClient();
    const { data: batches, error: batchError } = await db
      .from('payroll_batches')
      .select('id,batch_code,pay_period_id,status,scheduled_payment_date,submitted_by,submitted_at,ceo_reviewed_by,ceo_reviewed_at,ceo_rejection_reason,total_employees,total_regular_hours,total_overtime_hours,gross_total,deductions_total,net_total,execution_started_at,execution_completed_at,created_at,updated_at')
      .in('status', CEO_VISIBLE_STATUSES)
      .order('created_at', { ascending: false })
      .limit(100);

    if (batchError) throw batchError;

    const rows = batches || [];
    const periodIds = [...new Set(rows.map((row) => row.pay_period_id).filter(Boolean))];
    const profileIds = [...new Set(rows.flatMap((row) => [row.submitted_by, row.ceo_reviewed_by]).filter(Boolean))];

    const [periodsResult, profilesResult] = await Promise.all([
      periodIds.length
        ? db.from('pay_periods').select('id,period_name,start_date,end_date,status').in('id', periodIds)
        : Promise.resolve({ data: [], error: null }),
      profileIds.length
        ? db.from('profiles').select('id,first_name,last_name,email,role').in('id', profileIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (periodsResult.error) throw periodsResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const periodMap = new Map((periodsResult.data || []).map((row) => [row.id, row]));
    const profileMap = new Map((profilesResult.data || []).map((row) => [row.id, {
      ...row,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
    }]));

    const data = rows.map((row) => ({
      ...row,
      total_regular_hours: Number(row.total_regular_hours || 0),
      total_overtime_hours: Number(row.total_overtime_hours || 0),
      gross_total: Number(row.gross_total || 0),
      deductions_total: Number(row.deductions_total || 0),
      net_total: Number(row.net_total || 0),
      pay_period: periodMap.get(row.pay_period_id) || null,
      submitted_by_profile: profileMap.get(row.submitted_by) || null,
      ceo_reviewed_by_profile: profileMap.get(row.ceo_reviewed_by) || null,
    }));

    return NextResponse.json({
      success: true,
      data,
      summary: {
        awaiting_review: data.filter((row) => row.status === 'ready_for_ceo').length,
        approved_waiting_payment: data.filter((row) => row.status === 'approved_by_ceo').length,
        rejected: data.filter((row) => row.status === 'rejected_by_ceo').length,
        paid: data.filter((row) => row.status === 'paid').length,
        approved_waiting_payment_total: Number(data
          .filter((row) => row.status === 'approved_by_ceo')
          .reduce((sum, row) => sum + row.net_total, 0)
          .toFixed(2)),
      },
    });
  } catch (error) {
    console.error('CEO payroll queue GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load CEO payroll queue.' }, { status: 500 });
  }
}
