import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: documents, error } = await supabase
      .from('employee_documents')
      .select(`
        id,
        employee_id,
        document_type,
        file_name,
        file_url,
        employees (
          first_name,
          last_name,
          employee_code
        )
      `)
      .order('id', { ascending: false }); // Fallback ordering by ID instead of created_at

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
        document_type: doc.document_type || 'General Document',
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { employee_id, document_type, file_name, file_url } = body;

    if (!employee_id || !file_url) {
      return NextResponse.json(
        { success: false, error: 'employee_id and file_url are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employee_documents')
      .insert([
        {
          employee_id,
          document_type: document_type || 'Other',
          file_name: file_name || 'Uploaded Document',
          file_url,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error creating HR document entry:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}