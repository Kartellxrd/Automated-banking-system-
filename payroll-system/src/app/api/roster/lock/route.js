import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { site, locked_by, date } = await req.json();

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site parameter is required.' },
        { status: 400 }
      );
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // 1. Check if roster is already locked
    const { data: existingLock } = await supabase
      .from('roster_locks')
      .select('id, is_locked')
      .eq('site', site)
      .eq('lock_date', targetDate)
      .single();

    if (existingLock && existingLock.is_locked) {
      return NextResponse.json(
        { success: false, error: `Roster for ${site} on ${targetDate} is already locked.` },
        { status: 400 }
      );
    }

    // 2. Lock shift records for this site and date
    const { error: updateError } = await supabase
      .from('shift_logs')
      .update({ is_locked: true, status: 'Submitted to HR' })
      .eq('site', site)
      .eq('shift_date', targetDate);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // 3. Register or update the Lock Record
    const { data: lockRecord, error: lockError } = await supabase
      .from('roster_locks')
      .upsert({
        site: site,
        lock_date: targetDate,
        is_locked: true,
        locked_by: locked_by || 'Site Clerk',
        locked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (lockError) {
      throw new Error(lockError.message);
    }

    return NextResponse.json({
      success: true,
      message: `Roster for ${site} successfully locked and submitted to HR.`,
      data: lockRecord,
    });
  } catch (error) {
    console.error('Roster Lock API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const site = searchParams.get('site');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site parameter is required.' },
        { status: 400 }
      );
    }

    const { data: lockRecord } = await supabase
      .from('roster_locks')
      .select('*')
      .eq('site', site)
      .eq('lock_date', date)
      .single();

    return NextResponse.json({
      success: true,
      is_locked: lockRecord ? lockRecord.is_locked : false,
      data: lockRecord || null,
    });
  } catch (error) {
    console.error('Roster Lock Status GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}