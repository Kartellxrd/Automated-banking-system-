import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pay_period_id } = body;

    // 1. Fetch active employees with hourly rates and payment details
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name, hourly_rate, payment_channel, account_number');

    if (empError) throw empError;

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employee records found.' },
        { status: 404 }
      );
    }

    // 2. Build query for logged hours (filtered by pay_period_id if supplied)
    let hoursQuery = supabase.from('hours_logged').select('*');
    if (pay_period_id) {
      hoursQuery = hoursQuery.eq('pay_period_id', pay_period_id);
    }

    const { data: hoursData, error: hoursError } = await hoursQuery;
    if (hoursError) throw hoursError;

    // 3. Aggregate hours per worker
    const aggregatedHours = new Map();
    (hoursData || []).forEach((log) => {
      const current = aggregatedHours.get(log.employee_id) || { reg: 0, ot: 0 };
      const reg = parseFloat(log.regular_hours || log.hours_worked || 0);
      const ot = parseFloat(log.overtime_hours || 0);
      aggregatedHours.set(log.employee_id, {
        reg: current.reg + reg,
        ot: current.ot + ot,
      });
    });

    // 4. Compute wages for each worker
    const calculatedEntries = employees.map((emp) => {
      const hours = aggregatedHours.get(emp.id) || { reg: 0, ot: 0 };
      const rate = parseFloat(emp.hourly_rate || 0);
      const otRate = rate * 1.5;

      const regularPay = hours.reg * rate;
      const overtimePay = hours.ot * otRate;
      const grossPay = regularPay + overtimePay;

      return {
        pay_period_id: pay_period_id || null,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        hourly_rate: rate,
        regular_hours: hours.reg,
        overtime_hours: hours.ot,
        gross_pay: Number(grossPay.toFixed(2)),
        net_pay: Number(grossPay.toFixed(2)), // Adjust if tax deductions apply
        payment_channel: emp.payment_channel || 'Bank Transfer',
        account_number: emp.account_number || '',
        status: 'Draft',
        updated_at: new Date().toISOString(),
      };
    });

    // 5. Save/upsert records to payroll_entries
    const { data: savedEntries, error: saveError } = await supabase
      .from('payroll_entries')
      .upsert(calculatedEntries, { onConflict: 'pay_period_id,employee_id' })
      .select();

    if (saveError) throw saveError;

    return NextResponse.json({
      success: true,
      message: `Successfully calculated payroll for ${calculatedEntries.length} employees.`,
      data: savedEntries || calculatedEntries,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}