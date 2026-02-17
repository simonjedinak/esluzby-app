"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, UserRole } from "@/lib/types/database";
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
} from "lucide-react";

interface AdminClientProps {
  profiles: Profile[];
}

export function AdminClient({ profiles }: AdminClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [meno, setMeno] = useState("");
  const [priezvisko, setPriezvisko] = useState("");
  const [rola, setRola] = useState<UserRole>("reporter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Use Supabase Admin API via edge function or direct signup
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          meno,
          priezvisko,
          rola,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess(`Účet pre ${meno} ${priezvisko} (${email}) bol vytvorený`);
      setEmail("");
      setPassword("");
      setMeno("");
      setPriezvisko("");
      setRola("reporter");
      setShowForm(false);
      router.refresh();
    }
    setLoading(false);
  };

  const roleLabels: Record<UserRole, string> = {
    admin: "Administrátor",
    veduci: "Vedúci",
    reporter: "Reportér",
  };

  const roleColors: Record<UserRole, string> = {
    admin: "bg-purple-100 text-purple-700",
    veduci: "bg-orange-100 text-orange-700",
    reporter: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Správa účtov</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vytvárajte a spravujte používateľov
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
                  Rola
                </div>
              </label>
              <select
                value={rola}
                onChange={(e) => setRola(e.target.value as UserRole)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
              >
                <option value="reporter">Reportér</option>
                <option value="veduci">Vedúci</option>
                <option value="admin">Administrátor</option>
              </select>
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
            {profiles.length}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  {p.meno[0]}
                  {p.priezvisko[0]}
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    {p.meno} {p.priezvisko}
                  </span>
                  <p className="text-sm text-gray-500">{p.email}</p>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[p.rola]}`}
              >
                {roleLabels[p.rola]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
