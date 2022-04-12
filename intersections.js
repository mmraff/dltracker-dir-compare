const tallyDirContents = require('./tally')

function expectNonEmptyStrings(list) {
  if (list == undefined || list == null)
    throw new SyntaxError('No argument given')
  if (!(list instanceof Array))
    throw new TypeError(`Expected array; given ${typeof list}`)
  for (let i = 0; i < list.length; ++i) {
    if (typeof list[i] != 'string')
      throw new TypeError(
        `Array items must all be strings; found ${typeof list[i]}`
      )
    if (list[i] == '')
      throw new SyntaxError('Empty string is invalid in this context')
  }
  if (list.length < 2)
    throw new SyntaxError('Not enough directories specified')
}

module.exports = function getIntersections(dirs) {
  try {
    expectNonEmptyStrings(dirs)
  }
  catch(err) { return Promise.reject(err) }

  const map = {}
  function iterateDirs(i) {
    if (i >= dirs.length) return Promise.resolve(null)
    return tallyDirContents(dirs[i], i, map)
    .then(() => iterateDirs(i+1))
  }
  return iterateDirs(0).then(() => {
    const allCombos = combinations(dirs.length)
    const results = []
    // Get the set of dir combos of length n, 2 <= n <= dirs.length
    for (let i = dirs.length; i > 1; --i) {
      const nLengthCombos = allCombos.filter(function(c) { return c.length == i })
      if (nLengthCombos.length == 0) continue
      for (let c = 0; c < nLengthCombos.length; ++c) {
        const combo = nLengthCombos[c]
        const assoc = { dirs: combo, files: [] }
        for (let file in map) {
          if (map[file].toString() == combo.toString()) {
            assoc.files.push(file)
          }
        }
        if (assoc.files.length) results.push(assoc)
      }
    }
    return results
  })
}

// The non-recursive Power Set algorithm, adapted to the needs of this module.
function combinations(srcSize) {
  const result = []
  const powerSetSize = Math.pow(2, srcSize)
  for (let comboIdx = 0; comboIdx < powerSetSize; ++comboIdx) {
    const subset = []
    for (let bitPos = 0; bitPos < srcSize; ++bitPos) {
      if ((comboIdx & (1 << bitPos)) != 0)
        subset.push(bitPos)
    }
    if (subset.length > 1) result.push(subset)
  }
  return result
}
