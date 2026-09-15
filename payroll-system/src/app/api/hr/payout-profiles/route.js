import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireHR('employees.payment.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [providersResult, channelsResult, profilesResult] = await Promise.all([
      db.from('payout_providers').select('id, payment_channel_id, code, name, is_active').eq('is_active', true).order('name'),
      db.from('payment_channels').select('id, type, provider_name, is_active'),
      db.from('employee_payout_profiles').select('id, employee_id, payout_provider_id, account_or_mobile_number, branch_code, is_primary, verified_by, verified_at, proof_document_id, updated_at').eq('is_primary', true),
    ]);
    if (providersResult.error) throw providersResult.error;
    if (channelsResult.error) throw channelsResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const channelMap = new Map((channelsResult.data || []).map((row) => [row.id, row]));
    const providers = (providersResult.data || []).map((provider) => ({
      ...provider,
      channel_type: channelMap.get(provider.payment_channel_id)?.type || null,
    }));

    const employeeIds = [...new Set((profilesResult.data || []).map((row) => row.employee_id).filter(Boolean))];
    let validEmployeeIds = new Set();
    if (employeeIds.length) {
      const { data: employees, error } = await db.from('employees').select('id').in('id', employeeIds);
      if (error) throw error;
      validEmployeeIds = new Set((employees || []).map((employee) => employee.id));
    }

    const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
    const profiles = (profilesResult.data || [])
      .filter((profile) => validEmployeeIds.has(profile.employee_id))
      .map((profile) => ({ ...profile, provider: providerMap.get(profile.payout_provider_id) || null }));

    return NextResponse.json({ success: true, providers, profiles });
  } catch (error) {
    console.error('HR payout profiles GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load employee payout profiles.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const access = await requireHR('employees.payment.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const employeeId = String(body.employee_id || '').trim();
    const providerId = Number(body.provider_id);
    const account = String(body.account_or_mobile_number || '').trim();
    const branchCode = String(body.branch_code || '').trim() || null;
    const proofDocumentId = String(body.proof_document_id || '').trim() || null;

    if (!employeeId || !Number.isInteger(providerId) || !account) {
      return NextResponse.json({ success: false, error: 'Employee, payout provider and account/mobile number are required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: employee, error: employeeError } = await db
      .from('employees')
      .select('id, employee_code, first_name, last_name')
      .eq('id', employeeId)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const { data: profile, error } = await db.rpc('hr_set_employee_payout_profile', {
      p_hr_id: access.user.id,
      p_employee_id: employeeId,
      p_provider_id: providerId,
      p_account_or_mobile_number: account,
      p_branch_code: branchCode,
      p_proof_document_id: proofDocumentId,
    });
    if (error) return NextResponse.json({ success: false, error: error.message || 'Failed to save payout profile.' }, { status: 400 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'UPDATE_EMPLOYEE_PAYOUT_PROFILE',
      module: 'Employee Management',
      entityType: 'employee_payout_profiles',
      entityId: profile.id,
      details: `Verified payout details for ${employee.first_name} ${employee.last_name}.`,
      metadata: { employee_id: employeeId, employee_code: employee.employee_code, payout_provider_id: providerId, proof_document_id: proofDocumentId },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('HR payout profile save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save employee payout profile.' }, { status: 500 });
  }
}
