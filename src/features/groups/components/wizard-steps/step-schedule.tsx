"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar } from "lucide-react";

import { ScheduleBuilder, type RecurrenceBlock } from "../schedule-builder";

interface WizardStepScheduleProps {
  formData: {
    engine?: string;
    recurrences?: RecurrenceBlock[];
    defaultDurationMinutes?: number;
  };
  onChange: (data: { recurrences: RecurrenceBlock[] }) => void;
  locations: { id: string; name: string }[];
  trainers: { id: string; label: string }[];
  engine: "schedule_first" | "availability_first" | "slot_first";
}

export function WizardStepSchedule({
  formData,
  onChange,
  locations,
  trainers,
  engine,
}: WizardStepScheduleProps) {
  const t = useTranslations("groups.scheduleBuilder");

  const handleRecurrencesChange = (recurrences: RecurrenceBlock[]) => {
    onChange({ recurrences });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">
              {t(
                `engineInfo.${engine}` as
                  | "engineInfo.schedule_first"
                  | "engineInfo.availability_first"
                  | "engineInfo.slot_first"
                  | "engineInfo.default",
              ) || t("engineInfo.default")}
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              {t(
                `engineDesc.${engine}` as
                  | "engineDesc.schedule_first"
                  | "engineDesc.availability_first"
                  | "engineDesc.slot_first"
                  | "engineDesc.default",
              ) || t("engineDesc.default")}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("title")}
            <span className="text-sm font-normal text-muted-foreground">
              ({formData.recurrences?.length || 0} wzorców)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleBuilder
            groupTypeId="wizard-new"
            organizationId="wizard"
            engine={engine}
            defaultDurationMinutes={formData.defaultDurationMinutes || 60}
            locations={locations}
            trainers={trainers}
            onChange={handleRecurrencesChange}
            initialRecurrences={formData.recurrences || []}
          />
        </CardContent>
      </Card>

      {(!formData.recurrences || formData.recurrences.length === 0) && engine !== "slot_first" && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 ml-6">
            {t("noPatternsWarning")}
          </p>
        </div>
      )}
    </div>
  );
}