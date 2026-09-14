import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 10 characters long.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'A valid password-recovery session is required.' },
        { status: 401 }
      );
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (passwordError) {
      return NextResponse.json(
        { success: false, error: passwordError.message },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Password changed but profile flag update failed:', profileError);
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('Password Update Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
