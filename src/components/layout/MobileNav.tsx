"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types/database";
import {
  rolaLabels,
  rolaColors,
  hasRole,
  isOnlyReporter,
} from "@/lib/types/database";
import {
  Home,
  PlusCircle,
  Calendar,
  User,
  Menu,
  X,
  LogOut,
  Shield,
  Tv,
} from "lucide-react";
import { useState } from "react";
import { NovaTemaModal } from "@/components/nova-tema/NovaTemaModal";

interface MobileNavProps {
  profile: Profile;
}

export function MobileNav({ profile }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showMenu, setShowMenu] = useState(false);
  const [showNovaTema, setShowNovaTema] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { href: "/domov", label: "Domov", icon: Home },
    { href: "/volna", label: "Voľná", icon: Calendar },
    { href: "/profil", label: "Profil", icon: User },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Domov */}
          <Link
            href="/domov"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg min-w-[60px] transition-colors ${
              isActive("/domov") ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <Home
              className={`w-5 h-5 ${isActive("/domov") ? "stroke-[2.5]" : ""}`}
            />
            <span className="text-[10px] font-medium">Domov</span>
          </Link>

          {/* Téma - modal trigger */}
          <button
            onClick={() => setShowNovaTema(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg min-w-[60px] text-blue-600"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Téma</span>
          </button>

          {/* Voľno & Profil */}
          {navItems
            .filter((item) => item.href !== "/domov")
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg min-w-[60px] transition-colors ${
                    isActive(item.href) ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive(item.href) ? "stroke-[2.5]" : ""}`}
                  />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          <button
            onClick={() => setShowMenu(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg min-w-[60px] text-gray-500"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full-screen Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-white z-[60] md:hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Tv className="w-5 h-5 text-white" />
                </div>
                <span>
                  <span className="text-lg font-bold text-gray-900">
                    e-jano
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-0.75">
                    v2 Aplha
                  </span>
                </span>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-lg font-semibold">
                  {profile.region
                    ? profile.region.slice(0, 2).toUpperCase()
                    : `${profile.meno[0]}${profile.priezvisko[0]}`}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {profile.meno} {profile.priezvisko}
                  </p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
                {!isOnlyReporter(profile) && (
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {profile.roly
                      ?.filter((r: UserRole) => r !== "reporter")
                      .map((r: UserRole) => (
                        <span
                          key={r}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${rolaColors[r]}`}
                        >
                          {rolaLabels[r]}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Menu Links */}
            <div className="flex-1 p-4 space-y-1">
              {/* Nová téma button */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowNovaTema(true);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium w-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                Nová téma
              </button>

              {[
                { href: "/domov", label: "Domov", icon: Home },
                { href: "/volna", label: "Voľná", icon: Calendar },
                { href: "/profil", label: "Profil", icon: User },
                ...(hasRole(profile, "admin")
                  ? [{ href: "/admin", label: "Správa účtov", icon: Shield }]
                  : []),
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Odhlásiť sa
              </button>
            </div>
          </div>
        </div>
      )}

      <NovaTemaModal
        isOpen={showNovaTema}
        onClose={() => setShowNovaTema(false)}
      />
    </>
  );
}
