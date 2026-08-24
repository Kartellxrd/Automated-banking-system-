import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Load active sites, fetch site-assigned employees, and list documents
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

    // 3. Fetch documents for these employees
    const { data: documents, error: docErr } = await supabase
      .from('employee_documents')
      .select(`
        id,
        document_type,
        file_path,
        created_at,
        employee_id,
        employees (
          first_name,
          last_name,
          employee_code,
          assigned_site
        )
      `)
      .order('created_at', { ascending: false });

    if (docErr) throw docErr;

    // Build document objects and generate public URLs from 'sick-notes' bucket
    const filteredDocs = (documents || [])
      .filter((doc) => doc.employees?.assigned_site === site)
      .map((doc) => {
        let publicUrl = '';
        if (doc.file_path) {
          const { data: urlData } = supabase.storage
            .from('sick-notes')
            .getPublicUrl(doc.file_path);
          publicUrl = urlData?.publicUrl || '';
        }

        return {
          id: doc.id,
          document_type: doc.document_type,
          document_url: publicUrl,
          file_path: doc.file_path,
          created_at: doc.created_at,
          employee_id: doc.employee_id,
          employee_name: doc.employees
            ? `${doc.employees.first_name} ${doc.employees.last_name}`
            : 'Site Worker',
          employee_code: doc.employees?.employee_code || 'EMP',
        };
      });

    return NextResponse.json({
      success: true,
      sites: (sitesData || []).map((s) => s.site_name),
      employees: (employees || []).map((e) => ({
        ...e,
        job_title: e.job_role, // frontend compatibility
      })),
      documents: filteredDocs,
    });
  } catch (err) {
    console.error('Error in documents GET route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch site document data.' },
      { status: 500 }
    );
  }
}

// POST: Direct file upload to 'sick-notes' bucket & record metadata in employee_documents
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const employeeId = formData.get('employee_id');
    const documentType = formData.get('document_type');

    if (!file || !employeeId || !documentType) {
      return NextResponse.json(
        { success: false, error: 'File, employee ID, and document type are required.' },
        { status: 400 }
      );
    }

    // Prepare buffer and path
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

    // Record document metadata in database
    const { data: docRecord, error: dbErr } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId,
        document_type: documentType,
        file_path: fileName,
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({
      success: true,
      message: 'Document successfully saved to sick-notes bucket.',
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

// DELETE: Remove document file from bucket and DB entry
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');

    if (!docId) {
      return NextResponse.json({ success: false, error: 'Document ID required.' }, { status: 400 });
    }

    const { data: doc, error: fetchErr } = await supabase
      .from('employee_documents')
      .select('file_path')
      .eq('id', docId)
      .single();

    if (fetchErr) throw fetchErr;

    if (doc?.file_path) {
      await supabase.storage.from('sick-notes').remove([doc.file_path]);
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