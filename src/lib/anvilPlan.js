// Java Edition anvil planner.
//
// Model (Minecraft Wiki, "Anvil mechanics"):
//   - prior work penalty = 2^height - 1, where height is the number of anvil
//     operations on the longest path inside a combined item/book
//   - one operation costs the sacrifice's enchantment value after the
//     combination + the target's penalty + the sacrifice's penalty
//   - an operation's result height = max(target height, sacrifice height) + 1
//
// Books are represented as single-enchant leaves. The dynamic program below
// considers every way to merge books together before/while applying them to
// the base item, so it can find plans that pair books first to save XP.

const INF = Number.POSITIVE_INFINITY

export function enchantValue(enchantment, level) {
  return (enchantment?.bookMultiplier ?? 1) * level
}

function penalties(height) {
  return (1 << height) - 1
}

/**
 * @param {{id: string, level: number}[]} enchants
 * @param {Record<string, {bookMultiplier: number}>} definitions
 */
export function makePlan(enchants, definitions) {
  const k = enchants.length
  if (!k) {
    return { totalXp: 0, operations: [], groups: [], maxStepXp: 0, bookCount: 0 }
  }

  const values = enchants.map(e => enchantValue(definitions[e.id], e.level))
  const size = 1 << k
  const full = size - 1
  const H = k + 1 // a tree over k leaves can never be taller than k

  const subsetValue = new Array(size).fill(0)
  for (let mask = 1; mask < size; mask++) {
    const low = mask & -mask
    const index = 31 - Math.clz32(low)
    subsetValue[mask] = subsetValue[mask ^ low] + values[index]
  }

  // dpBook[mask][h]: cheapest way to merge exactly `mask` books into one book
  // whose prior-work height is h.
  const dpBook = Array.from({ length: size }, () => new Array(H).fill(INF))
  const bookChoice = Array.from({ length: size }, () => new Array(H).fill(null))
  for (let i = 0; i < k; i++) dpBook[1 << i][0] = 0

  for (let mask = 1; mask < size; mask++) {
    if ((mask & (mask - 1)) === 0) continue
    for (let sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask) {
      const other = mask ^ sub
      if (!other || sub > other) continue // each unordered split once
      for (let ha = 0; ha < H; ha++) {
        if (dpBook[sub][ha] === INF) continue
        for (let hb = 0; hb < H; hb++) {
          if (dpBook[other][hb] === INF) continue
          const h = Math.max(ha, hb) + 1
          if (h >= H) continue
          const cost =
            dpBook[sub][ha] +
            dpBook[other][hb] +
            Math.min(subsetValue[sub], subsetValue[other]) +
            penalties(ha) +
            penalties(hb)
          if (cost < dpBook[mask][h]) {
            dpBook[mask][h] = cost
            bookChoice[mask][h] = { a: sub, b: other, ha, hb }
          }
        }
      }
    }
  }

  // dpBase[mask][h]: cheapest way to put exactly `mask` of the books onto the
  // base item, where the base item's prior-work height is h.
  const dpBase = Array.from({ length: size }, () => new Array(H).fill(INF))
  const baseChoice = Array.from({ length: size }, () => new Array(H).fill(null))
  dpBase[0][0] = 0

  for (let mask = 0; mask < size; mask++) {
    const remaining = full ^ mask
    if (!remaining) continue
    for (let h = 0; h < H; h++) {
      if (dpBase[mask][h] === INF) continue
      for (let group = remaining; group; group = (group - 1) & remaining) {
        for (let hg = 0; hg < H; hg++) {
          if (dpBook[group][hg] === INF) continue
          const nextHeight = Math.max(h, hg) + 1
          if (nextHeight >= H) continue
          const cost =
            dpBase[mask][h] +
            dpBook[group][hg] +
            subsetValue[group] +
            penalties(h) +
            penalties(hg)
          const nextMask = mask | group
          if (cost < dpBase[nextMask][nextHeight]) {
            dpBase[nextMask][nextHeight] = cost
            baseChoice[nextMask][nextHeight] = { mask, h, group, hg, cost }
          }
        }
      }
    }
  }

  let bestHeight = -1
  let totalXp = INF
  for (let h = 0; h < H; h++) {
    if (dpBase[full][h] < totalXp) {
      totalXp = dpBase[full][h]
      bestHeight = h
    }
  }

  const label = mask => {
    const parts = []
    for (let i = 0; i < k; i++) {
      if (mask & (1 << i)) parts.push(enchantLabel(enchants[i], definitions))
    }
    return parts.join(' + ')
  }

  // Rebuild the merge tree for a book subset.
  function bookNode(mask, h) {
    if ((mask & (mask - 1)) === 0) {
      return {
        kind: 'book',
        mask,
        height: h,
        value: subsetValue[mask],
        cost: 0,
        label: label(mask),
        enchantIndexes: [31 - Math.clz32(mask)],
      }
    }
    const choice = bookChoice[mask][h]
    const targetIsA = subsetValue[choice.a] >= subsetValue[choice.b]
    const targetMask = targetIsA ? choice.a : choice.b
    const sacrificeMask = targetIsA ? choice.b : choice.a
    const targetHeight = targetIsA ? choice.ha : choice.hb
    const sacrificeHeight = targetIsA ? choice.hb : choice.ha
    const target = bookNode(targetMask, targetHeight)
    const sacrifice = bookNode(sacrificeMask, sacrificeHeight)
    return {
      kind: 'book',
      mask,
      height: h,
      value: subsetValue[mask],
      cost: dpBook[mask][h],
      label: label(mask),
      enchantIndexes: collectLeaves(mask),
      target,
      sacrifice,
      mergeCost:
        subsetValue[sacrificeMask] + penalties(targetHeight) + penalties(sacrificeHeight),
    }
  }

  function collectLeaves(mask) {
    const out = []
    for (let i = 0; i < k; i++) if (mask & (1 << i)) out.push(i)
    return out
  }

  // Walk the base DP backwards to get the groups in the order they are applied.
  const attachSteps = []
  let mask = full
  let h = bestHeight
  while (mask !== 0) {
    const choice = baseChoice[mask][h]
    attachSteps.push(choice)
    mask = choice.mask
    h = choice.h
  }
  attachSteps.reverse()

  // Flatten each group's book-merge tree. All book merges happen first (their
  // timing does not depend on the base item), then the finished groups are
  // applied to the item in the cheapest order found above.
  const operations = []
  const mergeOperations = []
  const applyOperations = []
  const groups = []
  for (const step of attachSteps) {
    const tree = bookNode(step.group, step.hg)
    const mergeOps = []
    emitBookOps(tree, mergeOps)
    mergeOperations.push(...mergeOps)
    const cost = subsetValue[step.group] + penalties(step.h) + penalties(step.hg)
    applyOperations.push({
      kind: 'apply',
      target: {
        kind: 'item',
        height: step.h,
        mask: step.mask,
        label: null, // the component fills in the item name
        enchantIndexes: collectLeaves(step.mask),
      },
      sacrifice: {
        kind: 'book',
        height: step.hg,
        mask: step.group,
        label: tree.label,
        enchantIndexes: tree.enchantIndexes,
      },
      result: {
        kind: 'item',
        height: Math.max(step.h, step.hg) + 1,
        mask: step.mask | step.group,
        enchantIndexes: collectLeaves(step.mask | step.group),
      },
      cost,
    })
    groups.push({
      mask: step.group,
      height: step.hg,
      cost,
      label: tree.label,
      enchantIndexes: tree.enchantIndexes,
      mergeOps,
    })
  }
  operations.push(...mergeOperations, ...applyOperations)

  function emitBookOps(node, out) {
    if (!node.target) return
    emitBookOps(node.target, out)
    emitBookOps(node.sacrifice, out)
    out.push({
      kind: 'merge',
      target: {
        kind: 'book',
        height: node.target.height,
        mask: node.target.mask,
        label: node.target.label,
        enchantIndexes: node.target.enchantIndexes,
      },
      sacrifice: {
        kind: 'book',
        height: node.sacrifice.height,
        mask: node.sacrifice.mask,
        label: node.sacrifice.label,
        enchantIndexes: node.sacrifice.enchantIndexes,
      },
      result: {
        kind: 'book',
        height: node.height,
        mask: node.mask,
        label: node.label,
        enchantIndexes: node.enchantIndexes,
      },
      cost: node.mergeCost,
    })
  }

  let stepXp = 0
  for (const op of operations) stepXp += op.cost

  return {
    totalXp,
    operations,
    groups,
    bookCount: k,
    maxStepXp: operations.reduce((max, op) => Math.max(max, op.cost), 0),
    height: bestHeight,
    verifiedTotal: stepXp,
  }
}

export function enchantLabel(enchant, definitions) {
  const def = definitions[enchant.id]
  const name = def?.name ?? enchant.id
  if (def?.maxLevel === 1) return name
  return `${name} ${roman(enchant.level)}`
}

export function roman(value) {
  const table = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let n = value
  let out = ''
  for (const [num, glyph] of table) {
    while (n >= num) {
      out += glyph
      n -= num
    }
  }
  return out
}
