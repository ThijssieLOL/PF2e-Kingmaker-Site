import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { FolderNoteLinks } from "./quartz/plugins/transformers"
import { FolderGraph } from "./quartz/plugins/pageTypes"
import { componentRegistry } from "./quartz/components/registry"
import { isFolderPath } from "./quartz/util/path"
import type { QuartzPluginData } from "./quartz/plugins/vfile"

// A folder page's listing sorts date-first by default, and every page carries a
// date from git, so the list reads in last-edited order and a note edited today
// jumps to the top of its folder. Override the plugin's sort so the subfolder
// band and the note cards both read alphabetically, folders ahead of notes. This
// only changes the order of the rows; the custom.scss layout owns the look.
const alphabeticallyFoldersFirst = (a: QuartzPluginData, b: QuartzPluginData): number => {
  const aIsFolder = isFolderPath(a.slug ?? "")
  const bIsFolder = isFolderPath(b.slug ?? "")
  if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
  const aTitle = a.frontmatter?.title?.toLowerCase() ?? ""
  const bTitle = b.frontmatter?.title?.toLowerCase() ?? ""
  return aTitle.localeCompare(bTitle)
}
componentRegistry.setOptionOverrides("@quartz-community/folder-page", {
  sort: alphabeticallyFoldersFirst,
})

const config = await loadQuartzConfig()

// The graph takes its local node from `window.location.pathname`, which drops the
// trailing `/index` that every folder note and folder page carries. Its own node
// keys keep it, so the two never meet and the page draws as a lone dot. Point the
// lookup at the page's real slug; both sides then agree.
let sawGraph = false
let patchedGraph = false
for (const component of componentRegistry.getAllComponents()) {
  const patch = (script: string) => {
    if (!script.includes("[Graph]")) return script
    sawGraph = true
    if (!script.includes("window.location.pathname")) return script
    patchedGraph = true
    return script.replace("window.location.pathname", 'document.body.dataset.slug||""')
  }
  const after = component.afterDOMLoaded
  if (typeof after === "string") {
    component.afterDOMLoaded = patch(after)
  } else if (Array.isArray(after)) {
    component.afterDOMLoaded = after.map(patch)
  }
}
if (sawGraph && !patchedGraph) {
  console.warn(
    "[vault] graph slug patch did not apply: the graph plugin's script no longer reads window.location.pathname",
  )
}

// Repair links to folder-notes (a note named after its folder, e.g. `X/X.md`),
// which Quartz resolves to `X/index` and the shortest-path resolver misses.
// Appended last so it runs after CrawlLinks has resolved every internal link.
config.plugins.transformers.push(FolderNoteLinks())

// Give linkless folder pages (folders with no note of their own) a meaningful
// graph by linking them to their children. Runs after the folder-page plugin.
config.plugins.pageTypes ??= []
config.plugins.pageTypes.push(FolderGraph())

export default config
export const layout = await loadQuartzLayout()
