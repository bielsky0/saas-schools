import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import {
  createFileRecord,
  getFileForOwner,
  markFileReady,
  softDeleteFile,
  type FileOwner,
} from "@/features/storage/data";
import { storage } from "@/lib/adapters/storage";
import { env } from "@/lib/env/server";
import { withOwner } from "@/lib/db/tenant";
import type {
  Adapter,
  HandleDelete,
  HandleUpload,
  StaticHandler,
} from "@payloadcms/plugin-cloud-storage/types";
import type { GenerateURL } from "@payloadcms/plugin-cloud-storage/types";

function buildKey(orgId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "file";
  return `org/${orgId}/media/${randomUUID()}-${safe}`;
}

function ownerFromOrgId(orgId: string): FileOwner {
  return { kind: "organization", organizationId: orgId };
}

export const cmsStorageAdapter: Adapter = () => {
  const client = new S3Client({
    region: env.S3_REGION!,
    endpoint: env.S3_ENDPOINT!,
    forcePathStyle: env.S3_FORCE_PATH_STYLE!,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });

  const bucket = env.S3_BUCKET!;

  const handleUpload: HandleUpload = async ({ data, file, req }) => {
    const cmsReq = req as unknown as { organizationId?: string };
    const orgId = cmsReq.organizationId ?? (data as Record<string, string>).organizationId;
    if (!orgId) {
      throw new Error("CMS storage: missing organizationId — cannot upload");
    }

    const key = buildKey(orgId, file.filename);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    const owner = ownerFromOrgId(orgId);
    const userId = (req.user as { id?: string } | undefined)?.id ?? "";

    const fileId = await withOwner(owner, (tx) =>
      createFileRecord(tx, {
        owner,
        uploadedByUserId: userId,
        key,
        originalName: file.filename,
        contentType: file.mimeType,
        size: file.filesize,
        visibility: "public",
      }),
    );

    await withOwner(owner, (tx) => markFileReady(tx, owner, fileId));

    return { ...data, fileId } as Record<string, unknown>;
  };

  const handleDelete: HandleDelete = async ({ doc }) => {
    const docData = doc as unknown as Record<string, string | undefined>;
    const orgId = docData.organizationId;
    const fileId = docData.fileId;
    if (!orgId || !fileId) return;

    const owner = ownerFromOrgId(orgId);
    const row = await withOwner(owner, (tx) => getFileForOwner(tx, owner, fileId));
    if (!row) return;

    await storage.delete(row.key);
    await withOwner(owner, (tx) => softDeleteFile(tx, owner, fileId));
  };

  const generateURL: GenerateURL = async ({ data }) => {
    const d = data as Record<string, string | undefined>;
    const fileId = d.fileId;
    const orgId = d.organizationId;
    if (!fileId || !orgId) return "";

    const owner = ownerFromOrgId(orgId);
    const row = await withOwner(owner, (tx) => getFileForOwner(tx, owner, fileId));
    if (!row) return "";

    return storage.createReadUrl({ key: row.key, expiresIn: 3600 });
  };

  const staticHandler: StaticHandler = async (req, { doc }) => {
    const docData = doc as Record<string, string | undefined> | undefined;
    if (!docData?.fileId || !docData?.organizationId) {
      return new Response("File not found", { status: 404 });
    }

    const owner = ownerFromOrgId(docData.organizationId);
    const row = await withOwner(owner, (tx) =>
      getFileForOwner(tx, owner, docData.fileId!),
    );
    if (!row) {
      return new Response("File not found", { status: 404 });
    }

    const url = await storage.createReadUrl({ key: row.key, expiresIn: 3600 });
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  };

  return {
    name: "cms-r2",
    handleUpload,
    handleDelete,
    generateURL,
    staticHandler,
  };
};
