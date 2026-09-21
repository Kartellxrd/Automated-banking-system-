import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

function environment() {
  const mode = String(process.env.PAYMENTS_MODE || 'test').toLowerCase() === 'production' ? 'production' : 'test';
  return {
    mode,
    label: mode === 'production' ? 'PRODUCTION' : 'TEST',
    live_payments_enabled: mode === 'production',
    automatic_bank_submission_enabled: false,
  };
}

function normalizeLastFour(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 4) throw new Error('Enter only the last 4 digits of the company account.');
  return `••••${digits}`;
}

export async function GET() {
  const access = await requireAccountant('payments.view');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [accountsResult, methodsResult] = await Promise.all([
      db.from('company_payment_accounts')
        .select('id,account_name,institution_name,account_type,account_identifier_label,currency,notes,is_active,created_at,updated_at')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: true }),
      db.from('payment_execution_methods')
        .select('id,code,name,method_type,description,supports_instruction_export,is_active,display_order')
        .eq('is_active', true)
        .order('display_order'),
    ]);

    if (accountsResult.error) throw accountsResult.error;
    if (methodsResult.error) throw methodsResult.error;

    const accounts = accountsResult.data || [];
    const methods = methodsResult.data || [];
    const fnbBulk = methods.find((method) => method.code === 'FNB_BULK') || null;

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        environment: environment(),
        fnb_bulk: fnbBulk,
        readiness: {
          active_source_count: accounts.filter((row) => row.is_active !== false).length,
          has_active_source: accounts.some((row) => row.is_active !== false),
          fnb_bulk_method_available: Boolean(fnbBulk),
          official_fnb_file_template_installed: false,
        },
      },
    });
  } catch (error) {
    console.error('Payment setup GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load company payment setup.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireAccountant('payments.source_accounts.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const accountName = String(body.account_name || '').trim();
    const institutionName = String(body.institution_name || 'First National Bank Botswana').trim();
    const accountType = String(body.account_type || 'bank').trim();
    const currency = String(body.currency || 'BWP').trim().toUpperCase();
    const notes = String(body.notes || '').trim() || null;
    const accountIdentifierLabel = normalizeLastFour(body.last_four);

    if (!accountName || !institutionName || !['bank', 'mobile_wallet', 'other'].includes(accountType)) {
      return NextResponse.json({ success: false, error: 'Account label, institution and a valid account type are required.' }, { status: 400 });
    }
    if (currency !== 'BWP') {
      return NextResponse.json({ success: false, error: 'V1 company payment sources currently support BWP only.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data, error } = await db.from('company_payment_accounts').insert({
      account_name: accountName,
      institution_name: institutionName,
      account_type: accountType,
      account_identifier_label: accountIdentifierLabel,
      currency,
      notes,
      is_active: true,
      created_by: access.user.id,
      updated_by: access.user.id,
    }).select('id,account_name,institution_name,account_type,account_identifier_label,currency,notes,is_active,created_at,updated_at').single();
    if (error) throw error;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'CREATE_COMPANY_PAYMENT_ACCOUNT',
      module: 'Payments',
      entityType: 'company_payment_account',
      entityId: data.id,
      details: `Created company payment source ${accountName}.`,
      metadata: {
        institution_name: institutionName,
        account_type: accountType,
        account_identifier_label: accountIdentifierLabel,
        currency,
        payment_mode: environment().mode,
      },
    });

    return NextResponse.json({ success: true, data, message: 'Company payment source added.' }, { status: 201 });
  } catch (error) {
    console.error('Payment setup POST error:', error);
    const message = String(error?.message || '');
    if (message.includes('last 4 digits')) return NextResponse.json({ success: false, error: message }, { status: 400 });
    const duplicate = message.toLowerCase().includes('duplicate');
    return NextResponse.json({ success: false, error: duplicate ? 'A company payment source with that name already exists.' : 'Failed to add company payment source.' }, { status: duplicate ? 409 : 500 });
  }
}

export async function PATCH(request) {
  const access = await requireAccountant('payments.source_accounts.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'Payment source ID is required.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const { data, error } = await db.from('company_payment_accounts').update({
      is_active: Boolean(body.is_active),
      updated_by: access.user.id,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('id,account_name,institution_name,account_type,account_identifier_label,currency,notes,is_active,created_at,updated_at').maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Payment source not found.' }, { status: 404 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: data.is_active ? 'ACTIVATE_COMPANY_PAYMENT_ACCOUNT' : 'DEACTIVATE_COMPANY_PAYMENT_ACCOUNT',
      module: 'Payments',
      entityType: 'company_payment_account',
      entityId: data.id,
      details: `${data.is_active ? 'Activated' : 'Deactivated'} company payment source ${data.account_name}.`,
      metadata: { payment_mode: environment().mode },
    });

    return NextResponse.json({ success: true, data, message: `Payment source ${data.is_active ? 'activated' : 'deactivated'}.` });
  } catch (error) {
    console.error('Payment setup PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update company payment source.' }, { status: 500 });
  }
}
