// Full-page 3D graph.
//
// The data is the same static/contentIndex.json the sidebar graph reads, and the
// node and edge rules mirror that graph so the two views agree: a link counts
// only when its normalised target is a real page, and tags become their own
// satellite nodes. Positions are simulated live with 3d-force-graph, which is
// loaded from the CDN on demand the same way d3 and Pixi are loaded for the 2D
// graph, so no other page pays for it.

type Entry = {
  slug: string
  title: string
  links?: string[]
  tags?: string[]
}

type Node3D = {
  id: string
  name: string
  isTag: boolean
  deg: number
  val: number
  x?: number
  y?: number
  z?: number
}

type Link3D = {
  source: string | Node3D
  target: string | Node3D
}

type Palette = {
  note: string
  hub: string
  tag: string
  link: string
  faded: string
}

const LIB_URL = "https://cdn.jsdelivr.net/npm/3d-force-graph@1.80.0/dist/3d-force-graph.min.js"
const HUB_DEGREE = 8
const LABEL_MIN_DEGREE = 4
const LABEL_LIMIT = 48
const TAG_REMOVE: string[] = []
const HINT_HIDE_MS = 9000

let libPromise: Promise<any> | null = null
let cleanup: (() => void) | null = null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Mirrors the 2D graph's slug normalisation: drop the leading slash, and treat
// `x/index` and `x/` as the same page.
function normSlug(raw: string): string {
  let s = raw
  if (s === "index") s = ""
  else if (s.endsWith("/index")) s = s.slice(0, -"index".length)
  if (s.startsWith("/")) s = s.slice(1)
  return s
}

