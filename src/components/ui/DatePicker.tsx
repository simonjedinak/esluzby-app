"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

const DAY_NAMES = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function DatePicker({
  value,
  onChange,
  placeholder = "Vyberte dátum",
  className = "",
  label,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(
    value ? new Date(value + "T12:00:00") : new Date(),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [popupStyle, setPopupStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Close on outside click (handles both button container and portal popup)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) return;
      if (portalRef.current && portalRef.current.contains(target)) return;
      setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Position popup when opened and update on scroll/resize
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPopupStyle(null);
      return;
    }

    const compute = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const top = rect.bottom + window.scrollY + 6; // small gap
      let left = rect.left + window.scrollX;

      const popupWidth = 288; // w-72
      const viewportRight = window.scrollX + window.innerWidth;
      if (left + popupWidth > viewportRight - 8) {
        left = viewportRight - popupWidth - 8;
      }
      if (left < window.scrollX + 8) left = window.scrollX + 8;

      setPopupStyle({ top, left });
    };

    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open]);

  // Update view month when value changes externally
  useEffect(() => {
    if (value) {
      setViewMonth(new Date(value + "T12:00:00"));
    }
  }, [value]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  let startDay = getDay(monthStart) - 1;
  if (startDay < 0) startDay = 6;

  const paddedDays: (Date | null)[] = Array(startDay).fill(null);
  paddedDays.push(...days);
  while (paddedDays.length % 7 !== 0) {
    paddedDays.push(null);
  }

  const selectedDate = value ? new Date(value + "T12:00:00") : null;

  const displayValue = value
    ? format(new Date(value + "T12:00:00"), "d. MMMM yyyy", { locale: sk })
    : "";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:border-gray-300"
      >
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        {displayValue ? (
          <span className="text-gray-900 text-sm">{displayValue}</span>
        ) : (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
      </button>

      {open &&
        popupStyle &&
        createPortal(
          <div
            ref={portalRef}
            style={{
              position: "absolute",
              top: popupStyle.top,
              left: popupStyle.left,
            }}
            className="z-[9999] mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-3 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {format(viewMonth, "LLLL yyyy", { locale: sk })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-medium text-gray-400 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {paddedDays.map((day, i) => {
                if (!day)
                  return (
                    <div key={`empty-${i}`} className="w-full aspect-square" />
                  );

                const dateStr = format(day, "yyyy-MM-dd");
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);
                const inMonth = isSameMonth(day, viewMonth);

                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      onChange(dateStr);
                      setOpen(false);
                    }}
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : today
                          ? "bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200"
                          : !inMonth
                            ? "text-gray-300"
                            : isWeekend
                              ? "text-neutral-500 hover:bg-gray-100"
                              : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const today = format(new Date(), "yyyy-MM-dd");
                  onChange(today);
                  setOpen(false);
                }}
                className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
              >
                Dnes
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
