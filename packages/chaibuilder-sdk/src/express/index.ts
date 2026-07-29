import cors from "cors";
import dotenv from "dotenv";
import express, { Express } from "express";
import fileUpload from "express-fileupload";
import ChaiActionsRegistry from "~/actions/builder/actions-registery";
import { initChaiBuilderActionHandler } from "~/actions/builder/chai-builder-actions-handler";
import { supabase } from "~/express/supabase-admin";
import { SupabaseAuthActions, SupabaseStorageActions } from "./actions/storage";
import "./register";
import { registerPageTypes } from "./registerPageTypes";

dotenv.config();

// Register storage actions
ChaiActionsRegistry.registerActions(SupabaseAuthActions(supabase));
ChaiActionsRegistry.registerActions(SupabaseStorageActions(supabase));

export const app: Express = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    abortOnLimit: true,
    responseOnLimit: "File size limit has been reached (max: 50MB)",
  }),
);
const apiKey = process.env["CHAIBUILDER_APP_KEY"]!;

export type DevGlobalData = {
  lang: string;
  logo: string;
  title: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
  };
};

registerPageTypes();

app.post("/chai/api", async (req, res) => {
  handleApi(req, res);
});

app.get(`/preview/*slug`, (req: express.Request<{ slug: string[] }>, res) => {
  const slug = req.params.slug;
  const fullSlug = `/${slug.join("/")}`;
  res.send(`Preview for "${fullSlug}"`);
});

if (!process.env["VITE"]) {
  const frontendFiles = process.cwd() + "/dist";
  app.use(express.static(frontendFiles));
  app.get("/*path", (_, res) => {
    res.send(frontendFiles + "/index.html");
  });
  app.listen(process.env["PORT"]);
}

async function handleApi(req: express.Request, res: express.Response) {
  const authorization = req.headers["authorization"] as string;
  const body = req.body;
  let authTokenOrUserId: string = "";
  authTokenOrUserId = (authorization ? authorization.split(" ")[1] : "") as string;

  const supabaseUser = await supabase.auth.getUser(authTokenOrUserId);
  if (supabaseUser.error) {
    // If the token is invalid or expired, return a 401 response
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  authTokenOrUserId = supabaseUser.data.user?.id || "";
  try {
    const actionHandler = initChaiBuilderActionHandler({ apiKey, userId: authTokenOrUserId });
    const response = await actionHandler(body);

    // Handle streaming responses
    if (response?._streamingResponse && response?._streamResult) {
      const result = response._streamResult;

      if (!result?.textStream) {
        return res.status(500).json({ error: "No streaming response available" });
      }

      // Set headers for streaming
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");

      // Stream the AI response chunks
      for await (const chunk of result.textStream) {
        if (chunk) {
          res.write(chunk);
        }
      }

      res.end();
      return;
    }

    if (response.status && typeof response.status === "number") {
      res.status(response.status);
    }

    res.json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: (error as Error).message });
  }
}
