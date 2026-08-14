export type FrontierWorkspaceIdentity = {
  index: "01" | "02" | "03" | "04" | "05" | "06";
  label: "TODAY" | "EXPLORE" | "PROJECT" | "SAVED" | "IDEA LAB" | "PERSONAL RADAR";
  descriptor:
    | "DAILY DISCOVERY"
    | "FRONTIER FIELD"
    | "INTELLIGENCE"
    | "RESEARCH SHELF"
    | "DIRECTION WORKBENCH"
    | "INTEREST FRONTIER";
};

export const FRONTIER_WORKSPACES = {
  today: { index: "01", label: "TODAY", descriptor: "DAILY DISCOVERY" },
  explore: { index: "02", label: "EXPLORE", descriptor: "FRONTIER FIELD" },
  project: { index: "03", label: "PROJECT", descriptor: "INTELLIGENCE" },
  saved: { index: "04", label: "SAVED", descriptor: "RESEARCH SHELF" },
  ideaLab: { index: "05", label: "IDEA LAB", descriptor: "DIRECTION WORKBENCH" },
  radar: { index: "06", label: "PERSONAL RADAR", descriptor: "INTEREST FRONTIER" },
} as const satisfies Record<string, FrontierWorkspaceIdentity>;

export function frontierWorkspaceForPath(pathname: string): FrontierWorkspaceIdentity {
  if (pathname.startsWith("/project/")) return FRONTIER_WORKSPACES.project;
  if (pathname === "/explore" || pathname.startsWith("/explore/")) return FRONTIER_WORKSPACES.explore;
  if (pathname === "/saved" || pathname.startsWith("/saved/")) return FRONTIER_WORKSPACES.saved;
  if (pathname === "/idea-lab" || pathname.startsWith("/idea-lab/")) return FRONTIER_WORKSPACES.ideaLab;
  if (pathname === "/radar" || pathname.startsWith("/radar/")) return FRONTIER_WORKSPACES.radar;
  return FRONTIER_WORKSPACES.today;
}
