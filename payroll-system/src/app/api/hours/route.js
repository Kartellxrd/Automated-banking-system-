import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculatePay } from '@/lib/payroll-math';

/**
 * GET: Fetch or initialize payroll entries for a given pay period
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let payPeriodId = searchParams.get('pay_period_id');

    // 1. Fetch active pay period or create a default one if none exists
    if (!payPeriodId) {
      const { data: latestPeriod, error: periodError } = await supabase
        .from('pay_periods')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (periodError && periodError.code !== 'PGRST116') throw periodError;

      if (latestPeriod) {
        payPeriodId = latestPeriod.id;
      } else {
        const { data: newPeriod, error: createError } = await supabase
          .from('pay_periods')
          .insert([
            {
              period_name: 'Current Pay Period',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0]
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        payPeriodId = newPeriod.id;
      }
    }

    // 2. Fetch all active workers (explicit field selection: first_name & last_name separated)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name, hourly_rate')
      .eq('is_active', true)
      .order('employee_code', { ascending: true });

    if (empError) throw empError;

    // 3. Fetch existing payroll entries for this pay period
    const { data: existingEntries, error: entryError } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('pay_period_id', payPeriodId);

    if (entryError) throw entryError;

    // Map existing entries by employee_id for quick O(1) lookup
    const entryMap = new Map();
    (existingEntries || []).forEach((entry) => {
      entryMap.set(entry.employee_id, entry);
    });

    // 4. Combine employees with their existing hours metadata
    const records = employees.map((emp) => {
      const existing = entryMap.get(emp.id);

      const regularHours = existing ? parseFloat(existing.regular_hours || 0) : 0;
      const overtimeHours = existing ? parseFloat(existing.overtime_hours || 0) : 0;
      const totalHours = existing 
        ? parseFloat(existing.total_hours_worked || regularHours + overtimeHours) 
        : 0;

      const baseRate = parseFloat(emp.hourly_rate || 0);
      const otRate = existing?.applied_overtime_rate 
        ? parseFloat(existing.applied_overtime_rate) 
        : baseRate * 1.5;

      return {
        employee_id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        hourly_rate: baseRate,
        overtime_rate: otRate,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        total_hours_worked: totalHours,
        gross_pay: existing ? parseFloat(existing.gross_pay || 0) : 0,
        net_pay: existing ? parseFloat(existing.net_pay || 0) : 0,
        entry_id: existing ? existing.id : null
      };
    });

    return NextResponse.json({
      success: true,
      pay_period_id: payPeriodId,
      data: records
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Batch save/update regular and overtime hours off paper logbooks
 */
export async function POST(request) {
  try {
    const body = await request.json();
    let { pay_period_id, entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { success: false, error: 'Missing entries payload array' },
        { status: 400 }
      );
    }

    // Determine target pay period if not provided
    if (!pay_period_id) {
      const { data: latestPeriod, error: periodError } = await supabase
        .from('pay_periods')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestPeriod) {
        pay_period_id = latestPeriod.id;
      } else {
        const { data: newPeriod, error: createError } = await supabase
          .from('pay_periods')
          .insert([
            {
              period_name: 'Current Pay Period',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0]
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        pay_period_id = newPeriod.id;
      }
    }

    // Process and normalize payroll calculation payloads
    const payload = entries.map((item) => {
      const empId = item.employee_id || item.worker_id;

      const regHours = parseFloat(item.regular_hours) || 0;
      const otHours = parseFloat(item.overtime_hours) || 0;
      const totalHours = item.total_hours_worked != null 
        ? parseFloat(item.total_hours_worked) 
        : (regHours + otHours);

      const baseRate = parseFloat(item.hourly_rate ?? item.rate) || 0;
      const otRate = item.overtime_rate != null 
        ? parseFloat(item.overtime_rate) 
        : baseRate * 1.5;

      // Business math fallbacks
      const calculated = calculatePay ? calculatePay({ regularHours: regHours, overtimeHours: otHours, baseRate, otRate }) : null;

      const grossPay = item.gross_pay != null
        ? parseFloat(item.gross_pay)
        : (calculated?.grossPay ?? (regHours * baseRate + otHours * otRate));

      const taxDeductions = item.tax_deductions != null
        ? parseFloat(item.tax_deductions)
        : (calculated?.taxDeductions ?? 0);

      const netPay = item.net_pay != null
        ? parseFloat(item.net_pay)
        : (calculated?.netPay ?? (grossPay - taxDeductions));

      return {
        pay_period_id,
        employee_id: empId,
        applied_hourly_rate: baseRate,
        applied_overtime_rate: otRate,
        regular_hours: regHours,
        overtime_hours: otHours,
        total_hours_worked: totalHours,
        gross_pay: grossPay,
        tax_deductions: taxDeductions,
        net_pay: netPay,
        status: 'Draft'
      };
    });

    // Upsert entries into database (Conflict targeted on pay_period_id + employee_id)
    const { data, error } = await supabase
      .from('payroll_entries')
      .upsert(payload, { onConflict: 'pay_period_id,employee_id' })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}