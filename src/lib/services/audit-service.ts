import { supabaseAdmin } from '@/lib/db/client';
import type { ActorType, AuditAction } from '@/lib/types/domain';

export async function createAuditLog(params: {
  actorId: string | null;
  actorType: ActorType;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  outcome: 'success' | 'failure';
}) {
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    actor_id: params.actorId,
    actor_type: params.actorType,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    metadata: params.metadata ?? {},
    outcome: params.outcome,
  });

  if (error) {
    console.error('Failed to create audit log:', error.message);
  }
}
