import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, routingVerified } = body;

    // Database update mock
    const updatedBatch = {
      id,
      ...(status && { status }),
      ...(typeof routingVerified === 'boolean' && { routingVerified }),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Batch ${id} successfully updated`,
      data: updatedBatch,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update staging batch', error: error.message },
      { status: 500 }
    );
  }
}