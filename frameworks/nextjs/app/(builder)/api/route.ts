import { getSupabaseAdmin } from "@/app/supabase-admin";
import { registerPageTypes } from "@/page-types";
import { ChaiActionsRegistry } from "@chaibuilder/sdk/actions";
import { SupabaseAuthActions, SupabaseStorageActions } from "@chaibuilder/sdk/actions/supabase";
import { initChaiBuilderNextJSActionHandler } from "@/package/actions";
import { NextRequest, NextResponse } from "next/server";

registerPageTypes();

export async function POST(req: NextRequest) {
  const apiKey = process.env.CHAIBUILDER_APP_KEY;

  if (!apiKey) {
    console.error("CHAIBUILDER_APP_KEY environment variable is not set.");
    return NextResponse.json({ error: "Server misconfiguration: CHAIBUILDER_APP_KEY is not set" }, { status: 500 });
  }
  const supabase = getSupabaseAdmin();
  ChaiActionsRegistry.registerActions(SupabaseAuthActions(supabase));
  ChaiActionsRegistry.registerActions(SupabaseStorageActions(supabase));
  try {
    // Get authorization header
    let authorization = req.headers.get("authorization") || "";
    authorization = authorization ? authorization.split(" ")[1] : "";

    // Parse request body
    const body = await req.json();

    // Supabase authentication check
    const supabaseUser = await supabase.auth.getUser(authorization);
    if (supabaseUser.error) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    const userId = supabaseUser.data.user?.id || "";
    const actionHandler = initChaiBuilderNextJSActionHandler({ apiKey, userId });
    return await actionHandler(body);
  } catch (error) {
    console.error("Error handling POST request", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
