import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, auditNotes } = body;

    const validStatuses = ['Audited', 'Flagged', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Replace with real DB update (e.g., Prisma / Supabase / SQL)
    return NextResponse.json({
      success: true,
      message: `Variance ${id} status updated to ${status}`,
      data: {
        id,
        status,
        auditNotes: auditNotes || null,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error updating variance record', error: error.message },
      { status: 500 }
    );
  }
}