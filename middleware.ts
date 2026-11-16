import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "@/lib/env";

const PROTECTED = ["/dashboard", "/account", "/admin", "/checkout"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const anon = request.cookies.get("dfiq_anon")?.value ?? crypto.randomUUID();
  const setAnon = (r: NextResponse) => { if (!request.cookies.get("dfiq_anon")) r.cookies.set("dfiq_anon", anon, { path: "/", maxAge: 31536000, sameSite: "lax" }); return r; };
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return setAnon(response);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some(p => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith("/checkout") ? "/signup" : "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return setAnon(NextResponse.redirect(url));
  }
  return setAnon(response);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|images/|.*\\.(?:svg|png|jpg|ico)$).*)"] };
