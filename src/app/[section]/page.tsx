import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loadData } from "@/lib/service";
import { localMode } from "@/lib/db";
import { Shell } from "@/components/shell";
import { Dashboard } from "@/components/dashboard";
import { Admin } from "@/components/admin";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { section } = await params;
  if (
    ![
      "home",
      "matches",
      "predictions",
      "leaderboard",
      "profile",
      "rules",
      "admin",
      "match",
    ].includes(section)
  )
    notFound();
  const user = await currentUser();
  if (!user || user.membership !== "approved") redirect("/");
  if (section === "admin" && user.role !== "admin") redirect("/home");
  const query = await searchParams;
  let data;
  try {
    data = await loadData(user.id, section, query);
  } catch (e) {
    if (section === "match") notFound();
    throw e;
  }
  if (section === "match" && !data.fixture) notFound();
  const safe = JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
  return (
    <Shell user={user} demo={localMode()}>
      {section === "admin" ? (
        <Admin data={safe} query={query} />
      ) : (
        <Dashboard
          section={section}
          data={safe}
          query={query}
          demo={localMode()}
        />
      )}
    </Shell>
  );
}
