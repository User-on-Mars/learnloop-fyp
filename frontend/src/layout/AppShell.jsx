import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";

/**
 * AppShell - Authenticated route wrapper
 * Provides the base layout structure for all authenticated pages
 * with responsive navigation (Sidebar on desktop, MobileNav on mobile)
 */
export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-[#f8faf6]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14 pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
