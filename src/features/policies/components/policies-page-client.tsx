"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { createPolicyDocumentAction } from "../actions";

const initial: FormState = {};

export function PoliciesPageClient({
  documents,
  acceptances,
}: {
  documents: {
    id: string;
    name: string;
    version: number;
    file_id: string;
    isActive: boolean;
    createdAt: Date;
  }[];
  acceptances: {
    id: string;
    clientName: string | null;
    clientEmail: string | null;
    groupTypeName: string | null;
    policyDocumentVersion: number;
    acceptedAt: Date;
    ipAddress: string | null;
  }[];
}) {
  const t = useTranslations("policies");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePolicyForm />
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("version")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("file")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell className="tabular-nums">{doc.version}</TableCell>
                <TableCell>
                  <Badge variant={doc.isActive ? "success" : "outline"}>
                    {doc.isActive ? t("active") : t("inactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ViewDocumentButton fileId={doc.file_id} />
                </TableCell>
                <TableCell className="text-right">
                  {doc.isActive ? <UploadVersionButton policyDocId={doc.id} /> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {acceptances.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{t("acceptanceHistory.title")}</h2>
            <p className="text-muted-foreground text-sm">{t("acceptanceHistory.subtitle")}</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("acceptanceHistory.client")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("acceptanceHistory.version")}</TableHead>
                <TableHead>{t("acceptanceHistory.acceptedAt")}</TableHead>
                <TableHead>{t("acceptanceHistory.ip")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acceptances.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.clientName || a.clientEmail || "—"}</TableCell>
                  <TableCell>{a.groupTypeName ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{a.policyDocumentVersion}</TableCell>
                  <TableCell>{new Date(a.acceptedAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{a.ipAddress ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </>
  );
}

function ViewDocumentButton({ fileId }: { fileId: string }) {
  const t = useTranslations("policies");
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(`/api/policies/file/${fileId}`);
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={open}>
      {t("document")}
    </Button>
  );
}

function CreatePolicyForm() {
  const t = useTranslations("policies");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [state, action, pending] = useActionState(createPolicyDocumentAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      setFileId(null);
    }
  }, [state]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setUploadBusy(true);
    try {
      const presignRes = await fetch("/api/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selected.name,
          contentType: selected.type,
          size: selected.size,
          visibility: "public",
        }),
      });
      if (!presignRes.ok) throw new Error("presign failed");
      const { fileId: newFileId, upload } = (await presignRes.json()) as {
        fileId: string;
        upload: { url: string; fields: Record<string, string> };
      };

      const form = new FormData();
      for (const [k, v] of Object.entries(upload.fields)) form.append(k, v);
      form.append("file", selected);
      const putRes = await fetch(upload.url, { method: "POST", body: form });
      if (!putRes.ok) throw new Error("upload failed");

      const confirmRes = await fetch("/api/storage/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: newFileId }),
      });
      if (!confirmRes.ok) throw new Error("confirm failed");

      setFileId(newFileId);
    } catch {
      toast.error(t("created"));
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <FormField label={t("name")} htmlFor="policy-name">
        <Input id="policy-name" name="name" required />
      </FormField>

      <input type="hidden" name="file_id" value={fileId ?? ""} />

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploadBusy}
        onClick={() => inputRef.current?.click()}
      >
        {fileId ? t("file") : t("document")}
      </Button>

      <Button type="submit" disabled={pending || !fileId}>
        {pending ? t("uploadingVersion") : t("createTitle")}
      </Button>
      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
    </form>
  );
}

function UploadVersionButton({ policyDocId }: { policyDocId: string }) {
  const t = useTranslations("policies");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setBusy(true);
    try {
      const presignRes = await fetch("/api/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selected.name,
          contentType: selected.type,
          size: selected.size,
          visibility: "public",
        }),
      });
      if (!presignRes.ok) throw new Error("presign failed");
      const { fileId, upload } = (await presignRes.json()) as {
        fileId: string;
        upload: { url: string; fields: Record<string, string> };
      };

      const form = new FormData();
      for (const [k, v] of Object.entries(upload.fields)) form.append(k, v);
      form.append("file", selected);
      const putRes = await fetch(upload.url, { method: "POST", body: form });
      if (!putRes.ok) throw new Error("upload failed");

      const confirmRes = await fetch("/api/storage/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      if (!confirmRes.ok) throw new Error("confirm failed");

      const formData = new FormData();
      formData.append("policyDocumentId", policyDocId);
      formData.append("file_id", fileId);

      const res = await fetch("/api/policies/upload-version", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("action failed");

      toast.success(t("versionUploaded"));
      window.location.reload();
    } catch {
      toast.error(t("versionUploaded"));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? t("uploadingVersion") : t("uploadVersion")}
      </Button>
    </>
  );
}
