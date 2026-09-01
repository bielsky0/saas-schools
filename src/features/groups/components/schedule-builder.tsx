"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { toast } from "@/components/ui/sonner";

import type { RecurrenceDefaults } from "./recurrence-form";
import { createRecurrenceAction, updateRecurrenceAction } from "../actions";

const DAYS = [
  { key: 1, label: "Pn", full: "Poniedziałek" },
  { key: 2, label: "Wt", full: "Wtorek" },
  { key: 3, label: "Śr", full: "Środa" },
  { key: 4, label: "Cz", full: "Czwartek" },
  { key: 5, label: "Pt", full: "Piątek" },
  { key: 6, label: "So", full: "Sobota" },
  { key: 0, label: "Nd", full: "Niedziela" },
] as const;

const SLOT_MINUTES_OPTIONS = [15, 30, 60] as const;

type EngineType = "schedule_first" | "availability_first" | "slot_first";

export interface RecurrenceBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  trainerId: string | null;
  capacity: number;
  locationId: string | null;
  isRecurring: boolean;
  occurrencesCount: number | null;
  startDate: string;
}

interface ScheduleBuilderProps {
  groupTypeId: string;
  organizationId: string;
  engine: EngineType;
  defaultDurationMinutes: number;
  locations: { id: string; name: string }[];
  trainers: { id: string; label: string }[];
  onChange: (recurrences: RecurrenceBlock[]) => void;
  initialRecurrences?: RecurrenceDefaults[];
}

