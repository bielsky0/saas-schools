import React, { lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "~/index.css";
import { registerDemoFeatureFlags } from "./routes/demo/demo-flags";
import { MicrosoftClarity } from "./routes/demo/microsoft-clarity";

const ChaiBuilderDefault = lazy(() => import("./routes/builder"));
const PreviewBuilder = lazy(() => import("./routes/page-preview"));
const ChaiBuilderCustom = lazy(() => import("./routes/custom-layout"));
const WebsiteBuilder = lazy(() => import("./routes/website-builder"));
const Home = lazy(() => import("./routes/home"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/builder",
    element: <ChaiBuilderDefault />,
  },
  {
    path: "/builder/preview",
    element: <PreviewBuilder />,
  },
  {
    path: "/builder/custom",
    element: <ChaiBuilderCustom />,
  },
  {
    path: "/website",
    element: <WebsiteBuilder />,
  },
]);

// Register demo feature flags
registerDemoFeatureFlags();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    {import.meta.env.VITE_CLARITY_ID && <MicrosoftClarity clarityId={import.meta.env.VITE_CLARITY_ID} />}
  </React.StrictMode>,
);
