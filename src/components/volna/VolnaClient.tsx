"use client";

import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Profile, Volno, VolnoStav } from "@/lib/types/database";
import {
  typVolnaLabels,
  volnoStavLabels,
  hasRole,
  canApproveLeave,
} from "@/lib/types/database";
import {
  Calendar,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  MessageSquare,
  Pencil,
  X,
  PlusCircle,
  History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";
import type { TypVolna } from "@/lib/types/database";
import { DatePicker } from "@/components/ui/DatePicker";
import Link from "next/link";
import { NoveVolnoModal } from "@/components/volna/NoveVolnoModal";

interface VolnaClientProps {
  currentProfile: Profile;
  volna: Volno[];
  allProfiles: Profile[];
}

export function VolnaClient({
  currentProfile,
  volna: initialVolna,
  allProfiles,
}: VolnaClientProps) {
  const [filter, setFilter] = useState<"all" | "caka">("all");
  const [showPast, setShowPast] = useState(false);
  const [volnaList, setVolnaList] = useState<Volno[]>(initialVolna);
  const [schvalovaniModal, setSchvalovaniModal] = useState<{
    volno: Volno;
    action: "schvalene" | "neschvalene";
  } | null>(null);
  const [poznamka, setPoznamka] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editModal, setEditModal] = useState<Volno | null>(null);
  const [editDatumOd, setEditDatumOd] = useState("");
  const [editDatumDo, setEditDatumDo] = useState("");
  const [editDovod, setEditDovod] = useState("");
  const [editTyp, setEditTyp] = useState<TypVolna>("dovolenka");
  const [showNoveVolno, setShowNoveVolno] = useState(false);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const getProfile = (id: string) => allProfiles.find((p) => p.id === id);

  const today = format(new Date(), "yyyy-MM-dd");
  const isApprover = canApproveLeave(currentProfile);

  const filteredVolna = volnaList.filter((v) => {
    // Hide past leaves unless admin/office_manazer toggled "show past"
    if (!showPast && v.datum_do < today) return false;

    if (filter === "caka") return v.stav === "caka";
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Naozaj chcete zmazať toto voľno?")) return;
    await supabase.from("volna").delete().eq("id", id);
    setVolnaList((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSchvalenie = async () => {
    if (!schvalovaniModal) return;
    setActionLoading(true);

    await supabase
      .from("volna")
      .update({
        stav: schvalovaniModal.action,
        schvalil_id: currentProfile.id,
        poznamka: poznamka || null,
      } as any)
      .eq("id", schvalovaniModal.volno.id);

    setVolnaList((prev) =>
      prev.map((v) =>
        v.id === schvalovaniModal.volno.id
          ? {
              ...v,
              stav: schvalovaniModal.action,
              schvalil_id: currentProfile.id,
              poznamka: poznamka || null,
            }
          : v,
      ),
    );

    setSchvalovaniModal(null);
    setPoznamka("");
    setActionLoading(false);
  };

  const openEditModal = (v: Volno) => {
    setEditDatumOd(v.datum_od);
    setEditDatumDo(v.datum_do);
    setEditDovod(v.dovod || "");
    setEditTyp(v.typ || "dovolenka");
    setEditModal(v);
  };

  const handleEditVolno = async () => {
    if (!editModal) return;
    setActionLoading(true);

    await supabase
      .from("volna")
      .update({
        datum_od: editDatumOd,
        datum_do: editDatumDo,
        dovod: editDovod || null,
        typ: editTyp,
      } as any)
      .eq("id", editModal.id);

    setVolnaList((prev) =>
      prev.map((v) =>
        v.id === editModal.id
          ? {
              ...v,
              datum_od: editDatumOd,
              datum_do: editDatumDo,
              dovod: editDovod || null,
              typ: editTyp,
            }
          : v,
      ),
    );

    setEditModal(null);
    setActionLoading(false);
  };

  const stavConfig: Record<
    VolnoStav,
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Všetky voľná</h1>
          <p className="text-sm text-gray-500 mt-1">
            Prehľad naplánovaných voľien
          </p>
        </div>
        <button
          onClick={() => setShowNoveVolno(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          Požiadať o voľno
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", ...(isApprover ? ["caka" as const] : [])] as const).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "Všetky" : "Na schválenie"}
              {f === "caka" && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-200 text-yellow-800 text-xs">
                  {volnaList.filter((v) => v.stav === "caka").length}
                </span>
              )}
            </button>
          ),
        )}

        {/* Show past leaves toggle - only for admin/office_manazer */}
        {isApprover && (
          <button
            onClick={() => setShowPast(!showPast)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ml-auto ${
              showPast
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Minulé
          </button>
        )}
      </div>

      {filteredVolna.length > 0 ? (
        <div className="space-y-3">
          {filteredVolna.map((v) => {
            const reporter = getProfile(v.reporter_id);
            const isMine = v.reporter_id === currentProfile.id;
            const canDelete = isMine || isApprover;
            const stav = stavConfig[v.stav || "caka"];
            const StavIcon = stav.icon;

            return (
              <div
                key={v.id}
                className={`bg-white rounded-2xl shadow-sm border p-4 ${
                  isMine ? "border-blue-200" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/profil?user=${v.reporter_id}`}
                      className="no-underline group shrink-0"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                          isMine
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {reporter?.region
                          ? reporter.region.slice(0, 2).toUpperCase()
                          : `${reporter?.meno[0]}${reporter?.priezvisko[0]}`}
                      </div>
                    </Link>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/profil?user=${v.reporter_id}`}
                          className="no-underline group"
                        >
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {reporter?.meno} {reporter?.priezvisko}
                          </span>
                        </Link>
                        {isMine && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                            Vy
                          </span>
                        )}
                        {/* Leave type badge */}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {typVolnaLabels[v.typ] || "Dovolenka"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {format(
                            new Date(v.datum_od + "T12:00:00"),
                            "d. MMM yyyy",
                            { locale: sk },
                          )}
                          {v.datum_od !== v.datum_do && (
                            <>
                              {" "}
                              —{" "}
                              {format(
                                new Date(v.datum_do + "T12:00:00"),
                                "d. MMM yyyy",
                                { locale: sk },
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      {v.dovod && (
                        <p className="text-sm text-gray-500 mt-1">{v.dovod}</p>
                      )}
                      {/* Approval status */}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${stav.color}`}
                        >
                          <StavIcon className="w-3 h-3" />
                          {stav.label}
                        </span>
                        {v.schvalil_id && (
                          <span className="text-xs text-gray-400">
                            ({getProfile(v.schvalil_id)?.meno}{" "}
                            {getProfile(v.schvalil_id)?.priezvisko})
                          </span>
                        )}
                      </div>
                      {v.poznamka && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
                          <p className="text-xs text-gray-500 italic">
                            {v.poznamka}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {/* Approve/Reject buttons - only for admin/office_manazer */}
                    {isApprover && v.stav === "caka" && (
                      <>
                        <button
                          onClick={() =>
                            setSchvalovaniModal({
                              volno: v,
                              action: "schvalene",
                            })
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                          title="Schváliť"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setSchvalovaniModal({
                              volno: v,
                              action: "neschvalene",
                            })
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                          title="Neschváliť"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => openEditModal(v)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Upraviť"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Žiadne voľná na zobrazenie</p>
        </div>
      )}

      {/* Schvalovanie Modal */}
      {schvalovaniModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {schvalovaniModal.action === "schvalene"
                ? "Schváliť voľno"
                : "Neschváliť voľno"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {getProfile(schvalovaniModal.volno.reporter_id)?.meno}{" "}
              {getProfile(schvalovaniModal.volno.reporter_id)?.priezvisko} —{" "}
              {typVolnaLabels[schvalovaniModal.volno.typ] || "Dovolenka"}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Komentár (voliteľné)
              </label>
              <textarea
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 placeholder-gray-400 resize-none"
                rows={3}
                placeholder={
                  schvalovaniModal.action === "neschvalene"
                    ? "Dôvod neschválenia..."
                    : "Komentár k schváleniu..."
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
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  schvalovaniModal.action === "schvalene"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading
                  ? "Ukladám..."
                  : schvalovaniModal.action === "schvalene"
                    ? "Schváliť"
                    : "Neschváliť"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Volno Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Upraviť voľno
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ voľna
                </label>
                <select
                  value={editTyp}
                  onChange={(e) => setEditTyp(e.target.value as TypVolna)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900"
                >
                  {(Object.keys(typVolnaLabels) as TypVolna[]).map((key) => (
                    <option key={key} value={key}>
                      {typVolnaLabels[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  value={editDatumOd}
                  onChange={setEditDatumOd}
                  label="Od"
                />
                <DatePicker
                  value={editDatumDo}
                  onChange={setEditDatumDo}
                  label="Do"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dôvod (voliteľné)
                </label>
                <textarea
                  value={editDovod}
                  onChange={(e) => setEditDovod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 resize-none"
                  rows={3}
                  placeholder="Dôvod voľna..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleEditVolno}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Ukladám..." : "Uložiť"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nové voľno Modal */}
      <NoveVolnoModal
        isOpen={showNoveVolno}
        onClose={() => setShowNoveVolno(false)}
      />
    </div>
  );
}
