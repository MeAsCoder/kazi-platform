import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { phone: {}, password: {} },
      async authorize(creds) {
        const phone = String(creds?.phone ?? "").trim();
        const password = String(creds?.password ?? "");
        if (!phone || !password) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user || user.isBanned) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    // Persist the role into the JWT and expose it on the session.
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
