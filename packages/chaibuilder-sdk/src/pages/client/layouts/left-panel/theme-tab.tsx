import { useAtom } from "jotai";
import {
  CreditCard,
  FormInput,
  Globe,
  Image,
  LayoutTemplate,
  MousePointerSquareDashed,
  Palette,
  Radius,
  Ruler,
  Smile,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { PageSettings } from "../right-panel/page-settings";
import { TemplateSettings } from "../right-panel/template-settings";
import { ThemeGroupContent } from "../theme/theme-editor";
import {
  getThemeGroupsBySection,
  selectedThemeGroupAtom,
  THEME_SECTIONS,
  type ThemeGroup,
} from "../theme/theme-groups";

const GROUP_ICONS: Record<string, LucideIcon> = {
  colors: Palette,
  typography: Type,
  "spacing-width": Ruler,
  "radius-shadows": Radius,
  buttons: MousePointerSquareDashed,
  "form-fields": FormInput,
  "course-cards": CreditCard,
  "logo-favicon": Image,
  icons: Smile,
};

const SectionHeader = ({ label }: { label: string }) => (
  <div className="mb-1 mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-1">
    {label}
  </div>
);

const ComingSoonBadge = () => {
  const { t } = useTranslation();
  return (
    <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[9px] font-medium uppercase text-muted-foreground">
      {t("Coming soon")}
    </span>
  );
};

const ThemeGroupItem = ({ group }: { group: ThemeGroup }) => {
  const { t } = useTranslation();
  const Icon = GROUP_ICONS[group.id] ?? Palette;

  return (
    <AccordionItem value={group.id} id={`theme-group-${group.id}`} className="border-0">
      <AccordionTrigger className="gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] font-normal text-gray-900 hover:bg-gray-100 hover:no-underline data-[state=open]:bg-gray-100 [&[data-state=open]>svg]:rotate-180">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <span className="min-w-0 flex-1 truncate">{t(group.labelKey)}</span>
          {group.kind === "placeholder" && <ComingSoonBadge />}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-1.5 pb-2 pt-1">
        <ThemeGroupContent groupId={group.id} />
      </AccordionContent>
    </AccordionItem>
  );
};

/**
 * Scoped accordion section. All sections live in one page-level accordion state
 * (`openItems`), but each Radix `Accordion` root reports only its own item set
 * via `onValueChange`. We restrict the controlled `value` to this section's item
 * ids and merge the root's `next` set back without touching other sections.
 */
const SectionAccordion = ({
  items,
  openItems,
  onOpenItemsChange,
  children,
}: {
  items: string[];
  openItems: string[];
  onOpenItemsChange: (next: string[]) => void;
  children: ReactNode;
}) => {
  const ownSet = useMemo(() => new Set(items), [items]);
  const value = useMemo(() => openItems.filter((v) => ownSet.has(v)), [openItems, ownSet]);
  const onValueChange = useCallback(
    (next: string[]) => {
      onOpenItemsChange([...openItems.filter((v) => !ownSet.has(v)), ...next]);
    },
    [openItems, ownSet, onOpenItemsChange],
  );

  return (
    <Accordion type="multiple" value={value} onValueChange={onValueChange}>
      {children}
    </Accordion>
  );
};

/**
 * "Ustawienia szablonu" (⚙) left-panel mode — Shopify-style accordion.
 *
 * Top: active-theme card. Body: collapsible sections — the current page's
 * (or collection template's) settings + theme categories (Basics/Components/
 * Brand) with their inline editors. No separate bottom slide-up panel.
 */
export const TemplateSettingsTab = () => {
  const { t } = useTranslation();
  const { context } = useEditorContext();
  const [darkMode] = useDarkMode();
  const [, setSelectedGroup] = useAtom(selectedThemeGroupAtom);
  const [openItems, setOpenItems] = useState<string[]>(() => [
    context.type === "template" ? "template" : "page",
    "colors",
  ]);

  const contextLabel = context.type === "template" ? t("Template") : t("Page");

  const openColors = useCallback(() => {
    setSelectedGroup("colors");
    setOpenItems((prev) => (prev.includes("colors") ? prev : [...prev, "colors"]));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById("theme-group-colors")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
  }, [setSelectedGroup]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 rounded-md border border-gray-200 bg-gray-50 p-2">
        <div className="text-[11px] text-muted-foreground">{t("Active theme")}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[13px] font-medium text-gray-900">
            {darkMode ? t("Dark") : t("Light")}
          </span>
          <Button variant="ghost" size="sm" className="h-6 shrink-0 px-2 text-xs" onClick={openColors}>
            {t("Change")}
          </Button>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        <SectionHeader label={contextLabel} />

        <SectionAccordion
          items={context.type === "template" ? ["template"] : ["page"]}
          openItems={openItems}
          onOpenItemsChange={setOpenItems}>
          {context.type === "template" ? (
            <AccordionItem value="template" className="border-0">
              <AccordionTrigger className="gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] font-normal text-gray-900 hover:bg-gray-100 hover:no-underline data-[state=open]:bg-gray-100 [&[data-state=open]>svg]:rotate-180">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <span className="min-w-0 flex-1 truncate">{t("Template settings")}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-1.5 pb-2 pt-1">
                <TemplateSettings embedded />
              </AccordionContent>
            </AccordionItem>
          ) : (
            <AccordionItem value="page" className="border-0">
              <AccordionTrigger className="gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] font-normal text-gray-900 hover:bg-gray-100 hover:no-underline data-[state=open]:bg-gray-100 [&[data-state=open]>svg]:rotate-180">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <span className="min-w-0 flex-1 truncate">{t("Page settings")}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-1.5 pb-2 pt-1">
                <PageSettings embedded />
              </AccordionContent>
            </AccordionItem>
          )}
        </SectionAccordion>

        {THEME_SECTIONS.map((section) => {
          const groups = getThemeGroupsBySection(section.id);
          return (
            <div key={section.id}>
              <SectionHeader label={t(section.labelKey)} />
              <SectionAccordion
                items={groups.map((group) => group.id)}
                openItems={openItems}
                onOpenItemsChange={setOpenItems}>
                {groups.map((group) => (
                  <ThemeGroupItem key={group.id} group={group} />
                ))}
              </SectionAccordion>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 rounded-md border border-sky-100 bg-sky-50 px-2.5 py-2 text-[11px] leading-snug text-sky-800">
        {t("Theme changes apply to all pages")}
      </div>
    </div>
  );
};

export const ThemeTab = TemplateSettingsTab;

export default TemplateSettingsTab;
