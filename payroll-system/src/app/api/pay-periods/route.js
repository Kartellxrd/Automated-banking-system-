import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Retrieve all pay periods and flag the current active one
export async function GET() {
  try {
    const { data: periods, error } = await supabase
      .from('pay_periods')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;

    const activePeriod = periods.find((p) => p.status === 'Active') || periods[0] || null;

    return NextResponse.json({
      success: true,
      activePeriod,
      periods: periods || [],
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a new pay period or update status (e.g. Close cycle)
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, period_name, start_date, end_date, period_id } = body;

    // Action 1: Close an active period
    if (action === 'CLOSE') {
      const { error } = await supabase
        .from('pay_periods')
        .update({ status: 'Closed' })
        .eq('id', period_id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Pay period closed.' });
    }

    // Action 2: Create a new pay period (automatically sets existing Active ones to Closed)
    if (!period_name || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: period_name, start_date, end_date' },
        { status: 400 }
      );
    }

    // Close all current active periods first so only one is active
    await supabase.from('pay_periods').update({ status: 'Closed' }).eq('status', 'Active');

    // Insert new active period
    const { data: newPeriod, error: insertError } = await supabase
      .from('pay_periods')
      .insert([
        {
          period_name,
          start_date,
          end_date,
          status: 'Active',
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: 'New pay period created successfully.',
      period: newPeriod,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}