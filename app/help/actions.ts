"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, adminClient, isConfigured } from "@/lib/supabase/server";

/** Save the person's town/city for "help near you". */
export async function setArea(fd: FormData) {
  const city = String(fd.get("city") || "").trim().slice(0, 60);
  const jar = await cookies();
  if (city) jar.set("area", encodeURIComponent(city), { path: "/", maxAge: 31536000, sameSite: "lax" }); else jar.delete("area");
  if (isConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Own town replaces the login location (coordinates cleared so the text town is used)
    if (user) await adminClient().from("profiles").update({ city: city || null, region: null, latitude: null, longitude: null }).eq("id", user.id);
  }
  revalidatePath("/help");
}
