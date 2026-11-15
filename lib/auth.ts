import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  normalizeIdentifier,
  checkLoginLockout,
  recordFailedLoginAttempt,
  resetLoginLockout,
} from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS");
        }

        const rawIdentifier = credentials.identifier.trim();
        const xForwardedFor = (req?.headers as any)?.["x-forwarded-for"];
        const clientIp =
          typeof xForwardedFor === "string"
            ? xForwardedFor.split(",")[0].trim()
            : "unknown";

        // 1. Rate Limit & Lockout Check (5 attempts -> 15 min lock)
        const lockoutCheck = await checkLoginLockout(rawIdentifier, clientIp);
        if (lockoutCheck.locked) {
          throw new Error(`LOCKED:${lockoutCheck.remainingMinutes}`);
        }

        // 2. Normalize Cambodian phone / email
        const norm = normalizeIdentifier(rawIdentifier);

        // 3. Find User
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: norm.value },
              { phone: norm.value },
              { phone: rawIdentifier },
            ],
            isActive: true,
          },
          include: {
            employee: {
              include: {
                branch: true,
                position: true,
                shift: true,
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          const failResult = await recordFailedLoginAttempt(rawIdentifier, clientIp);
          if (failResult.locked) {
            throw new Error(`LOCKED:${failResult.remainingMinutes}`);
          }
          throw new Error("INVALID_CREDENTIALS");
        }

        // 4. Validate Password
        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          const failResult = await recordFailedLoginAttempt(rawIdentifier, clientIp);
          if (failResult.locked) {
            throw new Error(`LOCKED:${failResult.remainingMinutes}`);
          }
          throw new Error("INVALID_CREDENTIALS");
        }

        // 5. Success -> reset rate limits
        await resetLoginLockout(rawIdentifier, clientIp);

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          employeeId: user.employee?.id || null,
          employeeCode: user.employee?.code || null,
          branchName: user.employee?.branch?.name || "All Branches",
          positionName: user.employee?.position?.name || user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.employeeId = (user as any).employeeId;
        token.employeeCode = (user as any).employeeCode;
        token.branchName = (user as any).branchName;
        token.positionName = (user as any).positionName;
        token.phone = (user as any).phone;
      }

      // If user has no employeeId yet in token, look up dynamically
      if (token?.id && !token?.employeeId) {
        try {
          const emp = await prisma.employee.findUnique({
            where: { userId: token.id as string },
            include: { branch: true, position: true },
          });
          if (emp) {
            token.employeeId = emp.id;
            token.employeeCode = emp.code;
            token.branchName = emp.branch?.name || "All Branches";
            token.positionName = emp.position?.name || (token.role as string);
          }
        } catch {}
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).employeeId = token.employeeId;
        (session.user as any).employeeCode = token.employeeCode;
        (session.user as any).branchName = token.branchName;
        (session.user as any).positionName = token.positionName;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Secure-next-auth.session-token`
          : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "attendpro-super-secret-key-2026-coffee-shop",
};
