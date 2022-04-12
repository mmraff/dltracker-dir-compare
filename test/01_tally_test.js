const fs = require('fs')
const path = require('path')
const util = require('util')
const promisify = util.promisify || require('./simple-promisify')
const mkdirAsync = promisify(fs.mkdir)
const readdirAsync = promisify(fs.readdir)

const expect = require('chai').expect
const npf = require('@offliner/npm-package-filename')
const rimrafAsync = promisify(require('rimraf'))

const tallyDirContents = require('../tally.js')
const testSetup = require('./lib/test-setup')

const tempBase = path.join(__dirname, 'mockDownloads1')
const dirNames = [ 'DIR1', 'DIR2', 'DIR3' ]
const MAPFILENAME = 'dltracker.json'
const GIT_REPOS_DIR = '_git-remotes'

describe('tallyDirContents function', function() {
  before('create mock download-tracker directories with varying contents', function(done) {
    const testDirs = []
    for (let i = 0; i < dirNames.length; ++i)
      testDirs.push(path.join(tempBase, dirNames[i]))

    rimrafAsync(tempBase)
    .then(() => mkdirAsync(tempBase))
    .then(() => testSetup.initOverlapping(testDirs))
    .then(() => done())
    .catch(err => done(err))
  })
  after('tear down temporary directory', function(done) {
    rimrafAsync(tempBase)
    .then(() => done())
    .catch(err => done(err))
  })

  const testMap = {}

  it('should yield a mapping of each filename in the given directory to an array containing the given index', function(done) {
    const idx = 0
    const dirPath = path.join(tempBase, dirNames[idx])
    let packageCount = 0
    let hasGitRepoBase = false
    tallyDirContents(dirPath, idx, testMap)
    .then(() => readdirAsync(dirPath))
    .then(files => {
      for (let i = 0; i < files.length; ++i) {
        const entry = files[i]
        if (entry == MAPFILENAME || !npf.parse(entry)) {
          if (entry == GIT_REPOS_DIR)
            hasGitRepoBase = true
          expect(testMap).to.not.have.property(entry)
          continue
        }
        expect(testMap).to.have.property(entry)
        expect(testMap[entry]).to.be.an('array').with.lengthOf(1)
        expect(testMap[entry][0]).to.equal(idx)
        ++packageCount
      }
      return hasGitRepoBase
    })
    .then(hasGitRepoBase => !hasGitRepoBase ?
      null :
      readdirAsync(path.join(dirPath, GIT_REPOS_DIR))
      .then(repoDirs => {
        for (let d = 0; d < repoDirs.length; ++d) {
          const entry = repoDirs[d]
          expect(testMap).to.have.property(entry)
          expect(testMap[entry]).to.be.an('array').with.lengthOf(1)
          expect(testMap[entry][0]).to.equal(idx)
          ++packageCount
        }
      })
    )
    .then(() => {
      expect(Object.keys(testMap).length).to.equal(packageCount)
      done()
    })
    .catch(err => done(err))
  })

  // For the next test, we re-use the map from the previous test
  it('should add files not already present in an existing map, and augment the data for files already present', function(done) {
    const idx = 1
    const dirPath = path.join(tempBase, dirNames[idx])
    const mapCopy = Object.assign({}, testMap)
    let newPackageCount = 0
    let hasGitRepoBase = false
    tallyDirContents(dirPath, idx, testMap)
    .then(() => readdirAsync(dirPath))
    .then(files => {
      for (let i = 0; i < files.length; ++i) {
        const entry = files[i]
        if (entry == MAPFILENAME || !npf.parse(entry)) {
          if (entry == GIT_REPOS_DIR)
            hasGitRepoBase = true
          expect(testMap).to.not.have.property(entry)
          continue
        }
        expect(testMap).to.have.property(entry)
        if (mapCopy[entry]) {
          expect(testMap[entry]).to.be.an('array').with.lengthOf(2)
          expect(testMap[entry][1]).to.equal(idx)
        }
        else {
          expect(testMap[entry]).to.be.an('array').with.lengthOf(1)
          expect(testMap[entry][0]).to.equal(idx)
          ++newPackageCount
        }
      }
      return hasGitRepoBase
    })
    .then(hasGitRepoBase => {
      return (!hasGitRepoBase) ?
        null :
        readdirAsync(path.join(dirPath, GIT_REPOS_DIR))
        .then(repoDirs => {
          for (let d = 0; d < repoDirs.length; ++d) {
            const entry = repoDirs[d]
            expect(testMap).to.have.property(entry)
            if (mapCopy[entry]) {
              expect(testMap[entry]).to.be.an('array').with.lengthOf(2)
              expect(testMap[entry][1]).to.equal(idx)
            }
            else {
              expect(testMap[entry]).to.be.an('array').with.lengthOf(1)
              expect(testMap[entry][0]).to.equal(idx)
              ++newPackageCount
            }
          }
        })
    })
    .then(() => {
      const sizeDiff = Object.keys(testMap).length - Object.keys(mapCopy).length
      expect(newPackageCount).to.be.above(0)
      expect(sizeDiff).to.equal(newPackageCount)
      done()
    })
    .catch(err => done(err))
  })
})
