import { db, safeQuery, schema } from "~/actions/db";
import { AI_MODELS } from "~/pages/panels/ai-panel/models";

const getModelMultiplier = (id: string) => {
  return AI_MODELS.find((model) => model.id === id)?.multiplier || 1;
};

export async function logAiRequestError({
  userId: authTokenOrUserId,
  startTime,
  error,
  model,
  prompt,
  appId,
}: {
  userId: string;
  startTime: number;
  error: any;
  model: string;
  prompt: string;
  appId: string;
}) {
  const errorStr = String(error);

  const totalDuration = startTime > 0 ? new Date().getTime() - startTime : 0;
  const payload = {
    model,
    totalDuration: String(totalDuration),
    error: errorStr,
    totalTokens: "0",
    tokenUsage: {},
    cost: 0,
    prompt,
    user: authTokenOrUserId,
    client: process?.env?.CHAIBUILDER_CLIENT_ID || null,
    app: appId,
  };

  const { error: dbError } = await safeQuery(() => db!.insert(schema.aiLogs).values(payload));
  if (dbError) {
    console.error("Error logging AI request error:", dbError);
  }
}

export async function logAiRequest({
  userId,
  startTime,
  arg,
  prompt,
  model,
  appId,
}: {
  userId: string;
  startTime: number;
  arg: any;
  prompt: string;
  model: string;
  appId: string;
}) {
  const totalUsage = arg?.totalUsage;
  const cost = arg?.providerMetadata?.gateway?.cost;
  const totalDuration = startTime > 0 ? Math.floor(new Date().getTime() - startTime) : 0;

  const requestStartIndex = prompt.indexOf("USER REQUEST");
  prompt = prompt.substring(requestStartIndex).trim();
  const payload = {
    model,
    totalDuration: String(totalDuration),
    error: null,
    totalTokens: String(Math.round((totalUsage?.totalTokens ?? 0) * getModelMultiplier(model))),
    tokenUsage: totalUsage,
    cost,
    prompt,
    user: userId,
    client: process?.env?.CHAIBUILDER_CLIENT_ID || null,
    app: appId,
  };
  const { error: dbError } = await safeQuery(() => db!.insert(schema.aiLogs).values(payload));
  if (dbError) {
    console.error("Error logging AI request:", dbError);
  }
}
