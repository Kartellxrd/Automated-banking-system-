import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch active personnel count
    const { count: activePersonnel } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true });

    // 2. Fetch pending roster batches from field clerks
    const { data: rosterData } = await supabase
      .from('daily_site_rosters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. Fetch unverified shift logs
    const { data: shiftData } = await supabase
      .from('shift_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    // 4. Transform queue items to guarantee all expected properties exist
    const formattedQueue = (shiftData || []).map((shift) => ({
      id: String(shift.id),
      worker: shift.worker_name || shift.employee_name || 'Field Worker',
      site: shift.site_location || shift.site_name || 'Unassigned Site',
      type: `${shift.regular_hours || 8}h Reg / ${shift.overtime_hours || 0}h OT`,
      date: shift.shift_date || new Date(shift.created_at).toLocaleDateString(),
      status: shift.status || 'PENDING',
    }));

    // 5. Calculate pending reviews & staging stats
    const pendingReviewsCount = formattedQueue.filter(
      (s) => String(s.status).toUpperCase() === 'PENDING'
    ).length;

    const readyForStaging = formattedQueue.filter(
      (s) => String(s.status).toUpperCase() === 'APPROVED'
    ).length;

    const total = pendingReviewsCount + readyForStaging;
    const readinessPercentage = total > 0 ? Math.round((readyForStaging / total) * 100) : 100;

    return NextResponse.json({
      success: true,
      stats: {
        activePersonnel: activePersonnel || 0,
        pendingReviews: pendingReviewsCount,
        readyForStaging: readyForStaging,
        unmatchedRates: 0,
        readinessPercentage,
      },
      pendingRosters: rosterData || [],
      pendingQueue: formattedQueue,
    });
  } catch (err) {
    console.error('HR Dashboard GET error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Database fetch failed' },
      { status: 500 }
    );
  }
}