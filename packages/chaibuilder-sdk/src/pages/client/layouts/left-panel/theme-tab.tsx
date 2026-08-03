import { useAtom } from "jotai";
import {
  ChevronRight,
  CreditCard,
  FormInput,
  Image,
  MousePointerSquareDashed,
  Palette,
  Radius,
  Ruler,
  Smile,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { cn } from "~/core/functions/common-functions";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { useLeftPanelBottom } from "~/hooks/use-theme";
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

const ThemeGroupRow = ({ group }: { group: ThemeGroup }) => {
  const { t } = useTranslation();
  const [, setBottomPanel] = useLeftPanelBottom();
  const [selectedGroup, setSelectedGroup] = useAtom(selectedThemeGroupAtom);
  const Icon = GROUP_ICONS[group.id] ?? Palette;

  const handleSelect = () => {
    setSelectedGroup(group.id);
    setBottomPanel("theme");
  };

  return (
    <button
      type="button"
      onClick={handleSelect}
      aria-current={selectedGroup === group.id}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] text-gray-900 transition-colors hover:bg-gray-100",
        selectedGroup === group.id && "bg-gray-100",
      )}>
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
      <span className="min-w-0 flex-1 truncate">{t(group.labelKey)}</span>
      {group.kind === "placeholder" && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[9px] font-medium uppercase text-muted-foreground">
          {t("Coming soon")}
        </span>
      )}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
    </button>
  );
};

export const ThemeTab = () => {
  const { t } = useTranslation();
  const [darkMode] = useDarkMode();
  const [, setBottomPanel] = useLeftPanelBottom();
  const [, setSelectedGroup] = useAtom(selectedThemeGroupAtom);

  const openColorsEditor = () => {
    setSelectedGroup("colors");
    setBottomPanel("theme");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 rounded-md border border-gray-200 bg-gray-50 p-2">
        <div className="text-[11px] text-muted-foreground">{t("Active theme")}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[13px] font-medium text-gray-900">
            {darkMode ? t("Dark") : t("Light")}
          </span>
          <Button variant="ghost" size="sm" className="h-6 shrink-0 px-2 text-xs" onClick={openColorsEditor}>
            {t("Change")}
          </Button>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        {THEME_SECTIONS.map((section) => (
          <div key={section.id}>
            <SectionHeader label={t(section.labelKey)} />
            {getThemeGroupsBySection(section.id).map((group) => (
              <ThemeGroupRow key={group.id} group={group} />
            ))}
          </div>
        ))}
      </div>

      <div className="shrink-0 rounded-md border border-sky-100 bg-sky-50 px-2.5 py-2 text-[11px] leading-snug text-sky-800">
        {t("Theme changes apply to all pages")}
      </div>
    </div>
  );
};

export default ThemeTab;
