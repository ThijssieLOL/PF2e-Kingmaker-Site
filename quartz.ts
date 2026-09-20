import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { FolderNoteLinks } from "./quartz/plugins/transformers"
import { FolderGraph } from "./quartz/plugins/pageTypes"

const config = await loadQuartzConfig()

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
