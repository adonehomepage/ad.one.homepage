import type { PageSection, PageSnapshot } from "@/types";

export type DraftCheckpoint = {
  id: string;
  label: string;
  savedAt: string;
  sections: PageSection[];
  globalSettings: Record<string, unknown>;
  formSettings: PageSnapshot["formSettings"];
  seoSettings: PageSnapshot["seoSettings"];
  privacySettings: PageSnapshot["privacy"];
};

const MAX_CHECKPOINTS = 10;

function key(projectId: string) {
  return `adone-draft-checkpoints-${projectId}`;
}

export function listCheckpoints(projectId: string): DraftCheckpoint[] {
  try {
    const raw = window.localStorage.getItem(key(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftCheckpoint[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_CHECKPOINTS) : [];
  } catch {
    return [];
  }
}

export function saveCheckpoint(projectId: string, checkpoint: Omit<DraftCheckpoint, "id" | "savedAt">): DraftCheckpoint[] {
  const next: DraftCheckpoint = {
    ...checkpoint,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    label: checkpoint.label.trim().slice(0, 40),
  };
  const stored = [next, ...listCheckpoints(projectId)].slice(0, MAX_CHECKPOINTS);
  window.localStorage.setItem(key(projectId), JSON.stringify(stored));
  return stored;
}

export function deleteCheckpoint(projectId: string, id: string): DraftCheckpoint[] {
  const stored = listCheckpoints(projectId).filter((item) => item.id !== id);
  window.localStorage.setItem(key(projectId), JSON.stringify(stored));
  return stored;
}
