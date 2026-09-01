"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/field";

import type { WizardContext } from "../group-type-wizard";

interface WizardStepBasicsProps {
  formData: WizardContext;
  onChange: (data: Partial<WizardContext>) => void;
}

export function WizardStepBasics({ formData, onChange }: WizardStepBasicsProps) {
  const t = useTranslations("groups");

  return (
    <div className="grid gap-5">
      <FormField label={t("form.name")} htmlFor="wz-name">
        <Input
          id="wz-name"
          value={formData.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </FormField>

      <FormField label={t("form.slug")} htmlFor="wz-slug" hint={t("form.slugHint")}>
        <Input
          id="wz-slug"
          value={formData.slug ?? ""}
          onChange={(e) => onChange({ slug: e.target.value })}
        />
      </FormField>

      <FormField label={t("form.description")} htmlFor="wz-desc" hint={t("form.descriptionHint")}>
        <Textarea
          id="wz-desc"
          rows={4}
          value={formData.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </FormField>

      <FormField label={t("form.engine")} htmlFor="wz-engine">
        <Select value={formData.engine ?? "schedule_first"} onValueChange={(v) => onChange({ engine: v })}>
          <SelectTrigger id="wz-engine">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="schedule_first">{t("engine.schedule_first")}</SelectItem>
            <SelectItem value="availability_first">{t("engine.availability_first")}</SelectItem>
            <SelectItem value="slot_first">{t("engine.slot_first")}</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {/* Niche info - only display, not saved */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="mb-2 font-medium">Nisza akademii (tylko informacja)</h4>
        <p className="text-sm text-muted-foreground">
          Ta informacja służy do dopasowania domyślnych sekcji i motywu w przyszłości (Faza 6).
          Nie jest zapisywana w typie grupy.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {["swimming", "school", "dance", "general"].map((niche) => (
            <button
              key={niche}
              type="button"
              className={`rounded-lg border-2 p-3 text-center transition-colors ${
                formData.niche === niche
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted-foreground/20 hover:border-primary/50"
              }`}
              onClick={() => onChange({ niche })}
            >
              <span className="capitalize">{niche}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}