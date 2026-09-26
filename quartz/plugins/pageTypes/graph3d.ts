import { QuartzPageTypePlugin } from "../types"
import Graph3D from "../../components/Graph3D"
import { FullSlug } from "../../util/path"

const GRAPH_SLUG = "graph" as FullSlug

/**
 * The dedicated full-page 3D graph, emitted as a single virtual page at `/graph`.
 *
 * It is deliberately `unlisted`: the page has no notes of its own to link to, so
 * leaving it out of the content index keeps it from becoming a lone node in the
 * graph views, showing up in search, or cluttering the explorer. Reach it from
 * the link on the home page.
 *
 * It never claims a content file (`match` is false), so real notes are untouched;
 * `frame: "minimal"` drops the sidebars and header so the graph fills the screen.
 */
export const Graph3DPage: QuartzPageTypePlugin = () => ({
  name: "Graph3DPage",
  priority: 5,
  match: () => false,
  layout: "graph3d",
  frame: "minimal",
  body: Graph3D,
  generate() {
    return [
      {
        slug: GRAPH_SLUG,
        title: "Graph View",
        data: {
          unlisted: true,
          frontmatter: { title: "Graph View", tags: [], unlisted: true },
        },
      },
    ]
  },
})
