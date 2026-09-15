import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

function normalizeOptional(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

async function buildEmployeePayload(db) {
  const [employeesResult, sitesResult, assignmentsResult, contractsResult, documentsResult, payoutResult] = await Promise.all([
    db.from('employees')
      .select('id, employee_code, first_name, last_name, national_id, phone, email, job_role, hourly_rate, status, created_at, updated_at')
      .order('last_name')
      .order('first_name'),
    db.from('sites').select('id, site_name, location, is_active').eq('is_active', true).order('site_name'),
    db.from('employee_site_assignments').select('employee_id, site_id, assigned_at').eq('is_active', true),
    db.from('employment_contracts').select('id, employee_id, site_id, job_title, hourly_rate, effective_date, contract_type, pay_rate_type').eq('is_current', true),
    db.from('employee_documents').select('employee_id, id, document_type, expiry_date, document_status, is_current').eq('is_current', true),
    db.from('employee_payout_profiles').select('employee_id, verified_at').eq('is_primary', true),
  ]);

  for (const result of [employeesResult, sitesResult, assignmentsResult, contractsResult, documentsResult, payoutResult]) {
    if (result.error) throw result.error;
  }

  const sites = sitesResult.data || [];
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  const assignmentMap = new Map((assignmentsResult.data || []).map((row) => [row.employee_id, row]));
  const contractMap = new Map((contractsResult.data || []).map((row) => [row.employee_id, row]));
  const payoutMap = new Map((payoutResult.data || []).map((row) => [row.employee_id, row]));
  const documentMap = new Map();
  for (const document of documentsResult.data || []) {
    const list = documentMap.get(document.employee_id) || [];
    list.push(document);
    documentMap.set(document.employee_id, list);
  }

  const today = new Date().toISOString().slice(0, 10);
  const employees = (employeesResult.data || []).map((employee) => {
    const assignment = assignmentMap.get(employee.id) || null;
    const site = assignment ? siteMap.get(assignment.site_id) || null : null;
    const contract = contractMap.get(employee.id) || null;
    const documents = documentMap.get(employee.id) || [];
    const payout = payoutMap.get(employee.id) || null;
    const documentTypes = new Set(documents.map((document) => document.document_type));
    const expiredDocuments = documents.filter((document) => document.expiry_date && document.expiry_date < today).length;

    const compliance = [];
    if (!site && employee.status === 'Active') compliance.push('No active site assignment');
    if (!employee.job_role || employee.job_role === 'Unassigned') compliance.push('Job role missing');
    if (employee.hourly_rate === null || employee.hourly_rate === undefined) compliance.push('Hourly rate missing');
    if (!documentTypes.has('omang') && !documentTypes.has('passport')) compliance.push('ID / passport copy missing');
    if (!documentTypes.has('contract')) compliance.push('Employment contract copy missing');
    if (expiredDocuments > 0) compliance.push(`${expiredDocuments} expired document${expiredDocuments === 1 ? '' : 's'}`);
    if (!payout?.verified_at) compliance.push('Verified payout details missing');

    return {
      ...employee,
      name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      hourly_rate: employee.hourly_rate === null ? null : Number(employee.hourly_rate),
      site,
      site_assignment: assignment,
      current_contract: contract ? { ...contract, hourly_rate: Number(contract.hourly_rate || 0) } : null,
      document_count: documents.length,
      expired_document_count: expiredDocuments,
      payout_verified: Boolean(payout?.verified_at),
      compliance_alerts: compliance,
    };
  });

  return { employees, sites };
}

export async function GET() {
  const access = await requireHR('employees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const payload = await buildEmployeePayload(db);
    return NextResponse.json({ success: true, data: payload.employees, sites: payload.sites });
  } catch (error) {
    console.error('HR employees GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load employees.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireHR('employees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const firstName = String(body.first_name || '').trim();
    const lastName = String(body.last_name || '').trim();
    const jobRole = String(body.job_role || '').trim();
    const hourlyRate = Number(body.hourly_rate);
    const siteId = normalizeOptional(body.site_id);

    if (!firstName || !lastName || !jobRole || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
      return NextResponse.json({ success: false, error: 'First name, last name, job role and a valid hourly rate are required.' }, { status: 400 });
    }

    if (siteId) {
      const siteAccess = await requireHR('employees.assign_site');
      if (!siteAccess.ok) return NextResponse.json({ success: false, error: siteAccess.error }, { status: siteAccess.status });
    }

    const db = createSupabaseAdminClient();
    const { data: employee, error } = await db.rpc('hr_create_employee', {
      p_hr_id: access.user.id,
      p_employee_code: normalizeOptional(body.employee_code),
      p_first_name: firstName,
      p_last_name: lastName,
      p_national_id: normalizeOptional(body.national_id),
      p_phone: normalizeOptional(body.phone),
      p_email: normalizeOptional(body.email),
      p_job_role: jobRole,
      p_hourly_rate: hourlyRate,
      p_site_id: siteId,
    });

    if (error) {
      const duplicate = error.message?.includes('duplicate key');
      return NextResponse.json({ success: false, error: duplicate ? 'Employee code or national ID already exists.' : error.message }, { status: duplicate ? 409 : 400 });
    }

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'CREATE_EMPLOYEE',
      module: 'Employee Management',
      entityType: 'employees',
      entityId: employee.id,
      details: `Created employee ${firstName} ${lastName}.`,
      metadata: { employee_code: employee.employee_code, site_id: siteId, job_role: jobRole, hourly_rate: hourlyRate },
    });

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    console.error('HR employee create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create employee.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireHR('employees.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const firstName = String(body.first_name || '').trim();
    const lastName = String(body.last_name || '').trim();
    const jobRole = String(body.job_role || '').trim();
    const hourlyRate = Number(body.hourly_rate);
    const status = String(body.status || 'Active');
    const siteId = normalizeOptional(body.site_id);

    if (!id || !firstName || !lastName || !jobRole || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
      return NextResponse.json({ success: false, error: 'Employee, name, job role and a valid hourly rate are required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: before, error: beforeError } = await db
      .from('employees')
      .select('id, employee_code, first_name, last_name, job_role, hourly_rate, status, primary_site_id')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const siteChanged = (before.primary_site_id || null) !== (siteId || null);
    if (siteChanged) {
      const siteAccess = await requireHR('employees.assign_site');
      if (!siteAccess.ok) return NextResponse.json({ success: false, error: siteAccess.error }, { status: siteAccess.status });
    }

    const { data: employee, error } = await db.rpc('hr_update_employee', {
      p_hr_id: access.user.id,
      p_employee_id: id,
      p_first_name: firstName,
      p_last_name: lastName,
      p_national_id: normalizeOptional(body.national_id),
      p_phone: normalizeOptional(body.phone),
      p_email: normalizeOptional(body.email),
      p_job_role: jobRole,
      p_hourly_rate: hourlyRate,
      p_site_id: siteId,
      p_status: status,
    });

    if (error) {
      const duplicate = error.message?.includes('duplicate key');
      return NextResponse.json({ success: false, error: duplicate ? 'That national ID is already assigned to another employee.' : error.message }, { status: duplicate ? 409 : 400 });
    }

    const roleChanged = before.job_role !== jobRole;
    const rateChanged = Number(before.hourly_rate || 0) !== hourlyRate;
    const statusChanged = before.status !== status;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'UPDATE_EMPLOYEE',
      module: 'Employee Management',
      entityType: 'employees',
      entityId: id,
      details: `Updated employee ${firstName} ${lastName}.`,
      metadata: {
        employee_code: before.employee_code,
        changes: { site_changed: siteChanged, role_changed: roleChanged, rate_changed: rateChanged, status_changed: statusChanged },
        previous: { site_id: before.primary_site_id, job_role: before.job_role, hourly_rate: before.hourly_rate, status: before.status },
        current: { site_id: siteId, job_role: jobRole, hourly_rate: hourlyRate, status },
      },
    });

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('HR employee update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update employee.' }, { status: 500 });
  }
}
