"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";
import { User, Mail, Phone, Lock, Save, CheckCircle } from "lucide-react";

interface ProfilClientProps {
  profile: Profile;
}

export function ProfilClient({ profile }: ProfilClientProps) {
  const [meno, setMeno] = useState(profile.meno);
  const [priezvisko, setPriezvisko] = useState(profile.priezvisko);
  const [telefon, setTelefon] = useState(profile.telefon || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("profiles")
      .update({ meno, priezvisko, telefon: telefon || null } as any)
      .eq("id", profile.id);

    if (error) {
      setError("Nepodarilo sa aktualizovať profil");
    } else {
      setSuccess("Profil bol aktualizovaný");
      router.refresh();
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Heslá sa nezhodujú");
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Heslo musí mať aspoň 6 znakov");
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError("Nepodarilo sa zmeniť heslo");
    } else {
      setSuccess("Heslo bolo zmenené");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  const roleLabels = {
    admin: "Administrátor",
    veduci: "Vedúci",
    reporter: "Reportér",
  };

  const roleColors = {
    admin: "bg-purple-100 text-purple-700",
    veduci: "bg-orange-100 text-orange-700",
    reporter: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Správa vášho účtu</p>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-2xl font-semibold">
            {profile.meno[0]}
            {profile.priezvisko[0]}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {profile.meno} {profile.priezvisko}
            </h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${roleColors[profile.rola]}`}
            >
              {roleLabels[profile.rola]}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  Meno
                </div>
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
              value={profile.email}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-400" />
                Telefón
              </div>
            </label>
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
              placeholder="+421 ..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? "Ukladám..." : "Uložiť zmeny"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-400" />
          Zmena hesla
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nové heslo
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
              placeholder="Minimálne 6 znakov"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Potvrdiť heslo
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
              placeholder="Zopakujte heslo"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 transition-all disabled:opacity-50"
          >
            {passwordLoading ? "Mením heslo..." : "Zmeniť heslo"}
          </button>
        </form>
      </div>
    </div>
  );
}
