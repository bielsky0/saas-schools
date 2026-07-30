"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/features/cms/admin/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/features/cms/admin/components/ui/input"
import { Textarea } from "@/features/cms/admin/components/ui/textarea"
import { Checkbox } from "@/features/cms/admin/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { FormState } from "@/lib/validation"
import { markAttendanceAction } from "@/features/bookings/staff-actions"
import { enterGradeAction } from "@/features/grades/actions"
import { saveLessonTopicAction, createHomeworkAction, markHomeworkCompletionAction } from "@/features/lesson-logs/actions"

type SessionData = {
  id: string
  startTime: string
  endTime: string
  capacity: number
  status: string
  meetingUrl: string | null
  groupTypeId: string
  roster: Array<{
    bookingId: string
    athleteId: string
    athleteName: string
    paymentStatus: string
    attendanceStatus: string
  }>
  topic: { id: string; title: string; body: string | null } | null
  homework: Array<{ id: string; description: string; dueDate: string | null; createdAt: Date }>
  homeworkCompletionMap: Record<string, Record<string, { id: string; status: string }>>
  grades: Record<
    string,
    {
      grades: Array<{
        id: string
        gradeFieldId: string
        value: string
      }>
      notes: Array<{
        id: string
        content: string
        createdAt: Date
      }>
    }
  >
  gradeFields: Array<{
    id: string
    name: string
    fieldType: string
    minValue: number | null
    maxValue: number | null
  }>
  participantCount: number
}

