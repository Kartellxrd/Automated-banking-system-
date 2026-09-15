import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireSiteClerk } from '@/lib/auth/requireSiteClerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteClerkContext } from '@/lib/site-clerk/getSiteContext';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const runtime = 'nodejs';

const BUCKET = 'timesheet-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

function mimeExtension(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}

function normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const s = a || '';
  const t = b || '';
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const row = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= t.length; j += 1) {
      const tmp = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (s[i - 1] === t[j - 1] ? 0 : 1)
      );
      previous = tmp;
    }
  }
  return row[t.length];
}

function similarity(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length);
}

function normalizeTime(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minute > 59 || hour > 23) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function matchWorker(row, employees, usedEmployeeIds) {
  const rawCode = normalizeToken(row.employeeCode);
  const rawNational = normalizeToken(row.nationalId);
  const rawName = normalizeName(row.employeeName);

  let candidate = null;
  let method = 'unmatched';
  let confidence = 0;

  if (rawCode) {
    candidate = employees.find((employee) => normalizeToken(employee.employee_code) === rawCode) || null;
    if (candidate) {
      method = 'employee_code';
      confidence = 1;
    }
  }

  if (!candidate && rawNational) {
    candidate = employees.find((employee) => normalizeToken(employee.national_id) === rawNational) || null;
    if (candidate) {
      method = 'national_id';
      confidence = 1;
    }
  }

  if (!candidate && rawName) {
    candidate = employees.find((employee) => normalizeName(`${employee.first_name} ${employee.last_name}`) === rawName) || null;
    if (candidate) {
      method = 'exact_name';
      confidence = 0.99;
    }
  }

  if (!candidate && rawName) {
    let best = null;
    let bestScore = 0;
    for (const employee of employees) {
      const score = similarity(row.employeeName, `${employee.first_name} ${employee.last_name}`);
      if (score > bestScore) {
        best = employee;
        bestScore = score;
      }
    }
    if (best && bestScore >= 0.82) {
      candidate = best;
      method = 'fuzzy_name';
      confidence = bestScore;
    }
  }

  if (candidate && usedEmployeeIds.has(candidate.id)) {
    return { employee: null, method: 'unmatched', confidence: 0, status: 'review' };
  }

  if (!candidate) {
    return { employee: null, method: 'unmatched', confidence: 0, status: 'unmatched' };
  }

  usedEmployeeIds.add(candidate.id);
  const status = method === 'fuzzy_name' ? 'review' : 'matched';
  return { employee: candidate, method, confidence, status };
}

async function extractWithGemini(buffer, mimeType) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Automatic extraction is unavailable because GEMINI_API_KEY is not configured.');
  }

  const modelNames = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ].filter(Boolean);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  let lastError = null;

  const prompt = `You are reading a photographed or scanned mining-site paper attendance timesheet. Extract only what is visibly present. Do not invent missing values. Return JSON only with this exact structure:\n{\n  "siteText": "string or null",\n  "documentDate": "YYYY-MM-DD or null",\n  "rows": [\n    {\n      "rowNumber": 1,\n      "employeeName": "string or null",\n      "employeeCode": "string or null",\n      "nationalId": "string or null",\n      "clockIn": "HH:MM or null",\n      "clockOut": "HH:MM or null",\n      "overtimeHours": 0,\n      "signaturePresent": true,\n      "confidence": 0.0\n    }\n  ]\n}\nUse 24-hour time. confidence must be between 0 and 1. If handwriting or a value is unreadable, use null and lower confidence. Do not infer workers that are not visible on the paper.`;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: buffer.toString('base64'), mimeType } },
      ]);
      return { parsed: JSON.parse(result.response.text()), modelName };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Automatic extraction failed.');
}

async function loadAssignedEmployees(db, siteId) {
  const { data: assignments, error: assignmentError } = await db
    .from('employee_site_assignments')
    .select('employee_id')
    .eq('site_id', siteId)
    .eq('is_active', true);
  if (assignmentError) throw assignmentError;

  const employeeIds = (assignments || []).map((row) => row.employee_id);
  if (!employeeIds.length) return [];

  const { data, error } = await db
    .from('employees')
    .select('id, employee_code, first_name, last_name, national_id, job_role, status')
    .in('id', employeeIds)
    .eq('status', 'Active');
  if (error) throw error;
  return data || [];
}

