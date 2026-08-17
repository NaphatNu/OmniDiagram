import { notFound } from "next/navigation";

export default async function DiagramEditorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await params;
  notFound();
}
