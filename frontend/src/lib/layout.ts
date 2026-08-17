import { Position } from "./types";

const GRID_COLS = 4;
const COL_WIDTH = 260;
const ROW_HEIGHT = 220;

function gridPosition(index: number): Position {
  return { x: (index % GRID_COLS) * COL_WIDTH, y: Math.floor(index / GRID_COLS) * ROW_HEIGHT };
}

function isValidPosition(value: unknown): value is Position {
  if (typeof value !== "object" || value === null) return false;
  const { x, y } = value as Position;
  return Number.isFinite(x) && Number.isFinite(y);
}

export function mergeLayout(
  tableNames: string[],
  layout: Record<string, Position>,
): Record<string, Position> {
  const merged: Record<string, Position> = {};
  let autoIndex = 0;
  for (const name of tableNames) {
    const stored = layout[name];
    if (isValidPosition(stored)) {
      merged[name] = stored;
    } else {
      merged[name] = gridPosition(autoIndex);
      autoIndex += 1;
    }
  }
  return merged;
}

export function layoutsEqual(a: Record<string, Position>, b: Record<string, Position>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => {
    const pa = a[key];
    const pb = b[key];
    return pb !== undefined && pa.x === pb.x && pa.y === pb.y;
  });
}
