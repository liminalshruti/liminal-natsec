import type { ArchetypeMetadata, ArchetypeRole, SpineNode } from "./schema.ts";

const ARCHETYPE_ENABLED_TYPES = new Set<SpineNode["type"]>([
  "anomaly",
  "claim",
  "actionOption",
  "reviewRule"
]);

export function supportsArchetypeMetadata(type: SpineNode["type"]): boolean {
  return ARCHETYPE_ENABLED_TYPES.has(type);
}

export function archetypeForRole(role: ArchetypeRole): ArchetypeMetadata {
  const primaryByRole: Record<ArchetypeRole, string> = {
    perception: "Sage",
    persistence: "Sage",
    epistemic: "Judge",
    decision: "Sovereign",
    review_memory: "Judge"
  };

  return {
    archetype_primary: primaryByRole[role],
    archetype_role: role
  };
}

export function attachArchetype<T extends SpineNode>(
  node: T,
  archetype: ArchetypeMetadata
): T {
  if (!supportsArchetypeMetadata(node.type)) {
    return node;
  }

  return {
    ...node,
    archetype
  };
}
