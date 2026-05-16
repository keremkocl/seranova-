import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import StatusBar from "@/components/layout/StatusBar";
import MobileShell from "@/components/layout/MobileShell";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";
import type { Role } from "@/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = {
    name: session.user.name ?? session.user.email ?? "Kullanıcı",
    email: session.user.email ?? "",
    role: session.user.role as Role,
  };

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  const isFarmer = user.role === "FARMER";

  return (
    <>
      <div className="control-room flex min-h-screen">
        {/* Desktop sidebar */}
        <div data-print-hide className="hidden md:block print:hidden">
          <Sidebar role={user.role} />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop navbar */}
          <div data-print-hide className="hidden md:block print:hidden">
            <Navbar user={user} unreadNotifications={unreadNotifications} />
          </div>

          {/* Mobile header + drawer */}
          <MobileShell
            role={user.role}
            userName={user.name}
            unreadNotifications={unreadNotifications}
          />

          {/* Platform status chips (desktop+) */}
          <StatusBar />

          <main
            data-print-main
            className={`flex-1 p-4 sm:p-5 md:p-6 ${isFarmer ? "pb-24 md:pb-6" : ""}`}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar — farmer only */}
      {isFarmer && (
        <MobileBottomNav unreadNotifications={unreadNotifications} />
      )}

      <div data-print-hide className="print:hidden">
        <Toaster richColors={true} position="top-right" />
      </div>
    </>
  );
}
