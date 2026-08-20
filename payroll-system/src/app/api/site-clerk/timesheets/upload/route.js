import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const siteName = formData.get('siteName') || 'Default Site';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Example mock parsing structure returning side-by-side verification rows
    const parsedWorkers = [
      { id: 1, name: 'Kagiso Sekgoma', idNumber: 'BW-9021', timeIn: '07:00 AM', timeOut: '05:00 PM', status: 'matched', hours: 9 },
      { id: 2, name: 'Thabo Molefe', idNumber: 'BW-4412', timeIn: '07:15 AM', timeOut: '05:00 PM', status: 'late', hours: 8.75 },
      { id: 3, name: 'Lesedi Dintwe', idNumber: 'BW-8819', timeIn: '08:30 AM', timeOut: '05:00 PM', status: 'flagged', hours: 7.5 },
    ];

    // Record sheet metadata entry in Supabase timesheets table
    const { data, error } = await supabase
      .from('timesheets')
      .insert([
        {
          site_name: siteName,
          file_name: file.name,
          status: 'pending',
          records_count: parsedWorkers.length,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    return NextResponse.json({
      success: true,
      timesheetId: data?.[0]?.id || 'sheet-temp-id',
      parsedWorkers,
    });
  } catch (err) {
    console.error('Upload Error:', err);
    return NextResponse.json({ error: 'Failed to process document upload.' }, { status: 500 });
  }
}