"use client";
import dynamic from "next/dynamic";

const EditorPage = dynamic(() => import("./editor"), { ssr: false });

export default EditorPage;
