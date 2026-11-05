import { EditorShell } from "@/modules/editor/editor-shell";

export const metadata = { title: "편집" };

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <EditorShell projectId={projectId} />;
}