export default function MyClassesClient({
  sessions,
}: {
  sessions: SessionData[]
}) {
  const t = useTranslations("trainer.myClasses")
  const router = useRouter()
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming")
  const [search, setSearch] = useState("")
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const now = new Date()

  const filtered = sessions.filter((s) => {
    const start = new Date(s.startTime)
    if (filter === "upcoming" && start < now) return false
    if (filter === "past" && start >= now) return false
    if (search && !s.roster.some((r) => r.athleteName.toLowerCase().includes(search.toLowerCase())))
      return false
    return true
  })

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d)

  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d)

  const runAction = async (
    action: (_p: FormState, f: FormData) => Promise<FormState>,
    formData: FormData,
  ) => {
    const result = await action({} as FormState, formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.success ?? "OK")
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <div className="flex items-center gap-2">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {t(f)}
          </Button>
        ))}
        <div className="ml-auto">
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-48 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t("noClasses")}</p>
      ) : (
        <Accordion
          type="multiple"
          value={[...expandedSessions]}
          onValueChange={(v) => setExpandedSessions(new Set(v))}
          className="flex flex-col gap-2"
        >
          {filtered.map((session) => {
            const start = new Date(session.startTime)
            const isPast = start < now
            return (
              <AccordionItem
                key={session.id}
                value={session.id}
                className="border-border rounded-lg border"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex flex-1 items-center gap-3 text-left">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {formatDate(start)} {formatTime(start)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {session.roster.length}/{session.capacity} {t("participants")}
                      </span>
                    </div>
                    <Badge variant={isPast ? "outline" : "default"} className="ml-auto">
                      {isPast ? t("past") : t("upcoming")}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <SessionPanel session={session} runAction={runAction} />
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}

function SessionPanel({
  session,
  runAction,
}: {
  session: SessionData
  runAction: (
    action: (_p: FormState, f: FormData) => Promise<FormState>,
    formData: FormData,
  ) => Promise<void>
}) {
  const t = useTranslations("trainer.myClasses")

  return (
    <div className="flex flex-col gap-6 pt-2">
      <RosterSection session={session} runAction={runAction} />
      <Separator />
      <GradesSection session={session} runAction={runAction} />
      <Separator />
      <TopicSection session={session} runAction={runAction} />
    </div>
  )
}

function RosterSection({
  session,
  runAction,
}: {
  session: SessionData
  runAction: (
    action: (_p: FormState, f: FormData) => Promise<FormState>,
    formData: FormData,
  ) => Promise<void>
}) {
  const t = useTranslations("trainer.myClasses")

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{t("rosterTitle")}</h3>
      <div className="flex flex-col gap-1.5">
        {session.roster.map((row) => (
          <div
            key={row.bookingId}
            className="border-border flex items-center justify-between rounded-md border px-3 py-2"
          >
            <span className="text-sm">{row.athleteName}</span>
            <div className="flex items-center gap-1">
              {(["present", "absent", "unmarked"] as const).map((status) => (
                <Button
                  key={status}
                  variant={row.attendanceStatus === status ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const fd = new FormData()
                    fd.set("bookingId", row.bookingId)
                    fd.set("status", status)
                    runAction(markAttendanceAction, fd)
                  }}
                >
                  {t(status)}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GradesSection({
  session,
  runAction,
}: {
  session: SessionData
  runAction: (
    action: (_p: FormState, f: FormData) => Promise<FormState>,
    formData: FormData,
  ) => Promise<void>
}) {
  const t = useTranslations("trainer.myClasses")

  if (session.gradeFields.length === 0 && session.roster.every((r) => (session.grades[r.bookingId]?.notes.length ?? 0) === 0)) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("gradesTitle")}</h3>
        <p className="text-muted-foreground text-xs">—</p>
      </div>
    )
  }

  const [gradeValues, setGradeValues] = useState<Record<string, string>>({})

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{t("gradesTitle")}</h3>
      {session.gradeFields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="pb-2 pr-4 font-medium">{t("participants")}</th>
                {session.gradeFields.map((f) => (
                  <th key={f.id} className="pb-2 pr-4 font-medium">
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {session.roster.map((row) => {
                const grades = session.grades[row.bookingId]?.grades ?? []
                return (
                  <tr key={row.bookingId} className="border-border border-b last:border-0">
                    <td className="py-2 pr-4 text-xs">{row.athleteName}</td>
                    {session.gradeFields.map((field) => {
                      const existing = grades.find((g) => g.gradeFieldId === field.id)
                      const key = `${row.bookingId}-${field.id}`
                      return (
                        <td key={field.id} className="py-2 pr-4">
                          <input
                            type={field.fieldType === "numeric" ? "number" : "text"}
                            className="border-border h-8 w-20 rounded border px-2 text-xs"
                            placeholder={existing?.value ?? "—"}
                            min={field.minValue ?? undefined}
                            max={field.maxValue ?? undefined}
                            value={gradeValues[key] ?? ""}
                            onChange={(e) =>
                              setGradeValues((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            onBlur={(e) => {
                              const val = e.target.value.trim()
                              if (!val) return
                              const fd = new FormData()
                              fd.set("gradeFieldId", field.id)
                              fd.set("bookingId", row.bookingId)
                              fd.set("value", val)
                              runAction(enterGradeAction, fd)
                              setGradeValues((prev) => {
                                const next = { ...prev }
                                delete next[key]
                                return next
                              })
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {session.roster.some((r) => (session.grades[r.bookingId]?.notes.length ?? 0) > 0) && (
        <div className="mt-4">
          <h4 className="mb-1 text-xs font-medium">{t("notesTitle")}</h4>
          {session.roster.map((row) => {
            const notes = session.grades[row.bookingId]?.notes ?? []
            if (notes.length === 0) return null
            return (
              <div key={row.bookingId} className="mb-2">
                <span className="text-xs font-medium">{row.athleteName}</span>
                {notes.map((n) => (
                  <p key={n.id} className="text-muted-foreground text-xs">
                    {n.content}
                  </p>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TopicSection({
  session,
  runAction,
}: {
  session: SessionData
  runAction: (
    action: (_p: FormState, f: FormData) => Promise<FormState>,
    formData: FormData,
  ) => Promise<void>
}) {
  const t = useTranslations("trainer.myClasses")
  const [topicTitle, setTopicTitle] = useState(session.topic?.title ?? "")
  const [topicBody, setTopicBody] = useState(session.topic?.body ?? "")
  const [homeworkDesc, setHomeworkDesc] = useState("")
  const [homeworkDue, setHomeworkDue] = useState("")

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{t("topicTitle")}</h3>

      <div className="mb-3 flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Input
            placeholder={t("topicPlaceholder")}
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            className="h-9 text-sm"
          />
          <Textarea
            placeholder={t("topicBodyPlaceholder")}
            value={topicBody}
            onChange={(e) => setTopicBody(e.target.value)}
            className="text-sm"
            rows={2}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-0.5"
          onClick={() => {
            const fd = new FormData()
            fd.set("sessionId", session.id)
            fd.set("title", topicTitle)
            fd.set("body", topicBody)
            runAction(saveLessonTopicAction, fd)
          }}
        >
          {t("saveTopic")}
        </Button>
      </div>

      <Separator className="my-3" />

      <h4 className="mb-2 text-xs font-medium">{t("homeworkTitle")}</h4>

      <div className="mb-3 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Input
            placeholder={t("homeworkPlaceholder")}
            value={homeworkDesc}
            onChange={(e) => setHomeworkDesc(e.target.value)}
            className="h-9 text-sm"
          />
          <Input
            placeholder={t("dueDate")}
            type="date"
            value={homeworkDue}
            onChange={(e) => setHomeworkDue(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!homeworkDesc.trim()) return
            const fd = new FormData()
            fd.set("sessionId", session.id)
            fd.set("description", homeworkDesc.trim())
            if (homeworkDue) fd.set("dueDate", homeworkDue)
            runAction(createHomeworkAction, fd)
            setHomeworkDesc("")
            setHomeworkDue("")
          }}
        >
          {t("addHomework")}
        </Button>
      </div>

      {session.homework.length > 0 && (
        <div className="flex flex-col gap-2">
          {session.homework.map((hw) => (
            <div key={hw.id} className="border-border rounded-md border p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{hw.description}</span>
                {hw.dueDate && (
                  <span className="text-muted-foreground text-xs">{hw.dueDate}</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {session.roster.map((row) => {
                  const completion = session.homeworkCompletionMap[hw.id]?.[row.athleteId]
                  const isDone = completion?.status === "done"
                  return (
                    <label
                      key={row.athleteId}
                      className="flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-xs"
                    >
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={(checked) => {
                          const fd = new FormData()
                          fd.set("homeworkId", hw.id)
                          fd.set("athleteId", row.athleteId)
                          fd.set("status", checked ? "done" : "not_done")
                          fd.set("sessionId", session.id)
                          runAction(markHomeworkCompletionAction, fd)
                        }}
                      />
                      {row.athleteName}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
