import type { Metadata } from "next";
import { loadPublicPlayerStats } from "@/lib/service";
import { TopScorersHub } from "@/components/top-scorers-hub";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Super League Kerala Top Scorers & Player Stats | SBK",
  description:
    "Complete rankings of Super League Kerala 2026 top goal scorers, assists leaders, and goal contributions.",
  robots: { index: true, follow: true },
};

export default async function TopScorersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const data = await loadPublicPlayerStats();
  const safe = JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
  return <TopScorersHub players={safe.players} initialTab={query.tab} />;
}
