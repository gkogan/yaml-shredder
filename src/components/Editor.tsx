"use client";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("react-monaco-editor"), { ssr: false });

export default MonacoEditor;
