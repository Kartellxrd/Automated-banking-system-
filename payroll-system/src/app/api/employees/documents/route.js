import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: Upload document to Supabase Storage & insert record
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const employee_id = formData.get('employee_id');
    const document_type = formData.get('document_type') || 'General Document';

    if (!file || !employee_id) {
      return NextResponse.json(
        { success: false, error: 'File and Employee ID are required.' },
        { status: 400 }
      );
    }

    // Clean up filename and build unique storage path
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${employee_id}/${Date.now()}_${safeFileName}`;
    
    // Convert File to ArrayBuffer directly
    const arrayBuffer = await file.arrayBuffer();

    // 1. Upload to Supabase Storage Bucket 'employee-documents'
    const { error: storageError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (storageError) {
      console.error('Supabase Storage Error:', storageError);
      return NextResponse.json({ success: false, error: storageError.message }, { status: 400 });
    }

    // 2. Retrieve Public URL
    const { data: publicUrlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(filePath);

    const document_url = publicUrlData?.publicUrl;

    if (!document_url) {
      return NextResponse.json({ success: false, error: 'Failed to generate public URL.' }, { status: 500 });
    }

    // 3. Insert database record
    const { data: docRecord, error: docError } = await supabase
      .from('employee_documents')
      .insert([
        {
          employee_id: employee_id, // Ensure this matches foreign key type (UUID/INT)
          document_type,
          document_url,
          file_path: filePath,
          is_valid: true
        }
      ])
      .select()
      .single();

    if (docError) {
      console.error('Supabase Database Insert Error:', docError);
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from('employee-documents').remove([filePath]);
      return NextResponse.json({ success: false, error: docError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: docRecord }, { status: 201 });
  } catch (err) {
    console.error('POST /api/employees/documents Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Remove record and file from Supabase Storage
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required.' }, { status: 400 });
    }

    // 1. Get document details
    const { data: doc, error: fetchErr } = await supabase
      .from('employee_documents')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchErr) {
      console.error('Fetch Document Error:', fetchErr);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 400 });
    }

    // 2. Remove from storage bucket if file_path exists
    if (doc?.file_path) {
      const { error: removeStorageErr } = await supabase.storage
        .from('employee-documents')
        .remove([doc.file_path]);

      if (removeStorageErr) {
        console.error('Storage Delete Warning:', removeStorageErr.message);
      }
    }

    // 3. Remove database record
    const { error: deleteErr } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.error('Database Delete Error:', deleteErr);
      return NextResponse.json({ success: false, error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/employees/documents Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}