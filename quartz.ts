import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { FolderNoteLinks } from "./quartz/plugins/transformers"
import { FolderGraph, Graph3DPage } from "./quartz/plugins/pageTypes"
import { componentRegistry } from "./quartz/components/registry"

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

// The dedicated full-page 3D graph at `/graph`. It is a virtual page, so it does
// not touch any note; see `quartz/plugins/pageTypes/graph3d.ts`.
config.plugins.pageTypes.push(Graph3DPage())

export default config
export const layout = await loadQuartzLayout()
