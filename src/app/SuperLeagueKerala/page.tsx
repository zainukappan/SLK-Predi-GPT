import type { Metadata } from "next";
import { loadPublicSportsData } from "@/lib/service";
import { PublicSportsHub } from "@/components/public-sports-hub";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Super League Kerala Match Centre | SBK",
  description: "Public fixtures, results, standings, player statistics and SBK prediction leaderboard.",
  robots: { index: true, follow: true },
};

export default async function SuperLeagueKeralaPage() {
  const data = await loadPublicSportsData();
  const safe = JSON.parse(JSON.stringify(data, (_, value) => typeof value === "bigint" ? Number(value) : value));
  return <PublicSportsHub data={safe} />;
}
