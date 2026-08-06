/**
 * README 脱敏固定 fixture（阶段 1.2）。虚构内容，不含真实用户数据。
 */
import { Buffer } from "node:buffer";
import type { GitHubReadmeResponse } from "@/lib/github/types";

export const README_TEXT_SHORT = "hello readme";

/** 超长 README 文本（用于截断测试）。 */
export const README_TEXT_LONG = "# Long README\n" + "x".repeat(10_000);

function toB64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

function makeReadme(fullName: string, text: string): GitHubReadmeResponse {
  return {
    name: "README.md",
    path: "README.md",
    sha: "deadbeef0000",
    size: Buffer.byteLength(text, "utf8"),
    url: `https://api.github.com/repos/${fullName}/readme`,
    html_url: `https://github.com/${fullName}/blob/main/README.md`,
    git_url: `https://api.github.com/repos/${fullName}/git/blobs/deadbeef0000`,
    download_url: `https://raw.example.com/${fullName}/main/README.md`,
    type: "file",
    content: toB64(text),
    encoding: "base64",
  };
}

export const readmeShort = makeReadme("alice/awesome-agent", README_TEXT_SHORT);
export const readmeLong = makeReadme("alice/awesome-agent", README_TEXT_LONG);
