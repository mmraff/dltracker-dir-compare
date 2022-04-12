#!/usr/bin/env node

const { Command } = require('commander')
const glob = require('glob')
const util = require('util')
const promisify = util.promisify || require('./simple-promisify')
const globAsync = promisify(glob)
const getIntersects = require('./intersections')
const getUniques = require('./uniques')

const program = new Command()
const { version: pkgVersion } = require('./package.json')
program.version(pkgVersion)

program
  .option('-c, --count', 'Only show counts for each combination of directories')
  .option('-u, --unique', 'Only show packages that are unique to one of the directories')
  .usage([
    '[options] item_1... item_n',
    '',
    'The items must resolve to existing paths.',
    'At least two arguments are required if literal paths, but a glob expression',
    'that yields enough paths to result in at least two arguments will suffice.'
  ].join('\n'))
  .action(function() {

    function evalNextArg(i) {
      if (i >= program.args.length) return Promise.resolve(null)
      const arg = program.args[i]
      if (glob.hasMagic(arg))
        return globAsync(arg).then(matches => {
          processedArgs.splice(-1, 0, ...matches)
          return evalNextArg(i+1)
        })
      processedArgs.push(arg)
      return evalNextArg(i+1)
    }

    Promise.resolve(program.args.length == 0)
    .then(noArgsGiven => {
      if (noArgsGiven) throw new Error('No directories named')

      const opts = {}
      if (program.count) opts.count = true
      const processedArgs = []
      const outputFunc = program.unique ? showUniqueEntries : showDuplicates
      return evalNextArg(0).then(() => outputFunc(processedArgs, opts))
    })
    .catch(err => {
      console.error(err.message)
      if (!err.code)
        console.log('\n' + program.helpInformation())
      process.exitCode = 1
    })
  })

program.parse()

function showDuplicates(args, opts) {
  return getIntersects(args).then(results => {
    if (!results.length) {
      console.log('\nNo duplicates found.\n')
      return
    }
    console.log(
      '\nShowing', opts.count ? 'counts of' : '',
      'packages in common among sets of directories:\n'
    )
    for (let i = 0; i < results.length; ++i) {
      const assoc = results[i]
      const dirs = assoc.dirs
      const files = assoc.files
      for (let d = 0; d < dirs.length; ++d)
        console.log(args[dirs[d]])
      if (opts.count)
        console.log(`${files.length} packages in common`)
      else {
        console.log('----------'.repeat(8))
        for (let f = 0; f < files.length; ++f)
          console.log(files[f])
      }
      console.log('')
    }
  })
}

function showUniqueEntries(args, opts) {
  return getUniques(args).then(results => {
    if (!results.length) {
      console.log('\nNo unique packages found.\n')
      return
    }
    console.log(
      '\nShowing', opts.count ? 'counts of' : '',
      'unique packages per directory:\n'
    )
    for (let d = 0; d < results.length; ++d) {
      const files = results[d]
      if (!files) continue

      console.log(args[d])
      if (opts.count)
        console.log(`${files.length} unique packages`)
      else {
        console.log('----------'.repeat(8))
        for (let f = 0; f < files.length; ++f)
          console.log(files[f])
      }
      console.log('')
    }
  })
}
