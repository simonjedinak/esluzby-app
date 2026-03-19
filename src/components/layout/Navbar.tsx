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
import { Tv, LogOut, User, Shield, PlusCircle } from "lucide-react";
import { useState } from "react";
import { NovaTemaModal } from "@/components/nova-tema/NovaTemaModal";

interface NavbarProps {
  profile: Profile;
}

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showMenu, setShowMenu] = useState(false);
  const [showNovaTema, setShowNovaTema] = useState(false);
  const isReadOnlyRole = hasRole(profile, "sefproducent");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { href: "/domov", label: "Domov" },
    { href: "/volna", label: "Voľná" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}

          <Link href="/domov" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-9 p-0.5" />

            <span className="flex items-center">
              <span className="text-xl font-bold text-gray-900">e-jano</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                v2
              </span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {!isReadOnlyRole && hasRole(profile, "reporter") && (
              <button
                onClick={() => setShowNovaTema(true)}
                className="ml-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Nová téma
              </button>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                {profile.region
                  ? profile.region.slice(0, 2).toUpperCase()
                  : `${profile.meno?.[0] ?? ""}${profile.priezvisko?.[0] ?? ""}` ||
                    "?"}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden lg:block">
                {profile.meno} {profile.priezvisko}
              </span>
              {!isOnlyReporter(profile) && (
                <div className="hidden lg:flex items-center gap-1 flex-wrap">
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
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    href="/profil"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    Profil
                  </Link>
                  {hasRole(profile, "admin") && (
                    <Link
                      href="/admin"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Shield className="w-4 h-4" />
                      Správa účtov
                    </Link>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Odhlásiť sa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <NovaTemaModal
        isOpen={showNovaTema}
        onClose={() => setShowNovaTema(false)}
      />
    </nav>
  );
}
