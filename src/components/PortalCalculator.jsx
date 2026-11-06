import { useState } from 'react'
import ItemIcon from './icons/ItemIcon'
import {
  DIMENSIONS,
  EDITIONS,
  PORTAL_FRAME,
  WORLD_BORDER,
  convertCoordinates,
  otherDimension,
  portalBuildCheck,
  searchSquare,
} from '../lib/portalMath'

const AXES = ['x', 'y', 'z']
const numberFormat = new Intl.NumberFormat('en-US')

function formatNumber(value) {
  return typeof value === 'number' ? numberFormat.format(value) : value
}

function CoordinateCard({ dimension, coords, eyebrow, highlight = false }) {
  const config = DIMENSIONS[dimension]
  return (
    <div
      className={`rounded-xl border p-3.5 ${config.border} ${config.background} ${
        highlight ? 'ring-2 ring-mc-green/25' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-2 text-sm font-bold ${config.accent}`}>
          <ItemIcon name={config.icon} size={22} />
          {config.name}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">{eyebrow}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {AXES.map(axis => (
          <div key={axis} className="rounded-lg bg-black/20 px-1 py-2 text-center">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">{axis}</div>
            <div className="mt-0.5 truncate font-mono text-sm font-bold text-white sm:text-base">
              {formatNumber(coords[axis])}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent = 'text-white' }) {
  return (
    <div className="rounded-lg border border-white/10 bg-mc-darker/50 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`mt-0.5 truncate font-mono text-[11px] font-semibold ${accent}`}>{value}</div>
    </div>
  )
}

function FrameDiagram() {
  return (
    <div className="shrink-0 rounded-lg border border-white/10 bg-black/20 p-2" aria-hidden="true">
      <div className="grid grid-cols-4 gap-0.5">
        {Array.from({ length: PORTAL_FRAME.outerHeight }, (_, row) =>
          Array.from({ length: PORTAL_FRAME.outerWidth }, (_, column) => {
            const frame =
              row === 0 ||
              row === PORTAL_FRAME.outerHeight - 1 ||
              column === 0 ||
              column === PORTAL_FRAME.outerWidth - 1
            return (
              <span
                key={`${row}-${column}`}
                className={`h-3.5 w-3.5 rounded-[2px] ${
                  frame
                    ? 'border border-white/10 bg-mc-deepslate'
                    : 'bg-purple-500/70 shadow-[0_0_6px_rgba(168,85,247,0.55)]'
                }`}
              />
            )
          }),
        )}
      </div>
      <div className="mt-1.5 text-center text-[8px] uppercase tracking-wider text-gray-500">4 x 5 frame</div>
    </div>
  )
}

