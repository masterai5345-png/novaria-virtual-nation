import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { databaseConfigured, query, upsertGoogleCitizen } from "@/lib/db";

const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: googleEnabled ? [Google] : [],
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14,
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !account.providerAccountId || !user.email) {
        return false;
      }
      if (!databaseConfigured) {
        console.error("Google sign-in blocked: DATABASE_URL is not configured.");
        return false;
      }

      const googleProfile = profile as { email_verified?: boolean } | undefined;
      if (googleProfile?.email_verified !== true) {
        return false;
      }

      const citizen = await upsertGoogleCitizen({
        googleSubject: account.providerAccountId,
        email: user.email,
        displayName: user.name?.trim() || user.email.split("@")[0],
      });
      return citizen.account_status === "active";
    },
    async jwt({ token, account, user }) {
      if (account?.provider === "google" && account.providerAccountId) {
        const citizen = await query(
          `SELECT id FROM citizens
           WHERE auth_provider = 'google' AND auth_subject = $1
             AND account_status = 'active'
           LIMIT 1`,
          [account.providerAccountId],
        );
        if (citizen.rows[0]?.id) {
          token.citizenId = String(citizen.rows[0].id);
        }
      } else if (user?.id) {
        token.citizenId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.citizenId === "string"
          ? token.citizenId
          : "";
      }
      return session;
    },
  },
});
