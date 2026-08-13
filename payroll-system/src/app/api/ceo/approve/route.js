import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { batchId, pin, amount, batchName, bankProvider } = await req.json();

    // 1. Verify 4-Digit Executive Security PIN
    if (pin !== '1234') {
      return NextResponse.json(
        { success: false, message: 'Invalid Executive Security PIN.' },
        { status: 401 }
      );
    }

    // 2. Format a Flutterwave Sandbox test reference (ending in _PMCK forces success)
    const transferRef = `PAYROLL-${batchId}-${Date.now()}_PMCK`;

    // 3. Make real HTTP POST call to Flutterwave Sandbox API
    const response = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      },
      body: JSON.stringify({
        account_bank: '044', // Standard Access Bank sandbox code
        account_number: '0690000031', // Standard Sandbox test account number
        amount: amount || 88450.00,
        currency: 'BWP', // Botswana Pula
        narration: `Payroll Outflow Execution - ${batchName || batchId}`,
        reference: transferRef,
        callback_url: 'https://webhook.site',
      }),
    });

    const flwData = await response.json();

    // 4. Handle response from Flutterwave
    if (flwData.status === 'success' || flwData.data?.id) {
      const receipt = {
        receiptNumber: `RCT-${Math.floor(100000 + Math.random() * 900000)}`,
        flutterwaveTransferId: flwData.data?.id || `FLW-TX-${Date.now()}`,
        transactionRef: flwData.data?.reference || transferRef,
        batchId: batchId,
        batchName: batchName || 'Payroll Outflow',
        amount: amount,
        bankProvider: bankProvider || 'First National Bank Botswana',
        status: flwData.data?.status || 'SUCCESSFUL',
        timestamp: flwData.data?.created_at || new Date().toISOString(),
        authorizedBy: 'CEO Executive Sign-Off (PIN Verified)',
      };

      return NextResponse.json({
        success: true,
        message: 'Batch disbursement executed successfully via Flutterwave.',
        receipt: receipt,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: flwData.message || 'Gateway rejected payout transaction.',
      });
    }
  } catch (error) {
    console.error('Flutterwave API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Network exception connecting to payment gateway.' },
      { status: 500 }
    );
  }
}