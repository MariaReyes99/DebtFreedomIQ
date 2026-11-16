"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { cancelSub, addMockCard, deleteCard, payNow, stripeAddCardUrl, stripePortalUrl } from "@/lib/billing";
import { paymentsMode } from "@/lib/payments";
import { track } from "@/lib/events";

export type BillingState = { ok?: string; error?: string; url?: string };
const origin = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function cancelAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const { user } = await getSession();
  if (!user) return { error: "Please log in again." };
  const r = await cancelSub(user.id, String(fd.get("subId")));
  revalidatePath("/", "layout");
  return r.error ? { error: r.error } : { ok: "You've unsubscribed. Premium features are now off. Your free Financial Health check is still available." };
}

export async function addCardAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const { user, country, displayCountry } = await getSession();
  if (!user) return { error: "Please log in again." };
  if (paymentsMode() === "stripe") return { url: await stripeAddCardUrl(user.id, user.email, origin(), (country ?? displayCountry).currency) };
  const r = await addMockCard(user.id, String(fd.get("number") || ""), String(fd.get("exp") || ""));
  if (r.error) return { error: r.error };
  await track("card_added", { userId: user.id });
  revalidatePath("/account");
  return { ok: "Card saved." };
}

export async function deleteCardAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const { user } = await getSession();
  if (!user) return { error: "Please log in again." };
  const r = await deleteCard(user.id, String(fd.get("cardId")));
  if (r.error) return { error: r.error };
  await track("card_deleted", { userId: user.id });
  revalidatePath("/account");
  return { ok: "Card removed." };
}

export async function payNowAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const { user } = await getSession();
  if (!user) return { error: "Please log in again." };
  if (paymentsMode() === "stripe") return { url: await stripePortalUrl(user.id, user.email, origin()) };
  const r = await payNow(user.id, String(fd.get("subId")));
  revalidatePath("/", "layout");
  return r.error ? { error: r.error } : { ok: "Payment received. Premium Plus is active again. 🎉" };
}
