import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import type { Role } from "@/types";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log("[auth] authorize called, email:", (credentials as Record<string, string>)?.email);
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) { console.log("[auth] schema validation failed"); return null; }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    redirect({ baseUrl }) {
      return baseUrl + "/dashboard/farmer";
    },
  },
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      options: { sameSite: "lax", secure: false, httpOnly: true, path: "/" },
    },
    callbackUrl: {
      options: { sameSite: "lax", secure: false, httpOnly: true, path: "/" },
    },
    csrfToken: {
      options: { sameSite: "lax", secure: false, httpOnly: true, path: "/" },
    },
  },
});
