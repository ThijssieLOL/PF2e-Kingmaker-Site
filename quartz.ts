import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { FolderNoteLinks } from "./quartz/plugins/transformers"

const config = await loadQuartzConfig()

// Repair links to folder-notes (a note named after its folder, e.g. `X/X.md`),
// which Quartz resolves to `X/index` and the shortest-path resolver misses.
// Appended last so it runs after CrawlLinks has resolved every internal link.
config.plugins.transformers.push(FolderNoteLinks())

export default config
export const layout = await loadQuartzLayout()
