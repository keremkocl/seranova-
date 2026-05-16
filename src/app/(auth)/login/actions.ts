"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  email: string,
  password: string
): Promise<{ error: string } | undefined> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // AuthError means invalid credentials
    if (error instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı." };
    }
    // Re-throw redirect errors — Next.js handles navigation
    throw error;
  }
}
