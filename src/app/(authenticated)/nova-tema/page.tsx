"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import {
  FileText,
  Calendar,
  AlignLeft,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function NovaTemPage() {
  const [nazov, setNazov] = useState("");
  const [popis, setPopis] = useState("");
  const [datum, setDatum] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nie ste prihlásený");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("temy").insert({
      reporter_id: user.id,
      datum,
      nazov,
      popis: popis || null,
      stav: "caka",
      poznamka_veduceho: null,
      schvalil_id: null,
    } as any);

    if (insertError) {
      setError("Nepodarilo sa pridať tému. Skúste znova.");
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Téma pridaná!
          </h2>
          <p className="text-gray-500 mb-6">
            Vaša téma čaká na schválenie vedúcim dňa.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSuccess(false);
                setNazov("");
                setPopis("");
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Pridať ďalšiu
            </button>
            <Link
              href="/domov"
              className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors text-center"
            >
              Na domov
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href="/domov"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Späť na domov
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nová téma</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pridajte novú tému na službu
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              Dátum
            </div>
          </label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            required
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setDatum(format(new Date(), "yyyy-MM-dd"))}
              className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
            >
              Dnes
            </button>
            <button
              type="button"
              onClick={() =>
                setDatum(format(addDays(new Date(), 1), "yyyy-MM-dd"))
              }
              className="text-xs px-3 py-1 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
            >
              Zajtra
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" />
              Názov témy
            </div>
          </label>
          <input
            type="text"
            value={nazov}
            onChange={(e) => setNazov(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
            placeholder="Zadajte názov témy"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <AlignLeft className="w-4 h-4 text-gray-400" />
              Popis (voliteľné)
            </div>
          </label>
          <textarea
            value={popis}
            onChange={(e) => setPopis(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 resize-none"
            rows={4}
            placeholder="Podrobnejší popis témy..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Pridávam..." : "Pridať tému"}
        </button>
      </form>
    </div>
  );
}
