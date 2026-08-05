import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculatePay } from '@/lib/payroll-math';

// GET: Fetch or initialize payroll entries for a given pay period
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let payPeriodId = searchParams.get('pay_period_id');

    // 1. If no pay_period_id provided, fetch the most recent active period
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
        // Create default initial pay period if none exists
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

    // 2. Fetch all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name, hourly_rate')
      .eq('is_active', true)
      .order('employee_code', { ascending: true });

    if (empError) throw empError;

    // 3. Fetch existing entries for this pay period
    const { data: existingEntries, error: entryError } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('pay_period_id', payPeriodId);

    if (entryError) throw entryError;

    // Map existing entries by employee_id for fast lookup
    const entryMap = new Map();
    (existingEntries || []).forEach((entry) => {
      entryMap.set(entry.employee_id, entry);
    });

    // 4. Combine employees with their recorded hours
    const records = employees.map((emp) => {
      const existing = entryMap.get(emp.id);
      return {
        employee_id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        hourly_rate: emp.hourly_rate,
        total_hours_worked: existing ? existing.total_hours_worked : 0,
        gross_pay: existing ? existing.gross_pay : 0,
        net_pay: existing ? existing.net_pay : 0,
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

// POST: Batch save/update total hours off paper logbooks
export async function POST(request) {
  try {
    const body = await request.json();
    let { pay_period_id, entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { success: false, error: 'Missing entries array' },
        { status: 400 }
      );
    }

    // If pay_period_id was not supplied by frontend, grab or create active period
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

    const payload = entries.map((item) => {
      const empId = item.employee_id || item.worker_id;
      const hours = parseFloat(item.total_hours_worked ?? item.hours_worked ?? item.hours) || 0;
      const rate = parseFloat(item.hourly_rate ?? item.rate) || 0;

      // Calculate values directly
      const calculated = calculatePay(hours, rate) || {};
      const grossPay = item.gross_pay != null 
        ? parseFloat(item.gross_pay) 
        : (calculated.grossPay != null ? calculated.grossPay : hours * rate);

      const taxDeductions = item.tax_deductions != null 
        ? parseFloat(item.tax_deductions) 
        : (calculated.taxDeductions != null ? calculated.taxDeductions : 0);

      const netPay = item.net_pay != null 
        ? parseFloat(item.net_pay) 
        : (calculated.netPay != null ? calculated.netPay : grossPay - taxDeductions);

      return {
        pay_period_id,
        employee_id: empId,
        applied_hourly_rate: rate,
        total_hours_worked: hours,
        gross_pay: grossPay,
        tax_deductions: taxDeductions,
        net_pay: netPay,
        status: 'Draft'
      };
    });

    // Upsert entries into database (Conflict on pay_period_id + employee_id)
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