import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch total employees count
    const { count: totalEmployees, error: empErr } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (empErr) throw empErr;

    // 2. Fetch pending shift logs
    const { data: pendingShifts, error: pendingErr } = await supabase
      .from('shift_logs')
      .select('id, overtime_hours, status, created_at, site_location, employee_id')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (pendingErr) throw pendingErr;

    // 3. Extract unique employee IDs and fetch split names
    const employeeIds = Array.from(
      new Set((pendingShifts || []).map((s) => s.employee_id).filter(Boolean))
    );

    let employeeMap = {};

    if (employeeIds.length > 0) {
      const { data: empList, error: empListErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);

      if (empListErr) throw empListErr;

      (empList || []).forEach((e) => {
        const fullName = `${e.first_name || ''} ${e.last_name || ''}`.trim();
        employeeMap[e.id] = fullName || 'Unnamed Employee';
      });
    }

    // 4. Calculate Staging & Readiness Metrics
    const { count: approvedShiftsCount } = await supabase
      .from('shift_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'APPROVED');

    const { count: totalShiftsCount } = await supabase
      .from('shift_logs')
      .select('*', { count: 'exact', head: true });

    const totalShifts = totalShiftsCount || 0;
    const readinessPercentage = totalShifts > 0 
      ? Math.round(((approvedShiftsCount || 0) / totalShifts) * 100) 
      : 0;

    // 5. Format Queue for UI Rendering
    const pendingQueue = (pendingShifts || []).map((log) => ({
      id: log.id,
      worker: employeeMap[log.employee_id] || 'Field Employee',
      full_name: employeeMap[log.employee_id] || 'Field Employee',
      type: log.overtime_hours > 0 ? `Overtime Review (${log.overtime_hours} hrs)` : 'Standard Shift Audit',
      site: log.site_location || 'Main Operational Site',
      status: log.status === 'PENDING' ? 'Pending Review' : log.status,
      date: new Date(log.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return NextResponse.json({
      success: true,
      stats: {
        activePersonnel: totalEmployees || 0,
        pendingReviews: pendingShifts?.length || 0,
        unmatchedRates: 0,
        readyForStaging: approvedShiftsCount || 0,
        readinessPercentage,
      },
      pendingQueue: pendingQueue.slice(0, 5),
    });
  } catch (error) {
    console.error('HR Dashboard API Error:', error);

    // Fallback response to preserve non-blocking UI state
    return NextResponse.json({
      success: false,
      error: error?.message || 'Database query failed',
      stats: {
        activePersonnel: 0,
        pendingReviews: 0,
        unmatchedRates: 0,
        readyForStaging: 0,
        readinessPercentage: 0,
      },
      pendingQueue: [],
    }, { status: 500 });
  }
}