import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { localMode } from "@/lib/db";
import { AuthScreen } from "@/components/auth-screen";
export const dynamic = "force-dynamic";
export default async function Welcome() {
  const user = await currentUser();
  if (user?.membership === "approved") redirect("/home");
  return <AuthScreen user={user} demo={localMode()} />;
}
