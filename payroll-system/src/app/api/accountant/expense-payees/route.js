import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireAccountant('expenses.payees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [payeesResult, profilesResult, providersResult] = await Promise.all([
      db.from('expense_payees').select('*').order('display_name'),
      db.from('expense_payee_payout_profiles').select('id,payee_id,payout_provider_id,account_or_mobile_number,branch_code,is_primary,is_verified,verified_at,verified_by,created_at').order('created_at', { ascending: false }),
      db.from('payout_providers').select('id,code,name,payment_channel_id,is_active').eq('is_active', true).order('name'),
    ]);
    for (const result of [payeesResult, profilesResult, providersResult]) if (result.error) throw result.error;

    const profilesByPayee = new Map();
    for (const profile of profilesResult.data || []) {
      if (!profilesByPayee.has(profile.payee_id)) profilesByPayee.set(profile.payee_id, []);
      profilesByPayee.get(profile.payee_id).push(profile);
    }
    const providerMap = new Map((providersResult.data || []).map((row) => [row.id, row]));
    const data = (payeesResult.data || []).map((payee) => ({
      ...payee,
      payout_profiles: (profilesByPayee.get(payee.id) || []).map((profile) => ({
        ...profile,
        provider: providerMap.get(profile.payout_provider_id) || null,
        masked_destination: profile.account_or_mobile_number.length <= 4 ? profile.account_or_mobile_number : `${'*'.repeat(profile.account_or_mobile_number.length - 4)}${profile.account_or_mobile_number.slice(-4)}`,
      })),
    }));

    return NextResponse.json({ success: true, data, providers: providersResult.data || [] });
  } catch (error) {
    console.error('Expense payees GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load expense payees.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireAccountant('expenses.payees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const displayName = String(body.display_name || '').trim();
    const payeeType = String(body.payee_type || 'vendor').trim();
    const providerId = Number(body.payout_provider_id);
    const destination = String(body.account_or_mobile_number || '').trim();
    const branchCode = String(body.branch_code || '').trim() || null;
    const registrationOrId = String(body.registration_or_id || '').trim() || null;
    const phone = String(body.phone || '').trim() || null;
    const notes = String(body.notes || '').trim() || null;

    if (!displayName || !['vendor','site_custodian','employee','other'].includes(payeeType)) {
      return NextResponse.json({ success: false, error: 'Payee name and a valid payee type are required.' }, { status: 400 });
    }
    if (!Number.isInteger(providerId) || !destination) {
      return NextResponse.json({ success: false, error: 'A payout provider and account/mobile number are required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: provider, error: providerError } = await db.from('payout_providers').select('id,name,is_active').eq('id', providerId).maybeSingle();
    if (providerError) throw providerError;
    if (!provider?.is_active) return NextResponse.json({ success: false, error: 'Selected payout provider is not active.' }, { status: 400 });

    const { data: payee, error: payeeError } = await db.from('expense_payees').insert({
      payee_type: payeeType,
      display_name: displayName,
      registration_or_id: registrationOrId,
      phone,
      notes,
      created_by: access.user.id,
      updated_by: access.user.id,
    }).select('*').single();
    if (payeeError) throw payeeError;

    const { data: payout, error: payoutError } = await db.from('expense_payee_payout_profiles').insert({
      payee_id: payee.id,
      payout_provider_id: providerId,
      account_or_mobile_number: destination,
      branch_code: branchCode,
      is_primary: true,
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: access.user.id,
      created_by: access.user.id,
    }).select('*').single();
    if (payoutError) throw payoutError;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'CREATE_VERIFIED_EXPENSE_PAYEE',
      module: 'Expenses',
      entityType: 'expense_payee',
      entityId: payee.id,
      details: `Created verified expense payee ${displayName}.`,
      metadata: { payee_type: payeeType, payout_provider_id: providerId, provider_name: provider.name },
    });

    return NextResponse.json({ success: true, data: { ...payee, payout_profiles: [payout] }, message: 'Verified expense payee created.' }, { status: 201 });
  } catch (error) {
    console.error('Expense payees POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create expense payee.' }, { status: 500 });
  }
}
