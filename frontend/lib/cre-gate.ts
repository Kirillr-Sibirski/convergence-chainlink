export const CRE_SIM_CMD =
  "cd /Users/kirillrybkov/Desktop/convergence-chainlink/cre-workflow && bun run simulate";

type CreMarketLike = {
  deadline: number;
  resolved: boolean;
};

export function getPendingCreResolutionCount(markets: CreMarketLike[]): number {
  const now = Math.floor(Date.now() / 1000);
  return markets.filter((m) => m.deadline <= now && !m.resolved).length;
}

