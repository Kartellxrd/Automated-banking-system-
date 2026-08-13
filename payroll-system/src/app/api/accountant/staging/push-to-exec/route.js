import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { batchIds } = body;

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please provide an array of valid batch IDs' },
        { status: 400 }
      );
    }

    // Perform database batch status update logic here
    const updatedTimestamp = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        message: `Successfully transferred ${batchIds.length} batch(es) to Executive Review queue.`,
        processedBatches: batchIds,
        pushedAt: updatedTimestamp,
        nextStage: 'EXECUTIVE_APPROVAL_REQUIRED',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Batch transmission failed', error: error.message },
      { status: 500 }
    );
  }
}