import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch active employees count
    const { count: activePersonnel, error: empErr } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    if (empErr) console.error('Error fetching employees count:', empErr);

    // 2. Fetch pending shift logs with employee join
    const { data: pendingShifts, error: shiftErr } = await supabase
      .from('shifts')
      .select(`
        id,
        shift_date,
        shift_type,
        status,
        site_name,
        employees!left (
          first_name,
          last_name,
          employee_code
        )
      `)
      .eq('status', 'PENDING')
      .order('shift_date', { ascending: false })
      .limit(10);

    if (shiftErr) console.error('Error fetching pending shifts:', shiftErr);

    // 3. Count total pending reviews
    const { count: pendingReviewsCount, error: pendingCountErr } = await supabase
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (pendingCountErr) console.error('Error counting pending shifts:', pendingCountErr);

    // 4. Count ready for staging timesheets
    const { count: readyForStaging, error: stagingErr } = await supabase
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'APPROVED');

    if (stagingErr) console.error('Error counting staging shifts:', stagingErr);

    // 5. Count rate audit alerts (unmatched rates)
    const { count: unmatchedRates, error: ratesErr } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .or('hourly_rate.is.null,hourly_rate.eq.0');

    if (ratesErr) console.error('Error checking unmatched rates:', ratesErr);

    // Calculate readiness percentage
    const totalShifts = (pendingReviewsCount || 0) + (readyForStaging || 0);
    const readinessPercentage = totalShifts > 0 
      ? Math.round(((readyForStaging || 0) / totalShifts) * 100) 
      : 100;

    // Format pending queue items safely
    const formattedQueue = (pendingShifts || []).map((shift) => {
      const emp = shift.employees;
      const workerName = emp 
        ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() 
        : 'Unassigned Staff';

      return {
        id: shift.id,
        worker: workerName,
        site: shift.site_name || 'Main Site',
        type: shift.shift_type || 'Regular Shift',
        date: shift.shift_date || 'Today',
        status: shift.status || 'PENDING',
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        activePersonnel: activePersonnel || 0,
        pendingReviews: pendingReviewsCount || 0,
        readyForStaging: readyForStaging || 0,
        unmatchedRates: unmatchedRates || 0,
        readinessPercentage,
      },
      pendingQueue: formattedQueue,
    });
  } catch (error) {
    console.error('HR Dashboard API error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error fetching HR metrics.' },
      { status: 500 }
    );
  }
}