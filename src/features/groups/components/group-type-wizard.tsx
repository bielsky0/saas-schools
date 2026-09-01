"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";

import { WizardStepBasics } from "./wizard-steps/step-basics";
import { WizardStepSchedule } from "./wizard-steps/step-schedule";
import { WizardStepPricing } from "./wizard-steps/step-pricing";
import { WizardStepPolicies } from "./wizard-steps/step-policies";
import { WizardStepPublish } from "./wizard-steps/step-publish";

export type WizardStep =
  | "basics"
  | "schedule"
  | "pricing"
  | "policies"
  | "publish";

export interface WizardContext {
  // Step 1
  name?: string;
  slug?: string;
  description?: string;
  engine?: string;
  /** Niche info only — not persisted to group_type (mvp-plan F6). */
  niche?: string;
  defaultDurationMinutes?: number;
  // Step 2
  recurrences?: Array<{
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
  }>;
  // Step 3
  productTemplates?: Array<{
    id?: string;
    name: string;
    description?: string;
    price: number;
    creditQuantity: number;
    billingType: "one_time" | "recurring";
    interval?: "month" | "year";
    intervalCount?: number;
    isActive: boolean;
  }>;
  // Step 4
  paymentPolicy?: string;
  isNewClientOnly?: boolean;
  requiresQualificationCard?: boolean;
  isTrialOffer?: boolean;
  waitlistEnabled?: boolean;
  policyDocumentId?: string;
  allowedPurchaseModes?: string[];
  allowedBillingTypes?: string[];
  // Step 5
  status?: string;
  enrollmentTemplateId?: string;
}

const STEPS: { key: WizardStep; label: string; href: string }[] = [
  { key: "basics", label: "Podstawy", href: "#step-basics" },
  { key: "schedule", label: "Harmonogram", href: "#step-schedule" },
  { key: "pricing", label: "Cennik", href: "#step-pricing" },
  { key: "policies", label: "Polityki", href: "#step-policies" },
  { key: "publish", label: "Publikacja", href: "#step-publish" },
];

interface GroupTypeWizardProps {
  locations: { id: string; name: string }[];
  policyDocuments?: { id: string; name: string; version: number }[];
  trainers: { id: string; label: string }[];
  enrollmentTemplates: { id: string; name: string }[];
  onComplete?: (data: WizardContext) => void;
  onCancel?: () => void;
}

export function GroupTypeWizard({
  locations,
  policyDocuments = [],
  trainers,
  enrollmentTemplates,
  onComplete,
  onCancel,
}: GroupTypeWizardProps) {
  const t = useTranslations("groups.wizard");
  const [currentStep, setCurrentStep] = useState<WizardStep>("basics");
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<WizardContext>({});
  const [stepErrors, setStepErrors] = useState<Partial<Record<WizardStep, string>>>({});

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const updateFormData = useCallback((data: Partial<WizardContext>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const validateStep = useCallback((step: WizardStep, data: WizardContext): string | null => {
    switch (step) {
      case "basics":
        if (!data.name?.trim()) return "Nazwa jest wymagana";
        if (!data.slug?.trim()) return "Slug jest wymagany";
        if (!data.engine) return "Silnik jest wymagany";
        return null;
      case "schedule":
        if (data.engine !== "slot_first" && (!data.recurrences || data.recurrences.length === 0)) {
          return "Dodaj co najmniej jeden wzorzec harmonogramu";
        }
        return null;
      case "pricing":
        // Optional - at least base price from group type
        return null;
      case "policies":
        if (!data.allowedPurchaseModes?.length) return "Wybierz co najmniej jeden tryb zakupu";
        if (data.allowedPurchaseModes.includes("package") && !data.allowedBillingTypes?.length) {
          return "Pakiety wymagają wybrania typu rozliczenia";
        }
        return null;
      case "publish":
        if (!data.status) return "Status jest wymagany";
        return null;
      default:
        return null;
    }
  }, []);

  const canProceed = () => {
    const error = validateStep(currentStep, formData);
    setStepErrors((prev) => ({ ...prev, [currentStep]: error || undefined }));
    return !error;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStepIndex < STEPS.length - 1) {
      const next = STEPS[currentStepIndex + 1];
      if (next) setCurrentStep(next.key);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prev = STEPS[currentStepIndex - 1];
      if (prev) setCurrentStep(prev.key);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    if (!onComplete) return;

    setIsSubmitting(true);
    try {
      await onComplete(formData);
    } catch (error) {
      console.error("Wizard submit error:", error);
      setStepErrors((prev) => ({ ...prev, publish: t("error") }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    const baseProps = {
      formData,
      onChange: updateFormData,
      locations,
      policyDocuments,
      trainers,
      enrollmentTemplates,
    };

    switch (currentStep) {
      case "basics":
        return <WizardStepBasics {...baseProps} />;
      case "schedule":
        return <WizardStepSchedule {...baseProps} engine={formData.engine as any} />;
      case "pricing":
        return <WizardStepPricing {...baseProps} />;
      case "policies":
        return <WizardStepPolicies {...baseProps} />;
      case "publish":
        return <WizardStepPublish {...baseProps} />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Stepper */}
      <nav className="mb-8" aria-label="Kroki kreatora">
        <ol className="flex items-center">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.key);
            const isActive = step.key === currentStep;
            const isFuture = index > currentStepIndex;

            return (
              <li key={step.key} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isCompleted || isActive) {
                      setCurrentStep(step.key);
                    }
                  }}
                  disabled={isFuture}
                  className={`
                    flex flex-col items-center gap-1 w-full transition-colors
                    ${isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}
                    ${isFuture ? "opacity-50 pointer-events-none" : "cursor-pointer"}
                  `}
                >
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium
                      ${isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-muted-foreground/30 bg-background"}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{t(`step${index + 1}` as any)}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`
                      flex-1 h-0.5 mx-2
                      ${index < currentStepIndex ? "bg-green-500" : "bg-muted-foreground/30"}
                    `}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t(`step${currentStepIndex + 1}` as any)}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
          {stepErrors[currentStep] && (
            <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {stepErrors[currentStep]}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>

        <div className="flex items-center gap-3 ml-auto">
          {!isLastStep && (
            <Button variant="outline" onClick={handleNext} disabled={isSubmitting}>
              {t("next")}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {isLastStep && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("publishing")}
                </>
              ) : (
                t("publish")
              )}
            </Button>
          )}

          {isFirstStep && onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting} className="ml-2">
              {t("cancel")}
            </Button>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Save Draft */}
      <Button variant="ghost" onClick={() => console.log("Save draft", formData)} className="w-full">
        {t("saveDraft")}
      </Button>
    </div>
  );
}