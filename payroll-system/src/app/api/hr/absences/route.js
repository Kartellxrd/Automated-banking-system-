import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Adjust this path to match your Supabase helper

// 1. GET: Fetch all absence records sorted by creation date
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('absences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Map database snake_case columns back to camelCase for the frontend UI
    const formattedData = (data || []).map((item) => ({
      id: item.id,
      workerName: item.worker_name,
      workerId: item.worker_id,
      site: item.site_name,
      absenceType: item.absence_type,
      submittedDate: item.submitted_date || item.created_at?.split('T')[0],
      startDate: item.start_date,
      endDate: item.end_date,
      status: item.status,
      doctorName: item.doctor_name,
      fileName: item.file_name,
      fileUrl: item.file_url,
      notes: item.notes,
      rejectionReason: item.rejection_reason,
    }));

    return NextResponse.json({ success: true, data: formattedData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 2. POST: Create a new HR-entered absence record
export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      workerName,
      workerId,
      site,
      absenceType,
      startDate,
      endDate,
      doctorName,
      fileName,
      fileUrl,
      notes,
    } = body;

    const { data, error } = await supabase
      .from('absences')
      .insert([
        {
          worker_name: workerName,
          worker_id: workerId,
          site_name: site,
          absence_type: absenceType,
          start_date: startDate,
          end_date: endDate,
          submitted_date: new Date().toISOString().split('T')[0],
          status: 'Pending',
          doctor_name: doctorName || null,
          file_name: fileName || null,
          file_url: fileUrl || null,
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Format new record response for UI
    const newRecord = {
      id: data.id,
      workerName: data.worker_name,
      workerId: data.worker_id,
      site: data.site_name,
      absenceType: data.absence_type,
      submittedDate: data.submitted_date,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status,
      doctorName: data.doctor_name,
      fileName: data.file_name,
      fileUrl: data.file_url,
      notes: data.notes,
    };

    return NextResponse.json({ success: true, data: newRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Invalid payload' },
      { status: 400 }
    );
  }
}

// 3. PATCH: Update absence status (Approve / Reject)
export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { id, status, reason } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id and status' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('absences')
      .update({
        status: status,
        rejection_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Absence ${id} updated to ${status}`,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Invalid payload' },
      { status: 400 }
    );
  }
}