import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ROLE_PATHS = {
  FARMER:     "/dashboard/farmer",
  CONSULTANT: "/dashboard/consultant",
  ADMIN:      "/dashboard/admin",
} as const;

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (role && role in ROLE_PATHS) {
    redirect(ROLE_PATHS[role as keyof typeof ROLE_PATHS]);
  }

  redirect("/login");
}
