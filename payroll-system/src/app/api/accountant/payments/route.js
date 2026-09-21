import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function num(value) {
  return Number(value || 0);
}

function paymentEnvironment() {
  const mode = String(process.env.PAYMENTS_MODE || 'test').toLowerCase() === 'production' ? 'production' : 'test';
  return {
    mode,
    label: mode === 'production' ? 'PRODUCTION' : 'TEST',
    live_payments_enabled: mode === 'production',
    settlement_recording_enabled: mode === 'production',
  };
}

export async function GET() {
  const access = await requireAccountant('payments.view');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [runsResult, accountsResult, methodsResult] = await Promise.all([
      db.from('payment_runs')
        .select('id,run_code,run_type,payroll_batch_id,status,execution_mode,total_items,total_amount,prepared_by,prepared_at,authorized_by,authorized_at,source_payment_account_id,external_batch_reference,execution_notes,executed_by,execution_started_at,execution_completed_at,created_at,updated_at')
        .not('authorized_by', 'is', null)
        .order('authorized_at', { ascending: false })
        .limit(60),
      db.from('company_payment_accounts')
        .select('id,account_name,institution_name,account_type,account_identifier_label,currency,notes,is_active,created_at,updated_at')
        .order('is_active', { ascending: false })
        .order('account_name'),
      db.from('payment_execution_methods')
        .select('id,code,name,method_type,description,supports_instruction_export,is_active,display_order')
        .eq('is_active', true)
        .order('display_order'),
    ]);

    if (runsResult.error) throw runsResult.error;
    if (accountsResult.error) throw accountsResult.error;
    if (methodsResult.error) throw methodsResult.error;

    const runs = runsResult.data || [];
    const runIds = runs.map((row) => row.id);
    const batchIds = runs.map((row) => row.payroll_batch_id).filter(Boolean);

    let items = [];
    if (runIds.length) {
      const { data, error } = await db.from('payment_run_items')
        .select('id,payment_run_id,payroll_entry_id,expense_request_id,employee_id,payee_name_snapshot,amount,payout_provider_id,payout_provider_name_snapshot,destination_snapshot,destination_masked,branch_code_snapshot,status,idempotency_key,payment_reference,payment_error,attempt_count,paid_at,execution_method_id,submitted_at,executed_by,created_at,updated_at')
        .in('payment_run_id', runIds)
        .order('payee_name_snapshot');
      if (error) throw error;
      items = data || [];
    }

    let batches = [];
    if (batchIds.length) {
      const { data, error } = await db.from('payroll_batches')
        .select('id,batch_code,status,total_employees,gross_total,net_total,pay_period_id,created_at')
        .in('id', batchIds);
      if (error) throw error;
      batches = data || [];
    }

    const payPeriodIds = batches.map((row) => row.pay_period_id).filter(Boolean);
    let periods = [];
    if (payPeriodIds.length) {
      const { data, error } = await db.from('pay_periods').select('id,period_name,start_date,end_date').in('id', payPeriodIds);
      if (error) throw error;
      periods = data || [];
    }

    const batchMap = new Map(batches.map((row) => [row.id, row]));
    const periodMap = new Map(periods.map((row) => [row.id, row]));
    const itemMap = new Map();
    for (const item of items) {
      if (!itemMap.has(item.payment_run_id)) itemMap.set(item.payment_run_id, []);
      itemMap.get(item.payment_run_id).push({ ...item, amount: num(item.amount) });
    }

    const data = runs.map((run) => {
      const runItems = itemMap.get(run.id) || [];
      const batch = run.payroll_batch_id ? batchMap.get(run.payroll_batch_id) || null : null;
      const counts = runItems.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      return {
        ...run,
        total_amount: num(run.total_amount),
        batch: batch ? { ...batch, gross_total: num(batch.gross_total), net_total: num(batch.net_total), pay_period: periodMap.get(batch.pay_period_id) || null } : null,
        items: runItems,
        progress: {
          queued: counts.queued || 0,
          submitted: counts.submitted || 0,
          paid: counts.paid || 0,
          failed: counts.failed || 0,
          skipped: counts.skipped || 0,
        },
      };
    });

    const summary = {
      awaiting_start: data.filter((row) => row.status === 'prepared').length,
      executing: data.filter((row) => row.status === 'executing').length,
      partial_failed: data.filter((row) => row.status === 'partial_failed').length,
      completed: data.filter((row) => row.status === 'completed').length,
      pending_amount: data.filter((row) => ['prepared','executing','partial_failed','failed'].includes(row.status)).reduce((sum, row) => sum + row.total_amount, 0),
    };

    const environment = paymentEnvironment();

    return NextResponse.json({
      success: true,
      data,
      accounts: accountsResult.data || [],
      methods: methodsResult.data || [],
      summary,
      workflow: {
        mode: environment.mode === 'production' ? 'bank_execution' : 'test_processing',
        environment,
        settlement_recording_enabled: environment.settlement_recording_enabled,
        message: environment.mode === 'production'
          ? 'CEO-authorized runs are processed by Finance and only marked paid after a real bank or mobile-money settlement reference is recorded.'
          : 'TEST mode allows Finance to prepare and export released runs without recording fake settlement results against real payroll.',
      },
    });
  } catch (error) {
    console.error('Accountant payments GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load payment execution queue.' }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const action = String(body.action || '');

  if (action === 'create_source_account') {
    const access = await requireAccountant('payments.source_accounts.manage');
    if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

    const accountName = String(body.account_name || '').trim();
    const institutionName = String(body.institution_name || '').trim();
    const accountType = String(body.account_type || 'bank').trim();
    const label = String(body.account_identifier_label || '').trim() || null;
    const notes = String(body.notes || '').trim() || null;
    if (!accountName || !institutionName || !['bank','mobile_wallet','other'].includes(accountType)) {
      return NextResponse.json({ success: false, error: 'Account name, institution and a valid account type are required.' }, { status: 400 });
    }

    try {
      const db = createSupabaseAdminClient();
      const { data, error } = await db.from('company_payment_accounts').insert({
        account_name: accountName,
        institution_name: institutionName,
        account_type: accountType,
        account_identifier_label: label,
        notes,
        created_by: access.user.id,
        updated_by: access.user.id,
      }).select('*').single();
      if (error) throw error;

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: 'CREATE_COMPANY_PAYMENT_ACCOUNT',
        module: 'Payments',
        entityType: 'company_payment_account',
        entityId: data.id,
        details: `Created company payment source ${accountName}.`,
        metadata: { institution_name: institutionName, account_type: accountType, account_identifier_label: label },
      });

      return NextResponse.json({ success: true, data, message: 'Company payment source added.' }, { status: 201 });
    } catch (error) {
      console.error('Create payment source error:', error);
      const duplicate = String(error?.message || '').toLowerCase().includes('duplicate');
      return NextResponse.json({ success: false, error: duplicate ? 'A company payment source with that name already exists.' : 'Failed to add company payment source.' }, { status: duplicate ? 409 : 500 });
    }
  }

  if (action === 'start_run') {
    const access = await requireAccountant('payments.execute_manual');
    if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const runId = String(body.run_id || '').trim();
    const sourceAccountId = String(body.source_account_id || '').trim();
    const notes = String(body.notes || '').trim() || null;
    if (!runId || !sourceAccountId) return NextResponse.json({ success: false, error: 'Payment run and source company account are required.' }, { status: 400 });

    try {
      const db = createSupabaseAdminClient();
      const { data, error } = await db.rpc('accountant_start_payment_run', {
        p_accountant_id: access.user.id,
        p_run_id: runId,
        p_source_account_id: sourceAccountId,
        p_notes: notes,
      });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: 'START_PAYMENT_RUN',
        module: 'Payments',
        entityType: 'payment_run',
        entityId: runId,
        details: `Started payment processing for ${data.run_code}.`,
        metadata: { source_payment_account_id: sourceAccountId, execution_mode: 'manual_export', payment_mode: paymentEnvironment().mode },
      });

      return NextResponse.json({ success: true, data, message: `${data.run_code} is ready for payment instruction export.` });
    } catch (error) {
      console.error('Start payment run error:', error);
      return NextResponse.json({ success: false, error: 'Failed to start payment run.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: 'Unsupported payment action.' }, { status: 400 });
}

export async function PATCH(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const action = String(body.action || '');

  if (action === 'set_source_account_active') {
    const access = await requireAccountant('payments.source_accounts.manage');
    if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'Payment source ID is required.' }, { status: 400 });
    try {
      const db = createSupabaseAdminClient();
      const { data, error } = await db.from('company_payment_accounts').update({
        is_active: Boolean(body.is_active),
        updated_by: access.user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: 'Payment source not found.' }, { status: 404 });
      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: data.is_active ? 'ACTIVATE_COMPANY_PAYMENT_ACCOUNT' : 'DEACTIVATE_COMPANY_PAYMENT_ACCOUNT',
        module: 'Payments',
        entityType: 'company_payment_account',
        entityId: data.id,
        details: `${data.is_active ? 'Activated' : 'Deactivated'} company payment source ${data.account_name}.`,
      });
      return NextResponse.json({ success: true, data, message: `Payment source ${data.is_active ? 'activated' : 'deactivated'}.` });
    } catch (error) {
      console.error('Payment source update error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update payment source.' }, { status: 500 });
    }
  }

  const access = await requireAccountant('payments.execute_manual');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  if (action === 'submitted' || action === 'paid' || action === 'failed' || action === 'retry') {
    if (!paymentEnvironment().settlement_recording_enabled) {
      return NextResponse.json({
        success: false,
        error: 'Settlement recording is disabled while PAYMENTS_MODE is TEST. Switch to production only after the real FNB process is verified.',
      }, { status: 409 });
    }

    const itemId = String(body.item_id || '').trim();
    const methodId = body.execution_method_id ? String(body.execution_method_id).trim() : null;
    const reference = body.reference == null ? null : String(body.reference).trim();
    const paymentError = body.error == null ? null : String(body.error).trim();
    if (!itemId) return NextResponse.json({ success: false, error: 'Payment item ID is required.' }, { status: 400 });

    try {
      const db = createSupabaseAdminClient();
      const { data, error } = await db.rpc('accountant_update_payment_item', {
        p_accountant_id: access.user.id,
        p_item_id: itemId,
        p_action: action,
        p_execution_method_id: methodId,
        p_reference: reference,
        p_error: paymentError,
      });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: `PAYMENT_ITEM_${action.toUpperCase()}`,
        module: 'Payments',
        entityType: 'payment_run_item',
        entityId: itemId,
        details: `${data.payee_name_snapshot || 'Payment item'} marked ${action}.`,
        metadata: { payment_run_id: data.payment_run_id, amount: data.amount, payment_reference: data.payment_reference, payment_error: data.payment_error, execution_method_id: data.execution_method_id },
      });

      return NextResponse.json({ success: true, data, message: `Payment item updated to ${data.status}.` });
    } catch (error) {
      console.error('Payment item update error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update payment result.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: 'Unsupported payment update.' }, { status: 400 });
}
