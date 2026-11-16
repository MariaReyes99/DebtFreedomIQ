import { SUPABASE_URL, SUPABASE_PUBLIC_KEY, SUPABASE_SECRET } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/plan", "/admin", "/account"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // anonymous id for funnel tracking
  if (!request.cookies.get("fs_anon")) {
    response.cookies.set("fs_anon", crypto.randomUUID(), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        const anon = response.cookies.get("fs_anon");
        response = NextResponse.next({ request });
        if (anon) response.cookies.set(anon);
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some(p => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
