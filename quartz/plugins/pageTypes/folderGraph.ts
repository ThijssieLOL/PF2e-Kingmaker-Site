import { QuartzPageTypePlugin } from "../types"
import { FullSlug, SimpleSlug } from "../../util/path"

const INDEX_SUFFIX = "/index"

/**
 * Folder pages are emitted by the folder-page plugin. A folder note (a note
 * named after its folder, e.g. `Aurelius/Aurelius.md`) carries its own links,
 * so its graph view is already the graph of the real note. A *virtual* folder
 * page (a folder with no note of its own) carries no links at all, so the graph
 * view draws a single meaningless dot.
 *
 * This page type runs after the folder-page plugin (lower priority) and gives
 * every linkless folder page an edge to each of its direct children, so its
 * local graph is meaningful. Folder notes are left untouched.
 */
export const FolderGraph: QuartzPageTypePlugin = () => {
  return {
    name: "FolderGraph",
    priority: 5,
    // Never claims a page; the folder-page plugin owns folder pages.
    match: () => false,
    layout: "folder",
    body: () => () => null,
    generate({ content, ctx }) {
      const folderPages = ctx.virtualPages.filter(([, file]) => {
        const slug = file.data.slug
        return typeof slug === "string" && slug.endsWith(INDEX_SUFFIX)
      })
      if (folderPages.length === 0) return []

      const allSlugs = new Set<string>()
      for (const [, file] of content) {
        const slug = file.data.slug
        if (typeof slug === "string") allSlugs.add(slug)
      }
      for (const [, file] of ctx.virtualPages) {
        const slug = file.data.slug
        if (typeof slug === "string") allSlugs.add(slug)
      }

      for (const [, file] of folderPages) {
        const slug = file.data.slug as FullSlug
        const existing = Array.isArray(file.data.links) ? (file.data.links as string[]) : []
        if (existing.length > 0) continue

        const prefix = slug.slice(0, -INDEX_SUFFIX.length) + "/"
        const children = new Set<string>()
        for (const candidate of allSlugs) {
          if (!candidate.startsWith(prefix) || candidate === slug) continue
          const rest = candidate.slice(prefix.length)
          const first = rest.split("/")[0]
          children.add(first === rest ? candidate : prefix + first + INDEX_SUFFIX)
        }
        if (children.size > 0) {
          file.data.links = [...children] as SimpleSlug[]
        }
      }

      return []
    },
  }
}