function loadLib(): Promise<any> {
  if (libPromise) return libPromise
  libPromise = new Promise((resolve, reject) => {
    const ready = () => {
      const factory = (window as any).ForceGraph3D
      if (typeof factory === "function") resolve(factory)
      else reject(new Error("ForceGraph3D not present on window"))
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LIB_URL}"]`)
    if (existing) {
      if ((window as any).ForceGraph3D) resolve((window as any).ForceGraph3D)
      else {
        existing.addEventListener("load", ready)
        existing.addEventListener("error", () => reject(new Error("Failed to load")))
      }
      return
    }
    const el = document.createElement("script")
    el.src = LIB_URL
    el.crossOrigin = "anonymous"
    el.addEventListener("load", ready)
    el.addEventListener("error", () => reject(new Error("Failed to load")))
    document.head.appendChild(el)
  })
  return libPromise
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function readPalette(): Palette {
  return {
    note: cssVar("--tertiary", "#84a59d"),
    hub: cssVar("--secondary", "#284b63"),
    tag: cssVar("--gray", "#b8b8b8"),
    link: cssVar("--gray", "#b8b8b8"),
    faded: cssVar("--lightgray", "#e5e5e5"),
  }
}

function slugToHref(id: string): string {
  const base = document.body.dataset.basepath ?? ""
  const suffix = id.startsWith("/") ? id : "/" + id
  return base + suffix
}

function linkId(end: string | Node3D): string {
  return typeof end === "string" ? end : end.id
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

function buildModel(index: Record<string, Entry>, showTags: boolean, showOrphans: boolean) {
  const byId = new Map<string, Entry>()
  for (const key of Object.keys(index)) byId.set(normSlug(key), index[key])

  const pairs: Array<[string, string]> = []
  byId.forEach((entry, id) => {
    for (const raw of entry.links ?? []) {
      const target = normSlug(raw)
      if (byId.has(target) && target !== id) pairs.push([id, target])
    }
    if (!showTags) return
    for (const tag of entry.tags ?? []) {
      if (TAG_REMOVE.indexOf(tag) !== -1) continue
      pairs.push([id, normSlug("tags/" + tag)])
    }
  })

  const deg = new Map<string, number>()
  for (const [source, target] of pairs) {
    deg.set(source, (deg.get(source) ?? 0) + 1)
    deg.set(target, (deg.get(target) ?? 0) + 1)
  }

  const weight = (d: number) => Math.min(1 + Math.sqrt(d), 4.2)

  const nodes: Node3D[] = []
  for (const [id, entry] of byId) {
    const d = deg.get(id) ?? 0
    if (!showOrphans && d === 0) continue
    nodes.push({ id, name: entry.title || id, isTag: false, deg: d, val: weight(d) })
  }
  if (showTags) {
    for (const [id, d] of deg) {
      if (!id.startsWith("tags/")) continue
      nodes.push({ id, name: "#" + id.slice(5), isTag: true, deg: d, val: weight(d) })
    }
  }

  const keep = new Set(nodes.map((n) => n.id))
  const links: Link3D[] = []
  for (const [source, target] of pairs) {
    if (keep.has(source) && keep.has(target)) links.push({ source, target })
  }
  return { nodes, links }
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

function init() {
  if (cleanup) return
  const root = document.querySelector<HTMLElement>(".graph3d")
  if (!root) return

  const stage = root.querySelector<HTMLElement>(".graph3d-stage")
  const labelLayer = root.querySelector<HTMLElement>(".graph3d-labels")
  const status = root.querySelector<HTMLElement>(".graph3d-status")
  const tip = root.querySelector<HTMLElement>(".graph3d-tip")
  const countEl = root.querySelector<HTMLElement>(".graph3d-count")
  const hint = root.querySelector<HTMLElement>(".graph3d-hint")
  const search = root.querySelector<HTMLInputElement>(".graph3d-search input")
  const tagsBox = root.querySelector<HTMLInputElement>("#graph3d-show-tags")
  const orphansBox = root.querySelector<HTMLInputElement>("#graph3d-show-orphans")
  const resetButton = root.querySelector<HTMLButtonElement>(".graph3d-reset")
  if (!stage || !labelLayer || !status) return
  const host: HTMLElement = stage
  const labelHost: HTMLElement = labelLayer

  let disposed = false
  let graph: any = null
  let palette = readPalette()
  let indexData: Record<string, Entry> = {}
  let nodes: Node3D[] = []
  let links: Link3D[] = []
  let byId = new Map<string, Node3D>()
  let showTags = tagsBox ? tagsBox.checked : true
  let showOrphans = orphansBox ? orphansBox.checked : true
  let hoverId: string | null = null
  let pinnedId: string | null = null
  let query = ""
  let nearIds = new Set<string>()
  let projectVec: any = null
  let pendingFrame = true
  const labelEls = new Map<string, HTMLElement>()
  const timeouts: number[] = []

  document.documentElement.classList.add("graph3d-active")

  function later(fn: () => void, ms: number) {
    timeouts.push(window.setTimeout(fn, ms))
  }

  // -- labels ---------------------------------------------------------------

  function updateLabelPositions() {
    if (!graph || !projectVec) return
    const camera = graph.camera()
    if (!camera) return
    const w = host.clientWidth
    const h = host.clientHeight
    for (const [id, el] of labelEls) {
      const node = byId.get(id)
      if (!node || node.x === undefined || node.y === undefined || node.z === undefined) {
        el.style.display = "none"
        continue
      }
      projectVec.set(node.x, node.y, node.z).project(camera)
      if (projectVec.z > 1) {
        el.style.display = "none"
        continue
      }
      const sx = (projectVec.x * 0.5 + 0.5) * w
      const sy = (-projectVec.y * 0.5 + 0.5) * h
      el.style.display = ""
      el.style.transform = `translate(-50%, -50%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`
    }
  }

  function wantedLabels(): Set<string> {
    const wanted = new Set<string>()
    const ranked = nodes.slice().sort((a, b) => b.deg - a.deg)
    for (const node of ranked) {
      if (node.deg < LABEL_MIN_DEGREE) break
      wanted.add(node.id)
      if (wanted.size >= LABEL_LIMIT) break
    }
    if (hoverId) {
      wanted.add(hoverId)
      for (const id of nearIds) wanted.add(id)
    }
    if (pinnedId) wanted.add(pinnedId)
    if (query) {
      for (const node of nodes) {
        if (node.name.toLowerCase().indexOf(query) !== -1) wanted.add(node.id)
      }
    }
    return wanted
  }

  function syncLabels() {
    const wanted = wantedLabels()
    for (const [id, el] of labelEls) {
      if (!wanted.has(id)) {
        el.remove()
        labelEls.delete(id)
      }
    }
    for (const id of wanted) {
      const node = byId.get(id)
      let el = labelEls.get(id)
      if (!el) {
        el = document.createElement("div")
        el.className = "graph3d-label"
        el.textContent = node ? node.name : id
        if (node && node.isTag) el.classList.add("is-tag")
        labelHost.appendChild(el)
        labelEls.set(id, el)
      }
      if (!node) continue
      el.classList.toggle("is-hub", node.deg >= HUB_DEGREE)
      el.classList.toggle("is-active", id === hoverId || id === pinnedId)
    }
    updateLabelPositions()
  }

  // -- colour ---------------------------------------------------------------

  function focusId(): string | null {
    return hoverId ?? pinnedId
  }

  function nodeColor(node: Node3D): string {
    const focus = focusId()
    if (focus) {
      if (node.id === focus) return palette.hub
      if (nearIds.has(node.id)) return node.isTag ? palette.tag : palette.note
      return palette.faded
    }
    if (node.isTag) return palette.tag
    if (node.deg >= HUB_DEGREE) return palette.hub
    return palette.note
  }

  function linkColor(link: Link3D): string {
    const focus = focusId()
    if (!focus) return palette.link
    if (linkId(link.source) === focus || linkId(link.target) === focus) return palette.hub
    return palette.faded
  }

  function refreshColors() {
    if (!graph) return
    // Fresh closures rather than the stored accessor, which guarantees the
    // library re-runs them and repaints the node and link colours.
    graph.nodeColor((n: Node3D) => nodeColor(n))
    graph.linkColor((l: Link3D) => linkColor(l))
  }

  // -- hover / focus --------------------------------------------------------

  function computeNear(id: string): Set<string> {
    const near = new Set<string>()
    near.add(id)
    for (const link of links) {
      const source = linkId(link.source)
      const target = linkId(link.target)
      if (source === id) near.add(target)
      else if (target === id) near.add(source)
    }
    return near
  }

  function showTip(node: Node3D | null) {
    if (!tip || !graph || !projectVec) return
    if (!node || node.x === undefined || node.y === undefined || node.z === undefined) {
      tip.classList.remove("is-visible")
      return
    }
    const camera = graph.camera()
    if (!camera) return
    projectVec.set(node.x, node.y, node.z).project(camera)
    if (projectVec.z > 1) {
      tip.classList.remove("is-visible")
      return
    }
    const sx = (projectVec.x * 0.5 + 0.5) * host.clientWidth
    const sy = (-projectVec.y * 0.5 + 0.5) * host.clientHeight
    const degree = node.isTag
      ? `${node.deg} linked`
      : `${node.deg} ${node.deg === 1 ? "link" : "links"}`
    tip.innerHTML = ""
    const strong = document.createElement("strong")
    strong.textContent = node.name
    const span = document.createElement("span")
    span.textContent = node.isTag ? `tag · ${degree}` : degree
    tip.appendChild(strong)
    tip.appendChild(span)
    tip.style.transform = "translate(-50%, -100%)"
    tip.style.left = `${sx.toFixed(0)}px`
    tip.style.top = `${(sy - 18).toFixed(0)}px`
    tip.classList.add("is-visible")
  }

  function setFocus(node: Node3D | null) {
    hoverId = node ? node.id : null
    nearIds = hoverId ? computeNear(hoverId) : new Set<string>()
    refreshColors()
    syncLabels()
    showTip(node)
  }

  function focusNode(node: Node3D) {
    if (!graph) return
    const x = node.x ?? 0
    const y = node.y ?? 0
    const z = node.z ?? 0
    const radius = Math.hypot(x, y, z) || 1
    const ratio = 1 + 42 / radius
    graph.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 900)
  }

  // -- data -----------------------------------------------------------------

  function tuneForces() {
    if (!graph) return
    const charge = graph.d3Force("charge")
    if (charge && charge.strength) charge.strength(-55)
    const linkForce = graph.d3Force("link")
    if (linkForce && linkForce.distance) linkForce.distance(34)
  }

  function applyData() {
    if (!graph) return
    const model = buildModel(indexData, showTags, showOrphans)
    nodes = model.nodes
    links = model.links
    byId = new Map(nodes.map((n) => [n.id, n]))
    hoverId = null
    nearIds = new Set<string>()
    if (pinnedId && !byId.has(pinnedId)) pinnedId = null
    graph.graphData(model)
    tuneForces()
    if (countEl) {
      const noteCount = nodes.filter((n) => !n.isTag).length
      countEl.textContent = `${noteCount} notes · ${links.length} links`
    }
    refreshColors()
    syncLabels()
    // Frame early for instant feedback, then once more when the layout settles.
    pendingFrame = true
    later(() => {
      if (graph && !disposed) graph.zoomToFit(650, 60)
    }, 220)
  }

  // -- search ---------------------------------------------------------------

  function runSearch(raw: string) {
    query = raw.trim().toLowerCase()
    pinnedId = null
    if (query) {
      let best: Node3D | null = null
      let bestScore = 0
      for (const node of nodes) {
        if (node.isTag) continue
        const name = node.name.toLowerCase()
        const score =
          name === query ? 3 : name.startsWith(query) ? 2 : name.indexOf(query) !== -1 ? 1 : 0
        if (score === 0) continue
        if (score > bestScore || (score === bestScore && best !== null && node.deg > best.deg)) {
          best = node
          bestScore = score
        }
      }
      if (best !== null) {
        pinnedId = (best as Node3D).id
        focusNode(best)
      }
    }
    refreshColors()
    syncLabels()
  }

  // -- events ---------------------------------------------------------------

  function onResize() {
    if (!graph) return
    graph.width(host.clientWidth).height(host.clientHeight)
    updateLabelPositions()
  }

  function restyle() {
    palette = readPalette()
    refreshColors()
    syncLabels()
  }

  function hideHint() {
    if (hint) hint.classList.add("is-hidden")
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return
    if (search && document.activeElement === search) return
    setFocus(null)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    for (const id of timeouts) window.clearTimeout(id)
    labelEls.forEach((el) => el.remove())
    labelEls.clear()
    window.removeEventListener("resize", onResize)
    document.removeEventListener("themechange", restyle)
    document.removeEventListener("keydown", onKeydown)
    if (graph) {
      try {
        // Stop the render loop before tearing the instance down, so a frame in
        // flight cannot reach the emptied host during a fast SPA navigation.
        if (typeof graph.pauseAnimation === "function") graph.pauseAnimation()
        graph._destructor()
      } catch {
        // The library may already be gone during a fast SPA navigation.
      }
      graph = null
    }
    host.innerHTML = ""
    document.documentElement.classList.remove("graph3d-active")
  }

  cleanup = dispose
  window.addEventListener("resize", onResize)
  document.addEventListener("themechange", restyle)
  document.addEventListener("keydown", onKeydown)

  // -- wire controls --------------------------------------------------------

  if (search) {
    search.addEventListener("input", () => runSearch(search.value))
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        search.value = ""
        runSearch("")
        search.blur()
      }
    })
  }

  if (tagsBox) {
    tagsBox.addEventListener("change", () => {
      showTags = tagsBox.checked
      applyData()
    })
  }

  if (orphansBox) {
    orphansBox.addEventListener("change", () => {
      showOrphans = orphansBox.checked
      applyData()
    })
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (!graph) return
      pinnedId = null
      setFocus(null)
      graph.zoomToFit(800, 60)
      hideHint()
    })
  }

  root.addEventListener("pointerdown", hideHint, { once: true })

  // -- start ----------------------------------------------------------------

  loadLib()
    .then((factory) => {
      if (disposed) return null
      graph = factory({ controlType: "orbit", rendererConfig: { antialias: true, alpha: true } })(
        host,
      )
      // With reduced motion the layout settles silently instead of visibly
      // springing apart: the whole simulation runs up front, then holds still.
      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      graph
        .backgroundColor("rgba(0,0,0,0)")
        .showNavInfo(false)
        .nodeRelSize(3.4)
        .nodeResolution(12)
        .nodeOpacity(0.95)
        .nodeColor((n: Node3D) => nodeColor(n))
        .nodeLabel(() => "")
        .linkColor((l: Link3D) => linkColor(l))
        .linkOpacity(0.32)
        .linkWidth(0.4)
        .linkDirectionalParticles(0)
        .warmupTicks(reduceMotion ? 200 : 40)
        .cooldownTicks(reduceMotion ? 0 : 240)
        .d3AlphaDecay(0.022)
        .d3VelocityDecay(0.32)
        .onNodeHover((node: Node3D | null) => setFocus(node))
        .onNodeClick((node: Node3D) => {
          if (!node || !node.id) return
          const href = new URL(slugToHref(node.id), window.location.origin)
          if (typeof window.spaNavigate === "function") window.spaNavigate(href)
          else window.location.href = href.toString()
        })
        .onEngineTick(() => updateLabelPositions())
        .onEngineStop(() => {
          updateLabelPositions()
          if (pendingFrame) {
            pendingFrame = false
            graph.zoomToFit(650, 60)
          }
        })

      const scene = graph.scene()
      if (scene && scene.position) projectVec = new (scene.position.constructor)()
      const controls = graph.controls()
      if (controls && controls.addEventListener) {
        controls.addEventListener("change", updateLabelPositions)
      }

      return fetchData.then((index: ContentIndex) => {
        if (disposed) return
        indexData = index as unknown as Record<string, Entry>
        applyData()
        if (status) status.classList.add("is-hidden")
        if (hint) later(() => hint.classList.add("is-hidden"), HINT_HIDE_MS)
      })
    })
    .catch((err: unknown) => {
      if (disposed) return
      console.error("[Graph3D] Failed to start:", err)
      if (status) status.textContent = "The 3D graph could not load. Check your network connection."
    })
}

function teardown() {
  if (!cleanup) return
  cleanup()
  cleanup = null
}

document.addEventListener("nav", init)
document.addEventListener("render", init)
document.addEventListener("prenav", teardown)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
