import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Allowed values array matching your PostgreSQL check constraint
const ALLOWED_TYPES = [
  'omang',
  'contract',
  'safety_cert',
  'medical_clearance',
  'other',
  'passport',
  'resume',
  'certificate',
  'sick_note',
  'drivers_license',
  'academic_transcript',
];

// Helper to normalize frontend input into valid DB constraint strings
function normalizeDocumentType(rawType) {
  if (!rawType) return 'other';
  
  const clean = rawType.toString().toLowerCase().trim();

  const ALIASES = {
    'national id': 'omang',
    'id': 'omang',
    'omang': 'omang',
    'contract': 'contract',
    'employment contract': 'contract',
    'safety cert': 'safety_cert',
    'safety certificate': 'safety_cert',
    'safety_cert': 'safety_cert',
    'medical clearance': 'medical_clearance',
    'medical': 'medical_clearance',
    'medical_clearance': 'medical_clearance',
    'passport': 'passport',
    'resume': 'resume',
    'cv': 'resume',
    'certificate': 'certificate',
    'sick note': 'sick_note',
    'sick_note': 'sick_note',
    'drivers license': 'drivers_license',
    "driver's license": 'drivers_license',
    'drivers_license': 'drivers_license',
    'transcript': 'academic_transcript',
    'academic transcript': 'academic_transcript',
    'academic_transcript': 'academic_transcript',
  };

  const resolved = ALIASES[clean] || clean;
  return ALLOWED_TYPES.includes(resolved) ? resolved : 'other';
}

// 1. GET: Fetch HR documents
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    let query = supabase
      .from('employee_documents')
      .select(`
        id,
        employee_id,
        document_type,
        file_name,
        file_url,
        created_at,
        employees (
          first_name,
          last_name,
          employee_code
        )
      `)
      .order('id', { ascending: false });

    if (employeeId && employeeId !== 'ALL') {
      query = query.eq('employee_id', employeeId);
    }

    const { data: documents, error } = await query;
    if (error) throw error;

    const formattedDocs = (documents || []).map((doc) => {
      const emp = doc.employees;
      const employeeName = emp
        ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
        : 'Unknown Employee';

      return {
        id: doc.id,
        employee_id: doc.employee_id,
        employee_name: employeeName,
        employee_code: emp?.employee_code || 'N/A',
        document_type: doc.document_type || 'other',
        file_name: doc.file_name || 'Document',
        title: doc.file_name || doc.document_type,
        file_url: doc.file_url,
        created_at: doc.created_at || null,
      };
    });

    return NextResponse.json({ success: true, data: formattedDocs });
  } catch (err) {
    console.error('Error fetching HR documents:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// 2. POST: Upload to 'employee-documents' bucket
export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get('file');
    const employee_id = formData.get('employee_id');
    const rawDocumentType = formData.get('document_type');
    const title = formData.get('title');

    if (!file || !employee_id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and file are required.' },
        { status: 400 }
      );
    }

    // Safely parse document type to match DB check constraint
    const document_type = normalizeDocumentType(rawDocumentType);

    // Validate 10 MB limit set on the bucket
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds the 10 MB limit.' },
        { status: 400 }
      );
    }

    // Validate bucket allowed MIME types
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PDFs and images are allowed.' },
        { status: 400 }
      );
    }

    // Convert file buffer to Uint8Array for Next.js App Router API transmission
    const fileBytes = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBytes);

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `employee-${employee_id}/${Date.now()}_${cleanFileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, fileData, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Database Insert
    const { data: dbData, error: dbError } = await supabase
      .from('employee_documents')
      .insert([
        {
          employee_id,
          document_type,
          file_name: title || file.name,
          file_url: publicUrl,
        },
      ])
      .select(`
        id,
        employee_id,
        document_type,
        file_name,
        file_url,
        created_at,
        employees (
          first_name,
          last_name,
          employee_code
        )
      `)
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, data: dbData }, { status: 201 });
  } catch (err) {
    console.error('Error processing document upload:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// 3. DELETE: Remove document record
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Document deleted.' });
  } catch (err) {
    console.error('Error deleting document:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}