"use client";

import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Profile, Volno } from "@/lib/types/database";
import { Calendar, Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VolnaClientProps {
  currentProfile: Profile;
  volna: Volno[];
  allProfiles: Profile[];
}

export function VolnaClient({
  currentProfile,
  volna,
  allProfiles,
}: VolnaClientProps) {
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const supabase = createClient();
  const router = useRouter();

  const getProfile = (id: string) => allProfiles.find((p) => p.id === id);

  const filteredVolna =
    filter === "mine"
      ? volna.filter((v) => v.reporter_id === currentProfile.id)
      : volna;

  const handleDelete = async (id: string) => {
    if (!confirm("Naozaj chcete zmazať toto voľno?")) return;

    await supabase.from("volna").delete().eq("id", id);
    router.refresh();
  };

  const isAdmin = currentProfile.rola === "admin";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Všetky voľná</h1>
        <p className="text-sm text-gray-500 mt-1">
          Prehľad naplánovaných voľien
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Všetky
        </button>
        <button
          onClick={() => setFilter("mine")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === "mine"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Moje
        </button>
      </div>

      {filteredVolna.length > 0 ? (
        <div className="space-y-3">
          {filteredVolna.map((v) => {
            const reporter = getProfile(v.reporter_id);
            const isMine = v.reporter_id === currentProfile.id;
            const canDelete = isMine || isAdmin;

            return (
              <div
                key={v.id}
                className={`bg-white rounded-2xl shadow-sm border p-4 ${
                  isMine ? "border-blue-200" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        isMine
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {reporter?.meno[0]}
                      {reporter?.priezvisko[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {reporter?.meno} {reporter?.priezvisko}
                        </span>
                        {isMine && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                            Vy
                          </span>
                        )}
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
                    </div>
                  </div>

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
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Žiadne voľná na zobrazenie</p>
        </div>
      )}
    </div>
  );
}
