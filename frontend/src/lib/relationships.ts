export type Cardinality = "1" | "*";

export interface RelationshipTable {
  name: string;
  fields: { name: string }[];
}

export interface RelationshipRefEndpoint {
  tableName: string;
  fieldNames: string[];
  relation: string;
}

export interface RelationshipRef {
  endpoints: RelationshipRefEndpoint[];
}

export interface RelationshipEdge {
  id: string;
  source: string;
  sourceHandle: string;
  sourceCardinality: Cardinality;
  target: string;
  targetHandle: string;
  targetCardinality: Cardinality;
  selfReferencing: boolean;
  dangling: boolean;
  danglingReason?: string;
}

function cardinalityOf(relation: string): Cardinality {
  return relation === "1" ? "1" : "*";
}

function describeMissing(endpoint: RelationshipRefEndpoint, table: RelationshipTable | undefined): string | null {
  const fieldName = endpoint.fieldNames[0];
  if (!table) {
    return `table "${endpoint.tableName}" not found`;
  }
  if (!table.fields.some((field) => field.name === fieldName)) {
    return `field "${endpoint.tableName}.${fieldName}" not found`;
  }
  return null;
}

/**
 * Maps parsed DBML refs to field-level edge descriptors. Every Ref becomes
 * exactly one edge, even when it names a table/field that doesn't currently
 * exist (dangling: true) or references the same table on both ends
 * (selfReferencing: true) — callers decide how to render those, this stays
 * plain data so it's testable without react-flow.
 */
export function buildRelationshipEdges(
  tables: RelationshipTable[],
  refs: RelationshipRef[],
): RelationshipEdge[] {
  const tablesByName = new Map(tables.map((table) => [table.name, table]));

  return refs.map((ref, index) => {
    const [sourceEndpoint, targetEndpoint] = ref.endpoints;
    const sourceTable = tablesByName.get(sourceEndpoint.tableName);
    const targetTable = tablesByName.get(targetEndpoint.tableName);

    const reasons = [sourceEndpoint, targetEndpoint]
      .map((endpoint, i) => describeMissing(endpoint, i === 0 ? sourceTable : targetTable))
      .filter((reason): reason is string => reason !== null);

    return {
      id: `ref-${index}-${sourceEndpoint.tableName}.${sourceEndpoint.fieldNames[0]}-${targetEndpoint.tableName}.${targetEndpoint.fieldNames[0]}`,
      source: sourceEndpoint.tableName,
      sourceHandle: sourceEndpoint.fieldNames[0],
      sourceCardinality: cardinalityOf(sourceEndpoint.relation),
      target: targetEndpoint.tableName,
      targetHandle: targetEndpoint.fieldNames[0],
      targetCardinality: cardinalityOf(targetEndpoint.relation),
      selfReferencing: sourceEndpoint.tableName === targetEndpoint.tableName,
      dangling: reasons.length > 0,
      danglingReason: reasons.length > 0 ? reasons.join("; ") : undefined,
    };
  });
}
