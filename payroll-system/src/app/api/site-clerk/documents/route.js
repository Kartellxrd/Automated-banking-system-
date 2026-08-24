import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Map UI display labels to exact PostgreSQL constraint values
const DOC_TYPE_MAP = {
  'Sick Note': 'sick_note',
  'Medical Certificate': 'medical_clearance',
  'Medical Clearance': 'medical_clearance',
  'Safety Cert': 'safety_cert',
  'Safety Certificate': 'safety_cert',
  'Contract': 'contract',
  'Omang': 'omang',
  'Passport': 'passport',
  'Resume': 'resume',
  'Certificate': 'certificate',
  'Drivers License': 'drivers_license',
  'Academic Transcript': 'academic_transcript',
  'Other': 'other',
};

// GET: Fetch sites, employees for the selected site, and document logs safely
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site') || 'Site A';

    // 1. Load available active sites using 'site_name'
    const { data: sitesData, error: sitesErr } = await supabase
      .from('sites')
      .select('id, site_name');

    if (sitesErr) throw sitesErr;

    // 2. Fetch employees assigned to this site using 'assigned_site'
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, job_role, assigned_site')
      .eq('assigned_site', site);

    if (empErr) throw empErr;

    // 3. Safe Document Retrieval matching exact schema columns
    let filteredDocs = [];
    try {
      const { data: documents, error: docErr } = await supabase
        .from('employee_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!docErr && documents && documents.length > 0) {
        filteredDocs = documents.map((doc) => {
          let publicUrl = doc.file_url || '';
          if (!publicUrl && doc.file_name) {
            const { data: urlData } = supabase.storage
              .from('sick-notes')
              .getPublicUrl(doc.file_name);
            publicUrl = urlData?.publicUrl || '';
          }

          const matchedEmp = employees.find((e) => e.id === doc.employee_id);

          return {
            id: doc.id,
            document_type: doc.document_type || 'sick_note',
            document_url: publicUrl,
            file_path: doc.file_name || '',
            created_at: doc.created_at || doc.uploaded_at,
            employee_id: doc.employee_id,
            employee_name: matchedEmp
              ? `${matchedEmp.first_name} ${matchedEmp.last_name}`
              : 'Site Worker',
            employee_code: matchedEmp?.employee_code || 'EMP',
          };
        });
      }
    } catch (docFetchErr) {
      console.warn('Notice: Could not load documents or bucket is empty:', docFetchErr.message);
      filteredDocs = [];
    }

    return NextResponse.json({
      success: true,
      sites: (sitesData || []).map((s) => s.site_name),
      employees: (employees || []).map((e) => ({
        ...e,
        job_title: e.job_role, // frontend dropdown support
      })),
      documents: filteredDocs,
    });
  } catch (err) {
    console.error('Error fetching site documents data:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch site data.' },
      { status: 500 }
    );
  }
}

// POST: Direct file upload to 'sick-notes' storage bucket
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const employeeId = formData.get('employee_id');
    const rawDocumentType = formData.get('document_type');

    if (!file || !employeeId || !rawDocumentType) {
      return NextResponse.json(
        { success: false, error: 'File, employee ID, and document type are required.' },
        { status: 400 }
      );
    }

    // Convert document type string to match DB CHECK constraint
    const normalizedDocType =
      DOC_TYPE_MAP[rawDocumentType] ||
      rawDocumentType.toString().trim().toLowerCase().replace(/\s+/g, '_') ||
      'sick_note';

    // Prepare buffer and bucket path
    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}/${Date.now()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload directly to 'sick-notes' bucket
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('sick-notes')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    // Retrieve public URL
    const { data: urlData } = supabase.storage
      .from('sick-notes')
      .getPublicUrl(fileName);

    const publicUrl = urlData?.publicUrl || '';

    // Insert metadata record using exact schema column names and normalized enum string
    const { data: docRecord, error: dbErr } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId,
        document_type: normalizedDocType,
        file_name: fileName,
        file_url: publicUrl,
        mime_type: file.type || 'application/pdf',
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({
      success: true,
      message: 'Document successfully uploaded to sick-notes bucket.',
      data: docRecord,
    });
  } catch (err) {
    console.error('Error uploading document:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to upload document.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove document file from bucket and DB table
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');

    if (!docId) {
      return NextResponse.json({ success: false, error: 'Document ID required.' }, { status: 400 });
    }

    const { data: doc } = await supabase
      .from('employee_documents')
      .select('file_name')
      .eq('id', docId)
      .maybeSingle();

    if (doc?.file_name) {
      await supabase.storage.from('sick-notes').remove([doc.file_name]);
    }

    const { error: deleteErr } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', docId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting document:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete document.' },
      { status: 500 }
    );
  }
}