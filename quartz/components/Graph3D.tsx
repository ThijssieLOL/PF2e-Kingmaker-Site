import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import graph3dScript from "./scripts/graph3d.inline"
import graph3dStyle from "./styles/graph3d.scss"

/**
 * Body of the dedicated full-page 3D graph. The markup is mostly scaffolding:
 * the canvas is appended by the script into `.graph3d-stage`, node labels are
 * projected into `.graph3d-labels`, and the floating panel drives search and
 * the two data toggles.
 */
function Graph3D({ displayClass }: QuartzComponentProps) {
  return (
    <div class={classNames(displayClass, "graph3d")}>
      <div class="graph3d-stage"></div>
      <div class="graph3d-labels"></div>

      <div class="graph3d-panel">
        <h2>Graph View</h2>
        <p class="graph3d-count">Loading…</p>

        <div class="graph3d-search">
          <input
            id="graph3d-query"
            type="search"
            placeholder="Find a note…"
            aria-label="Find a note in the graph"
            autocomplete="off"
            spellcheck={false}
          />
        </div>

        <div class="graph3d-toggles">
          <label>
            <input id="graph3d-show-tags" type="checkbox" checked />
            Tags
          </label>
          <label>
            <input id="graph3d-show-orphans" type="checkbox" checked />
            Unlinked notes
          </label>
        </div>

        <div class="graph3d-actions">
          <button type="button" class="graph3d-button graph3d-reset">
            Reset view
          </button>
        </div>

        <div class="graph3d-legend">
          <div class="graph3d-legend-row">
            <span class="graph3d-swatch" style="background: var(--secondary)"></span>
            Well connected
          </div>
          <div class="graph3d-legend-row">
            <span class="graph3d-swatch" style="background: var(--tertiary)"></span>
            Note
          </div>
          <div class="graph3d-legend-row">
            <span class="graph3d-swatch" style="background: var(--gray)"></span>
            Tag
          </div>
        </div>
      </div>

      <div class="graph3d-tip"></div>
      <div class="graph3d-hint">Drag to orbit · Scroll to zoom · Click a note to open it</div>
      <div class="graph3d-status">Loading the graph…</div>
    </div>
  )
}

Graph3D.css = graph3dStyle
Graph3D.afterDOMLoaded = graph3dScript

export default (() => Graph3D) satisfies QuartzComponentConstructor
