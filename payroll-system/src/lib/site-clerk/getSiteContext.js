export async function getSiteClerkContext(db, userId) {
  const { data: assignment, error: assignmentError } = await db
    .from('user_site_assignments')
    .select('id, site_id, assigned_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment) return null;

  const { data: site, error: siteError } = await db
    .from('sites')
    .select('id, site_name, location, is_active')
    .eq('id', assignment.site_id)
    .maybeSingle();

  if (siteError) throw siteError;
  if (!site || site.is_active === false) return null;

  return { assignment, site };
}
