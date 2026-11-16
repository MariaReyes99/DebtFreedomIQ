"use server";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";

export type FeedbackState = { ok?: boolean; error?: string };

export async function sendFeedback(_: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const rating = Number(fd.get("rating"));
  const comment = String(fd.get("comment") || "").trim().slice(0, 2000);
  if (!(rating >= 1 && rating <= 5) && !comment) return { error: "Choose a rating or write a comment." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id, rating: rating >= 1 && rating <= 5 ? rating : null, comment: comment || null, country: String(fd.get("country") || "") || null,
  });
  if (error) return { error: "Sorry, we couldn't save that. Please try again." };
  await track("feedback", { userId: user.id, props: { rating } });
  return { ok: true };
}
