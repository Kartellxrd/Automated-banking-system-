import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { site_location } = body;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Fetch today's records for this site location
    const { data: records, error } = await supabase
      .from('site_attendance')
      .select('*')
      .eq('site_location', site_location || 'Debete Site')
      .gte('created_at', startOfDay.toISOString());

    if (error) throw error;

    const summary = {
      total_logs: records.length,
      currently_active: records.filter((r) => !r.clock_out).length,
      completed_shifts: records.filter((r) => r.clock_out).length,
      submitted_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Shift summary calculated successfully',
      data: summary,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}