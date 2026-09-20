import { Root } from "hast"
import { VFile } from "vfile"
import { QuartzTransformerPlugin } from "../types"
import { BuildCtx } from "../../util/ctx"
import {
  FilePath,
  FullSlug,
  resolveRelative,
  SimpleSlug,
  simplifySlug,
  slugifyFilePath,
  stripSlashes,
} from "../../util/path"

/**
 * Quartz treats a note named after its folder (`X/X.md`) as that folder's index
 * and rewrites its slug to `X/index`. The shortest-path link resolver matches a
 * wikilink by its final slug segment, so a bare `[[X]]` resolves to `x`, misses
 * the note at `.../x/index`, and falls back to a dead root-level URL.
 *
 * This transformer runs after CrawlLinks and repairs any internal link whose
 * resolved target is missing but whose final segment names a folder note,
 * pointing it at the folder page instead. Vault links stay clean; the fix lives
 * in the build.
 *
 * A note that also carries its own name as an alias (`Aurelius` on `Aurelius.md`)
 * makes the bare slug look resolvable, so the repair is skipped and the graph
 * loses the edge. The alias only ever redirects to the same folder page, so the
 * check runs against the real file slugs instead of `ctx.allSlugs`, which the
 * note-properties plugin pads with alias slugs.
 */
const INDEX_SUFFIX = "/index"

export const FolderNoteLinks: QuartzTransformerPlugin = () => {
  return {
    name: "FolderNoteLinks",
    htmlPlugins(ctx: BuildCtx) {
      const knownSlugs = new Set<string>(
        ctx.allFiles.map((fp) => slugifyFilePath(fp as FilePath) as string),
      )
      const folderNotes = new Map<string, string>()
      for (const slug of ctx.allSlugs) {
        if (!slug.endsWith(INDEX_SUFFIX)) continue
        const folder = slug.slice(0, -INDEX_SUFFIX.length)
        const name = folder.split("/").pop()
        if (name && !folderNotes.has(name)) {
          folderNotes.set(name, folder)
        }
      }

      return [
        () => (tree: Root, file: VFile) => {
          const pageSlug =
            typeof file.data.slug === "string" ? (file.data.slug as FullSlug) : undefined
          if (!pageSlug) return
          const outgoing = Array.isArray(file.data.links)
            ? (file.data.links as string[])
            : undefined

          const repair = (node: unknown): void => {
            if (!node || typeof node !== "object") return
            const el = node as {
              type?: string
              tagName?: string
              properties?: Record<string, unknown>
              children?: unknown[]
            }
            if (el.type === "element" && el.tagName === "a" && el.properties) {
              const props = el.properties
              const dataSlug = props["data-slug"]
              if (typeof dataSlug === "string") {
                const canonical = stripSlashes(dataSlug)
                if (!knownSlugs.has(canonical)) {
                  const name = canonical.split("/").pop()
                  const folder = name ? folderNotes.get(name) : undefined
                  if (folder) {
                    props.href = resolveRelative(pageSlug, folder as SimpleSlug) + "/"
                    props["data-slug"] = folder + INDEX_SUFFIX
                    if (outgoing) outgoing.push(simplifySlug(folder + INDEX_SUFFIX))
                  }
                }
              }
            }
            if (Array.isArray(el.children)) {
              for (const child of el.children) repair(child)
            }
          }

          repair(tree)
        },
      ]
    },
  }
}
