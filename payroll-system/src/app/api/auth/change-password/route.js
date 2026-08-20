import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Update password for current authenticated user
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password Update Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}