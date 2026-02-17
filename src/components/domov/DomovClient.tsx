"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, addDays, subDays } from "date-fns";
import { sk } from "date-fns/locale";
import type {
  Profile,
  Tema,
  VeduciDna,
  DennyStav,
  TemaStav,
  ReporterStav,
} from "@/lib/types/database";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Circle,
  MessageSquare,
} from "lucide-react";

interface DomovClientProps {
  currentProfile: Profile;
  allProfiles: Profile[];
}

export function DomovClient({ currentProfile, allProfiles }: DomovClientProps) {
  const [datum, setDatum] = useState(format(new Date(), "yyyy-MM-dd"));
  const [temy, setTemy] = useState<Tema[]>([]);
  const [veduciDna, setVeduciDna] = useState<VeduciDna[]>([]);
  const [denneStavy, setDenneStavy] = useState<DennyStav[]>([]);
  const [loading, setLoading] = useState(true);
  const [schvalovaniModal, setSchvalovaniModal] = useState<{
    tema: Tema;
    action: "schvalene" | "neschvalene";
  } | null>(null);
  const [poznamka, setPoznamka] = useState("");
  const [stavLoading, setStavLoading] = useState(false);
  const supabase = createClient();

  const isVeduci =
    currentProfile.rola === "veduci" || currentProfile.rola === "admin";
  const isVeduciDna = veduciDna.some((v) => v.veduci_id === currentProfile.id);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [temyRes, veduciRes, stavyRes] = await Promise.all([
      supabase.from("temy").select("*").eq("datum", datum).order("created_at"),
      supabase.from("veduci_dna").select("*").eq("datum", datum),
      supabase.from("denny_stav").select("*").eq("datum", datum),
    ]);

    setTemy((temyRes.data || []) as unknown as Tema[]);
    setVeduciDna((veduciRes.data || []) as unknown as VeduciDna[]);
    setDenneStavy((stavyRes.data || []) as unknown as DennyStav[]);
    setLoading(false);
  }, [datum, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProfile = (id: string) => allProfiles.find((p) => p.id === id);

  const getReporterStav = (reporterId: string): ReporterStav => {
    const stav = denneStavy.find((s) => s.reporter_id === reporterId);
    return stav?.stav || "pracujuci";
  };

  const getReporterTemy = (reporterId: string) => {
    return temy.filter((t) => t.reporter_id === reporterId);
  };

  // Get all reporters who have themes or status for this day
  const activeReporterIds = new Set([
    ...temy.map((t) => t.reporter_id),
    ...denneStavy.map((s) => s.reporter_id),
  ]);

  // All reporters (those with activity first, then all)
  const reporters = allProfiles.filter(
    (p) => p.rola === "reporter" || activeReporterIds.has(p.id),
  );

  // Sort: current user first, then active reporters, then others
  const sortedReporters = [...reporters].sort((a, b) => {
    if (a.id === currentProfile.id) return -1;
    if (b.id === currentProfile.id) return 1;
    const aActive = activeReporterIds.has(a.id);
    const bActive = activeReporterIds.has(b.id);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return a.priezvisko.localeCompare(b.priezvisko);
  });

  const handleSchvalenie = async () => {
    if (!schvalovaniModal) return;
    setStavLoading(true);

    await supabase
      .from("temy")
      .update({
        stav: schvalovaniModal.action,
        schvalil_id: currentProfile.id,
        poznamka_veduceho: poznamka || null,
      } as any)
      .eq("id", schvalovaniModal.tema.id);

    setSchvalovaniModal(null);
    setPoznamka("");
    setStavLoading(false);
    fetchData();
  };

  const handleReporterStav = async (reporterId: string, stav: ReporterStav) => {
    const existing = denneStavy.find((s) => s.reporter_id === reporterId);

    if (existing) {
      await supabase
        .from("denny_stav")
        .update({ stav, nastavil_id: currentProfile.id } as any)
        .eq("id", existing.id);
    } else {
      await supabase.from("denny_stav").insert({
        reporter_id: reporterId,
        datum,
        stav,
        nastavil_id: currentProfile.id,
      } as any);
    }

    fetchData();
  };

  const stavConfig: Record<
    TemaStav,
    { label: string; color: string; icon: typeof CheckCircle }
  > = {
    schvalene: {
      label: "Schválené",
      color: "bg-green-100 text-green-700 border-green-200",
      icon: CheckCircle,
    },
    caka: {
      label: "Čaká",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: Clock,
    },
    neschvalene: {
      label: "Neschválené",
      color: "bg-red-100 text-red-700 border-red-200",
      icon: XCircle,
    },
  };

  const reporterStavConfig: Record<
    ReporterStav,
    { label: string; color: string; dot: string }
  > = {
    pracujuci: {
      label: "Pracujúci",
      color: "text-green-700",
      dot: "bg-green-500",
    },
    nepracujuci: {
      label: "Nepracujúci",
      color: "text-red-700",
      dot: "bg-red-500",
    },
    volno: { label: "Voľno", color: "text-gray-500", dot: "bg-gray-400" },
  };

  const formattedDate = format(
    new Date(datum + "T12:00:00"),
    "EEEE, d. MMMM yyyy",
    { locale: sk },
  );

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setDatum(
                format(subDays(new Date(datum + "T12:00:00"), 1), "yyyy-MM-dd"),
              )
            }
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {formattedDate}
              </h2>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer bg-transparent border-none outline-none text-center"
              />
            </div>
          </div>

          <button
            onClick={() =>
              setDatum(
                format(addDays(new Date(datum + "T12:00:00"), 1), "yyyy-MM-dd"),
              )
            }
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Quick nav */}
        <div className="flex justify-center gap-2 mt-3">
          <button
            onClick={() => setDatum(format(new Date(), "yyyy-MM-dd"))}
            className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
          >
            Dnes
          </button>
          <button
            onClick={() =>
              setDatum(format(addDays(new Date(), 1), "yyyy-MM-dd"))
            }
            className="text-xs px-3 py-1 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
          >
            Zajtra
          </button>
        </div>
      </div>

      {/* Vedúci dňa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-gray-900">Vedúci dňa</h3>
        </div>
        {veduciDna.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {veduciDna.map((v) => {
              const veduci = getProfile(v.veduci_id);
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2"
                >
                  <div className="w-7 h-7 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-semibold">
                    {veduci?.meno[0]}
                    {veduci?.priezvisko[0]}
                  </div>
                  <span className="text-sm font-medium text-orange-800">
                    {veduci?.meno} {veduci?.priezvisko}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Žiadny vedúci dňa nie je nastavený
          </p>
        )}

        {/* Vedúci management for admin/veduci */}
        {isVeduci && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <select
              onChange={async (e) => {
                if (e.target.value) {
                  await supabase.from("veduci_dna").insert({
                    datum,
                    veduci_id: e.target.value,
                  } as any);
                  e.target.value = "";
                  fetchData();
                }
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-gray-700"
              defaultValue=""
            >
              <option value="" disabled>
                + Pridať vedúceho dňa
              </option>
              {allProfiles
                .filter(
                  (p) =>
                    (p.rola === "veduci" || p.rola === "admin") &&
                    !veduciDna.some((v) => v.veduci_id === p.id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.meno} {p.priezvisko}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Reporters & Themes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <h3 className="font-semibold text-gray-900">Reportéri a témy</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {sortedReporters.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReporters.map((reporter) => {
              const reporterTemy = getReporterTemy(reporter.id);
              const stav = getReporterStav(reporter.id);
              const stavInfo = reporterStavConfig[stav];
              const isCurrentUser = reporter.id === currentProfile.id;

              return (
                <div
                  key={reporter.id}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                    isCurrentUser
                      ? "border-blue-200 ring-1 ring-blue-100"
                      : "border-gray-100"
                  }`}
                >
                  {/* Reporter Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                          isCurrentUser
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {reporter.meno[0]}
                        {reporter.priezvisko[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {reporter.meno} {reporter.priezvisko}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                              Vy
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div
                            className={`w-2 h-2 rounded-full ${stavInfo.dot}`}
                          />
                          <span
                            className={`text-xs font-medium ${stavInfo.color}`}
                          >
                            {stavInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reporter status changer (for vedúci) */}
                    {isVeduci && (
                      <div className="flex items-center gap-1">
                        {(
                          [
                            "pracujuci",
                            "nepracujuci",
                            "volno",
                          ] as ReporterStav[]
                        ).map((s) => {
                          const cfg = reporterStavConfig[s];
                          return (
                            <button
                              key={s}
                              onClick={() => handleReporterStav(reporter.id, s)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${
                                stav === s
                                  ? `${cfg.dot} border-transparent scale-110`
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                              title={cfg.label}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Themes */}
                  <div className="p-4">
                    {reporterTemy.length > 0 ? (
                      <div className="space-y-2">
                        {reporterTemy.map((tema) => {
                          const stavI = stavConfig[tema.stav];
                          const StavIcon = stavI.icon;
                          return (
                            <div
                              key={tema.id}
                              className={`flex items-start justify-between p-3 rounded-xl border ${stavI.color}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <StavIcon className="w-4 h-4 shrink-0" />
                                  <span className="font-medium text-sm truncate">
                                    {tema.nazov}
                                  </span>
                                </div>
                                {tema.popis && (
                                  <p className="text-xs mt-1 ml-6 opacity-80">
                                    {tema.popis}
                                  </p>
                                )}
                                {tema.poznamka_veduceho && (
                                  <div className="flex items-start gap-1.5 mt-2 ml-6">
                                    <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                    <p className="text-xs italic opacity-80">
                                      {tema.poznamka_veduceho}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Approve/Reject buttons for vedúci dňa */}
                              {(isVeduciDna ||
                                currentProfile.rola === "admin") &&
                                tema.stav === "caka" && (
                                  <div className="flex items-center gap-1 ml-2 shrink-0">
                                    <button
                                      onClick={() =>
                                        setSchvalovaniModal({
                                          tema,
                                          action: "schvalene",
                                        })
                                      }
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-200 hover:bg-green-300 text-green-800 transition-colors"
                                      title="Schváliť"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setSchvalovaniModal({
                                          tema,
                                          action: "neschvalene",
                                        })
                                      }
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-200 hover:bg-red-300 text-red-800 transition-colors"
                                      title="Neschváliť"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Circle className="w-4 h-4" />
                        <span className="text-sm italic">Žiadne témy</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schvalovanie Modal */}
      {schvalovaniModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {schvalovaniModal.action === "schvalene"
                ? "Schváliť tému"
                : "Neschváliť tému"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Téma:{" "}
              <span className="font-medium text-gray-700">
                {schvalovaniModal.tema.nazov}
              </span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Poznámka (voliteľné)
              </label>
              <textarea
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 placeholder-gray-400 resize-none"
                rows={3}
                placeholder={
                  schvalovaniModal.action === "neschvalene"
                    ? "Dôvod neschválenia..."
                    : "Poznámka k schváleniu..."
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSchvalovaniModal(null);
                  setPoznamka("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSchvalenie}
                disabled={stavLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  schvalovaniModal.action === "schvalene"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {stavLoading
                  ? "Ukladám..."
                  : schvalovaniModal.action === "schvalene"
                    ? "Schváliť"
                    : "Neschváliť"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
