import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

async function loadAbsencePayload(db) {
  const { data: records, error } = await db
    .from('absence_records')
    .select('id, employee_id, site_id, absence_type, start_date, end_date, status, doctor_name, file_name, file_url, notes, rejection_reason, supporting_document_id, submitted_by, reviewed_by, reviewed_at, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const employeeIds = [...new Set((records || []).map((row) => row.employee_id).filter(Boolean))];
  const siteIds = [...new Set((records || []).map((row) => row.site_id).filter(Boolean))];
  let employees = [];
  let sites = [];

  if (employeeIds.length) {
    const result = await db.from('employees').select('id, employee_code, first_name, last_name, status').in('id', employeeIds);
    if (result.error) throw result.error;
    employees = result.data || [];
  }
  if (siteIds.length) {
    const result = await db.from('sites').select('id, site_name, location').in('id', siteIds);
    if (result.error) throw result.error;
    sites = result.data || [];
  }

  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const siteMap = new Map(sites.map((site) => [site.id, site]));

  return (records || []).map((record) => {
    const employee = employeeMap.get(record.employee_id);
    const site = siteMap.get(record.site_id);
    return {
      ...record,
      employee: employee ? {
        id: employee.id,
        employee_code: employee.employee_code,
        name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        status: employee.status,
      } : null,
      site: site || null,
    };
  });
}

export async function GET() {
  const access = await requireHR('absences.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const data = await loadAbsencePayload(db);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('HR absences GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load absence and leave records.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireHR('absences.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const employeeId = String(body.employee_id || '').trim();
    const absenceType = String(body.absence_type || '').trim();
    const startDate = String(body.start_date || '').trim();
    const endDate = String(body.end_date || '').trim();
    const doctorName = String(body.doctor_name || '').trim() || null;
    const notes = String(body.notes || '').trim() || null;
    const supportingDocumentId = String(body.supporting_document_id || '').trim() || null;

    if (!employeeId || !absenceType || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'Employee, absence type, start date and end date are required.' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ success: false, error: 'End date cannot be before start date.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: employee, error: employeeError } = await db
      .from('employees')
      .select('id, employee_code, first_name, last_name')
      .eq('id', employeeId)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const { data: assignment, error: assignmentError } = await db
      .from('employee_site_assignments')
      .select('site_id')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .maybeSingle();
    if (assignmentError) throw assignmentError;

    if (supportingDocumentId) {
      const { data: document, error: documentError } = await db
        .from('employee_documents')
        .select('id, employee_id, file_name')
        .eq('id', supportingDocumentId)
        .maybeSingle();
      if (documentError) throw documentError;
      if (!document || document.employee_id !== employeeId) {
        return NextResponse.json({ success: false, error: 'Supporting document does not belong to this employee.' }, { status: 400 });
      }
    }

    const { data: record, error } = await db
      .from('absence_records')
      .insert({
        employee_id: employeeId,
        site_id: assignment?.site_id || null,
        absence_type: absenceType,
        start_date: startDate,
        end_date: endDate,
        status: 'Pending',
        doctor_name: doctorName,
        notes,
        supporting_document_id: supportingDocumentId,
        submitted_by: access.user.id,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'CREATE_ABSENCE_RECORD',
      module: 'Employee Management',
      entityType: 'absence_records',
      entityId: record.id,
      details: `Created ${absenceType} record for ${employee.first_name} ${employee.last_name}.`,
      metadata: { employee_id: employeeId, employee_code: employee.employee_code, site_id: assignment?.site_id || null, start_date: startDate, end_date: endDate },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('HR absence create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create absence record.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireHR('absences.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const status = String(body.status || '').trim();
    const reason = String(body.reason || '').trim();

    if (!id || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Record ID and a valid decision are required.' }, { status: 400 });
    }
    if (status === 'Rejected' && !reason) {
      return NextResponse.json({ success: false, error: 'A rejection reason is required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: record, error } = await db
      .from('absence_records')
      .update({
        status,
        rejection_reason: status === 'Rejected' ? reason : null,
        reviewed_by: access.user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!record) return NextResponse.json({ success: false, error: 'Absence record not found.' }, { status: 404 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: status === 'Approved' ? 'APPROVE_ABSENCE_RECORD' : 'REJECT_ABSENCE_RECORD',
      module: 'Employee Management',
      entityType: 'absence_records',
      entityId: id,
      details: status === 'Approved' ? `Approved ${record.absence_type} record.` : `Rejected ${record.absence_type} record: ${reason}`,
      metadata: { employee_id: record.employee_id, site_id: record.site_id, status },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('HR absence decision error:', error);
    return NextResponse.json({ success: false, error: 'Failed to review absence record.' }, { status: 500 });
  }
}
