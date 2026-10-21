"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from "@/components/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { deleteCheckpoint, listCheckpoints, saveCheckpoint, type DraftCheckpoint } from "@/modules/editor/checkpoints";
import type { PageSection, PageSnapshot } from "@/types";

function shellText(settings: Record<string, unknown>, key: string, fallback: string) {
  return String(settings[key] ?? "").trim() || fallback;
}

export function CheckpointDialog({
  projectId,
  sections,
  globalSettings,
  formSettings,
  seoSettings,
  privacySettings,
  onRestore,
  onClose,
}: {
  projectId: string;
  sections: PageSection[];
  globalSettings: Record<string, unknown>;
  formSettings: PageSnapshot["formSettings"];
  seoSettings: PageSnapshot["seoSettings"];
  privacySettings: PageSnapshot["privacy"];
  onRestore: (checkpoint: DraftCheckpoint) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<DraftCheckpoint[]>([]);
  const [label, setLabel] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<{ type: "restore" | "delete"; item: DraftCheckpoint } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(listCheckpoints(projectId));
  }, [projectId]);

  useDialogFocusTrap({
    open: true,
    panelRef,
    initialFocusRef: inputRef,
    onEscape: onClose,
    escapeEnabled: !pending,
  });

  function save() {
    const name = label.trim();
    if (!name) {
      setNotice(shellText(globalSettings, "shellCheckpointNeedName", "이름을 입력하세요."));
      return;
    }
    setItems(saveCheckpoint(projectId, { label: name, sections, globalSettings, formSettings, seoSettings, privacySettings }));
    setLabel("");
    setNotice(shellText(globalSettings, "shellCheckpointSaved", "이 브라우저에 임시 저장했습니다. 공개 페이지는 바뀌지 않습니다."));
  }

  return (
    <>
      <DialogShell titleId="checkpoint-dialog-title" panelRef={panelRef} onClose={onClose} closeLabel={shellText(globalSettings, "shellClose", "닫기")} size="md">
        <DialogHeader titleId="checkpoint-dialog-title" title={shellText(globalSettings, "shellCheckpoint", "임시 저장")} onClose={onClose} closeLabel={shellText(globalSettings, "shellClose", "닫기")} />
        <DialogBody>
          <p className="text-sm leading-relaxed text-text-body">
            {shellText(
              globalSettings,
              "shellCheckpointBody",
              "지금 작업본을 이 브라우저에 최대 10개까지 남겨 둡니다. 되돌리면 작업본만 바뀌고, 공개 페이지는 다시 발행해야 반영됩니다.",
            )}
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              ref={inputRef}
              value={label}
              maxLength={40}
              className="h-11 min-h-11 text-sm"
              placeholder={shellText(globalSettings, "shellCheckpointName", "저장 이름")}
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
              }}
            />
            <Button type="button" className="h-11 shrink-0 px-4 text-[15px]" onClick={save}>
              {shellText(globalSettings, "shellCheckpointSave", "저장")}
            </Button>
          </div>
          {notice ? (
            <p className="mt-2 text-sm text-primary" role="status" aria-live="polite">
              {notice}
            </p>
          ) : null}
          <ul className="mt-4 space-y-2">
            {items.length === 0 ? (
              <li className="rounded-[14px] border border-dashed border-border px-3 py-4 text-sm text-text-muted">{shellText(globalSettings, "shellCheckpointEmpty", "아직 임시 저장이 없습니다.")}</li>
            ) : null}
            {items.map((item) => (
              <li key={item.id} className="rounded-[14px] border border-border px-3 py-3">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-text-muted">{new Date(item.savedAt).toLocaleString("ko-KR")}</p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="soft" className="h-9 px-3 text-sm" onClick={() => setPending({ type: "restore", item })}>
                    {shellText(globalSettings, "shellCheckpointRestoreButton", "이 내용으로 되돌리기")}
                  </Button>
                  <Button type="button" variant="ghost" className="h-9 px-3 text-sm" onClick={() => setPending({ type: "delete", item })}>
                    {shellText(globalSettings, "editRemove", "삭제")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" className="h-11 px-4 text-[15px]" onClick={onClose}>
            {shellText(globalSettings, "shellClose", "닫기")}
          </Button>
        </DialogFooter>
      </DialogShell>
      <ConfirmDialog
        open={pending?.type === "restore"}
        title={shellText(globalSettings, "shellCheckpointRestoreButton", "이 내용으로 되돌리기")}
        description={shellText(globalSettings, "shellCheckpointRestore", "이 임시 저장으로 작업본을 바꿉니다. 공개 페이지는 다시 발행해야 바뀝니다.")}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.item) onRestore(pending.item);
          setPending(null);
        }}
      />
      <ConfirmDialog
        open={pending?.type === "delete"}
        title={shellText(globalSettings, "editRemove", "삭제")}
        description={shellText(globalSettings, "shellCheckpointDelete", "이 임시 저장을 삭제할까요?")}
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.item) setItems(deleteCheckpoint(projectId, pending.item.id));
          setPending(null);
        }}
      />
    </>
  );
}
