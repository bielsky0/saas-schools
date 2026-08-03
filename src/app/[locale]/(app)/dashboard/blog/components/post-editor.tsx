"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"

import { Button, Input, Label, Switch, Textarea } from "@/components/ui"
import { slugify } from "@/features/organizations/slug"
import {
  createBlogPostAction,
  updateBlogPostAction,
} from "@/features/blog/api"
import { RichTextEditor } from "./rich-text-editor"

type PostData = {
  id: string
  title: string
  slug: string
  status: "draft" | "published" | "archived"
  pageContent: {
    title?: string
    body?: string
    excerpt?: string
    image?: string
    tags?: string[]
    categories?: string[]
  } | null
  seo: {
    title?: string
    description?: string
    ogImage?: string
    noIndex?: boolean
  } | null
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function PostEditor({ post }: { post?: PostData | null }) {
  const t = useTranslations("blog")
  const isEdit = Boolean(post)

  const [title, setTitle] = useState(post?.title ?? "")
  const [slug, setSlug] = useState(post?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [body, setBody] = useState(post?.pageContent?.body ?? "")
  const [excerpt, setExcerpt] = useState(post?.pageContent?.excerpt ?? "")
  const [image, setImage] = useState(post?.pageContent?.image ?? "")
  const [tags, setTags] = useState((post?.pageContent?.tags ?? []).join(", "))
  const [categories, setCategories] = useState(
    (post?.pageContent?.categories ?? []).join(", "),
  )
  const [seoTitle, setSeoTitle] = useState(post?.seo?.title ?? "")
  const [seoDescription, setSeoDescription] = useState(
    post?.seo?.description ?? "",
  )
  const [seoOgImage, setSeoOgImage] = useState(post?.seo?.ogImage ?? "")
  const [noIndex, setNoIndex] = useState(post?.seo?.noIndex ?? false)
  const [status, setStatus] = useState<"draft" | "published">(
    post?.status === "published" ? "published" : "draft",
  )

  const action = isEdit ? updateBlogPostAction : createBlogPostAction
  const [state, formAction, pending] = useActionState(action, {})

  const onTitleChange = (v: string) => {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name]?.[0]

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {isEdit && (
        <input type="hidden" name="postId" value={post!.id} />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-title">{t("form.title")}</Label>
            <Input
              id="post-title"
              name="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              required
              maxLength={160}
            />
            {fieldError("title") && (
              <p className="text-destructive text-sm">{fieldError("title")}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="post-slug">{t("form.slug")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/blog/</span>
              <Input
                id="post-slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                className="font-mono"
              />
            </div>
            {fieldError("slug") && (
              <p className="text-destructive text-sm">{fieldError("slug")}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("form.body")}</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder={t("form.bodyPlaceholder")}
            />
            <input type="hidden" name="body" value={body} />
            {fieldError("body") && (
              <p className="text-destructive text-sm">{fieldError("body")}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="post-excerpt">{t("form.excerpt")}</Label>
            <Textarea
              id="post-excerpt"
              name="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            {fieldError("excerpt") && (
              <p className="text-destructive text-sm">{fieldError("excerpt")}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="post-image">{t("form.image")}</Label>
            <Input
              id="post-image"
              name="image"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
            />
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="bg-muted mt-2 aspect-video w-full max-w-xs rounded-lg border object-cover"
              />
            )}
            {fieldError("image") && (
              <p className="text-destructive text-sm">{fieldError("image")}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="post-tags">{t("form.tags")}</Label>
              <Input
                id="post-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("form.commaSeparated")}
              />
              {splitList(tags).map((tag) => (
                <input key={tag} type="hidden" name="tags" value={tag} />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="post-categories">{t("form.categories")}</Label>
              <Input
                id="post-categories"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder={t("form.commaSeparated")}
              />
              {splitList(categories).map((cat) => (
                <input key={cat} type="hidden" name="categories" value={cat} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="border-border rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-semibold">{t("form.publish")}</h2>
            <div className="flex items-center justify-between gap-2">
              <Label className="cursor-pointer">
                {t("form.statusPublished")}
              </Label>
              <Switch
                checked={status === "published"}
                onCheckedChange={(checked) =>
                  setStatus(checked ? "published" : "draft")
                }
                aria-label={t("form.statusPublished")}
              />
            </div>
            <input type="hidden" name="status" value={status} />
            <p className="text-muted-foreground mt-2 text-xs">
              {status === "published"
                ? t("form.publishedHint")
                : t("form.draftHint")}
            </p>
          </div>

          <div className="border-border rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-semibold">{t("form.seo")}</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seo-title" className="text-xs">
                  {t("form.seoTitle")}
                </Label>
                <Input
                  id="seo-title"
                  name="seo.title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seo-description" className="text-xs">
                  {t("form.seoDescription")}
                </Label>
                <Textarea
                  id="seo-description"
                  name="seo.description"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  maxLength={320}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seo-og-image" className="text-xs">
                  {t("form.seoOgImage")}
                </Label>
                <Input
                  id="seo-og-image"
                  name="seo.ogImage"
                  type="url"
                  value={seoOgImage}
                  onChange={(e) => setSeoOgImage(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="seo-no-index" className="text-xs">
                  {t("form.seoNoIndex")}
                </Label>
                <Switch
                  id="seo-no-index"
                  checked={noIndex}
                  onCheckedChange={setNoIndex}
                />
              </div>
              <input
                type="hidden"
                name="seo.noIndex"
                value={noIndex ? "on" : ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {state?.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}
            {state?.success && (
              <p className="text-success text-sm">{state.success}</p>
            )}
            <Button type="submit" disabled={pending}>
              {pending
                ? isEdit
                  ? t("saving")
                  : t("creating")
                : isEdit
                  ? t("save")
                  : t("createPost")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
