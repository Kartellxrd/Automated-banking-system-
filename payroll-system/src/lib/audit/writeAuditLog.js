export async function writeAuditLog(db, {
  actorUserId,
  action,
  module,
  entityType = null,
  entityId = null,
  status = 'SUCCESS',
  details = null,
  metadata = {},
}) {
  const { error } = await db.rpc('write_audit_log', {
    p_actor_user_id: actorUserId,
    p_action: action,
    p_module: module,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_status: status,
    p_details: details,
    p_metadata: metadata,
  });

  if (error) {
    console.error('Audit log write failed:', error);
  }
}
