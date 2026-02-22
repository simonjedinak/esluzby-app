"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Profile, UserRole } from "@/lib/types/database";
import { ALL_ROLES, rolaLabels, rolaColors } from "@/lib/types/database";
import {
  Users,
  UserPlus,
  Mail,
  Lock,
  User,
  Shield,
  Tv,
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
  MapPin,
  Phone,
} from "lucide-react";

interface AdminClientProps {
  profiles: Profile[];
}

export function AdminClient({ profiles: initialProfiles }: AdminClientProps) {
  const [profilesList, setProfilesList] = useState<Profile[]>(() =>
    [...initialProfiles].sort((a, b) =>
      a.priezvisko.localeCompare(b.priezvisko, "sk"),
    ),
  );
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [meno, setMeno] = useState("");
  const [priezvisko, setPriezvisko] = useState("");
  const [selectedRoly, setSelectedRoly] = useState<UserRole[]>(["reporter"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Role editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoly, setEditingRoly] = useState<UserRole[]>([]);
  const [editingMeno, setEditingMeno] = useState("");
  const [editingPriezvisko, setEditingPriezvisko] = useState("");
  const [editingTelefon, setEditingTelefon] = useState("");
  const [editingRegion, setEditingRegion] = useState("");
  const [editingJeRegionalny, setEditingJeRegionalny] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const supabase = createClient();

  const toggleRole = (
    role: UserRole,
    roly: UserRole[],
    setRoly: (r: UserRole[]) => void,
  ) => {
    if (roly.includes(role)) {
      // Don't allow removing the last role
      if (roly.length === 1) return;
      setRoly(roly.filter((r) => r !== role));
    } else {
      setRoly([...roly, role]);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          meno,
          priezvisko,
          roly: selectedRoly,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      // Also update the roly directly on profiles
      if (data?.user) {
        await supabase
          .from("profiles")
          .update({ roly: selectedRoly } as any)
          .eq("id", data.user.id);

        // Add the new profile to local state
        const { data: newProfile } = (await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()) as { data: Profile | null };

        if (newProfile) {
          setProfilesList((prev) =>
            [...prev, newProfile].sort((a, b) =>
              a.priezvisko.localeCompare(b.priezvisko, "sk"),
            ),
          );
        }
      }
      setSuccess(`Účet pre ${meno} ${priezvisko} (${email}) bol vytvorený`);
      setEmail("");
      setPassword("");
      setMeno("");
      setPriezvisko("");
      setSelectedRoly(["reporter"]);
      setShowForm(false);
    }
    setLoading(false);
  };

  const handleSaveRoles = async (profileId: string) => {
    setRoleLoading(true);
    setError("");

    const { error: err } = await supabase
      .from("profiles")
      .update({
        roly: editingRoly,
        meno: editingMeno,
        priezvisko: editingPriezvisko,
        telefon: editingTelefon || null,
        region: editingRegion || null,
        je_regionalny: editingJeRegionalny,
      } as any)
      .eq("id", profileId);

    if (err) {
      setError("Nepodarilo sa aktualizovať profil");
    } else {
      // Update local state directly to avoid layout shift
      setProfilesList((prev) =>
        prev
          .map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  roly: editingRoly,
                  meno: editingMeno,
                  priezvisko: editingPriezvisko,
                  telefon: editingTelefon || null,
                  region: editingRegion || null,
                  je_regionalny: editingJeRegionalny,
                }
              : p,
          )
          .sort((a, b) => a.priezvisko.localeCompare(b.priezvisko, "sk")),
      );
      setSuccess("Profil bol aktualizovaný");
      setEditingUserId(null);
    }
    setRoleLoading(false);
  };

  const startEditingRoles = (profile: Profile) => {
    setEditingUserId(profile.id);
    setEditingRoly(profile.roly || ["reporter"]);
    setEditingMeno(profile.meno);
    setEditingPriezvisko(profile.priezvisko);
    setEditingTelefon(profile.telefon || "");
    setEditingRegion(profile.region || "");
    setEditingJeRegionalny(profile.je_regionalny);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Správa účtov</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vytvárajte a spravujte používateľov a ich roly
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nový účet
        </button>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Create User Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Nový používateľ
          </h3>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Meno
                </label>
                <input
                  type="text"
                  value={meno}
                  onChange={(e) => setMeno(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priezvisko
                </label>
                <input
                  type="text"
                  value={priezvisko}
                  onChange={(e) => setPriezvisko(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email
                </div>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                placeholder="email@priklad.sk"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Heslo
                </div>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Minimálne 6 znakov"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Roly
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      toggleRole(role, selectedRoly, setSelectedRoly)
                    }
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border-2 transition-all ${
                      selectedRoly.includes(role)
                        ? `${rolaColors[role]} border-current`
                        : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {rolaLabels[role]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Vyberte jednu alebo viac rolí
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Vytváram..." : "Vytvoriť účet"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Používatelia</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {profilesList.length}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {profilesList.map((p) => (
            <div key={p.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/profil?user=${p.id}`}
                    className="no-underline group flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {p.region
                        ? p.region.slice(0, 2).toUpperCase()
                        : `${p.meno[0]}${p.priezvisko[0]}`}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {p.meno} {p.priezvisko}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-500">{p.email}</p>
                        {p.je_regionalny && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            Regionálny
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
                {editingUserId === p.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSaveRoles(p.id)}
                      disabled={roleLoading}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50"
                      title="Uložiť"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingUserId(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      title="Zrušiť"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditingRoles(p)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Upraviť roly"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Profile editing */}
              {editingUserId === p.id ? (
                <div className="mt-3 ml-13 space-y-3">
                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Meno
                      </label>
                      <input
                        type="text"
                        value={editingMeno}
                        onChange={(e) => setEditingMeno(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Priezvisko
                      </label>
                      <input
                        type="text"
                        value={editingPriezvisko}
                        onChange={(e) => setEditingPriezvisko(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Telefon + Region */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Telefón
                        </div>
                      </label>
                      <input
                        type="tel"
                        value={editingTelefon}
                        onChange={(e) => setEditingTelefon(e.target.value)}
                        placeholder="+421 ..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Región
                        </div>
                      </label>
                      <input
                        type="text"
                        value={editingRegion}
                        onChange={(e) => setEditingRegion(e.target.value)}
                        placeholder="BA, KE, BB..."
                        maxLength={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-400 uppercase"
                      />
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        Len skratka okresu (napr. BA, KE, BB...)
                      </p>
                    </div>
                  </div>

                  {/* Roles */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Roly
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            toggleRole(role, editingRoly, setEditingRoly)
                          }
                          className={`text-xs px-3 py-1.5 rounded-full font-medium border-2 transition-all ${
                            editingRoly.includes(role)
                              ? `${rolaColors[role]} border-current`
                              : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {rolaLabels[role]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Regional toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingJeRegionalny(!editingJeRegionalny)
                      }
                      className={`relative w-8 h-4.5 rounded-full transition-colors ${
                        editingJeRegionalny ? "bg-amber-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${
                          editingJeRegionalny ? "translate-x-3.5" : ""
                        }`}
                      />
                    </button>
                    <span className="text-xs text-gray-600 font-medium">
                      Regionálny redaktor
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 ml-13 flex flex-wrap gap-1">
                  {(p.roly || []).map((r: UserRole) => (
                    <span
                      key={r}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${rolaColors[r] || "bg-gray-100 text-gray-600"}`}
                    >
                      {rolaLabels[r] || r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