export default function PortalCalculator() {
  const [edition, setEdition] = useState('java')
  const [sourceDimension, setSourceDimension] = useState('overworld')
  const [draft, setDraft] = useState({ x: '0', y: '64', z: '0' })
  const [copied, setCopied] = useState(null)

  const destinationDimension = otherDimension(sourceDimension)
  const parsed = {
    x: Number(draft.x),
    y: Number(draft.y),
    z: Number(draft.z),
  }
  const hasAllFields = AXES.every(axis => String(draft[axis]).trim() !== '')
  const valid =
    hasAllFields &&
    AXES.every(axis => Number.isFinite(parsed[axis]) && Number.isInteger(parsed[axis]))

  const converted = valid ? convertCoordinates(parsed, sourceDimension) : null
  const build = converted
    ? portalBuildCheck(converted.destinationDimension, edition, converted.target.y)
    : null
  const square = converted
    ? searchSquare(converted.target, converted.destinationDimension, edition)
    : null
  const destinationConfig = DIMENSIONS[converted?.destinationDimension ?? destinationDimension]
  const editionConfig = EDITIONS[edition]

  const setAxis = (axis, value) => {
    setDraft(current => ({ ...current, [axis]: value }))
    setCopied(null)
  }

  const chooseSource = dimension => {
    setSourceDimension(dimension)
    setCopied(null)
  }

  const swapSides = () => {
    if (!converted) return
    setSourceDimension(converted.destinationDimension)
    setDraft({
      x: String(converted.target.x),
      y: String(converted.target.y),
      z: String(converted.target.z),
    })
    setCopied(null)
  }

  const copyTarget = async () => {
    if (!converted) return
    const text = `${converted.target.x} ${converted.target.y} ${converted.target.z}`
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(text)
      setCopied('target')
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied('failed')
    }
  }

  const formula = axis => {
    if (!converted) return '—'
    const value = draft[axis]
    return sourceDimension === 'overworld'
      ? `floor(${value} / 8) = ${formatNumber(converted.rawTarget[axis])}`
      : `${value} x 8 = ${formatNumber(converted.rawTarget[axis])}`
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
            <ItemIcon name="Compass" size={30} />
            Portal Calculator
          </h2>
          <p className="max-w-3xl text-sm text-gray-400">
            Convert a portal position between the Overworld and Nether, then see the ideal target
            and the area where Minecraft will search for a destination portal.
          </p>
        </div>
        <span className="rounded-full border border-mc-green/30 bg-mc-green/10 px-3 py-1 text-[11px] font-semibold text-mc-green-light">
          8:1 horizontal scale
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-white/10 bg-mc-dark p-1">
          <button
            type="button"
            onClick={() => chooseSource('overworld')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              sourceDimension === 'overworld'
                ? 'bg-mc-green/25 text-mc-green-light'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overworld to Nether
          </button>
          <button
            type="button"
            onClick={() => chooseSource('nether')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              sourceDimension === 'nether'
                ? 'bg-red-500/20 text-red-300'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Nether to Overworld
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-white/10 bg-mc-dark p-1">
          {Object.values(EDITIONS).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setEdition(item.id)
                setCopied(null)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                edition === item.id
                  ? 'bg-mc-diamond/15 text-mc-diamond'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-mc-darker/50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">Source coordinates</h3>
            <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${DIMENSIONS[sourceDimension].accent}`}>
              <ItemIcon name={DIMENSIONS[sourceDimension].icon} size={16} />
              {DIMENSIONS[sourceDimension].name}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {AXES.map(axis => (
              <label key={axis} className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {axis}
                </span>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={draft[axis]}
                  onChange={event => setAxis(axis, event.target.value)}
                  aria-label={`Source ${axis.toUpperCase()} coordinate`}
                  className="w-full rounded-lg border border-white/10 bg-mc-dark px-2.5 py-2 font-mono text-sm text-white focus:border-mc-green focus:outline-none"
                />
              </label>
            ))}
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            Use the whole-block X / Y / Z from the debug screen or coordinates display. Y is never
            scaled. X and Z are floored when entering the Nether. The site check treats Y as the
            bottom frame block.
          </p>

          {!valid && (
            <p className="mt-2 text-[11px] font-medium text-red-400">
              Enter a whole number for X, Y and Z.
            </p>
          )}

          {converted?.sourceOutsideBorder && (
            <p className="mt-2 rounded-lg border border-mc-gold/20 bg-mc-gold/5 px-2.5 py-2 text-[11px] text-mc-gold">
              This source position is outside the default world border.
            </p>
          )}

          <div className="mt-3 rounded-lg border border-white/5 bg-mc-darker/60 p-2.5">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Conversion
            </div>
            {converted ? (
              <div className="grid gap-1 text-[11px] text-gray-400 sm:grid-cols-2">
                <span>X: <span className="font-mono text-gray-200">{formula('x')}</span></span>
                <span>Z: <span className="font-mono text-gray-200">{formula('z')}</span></span>
                <span className="sm:col-span-2">
                  Y: <span className="font-mono text-gray-200">{formatNumber(converted.target.y)}</span>{' '}
                  <span className="text-gray-500">(unchanged)</span>
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-gray-500">Enter valid coordinates to see the formula.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
            <CoordinateCard
              dimension={sourceDimension}
              coords={converted?.source ?? { x: '—', y: '—', z: '—' }}
              eyebrow="Source"
            />
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-1 rounded-full border border-mc-green/30 bg-mc-green/10 px-2.5 py-1 text-[10px] font-bold text-mc-green-light">
                {sourceDimension === 'overworld' ? '/ 8' : 'x 8'}
                <span aria-hidden="true">-&gt;</span>
              </div>
            </div>
            <CoordinateCard
              dimension={destinationDimension}
              coords={converted?.target ?? { x: '—', y: '—', z: '—' }}
              eyebrow="Ideal target"
              highlight
            />
          </div>

          <p className="rounded-lg border border-mc-gold/20 bg-mc-gold/5 px-3 py-2 text-[11px] leading-relaxed text-mc-gold">
            This is the ideal link point, not a guaranteed generated-portal position. A new portal
            can be placed up to 16 blocks away, at a different Y, or an existing portal inside the
            search square may be chosen instead.
          </p>

          {converted?.clamped && (
            <p className="rounded-lg border border-mc-gold/20 bg-mc-gold/5 px-3 py-2 text-[11px] text-mc-gold">
              The target was clamped to the world border: X/Z must stay within{' '}
              {formatNumber(WORLD_BORDER.min)} to {formatNumber(WORLD_BORDER.max)}.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={swapSides}
              disabled={!converted}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-mc-dark px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-mc-green/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ItemIcon name="Compass" size={15} />
              Use target as source
            </button>
            <button
              type="button"
              onClick={copyTarget}
              disabled={!converted}
              className="inline-flex items-center gap-1.5 rounded-lg border border-mc-green/30 bg-mc-green/10 px-3 py-2 text-xs font-semibold text-mc-green-light transition hover:bg-mc-green/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ItemIcon name="Book" size={15} />
              {copied === 'target' ? 'Copied!' : copied === 'failed' ? 'Copy failed' : 'Copy target coords'}
            </button>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-mc-diamond/20 bg-mc-diamond/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ItemIcon name="Eye of Ender" size={20} />
            <h3 className="text-sm font-bold text-white">Existing-portal search</h3>
          </div>
          <p className="text-xs leading-relaxed text-gray-400">
            {converted ? (
              <>
                {editionConfig.name} checks a horizontal square around the linked target. The
                destination is the {destinationConfig.name}, so the search radius is{' '}
                <span className="font-bold text-mc-diamond">±{square.radius} blocks</span>.
              </>
            ) : (
              'Enter valid coordinates to see the destination search range.'
            )}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStat
              label="X range"
              value={square ? `${formatNumber(square.minX)} ... ${formatNumber(square.maxX)}` : '—'}
            />
            <MiniStat
              label="Z range"
              value={square ? `${formatNumber(square.minZ)} ... ${formatNumber(square.maxZ)}` : '—'}
            />
            <MiniStat label="Height" value="Full world height" />
            <MiniStat label="Winner" value="Closest 3D portal" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
            If no active portal is inside that square, the game tries to build one within 16 blocks
            horizontally of the target. The closest portal wins by straight-line distance, including
            Y, so height can break a tie.
          </p>
        </section>

        <section
          className={`rounded-xl border p-4 ${
            build?.ok
              ? 'border-mc-green/20 bg-mc-green/5'
              : build
                ? 'border-red-400/30 bg-red-500/5'
                : 'border-white/10 bg-mc-darker/50'
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ItemIcon name="Flint and Steel" size={20} />
              <h3 className="text-sm font-bold text-white">Portal site check</h3>
            </div>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                build?.ok ? 'text-mc-green-light' : build ? 'text-red-300' : 'text-gray-500'
              }`}
            >
              {build?.ok ? 'Coordinate rules pass' : build ? 'Needs attention' : 'Waiting for coordinates'}
            </span>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <FrameDiagram />
            <ul className="min-w-[180px] flex-1 space-y-1.5 text-[11px] text-gray-400">
              <li>
                Frame: <span className="text-white">4 x 5 outside</span>, 2 x 3 opening
              </li>
              <li>
                Obsidian: <span className="text-white">10</span> without corners,{' '}
                <span className="text-white">14</span> with corners
              </li>
              <li>
                Bottom Y:{' '}
                <span className="text-white">{converted ? formatNumber(converted.target.y) : '—'}</span>
                {build && (
                  <span className="text-gray-500">
                    {' '}
                    (top frame Y {formatNumber(build.frameTop)})
                  </span>
                )}
              </li>
              <li>
                Allowed base Y:{' '}
                <span className="text-white">
                  {build ? `${formatNumber(build.minY)} to ${formatNumber(build.maxY)}` : '—'}
                </span>
              </li>
              <li>Terrain and open space cannot be checked without your world seed.</li>
            </ul>
          </div>

          {build && !build.ok && (
            <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-300">
              {build.reason}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
            The game can still place a generated portal up to 16 blocks horizontally from the target,
            or force one at the target with a small obsidian platform. Build manually at the linked
            target if you want the exact coordinates.
          </p>
        </section>
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-mc-darker/40 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-gray-300">
          How portal linking works
        </summary>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-gray-400">
          <li>Overworld to Nether: X and Z are divided by 8 and floored; Y does not change.</li>
          <li>Nether to Overworld: X and Z are multiplied by 8; Y does not change.</li>
          <li>
            Java 1.16.2+ searches ±16 blocks in the Nether and ±128 blocks in the Overworld.
            Bedrock searches ±128 in both dimensions.
          </li>
          <li>The search is a square, covers the full height, and selects the closest portal by 3D distance.</li>
          <li>
            Converting keeps X/Z inside the world border ({formatNumber(WORLD_BORDER.min)} to{' '}
            {formatNumber(WORLD_BORDER.max)}).
          </li>
          <li>
            Details checked against the{' '}
            <a
              href="https://minecraft.wiki/w/Nether_Portal"
              target="_blank"
              rel="noreferrer"
              className="text-mc-green-light underline decoration-mc-green/40 underline-offset-2"
            >
              Minecraft Wiki: Nether Portal
            </a>
            .
          </li>
        </ul>
      </details>
    </div>
  )
}