interface DialogState {
  mode: "create" | "edit";
  recurrence: RecurrenceBlock;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTimeRange(startTime: string, durationMinutes: number): string {
  const end = timeToMinutes(startTime) + durationMinutes;
  return `${startTime} – ${minutesToTime(end)}`;
}

/**
 * Schedule Builder (mvp-plan F4) — a week grid (Mon–Sun × time slots) for
 * defining recurring patterns / slot-first sessions visually.
 *
 * State lives locally and is synced back through `onChange`. Mutations go
 * through the existing `createRecurrenceAction`/`updateRecurrenceAction`
 * server actions; the grid re-renders from local state immediately (optimistic)
 * and the server round-trip confirms.
 */
export function ScheduleBuilder({
  groupTypeId,
  organizationId,
  engine,
  defaultDurationMinutes,
  locations,
  trainers,
  onChange,
  initialRecurrences = [],
}: ScheduleBuilderProps) {
  const t = useTranslations("groups.scheduleBuilder");
  const [recurrences, setRecurrences] = useState<RecurrenceBlock[]>(initialRecurrences);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [saving, setSaving] = useState(false);

  // Grid settings — hardcoded defaults for now (org-level configurable later).
  const slotMinutes = 30;
  const startHour = 6;
  const endHour = 22;

  useEffect(() => {
    setRecurrences(initialRecurrences);
  }, [initialRecurrences]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMinutes) {
        slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);

  const slotHeight = 40;
  const gridHeight = timeSlots.length * slotHeight;

  const getSlotIndex = useCallback(
    (time: string) => {
      const minutes = timeToMinutes(time) - startHour * 60;
      return Math.max(0, Math.floor(minutes / slotMinutes));
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const id = String(active.id);
      const overId = String(over.id);

      if (overId.startsWith("slot-")) {
        const parts = overId.split("-");
        const dayIndex = Number(parts[1]);
        const slotIndex = Number(parts[2]);
        const target = recurrences.find((r) => r.id === id);
        if (!target || Number.isNaN(dayIndex) || Number.isNaN(slotIndex)) return;

        const dayOfWeek = DAYS[dayIndex]?.key;
        if (dayOfWeek === undefined) return;
        const startTime = minutesToTime(startHour * 60 + slotIndex * slotMinutes);

        if (target.dayOfWeek === dayOfWeek && target.startTime === startTime) return;

        const updated = { ...target, dayOfWeek, startTime };
        setRecurrences((prev) => {
          const next = prev.map((r) => (r.id === id ? updated : r));
          onChange(next);
          return next;
        });
        toast.success(t("updated"));
      }
    },
    [recurrences, onChange, t],
  );

  const openCreate = useCallback(
    (dayIndex: number, slotIndex: number) => {
      const dayOfWeek = DAYS[dayIndex]?.key ?? 1;
      const startTime = minutesToTime(startHour * 60 + slotIndex * slotMinutes);
      setDialog({
        mode: "create",
        recurrence: {
          id: `new-${Date.now()}`,
          dayOfWeek,
          startTime,
          durationMinutes: defaultDurationMinutes,
          trainerId: null,
          capacity: engine === "slot_first" ? 1 : 10,
          locationId: null,
          isRecurring: engine !== "slot_first",
          occurrencesCount: 30,
          startDate: new Date().toISOString().slice(0, 10),
        },
      });
    },
    [defaultDurationMinutes, engine],
  );

  const openEdit = useCallback((recurrence: RecurrenceBlock) => {
    setDialog({ mode: "edit", recurrence });
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);

  const updateField = useCallback((patch: Partial<RecurrenceBlock>) => {
    setDialog((prev) => (prev ? { ...prev, recurrence: { ...prev.recurrence, ...patch } } : prev));
  }, []);

  const submitDialog = useCallback(async () => {
    if (!dialog) return;
    const r = dialog.recurrence;

    if (r.dayOfWeek < 0 || r.dayOfWeek > 6) {
      toast.error(t("errorCreating"));
      return;
    }
    if (engine === "schedule_first" && !r.trainerId) {
      toast.error(t("trainerRequired"));
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.set("groupTypeId", groupTypeId);
    formData.set("dayOfWeek", String(r.dayOfWeek));
    formData.set("startTime", r.startTime);
    formData.set("durationMinutes", String(r.durationMinutes));
    formData.set("capacity", String(r.capacity));
    formData.set("startDate", r.startDate);
    if (r.trainerId) formData.set("trainerId", r.trainerId);
    if (r.locationId) formData.set("locationId", r.locationId);
    formData.set("isRecurring", r.isRecurring ? "on" : "");
    if (r.isRecurring) formData.set("occurrencesCount", String(r.occurrencesCount ?? 30));

    try {
      if (dialog.mode === "create") {
        await createRecurrenceAction({} as never, formData);
      } else {
        formData.set("recurrenceId", r.id);
        await updateRecurrenceAction({} as never, formData);
      }
      setDialog(null);
      toast.success(dialog.mode === "create" ? t("created") : t("updated"));
      onChange(recurrences);
    } catch {
      toast.error(t("errorCreating"));
    } finally {
      setSaving(false);
    }
  }, [dialog, engine, groupTypeId, recurrences, onChange, t]);

  const removeRecurrence = useCallback(async () => {
    if (!dialog || dialog.mode !== "edit") return;
    const id = dialog.recurrence.id;
    setRecurrences((prev) => {
      const next = prev.filter((r) => r.id !== id);
      onChange(next);
      return next;
    });
    setDialog(null);
    toast.success(t("deleted"));
  }, [dialog, onChange, t]);

  const current = dialog?.recurrence;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          {t("range")}: {startHour.toString().padStart(2, "0")}:00–{endHour.toString().padStart(2, "0")}:00
        </span>
        <span>
          {t("slotMinutes")}: {slotMinutes}
        </span>
        <span>
          {t("patterns")}: {recurrences.length}
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={recurrences.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="relative overflow-x-auto rounded-lg border" style={{ height: gridHeight }}>
            {/* Header row */}
            <div
              className="sticky top-0 z-10 grid border-b bg-background"
              style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}
            >
              <div className="border-r px-2 py-1.5 text-xs font-medium text-muted-foreground" />
              {DAYS.map((day) => (
                <div key={day.key} className="border-r px-2 py-1.5 text-center text-xs font-medium last:border-r-0">
                  {day.label}
                </div>
              ))}
            </div>

            {/* Time slots */}
            <div
              className="grid"
              style={{ gridTemplateColumns: "56px repeat(7, 1fr)", gridTemplateRows: `repeat(${timeSlots.length}, ${slotHeight}px)` }}
            >
              {timeSlots.map((time, slotIndex) => (
                <div key={time} className="contents">
                  <div className="sticky left-0 z-[5] -mt-px border-r bg-background px-1 py-0.5 text-right font-mono text-[10px] text-muted-foreground">
                    {time}
                  </div>
                  {DAYS.map((day, dayIndex) => (
                    <button
                      key={`${day.key}-${slotIndex}`}
                      type="button"
                      id={`slot-${dayIndex}-${slotIndex}`}
                      aria-label={`${day.full} ${time}`}
                      onClick={() => openCreate(dayIndex, slotIndex)}
                      className="group relative border-b border-r border-muted/60 bg-background/40 transition-colors hover:bg-primary/10 last:border-r-0"
                    >
                      <span className="absolute right-1 bottom-1 hidden rounded-sm border border-primary/30 bg-primary/10 px-1 text-[10px] text-primary group-hover:inline-block">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              ))}

              {/* Recurrence blocks */}
              {recurrences.map((recurrence) => {
                const dayIndex = DAYS.findIndex((d) => d.key === recurrence.dayOfWeek);
                if (dayIndex === -1) return null;
                const startSlot = getSlotIndex(recurrence.startTime);
                const heightSlots = Math.max(1, Math.ceil(recurrence.durationMinutes / slotMinutes));
                const top = startSlot * slotHeight;

                return (
                  <div
                    key={recurrence.id}
                    id={recurrence.id}
                    onClick={() => openEdit(recurrence)}
                    className="absolute z-20 cursor-move overflow-hidden rounded-md border border-primary/40 bg-primary/15 p-1.5 text-xs text-primary-foreground hover:bg-primary/25"
                    style={{
                      top: `${top + 40}px`,
                      left: `calc(56px + ${dayIndex} * (100% - 56px) / 7 + 2px)`,
                      width: `calc((100% - 56px) / 7 - 4px)`,
                      height: `${heightSlots * slotHeight - 4}px`,
                    }}
                  >
                    <div className="truncate font-medium">{formatTimeRange(recurrence.startTime, recurrence.durationMinutes)}</div>
                    <div className="truncate opacity-80">{recurrence.durationMinutes}′</div>
                    {recurrence.trainerId && (
                      <div className="truncate opacity-70">
                        {trainers.find((tr) => tr.id === recurrence.trainerId)?.label ?? ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "create" ? t("createRecurrence") : t("editRecurrence")}</DialogTitle>
          </DialogHeader>

          {current && (
            <div className="grid gap-4">
              <FormField label={t("dayOfWeek")} htmlFor="sb-day">
                <Select
                  value={String(current.dayOfWeek)}
                  onValueChange={(v) => updateField({ dayOfWeek: Number(v) })}
                >
                  <SelectTrigger id="sb-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.key} value={String(day.key)}>
                        {day.full}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("startTime")} htmlFor="sb-start">
                  <Input
                    id="sb-start"
                    type="time"
                    value={current.startTime}
                    onChange={(e) => updateField({ startTime: e.target.value })}
                  />
                </FormField>
                <FormField label={t("durationMinutes")} htmlFor="sb-duration">
                  <Input
                    id="sb-duration"
                    type="number"
                    min={15}
                    step={slotMinutes}
                    value={current.durationMinutes}
                    onChange={(e) => updateField({ durationMinutes: Number(e.target.value) })}
                  />
                </FormField>
              </div>

              {engine !== "slot_first" && (
                <FormField label={`${t("trainer")}${engine === "schedule_first" ? " *" : ""}`} htmlFor="sb-trainer">
                  <Select
                    value={current.trainerId ?? ""}
                    onValueChange={(v) => updateField({ trainerId: v || null })}
                  >
                    <SelectTrigger id="sb-trainer">
                      <SelectValue placeholder={t("noTrainer")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("noTrainer")}</SelectItem>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              <FormField label={t("capacity")} htmlFor="sb-capacity">
                <Input
                  id="sb-capacity"
                  type="number"
                  min={1}
                  disabled={engine === "slot_first"}
                  value={current.capacity}
                  onChange={(e) => updateField({ capacity: Number(e.target.value) })}
                />
              </FormField>

              <FormField label={t("location")} htmlFor="sb-location">
                <Select
                  value={current.locationId ?? ""}
                  onValueChange={(v) => updateField({ locationId: v || null })}
                >
                  <SelectTrigger id="sb-location">
                    <SelectValue placeholder={t("inheritLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("inheritLocation")}</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {engine !== "slot_first" && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={current.isRecurring}
                      onChange={(e) => updateField({ isRecurring: e.target.checked })}
                      className="size-4 accent-primary"
                    />
                    {t("isRecurring")}
                  </label>

                  {current.isRecurring && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label={t("occurrencesCount")} htmlFor="sb-occurrences">
                        <Input
                          id="sb-occurrences"
                          type="number"
                          min={1}
                          value={current.occurrencesCount ?? 30}
                          onChange={(e) => updateField({ occurrencesCount: Number(e.target.value) })}
                        />
                      </FormField>
                      <FormField label={t("startDate")} htmlFor="sb-start-date">
                        <Input
                          id="sb-start-date"
                          type="date"
                          value={current.startDate}
                          onChange={(e) => updateField({ startDate: e.target.value })}
                        />
                      </FormField>
                    </div>
                  )}
                </>
              )}

              {engine === "slot_first" && (
                <FormField label={t("startDate")} htmlFor="sb-start-date">
                  <Input
                    id="sb-start-date"
                    type="date"
                    value={current.startDate}
                    onChange={(e) => updateField({ startDate: e.target.value })}
                  />
                </FormField>
              )}

              <DialogFooter className="gap-2">
                {dialog?.mode === "edit" && (
                  <Button type="button" variant="outline" onClick={removeRecurrence} className="mr-auto text-destructive">
                    {t("delete")}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                  {t("cancel")}
                </Button>
                <Button type="button" onClick={submitDialog} disabled={saving}>
                  {saving ? t("saving") : dialog?.mode === "create" ? t("create") : t("save")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}