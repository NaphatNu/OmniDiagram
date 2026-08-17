import { Diagram, DiagramKind, DiagramPatch, DiagramSummary, RevisionSummary } from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      if (typeof body?.error === "string") {
        message = body.error;
      }
    } catch {
      message = response.statusText;
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export function listDiagrams(): Promise<DiagramSummary[]> {
  return request("/api/admin/diagrams");
}

export function createDiagram(kind: DiagramKind, title?: string): Promise<Diagram> {
  return request("/api/admin/diagrams", {
    method: "POST",
    body: JSON.stringify({ kind, title }),
  });
}

export function deleteDiagram(shareToken: string): Promise<void> {
  return request(`/api/admin/diagrams/${shareToken}`, { method: "DELETE" });
}

export function getDiagram(shareToken: string): Promise<Diagram> {
  return request(`/api/diagrams/${shareToken}`);
}

export function updateDiagram(shareToken: string, patch: DiagramPatch): Promise<Diagram> {
  return request(`/api/diagrams/${shareToken}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function listRevisions(shareToken: string): Promise<RevisionSummary[]> {
  return request(`/api/diagrams/${shareToken}/revisions`);
}

export function revertToRevision(shareToken: string, revisionId: string): Promise<Diagram> {
  return request(`/api/diagrams/${shareToken}/revisions/${revisionId}/revert`, {
    method: "POST",
  });
}
