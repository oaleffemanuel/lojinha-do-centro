import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_PUBLIC_DEPLOY_TARGET === "github-pages";

const config: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: isGitHubPagesBuild ? "/lojinha-do-centro" : undefined,
  env: { WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || "5531975965032" },
};
export default config;
