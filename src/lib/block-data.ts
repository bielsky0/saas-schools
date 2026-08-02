import { and, desc, eq, isNull } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import { membership, user } from "@/lib/db/schema";
import { page } from "@/lib/db/schema/pages";
import { getBlogPageType } from "@/lib/cms-collection-data";
import { getGroupType } from "@/features/groups/data";
import { listUpcomingSessions } from "@/features/schedule/data";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

export type GroupTypeBlockData = {
  name: string;
  description: string | null;
  price: number;
  slug: string;
  status: "scheduled" | "collecting_interest";
  defaultDurationMinutes: number | null;
} | null;

export type UpcomingSessionBlockData = {
  id: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  status: string;
  groupTypeId: string;
  groupTypeName: string;
  trainerName: string | null;
  trainerEmail: string | null;
  locationId: string | null;
  locationName: string | null;
};

export type TrainerBlockData = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
} | null;

export async function getGroupTypeForBlock(
  tx: TenantDb,
  orgId: string,
  groupTypeId: string,
): Promise<GroupTypeBlockData> {
  const gt = await getGroupType(tx, orgId, groupTypeId);
  if (!gt) return null;
  return {
    name: gt.name,
    description: gt.description,
    price: gt.price,
    slug: gt.slug,
    status: gt.status,
    defaultDurationMinutes: gt.defaultDurationMinutes,
  };
}

export async function getUpcomingSessionsForBlock(
  tx: TenantDb,
  orgId: string,
  opts?: { groupTypeId?: string; limit?: number },
): Promise<UpcomingSessionBlockData[]> {
  const limit = opts?.limit ?? 5;
  const sessions = await listUpcomingSessions(tx, orgId, { limit: 200 });
  const filtered = opts?.groupTypeId
    ? sessions.filter((s) => s.groupTypeId === opts.groupTypeId)
    : sessions;
  return filtered.slice(0, limit);
}

export async function getTrainerForBlock(
  tx: TenantDb,
  orgId: string,
  userId: string,
): Promise<TrainerBlockData> {
  const [row] = await tx
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: membership.role,
    })
    .from(membership)
    .innerJoin(user, eq(membership.userId, user.id))
    .where(
      and(
        eq(membership.organizationId, orgId),
        eq(membership.userId, userId),
        eq(membership.role, "trainer"),
        eq(membership.status, "active"),
        isNull(user.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getBlogPosts(
  tx: TenantDb,
  orgId: string,
  limit?: number,
  offset?: number,
) {
  const pageType = await getBlogPageType(tx, orgId);
  return tx.query.page.findMany({
    where: and(
      eq(page.organizationId, orgId),
      eq(page.pageType, pageType),
      eq(page.status, "published"),
    ),
    orderBy: [desc(page.publishedAt)],
    limit: limit ?? 10,
    offset: offset ?? 0,
  });
}

export async function getBlogPostBySlug(
  tx: TenantDb,
  orgId: string,
  slug: string,
) {
  const pageType = await getBlogPageType(tx, orgId);
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.slug, slug),
        eq(page.pageType, pageType),
        eq(page.status, "published"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function enrichBlocksWithData(
  tx: TenantDb,
  orgId: string,
  blocks: ChaiBlock[],
): Promise<ChaiBlock[]> {
  return Promise.all(
    blocks.map(async (block) => {
      switch (block._type) {
        case "GroupTypeCard": {
          const groupTypeId = block.groupTypeId as string | undefined;
          if (!groupTypeId) break;
          const data = await getGroupTypeForBlock(tx, orgId, groupTypeId);
          return { ...block, data };
        }
        case "UpcomingEvents": {
          const data = await getUpcomingSessionsForBlock(tx, orgId, {
            groupTypeId: block.groupTypeId as string | undefined,
            limit: (block.limit as number | undefined) ?? 5,
          });
          return { ...block, data };
        }
        case "InstructorCard": {
          const trainerId = block.trainerId as string | undefined;
          if (!trainerId) break;
          const data = await getTrainerForBlock(tx, orgId, trainerId);
          return { ...block, data };
        }
      }
      return block;
    }),
  );
}
