import { registerChaiSidebarPanel } from "~/runtime/client";
import { aiPanel, aiPanelId } from "./ai-panel/ai-panel";
import { seoPanel, seoPanelId } from "./seo-panel";
import { userInfoPanel, userInfoPanelId } from "./user-info";

export const registerChaiPanels = () => {
  registerChaiSidebarPanel(seoPanelId, seoPanel);
  registerChaiSidebarPanel(userInfoPanelId, userInfoPanel);
  registerChaiSidebarPanel(aiPanelId, aiPanel);
};
