"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Tags,
  CalendarDays,
  Users,
  UserCircle,
  CreditCard,
  Award,
  CircleDollarSign,
  TrendingUp,
  ShoppingCart,
  FileText,
  Settings,
  History,
  UserPlus,
  FolderOpen,
  Globe,
  Menu,
  MapPin,
  BookOpen,
  GitCompareArrows,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Link } from "@/lib/i18n/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/features/notifications"
import { SignOutButton } from "@/features/auth"

type NavLinkDef = {
  href: string
  labelKey: string
  icon: LucideIcon
  permission?: string
}

type NavSectionDef = {
  titleKey?: string
  links: NavLinkDef[]
}

const sections: NavSectionDef[] = [
  {
    links: [
      { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
    ],
  },
  {
    titleKey: "nav.trainerSection",
    links: [
      { href: "/dashboard/my-classes", labelKey: "nav.myClasses", icon: BookOpen, permission: "bookings.mark_attendance" },
      { href: "/dashboard/group-change-requests", labelKey: "nav.groupChanges", icon: GitCompareArrows },
      { href: "/dashboard/leave-requests", labelKey: "nav.leaveRequests", icon: CalendarDays },
    ],
  },
  {
    titleKey: "nav.management",
    links: [
      { href: "/dashboard/group-types", labelKey: "nav.groupTypes", icon: Tags, permission: "group_types.manage" },
      { href: "/dashboard/schedule", labelKey: "nav.schedule", icon: CalendarDays, permission: "sessions.manage" },
      { href: "/dashboard/trainers", labelKey: "nav.trainers", icon: Users, permission: "trainer_availability.manage" },
      { href: "/dashboard/clients", labelKey: "nav.clients", icon: UserCircle, permission: "members.invite" },
      { href: "/dashboard/credits", labelKey: "nav.credits", icon: CreditCard, permission: "credits.manual_grant" },
      { href: "/dashboard/qualification-cards", labelKey: "nav.qualificationCards", icon: Award, permission: "qualification_cards.manage" },
      { href: "/dashboard/extra-fees", labelKey: "nav.extraFees", icon: CircleDollarSign, permission: "extra_fees.manage" },
      { href: "/dashboard/locations", labelKey: "nav.locations", icon: MapPin, permission: "locations.manage" },
    ],
  },
  {
    titleKey: "nav.finances",
    links: [
      { href: "/dashboard/trainers/earnings", labelKey: "nav.earnings", icon: TrendingUp, permission: "trainer_earnings.view" },
      { href: "/dashboard/purchases", labelKey: "nav.purchases", icon: ShoppingCart, permission: "credits.purchase_cash" },
      { href: "/dashboard/invoices", labelKey: "nav.invoices", icon: FileText, permission: "invoices.mark_issued" },
    ],
  },
  {
    titleKey: "nav.admin",
    links: [
      { href: "/dashboard/settings", labelKey: "nav.settings", icon: Settings, permission: "organization.update" },
      { href: "/dashboard/settings/audit", labelKey: "nav.audit", icon: History, permission: "audit.read" },
      { href: "/dashboard/members", labelKey: "nav.members", icon: UserPlus, permission: "members.invite" },
      { href: "/dashboard/files", labelKey: "nav.files", icon: FolderOpen, permission: "storage.upload" },
      { href: "/admin", labelKey: "nav.cms", icon: Globe, permission: "cms.manage" },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(href + "/")
}

function NavLink({
  link,
  pathname,
  onClick,
}: {
  link: NavLinkDef
  pathname: string
  onClick?: () => void
}) {
  const t = useTranslations("sidebar") as (k: string) => string
  const Icon = link.icon
  const active = isActive(pathname, link.href)

  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{t(link.labelKey)}</span>
    </Link>
  )
}

function NavContent({
  permissions,
  pathname,
  onLinkClick,
}: {
  permissions: Set<string>
  pathname: string
  onLinkClick?: () => void
}) {
  const t = useTranslations("sidebar") as (k: string) => string

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {sections.map((section, i) => {
        const visibleLinks = section.links.filter(
          (l) => !l.permission || permissions.has(l.permission),
        )
        if (visibleLinks.length === 0) return null

        return (
          <div key={i} className="mb-2">
            {section.titleKey && (
              <p className="text-muted-foreground mb-1 px-3 text-xs font-semibold uppercase tracking-wider">
                {t(section.titleKey)}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  onClick={onLinkClick}
                />
              ))}
            </div>
            {i < sections.length - 1 && section.links.length > 0 && (
              <Separator className="my-3" />
            )}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  return (
    <div className="flex items-center gap-2 border-t px-3 py-3">
      <div className="flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
      </div>
      <div className="ml-auto">
        <SignOutButton />
      </div>
    </div>
  )
}

function SidebarHeader({ orgName }: { orgName: string }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-4">
      <Avatar className="size-8">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {orgName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-semibold">{orgName}</span>
    </div>
  )
}

export function Sidebar({
  orgName,
  permissions,
}: {
  orgName: string
  permissions: string[]
}) {
  const pathname = usePathname()
  const t = useTranslations("sidebar")
  const [sheetOpen, setSheetOpen] = useState(false)
  const permSet = new Set(permissions)

  return (
    <>
      {/* Mobile header */}
      <header className="border-border bg-background flex items-center gap-3 border-b px-4 py-3 md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("mobile.menu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[260px] flex-col p-0">
            <SidebarHeader orgName={orgName} />
            <NavContent
              permissions={permSet}
              pathname={pathname}
              onLinkClick={() => setSheetOpen(false)}
            />
            <SidebarFooter />
          </SheetContent>
        </Sheet>
        <span className="truncate text-sm font-semibold">{orgName}</span>
      </header>

      {/* Desktop sidebar */}
      <aside className="bg-background hidden md:flex md:w-[260px] md:flex-col md:shrink-0 md:border-r">
        <div className="flex min-h-0 flex-1 flex-col">
          <SidebarHeader orgName={orgName} />
          <NavContent permissions={permSet} pathname={pathname} />
          <SidebarFooter />
        </div>
      </aside>
    </>
  )
}
