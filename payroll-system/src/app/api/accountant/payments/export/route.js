import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export async function GET(request) {
  const access = await requireAccountant('payments.view');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  const { searchParams } = new URL(request.url);
  const runId = String(searchParams.get('run_id') || '').trim();
  if (!runId) return NextResponse.json({ success: false, error: 'Payment run ID is required.' }, { status: 400 });

  try {
    const db = createSupabaseAdminClient();
    const { data: run, error: runError } = await db.from('payment_runs')
      .select('id,run_code,run_type,status,authorized_by,authorized_at,total_items,total_amount')
      .eq('id', runId)
      .maybeSingle();
    if (runError) throw runError;
    if (!run) return NextResponse.json({ success: false, error: 'Payment run not found.' }, { status: 404 });
    if (!run.authorized_by || !run.authorized_at) return NextResponse.json({ success: false, error: 'CEO authorization is required before export.' }, { status: 409 });

    const { data: items, error: itemError } = await db.from('payment_run_items')
      .select('id,payee_name_snapshot,amount,payout_provider_name_snapshot,destination_snapshot,destination_masked,branch_code_snapshot,status,payment_reference')
      .eq('payment_run_id', runId)
      .order('payee_name_snapshot');
    if (itemError) throw itemError;

    const headers = ['Run Code','Payee','Amount BWP','Destination Provider','Destination Account / Mobile','Branch Code','Current Status','Existing Reference'];
    const rows = [headers, ...(items || []).map((item) => [
      run.run_code,
      item.payee_name_snapshot || '',
      Number(item.amount || 0).toFixed(2),
      item.payout_provider_name_snapshot || '',
      item.destination_snapshot || '',
      item.branch_code_snapshot || '',
      item.status,
      item.payment_reference || '',
    ])];

    const content = rows.map((row) => row.map(cell).join(',')).join('\n');

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'EXPORT_PAYMENT_INSTRUCTIONS',
      module: 'Payments',
      entityType: 'payment_run',
      entityId: run.id,
      details: `Exported authorized payment instructions for ${run.run_code}.`,
      metadata: { items: (items || []).length, total_amount: Number(run.total_amount || 0) },
    });

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${run.run_code}_payment_instructions.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Payment instruction export error:', error);
    return NextResponse.json({ success: false, error: 'Failed to export payment instructions.' }, { status: 500 });
  }
}
