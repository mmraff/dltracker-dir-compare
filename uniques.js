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

module.exports = function getUniques(dirs) {
  try {
    expectNonEmptyStrings(dirs)
  }
  catch(err) { return Promise.reject(err) }

  const map = {}
  function nextDir(i) {
    if (i >= dirs.length) return Promise.resolve(null)
    return tallyDirContents(dirs[i], i, map)
    .then(() => nextDir(i+1))
  }
  return nextDir(0).then(() => {
    const singlesLists = []
    for (let file in map) {
      const dIds = map[file]
      if (dIds.length == 1) {
        const d = dIds[0]
        if (!singlesLists[d]) singlesLists[d] = []
        singlesLists[d].push(file)
      }
    }
    return singlesLists
  })
}