export async function POST(request) {
  const access = await requireSiteClerk('attendance.create');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const db = createSupabaseAdminClient();
  let uploadedPath = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const date = String(formData.get('date') || '').trim();

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, error: 'Choose a JPG, PNG, or PDF timesheet.' }, { status: 400 });
    }
    if (!validDate(date)) {
      return NextResponse.json({ success: false, error: 'A valid work date is required.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Only JPG, PNG, and PDF files are supported.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Timesheet files must be between 1 byte and 10 MB.' }, { status: 400 });
    }

    const context = await getSiteClerkContext(db, access.user.id);
    if (!context) {
      return NextResponse.json({ success: false, error: 'No active site assignment found for your account.' }, { status: 409 });
    }

    let { data: roster, error: rosterError } = await db
      .from('daily_site_rosters')
      .select('id, site_id, shift_date, status')
      .eq('site_id', context.site.id)
      .eq('shift_date', date)
      .maybeSingle();
    if (rosterError) throw rosterError;

    if (!roster) {
      const { data, error } = await db
        .from('daily_site_rosters')
        .insert({
          site_id: context.site.id,
          shift_date: date,
          status: 'draft',
          created_by: access.user.id,
          updated_at: new Date().toISOString(),
        })
        .select('id, site_id, shift_date, status')
        .single();
      if (error) throw error;
      roster = data;
    }

    if (!['draft', 'rejected'].includes(roster.status)) {
      return NextResponse.json({ success: false, error: 'This roster has already been submitted and cannot accept another paper timesheet.' }, { status: 409 });
    }

    const employees = await loadAssignedEmployees(db, context.site.id);
    if (!employees.length) {
      return NextResponse.json({ success: false, error: 'No active workers are assigned to your site.' }, { status: 409 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadId = randomUUID();
    const extension = mimeExtension(file.type);
    uploadedPath = `${context.site.id}/${date}/${roster.id}/${uploadId}.${extension}`;
    const hash = createHash('sha256').update(buffer).digest('hex');

    const { error: storageError } = await db.storage
      .from(BUCKET)
      .upload(uploadedPath, buffer, { contentType: file.type, upsert: false });
    if (storageError) throw storageError;

    const { error: uploadRecordError } = await db
      .from('timesheet_uploads')
      .insert({
        id: uploadId,
        roster_id: roster.id,
        storage_bucket: BUCKET,
        storage_path: uploadedPath,
        original_filename: file.name || `timesheet.${extension}`,
        mime_type: file.type,
        file_size_bytes: file.size,
        file_sha256: hash,
        uploaded_by: access.user.id,
        processing_status: 'extracting',
        parser_provider: process.env.GEMINI_API_KEY ? 'google_gemini' : null,
      });
    if (uploadRecordError) throw uploadRecordError;

    let parsed = { siteText: null, documentDate: null, rows: [] };
    let parserModel = null;
    let extractionError = null;

    try {
      const extraction = await extractWithGemini(buffer, file.type);
      parsed = extraction.parsed || parsed;
      parserModel = extraction.modelName;
    } catch (error) {
      extractionError = error.message || 'Automatic extraction failed.';
    }

    const usedEmployeeIds = new Set();
    const extractionRows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const stagedRows = extractionRows.map((row, index) => {
      const matched = matchWorker(row, employees, usedEmployeeIds);
      return {
        upload_id: uploadId,
        source_row_number: Number.isInteger(Number(row.rowNumber)) && Number(row.rowNumber) > 0 ? Number(row.rowNumber) : index + 1,
        raw_employee_name: row.employeeName || null,
        raw_employee_code: row.employeeCode || null,
        raw_national_id: row.nationalId || null,
        extracted_clock_in: normalizeTime(row.clockIn),
        extracted_clock_out: normalizeTime(row.clockOut),
        extracted_overtime_hours: Number.isFinite(Number(row.overtimeHours)) && Number(row.overtimeHours) >= 0 ? Number(row.overtimeHours) : null,
        signature_present: typeof row.signaturePresent === 'boolean' ? row.signaturePresent : null,
        ocr_confidence: clamp01(row.confidence),
        matched_employee_id: matched.employee?.id || null,
        match_method: matched.method,
        match_confidence: clamp01(matched.confidence),
        match_status: matched.status,
      };
    });

    if (stagedRows.length) {
      const { error } = await db.from('timesheet_extracted_rows').insert(stagedRows);
      if (error) throw error;
    }

    const detectedDate = validDate(parsed.documentDate) ? parsed.documentDate : null;
    const { error: finishError } = await db
      .from('timesheet_uploads')
      .update({
        processing_status: 'review_ready',
        detected_site_text: parsed.siteText || null,
        detected_document_date: detectedDate,
        parser_model: parserModel,
        extraction_error: extractionError,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadId);
    if (finishError) throw finishError;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'UPLOAD_TIMESHEET',
      module: 'Attendance & Rosters',
      entityType: 'timesheet_upload',
      entityId: uploadId,
      details: `Uploaded paper timesheet for ${context.site.site_name} on ${date}.`,
      metadata: {
        site_id: context.site.id,
        roster_id: roster.id,
        shift_date: date,
        mime_type: file.type,
        extracted_rows: stagedRows.length,
        extraction_error: extractionError,
      },
    });

    const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(uploadedPath, 60 * 60);

    return NextResponse.json({
      success: true,
      data: {
        upload_id: uploadId,
        site: context.site,
        date,
        roster,
        preview_url: signed?.signedUrl || null,
        extraction_available: !extractionError,
        extraction_warning: extractionError,
        detected_site_text: parsed.siteText || null,
        detected_document_date: detectedDate,
        extracted_rows: stagedRows,
      },
    });
  } catch (error) {
    console.error('Secure timesheet upload error:', error);
    if (uploadedPath) {
      try {
        await db.storage.from(BUCKET).remove([uploadedPath]);
      } catch (cleanupError) {
        console.error('Timesheet storage cleanup failed:', cleanupError);
      }
    }
    return NextResponse.json({ success: false, error: 'Failed to upload and process the paper timesheet.' }, { status: 500 });
  }
}
