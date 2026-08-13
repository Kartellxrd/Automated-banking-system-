import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PATCH(req) {
  try {
    const { shift_id, ot_hours, audit_note, site } = await req.json();

    if (!shift_id || ot_hours === undefined || !audit_note?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Shift ID, OT hours, and a mandatory audit note are required.' },
        { status: 400 }
      );
    }

    // 1. Verify if the roster for this shift is locked
    const { data: shift } = await supabase
      .from('shift_logs')
      .select('is_locked, site')
      .eq('id', shift_id)
      .single();

    if (shift && shift.is_locked) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify variance: This roster is already locked and submitted to HR.' },
        { status: 403 }
      );
    }

    // 2. Update overtime and attach variance audit note
    const { data: updatedShift, error: updateError } = await supabase
      .from('shift_logs')
      .update({
        ot_hours: parseFloat(ot_hours),
        variance_note: audit_note,
        status: 'Adjusted & Verified',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shift_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Shift variance updated successfully.',
      data: updatedShift,
    });
  } catch (error) {
    console.error('Shift Variance API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}