import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 250, 1), 500);
    const db = createSupabaseAdminClient();

    const { data: logs, error } = await db
      .from('audit_logs')
      .select('id, actor_user_id, action, module, entity_type, entity_id, status, details, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const actorIds = [...new Set((logs || []).map((log) => log.actor_user_id).filter(Boolean))];
    let actors = [];
    if (actorIds.length) {
      const { data, error: actorError } = await db.from('profiles').select('id, first_name, last_name, email, role').in('id', actorIds);
      if (actorError) throw actorError;
      actors = data || [];
    }
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
    const data = (logs || []).map((log) => ({ ...log, actor: log.actor_user_id ? actorMap.get(log.actor_user_id) || null : null }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Audit logs GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load audit logs.' }, { status: 500 });
  }
}
