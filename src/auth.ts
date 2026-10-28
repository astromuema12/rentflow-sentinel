import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/auth/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion;
      }

      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        token.sub &&
        typeof token.sessionVersion === "number"
      ) {
        session.user.id = token.sub;
        session.user.sessionVersion = token.sessionVersion;
      }

      return session;
    },
  },
  events: {
    async signOut(message) {
      const userId =
        "token" in message ? message.token?.sub : message.session?.userId;
      if (userId) {
        await getPrisma().user.updateMany({
          where: { id: userId },
          data: { sessionVersion: { increment: 1 } },
        });
      }
    },
  },
});
