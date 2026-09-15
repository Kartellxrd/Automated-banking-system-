import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireHR } from '@/lib/auth/requireHR';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'employee-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const ALLOWED_TYPES = new Set(['omang', 'contract', 'safety_cert', 'medical_clearance', 'other', 'passport', 'resume', 'certificate', 'sick_note', 'drivers_license', 'academic_transcript']);

function normalizeDocumentType(value) {
  const clean = String(value || '').toLowerCase().trim();
  const aliases = {
    'national id': 'omang', id: 'omang', omang: 'omang',
    contract: 'contract', 'employment contract': 'contract',
    'safety certificate': 'safety_cert', 'safety cert': 'safety_cert', safety_cert: 'safety_cert',
    'medical clearance': 'medical_clearance', medical: 'medical_clearance', medical_clearance: 'medical_clearance',
    passport: 'passport', resume: 'resume', cv: 'resume', certificate: 'certificate',
    'sick note': 'sick_note', sick_note: 'sick_note',
    'drivers license': 'drivers_license', "driver's license": 'drivers_license', drivers_license: 'drivers_license',
    transcript: 'academic_transcript', 'academic transcript': 'academic_transcript', academic_transcript: 'academic_transcript',
    other: 'other',
  };
  const result = aliases[clean] || clean;
  return ALLOWED_TYPES.has(result) ? result : 'other';
}

function extensionForMime(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}

async function signedUrl(db, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data?.signedUrl || null;
}

export async function GET(request) {
  const access = await requireHR('employees.documents.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const db = createSupabaseAdminClient();

    let query = db
      .from('employee_documents')
      .select('id, employee_id, document_type, file_name, original_filename, mime_type, uploaded_at, created_at, storage_path, issue_date, expiry_date, document_status, notes, is_current, uploaded_by, verified_by, verified_at')
      .order('uploaded_at', { ascending: false });
    if (employeeId && employeeId !== 'ALL') query = query.eq('employee_id', employeeId);

    const { data: documents, error } = await query.limit(500);
    if (error) throw error;

    const employeeIds = [...new Set((documents || []).map((doc) => doc.employee_id).filter(Boolean))];
    let employees = [];
    if (employeeIds.length) {
      const { data, error: employeeError } = await db
        .from('employees')
        .select('id, employee_code, first_name, last_name')
        .in('id', employeeIds);
      if (employeeError) throw employeeError;
      employees = data || [];
    }
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
    const today = new Date().toISOString().slice(0, 10);

    const result = await Promise.all((documents || []).map(async (doc) => {
      const employee = employeeMap.get(doc.employee_id);
      const preview = await signedUrl(db, doc.storage_path);
      const effectiveStatus = doc.is_current && doc.expiry_date && doc.expiry_date < today && doc.document_status === 'valid'
        ? 'expired'
        : doc.document_status;
      return {
        ...doc,
        document_status: effectiveStatus,
        employee_name: employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : 'Unknown Employee',
        employee_code: employee?.employee_code || null,
        preview_url: preview,
        file_url: preview,
        title: doc.file_name,
      };
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('HR documents GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load employee documents.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireHR('employees.documents.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  let storagePath = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const employeeId = String(formData.get('employee_id') || '').trim();
    const documentType = normalizeDocumentType(formData.get('document_type'));
    const title = String(formData.get('title') || file?.name || 'Employee document').trim();
    const issueDate = String(formData.get('issue_date') || '').trim() || null;
    const expiryDate = String(formData.get('expiry_date') || '').trim() || null;
    const notes = String(formData.get('notes') || '').trim() || null;

    if (!employeeId || !file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, error: 'Employee and document file are required.' }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Only JPG, PNG and PDF documents are supported.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Document must be between 1 byte and 10 MB.' }, { status: 400 });
    }
    if (issueDate && expiryDate && expiryDate < issueDate) {
      return NextResponse.json({ success: false, error: 'Expiry date cannot be before issue date.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: employee, error: employeeError } = await db
      .from('employees')
      .select('id, employee_code, first_name, last_name')
      .eq('id', employeeId)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const ext = extensionForMime(file.type);
    const documentId = randomUUID();
    storagePath = `${employeeId}/${documentId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: document, error: insertError } = await db
      .from('employee_documents')
      .insert({
        id: documentId,
        employee_id: employeeId,
        document_type: documentType,
        file_name: title,
        original_filename: file.name || title,
        mime_type: file.type,
        file_url: null,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        uploaded_by: access.user.id,
        issue_date: issueDate,
        expiry_date: expiryDate,
        document_status: 'valid',
        notes,
        is_current: true,
      })
      .select('*')
      .single();
    if (insertError) throw insertError;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'UPLOAD_EMPLOYEE_DOCUMENT',
      module: 'Employee Management',
      entityType: 'employee_documents',
      entityId: document.id,
      details: `Uploaded ${documentType} for ${employee.first_name} ${employee.last_name}.`,
      metadata: { employee_id: employeeId, employee_code: employee.employee_code, document_type: documentType, expiry_date: expiryDate },
    });

    return NextResponse.json({ success: true, data: { ...document, preview_url: await signedUrl(db, storagePath) } }, { status: 201 });
  } catch (error) {
    console.error('HR document upload error:', error);
    if (storagePath) {
      try { await createSupabaseAdminClient().storage.from(BUCKET).remove([storagePath]); } catch {}
    }
    return NextResponse.json({ success: false, error: 'Failed to upload employee document.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireHR('employees.documents.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'Document ID is required.' }, { status: 400 });

    const updates = {};
    if (body.title !== undefined) updates.file_name = String(body.title || '').trim() || 'Employee document';
    if (body.issue_date !== undefined) updates.issue_date = body.issue_date || null;
    if (body.expiry_date !== undefined) updates.expiry_date = body.expiry_date || null;
    if (body.notes !== undefined) updates.notes = String(body.notes || '').trim() || null;
    if (body.document_status !== undefined) updates.document_status = body.document_status;
    if (body.is_current !== undefined) updates.is_current = Boolean(body.is_current);
    if (body.verify === true) {
      updates.verified_by = access.user.id;
      updates.verified_at = new Date().toISOString();
    }

    const db = createSupabaseAdminClient();
    const { data: document, error } = await db.from('employee_documents').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!document) return NextResponse.json({ success: false, error: 'Document not found.' }, { status: 404 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'UPDATE_EMPLOYEE_DOCUMENT',
      module: 'Employee Management',
      entityType: 'employee_documents',
      entityId: id,
      details: `Updated employee document ${document.file_name}.`,
      metadata: { employee_id: document.employee_id, document_type: document.document_type },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error('HR document update error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update document.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const access = await requireHR('employees.documents.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Document ID is required.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const { data: document, error: fetchError } = await db
      .from('employee_documents')
      .select('id, employee_id, document_type, file_name, storage_path')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!document) return NextResponse.json({ success: false, error: 'Document not found.' }, { status: 404 });

    if (document.storage_path) {
      const { error: storageError } = await db.storage.from(BUCKET).remove([document.storage_path]);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await db.from('employee_documents').delete().eq('id', id);
    if (deleteError) throw deleteError;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'DELETE_EMPLOYEE_DOCUMENT',
      module: 'Employee Management',
      entityType: 'employee_documents',
      entityId: id,
      details: `Deleted employee document ${document.file_name}.`,
      metadata: { employee_id: document.employee_id, document_type: document.document_type },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HR document delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete document.' }, { status: 500 });
  }
}
