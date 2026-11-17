import { getSession } from "@/lib/session";
import { BottomNav } from "./NavLinks";

export default async function BottomNavServer() {
  const { user } = await getSession();
  return <BottomNav loggedIn={Boolean(user)} />;
}
