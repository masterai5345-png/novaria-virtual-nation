import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export const runtime="nodejs";

// Diagnostic exposes configuration BOOLEANS only, NEVER secrets.
export async function GET(){
 const googleId=Boolean(process.env.AUTH_GOOGLE_ID?.trim());
 const googleSecret=Boolean(process.env.AUTH_GOOGLE_SECRET?.trim());
 const owner=Boolean(process.env.NOVARIA_OWNER_EMAIL?.trim());
 const sessionSecret=Boolean(process.env.AUTH_SECRET?.trim());
 return NextResponse.json({
   googleOAuthReady:googleId&&googleSecret&&sessionSecret,
   ownerConfigured:owner,
   googleIdConfigured:googleId,
   googleSecretConfigured:googleSecret,
   authSecretConfigured:sessionSecret,
   callbackUrl:"https://novaria-web.onrender.com/api/auth/callback/google",
   note:"Tidak ada kredensial rahasia yang ditampilkan.",
 },{headers:{"Cache-Control":"no-store"}});
}
