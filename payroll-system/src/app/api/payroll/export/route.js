import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pay_period_id = searchParams.get('pay_period_id');

    let query = supabase.from('payroll_entries').select('*');
    if (pay_period_id) {
      query = query.eq('pay_period_id', pay_period_id);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payroll records available for export.' },
        { status: 404 }
      );
    }

    // Build CSV content
    const headers = [
      'Employee Code',
      'First Name',
      'Last Name',
      'Hourly Rate (BWP)',
      'Regular Hours',
      'Overtime Hours',
      'Gross Pay (BWP)',
      'Payment Channel',
      'Account Number',
      'Status'
    ];

    const csvRows = [headers.join(',')];

    entries.forEach((row) => {
      const values = [
        `"${row.employee_code || row.employee_id || ''}"`,
        `"${row.first_name || ''}"`,
        `"${row.last_name || ''}"`,
        row.hourly_rate || 0,
        row.regular_hours || 0,
        row.overtime_hours || 0,
        row.gross_pay || 0,
        `"${row.payment_channel || 'Bank Transfer'}"`,
        `"${row.account_number || ''}"`,
        `"${row.status || 'Draft'}"`
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const filename = `payroll_export_${pay_period_id ? pay_period_id.slice(0, 8) : 'all'}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}