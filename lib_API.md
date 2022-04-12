# dltracker-dir-compare
Compare directories of packages obtained by the `npm download` command

------

## API: intersections.js

```js
const getIntersections = require('dltracker-dir-compare/intersections')
```
### `getIntersections(dirs)` &rarr; `Promise<Array>`
* `dirs` {Array&lt;string&gt;} Two or more paths to download-tracker directories.

Resolves to an Array. For each subset of directories that have package files in
common, the array contains an object that pairs the subset with the list of
files:
* `dirs` {Array&lt;number&gt;} indices of elements in the input array `dirs`
* `files` {Array&lt;string&gt;} names of files in common

**Example:** given three directories with contents as shown...
```
dir1                    dir2                    dir3
----------------------  ----------------------  ----------------------
pkg-a-1.0.0.tar.gz      pkg-a-1.0.0.tar.gz      pkg-b-1.0.1.tar.gz
pkg-b-1.0.1.tar.gz      pkg-d-1.0.3.tar.gz      pkg-d-1.0.3.tar.gz
pkg-c-1.0.2.tar.gz      pkg-e-1.0.4.tar.gz      pkg-f-1.0.5.tar.gz
pkg-f-1.0.5.tar.gz      pkg-f-1.0.5.tar.gz
```
The call `getIntersections([dir1, dir2, dir3])` would yield these results:
```
[
  { dirs: [0, 1, 2], files: ['pkg-f-1.0.5.tar.gz'] },
  { dirs: [0, 1], files: ['pkg-a-1.0.0.tar.gz'] },
  { dirs: [0, 2], files: ['pkg-b-1.0.1.tar.gz'] },
  { dirs: [1, 2], files: ['pkg-d-1.0.3.tar.gz'] }
]
```
In this simplistic example, each subset of directories has only one file in
common, but in real cases there may be several files in the `files` list; and
of course, there may be subsets of directories absent from the results because
they have nothing in common (or nothing that has not been accounted for in a
larger subset).

------

## API: uniques.js

```js
const getUniques = require('dltracker-dir-compare/uniques')
```
### `getUniques(dirs)` &rarr; `Promise<Array>`
* `dirs` {Array&lt;string&gt;} Two or more paths to download-tracker directories.

Resolves to an Array. For each given directory, if a filename is found there and
not at any other of the given paths, the filename is in a nested array that is
at the same index in the result array as the index of the directory in the input
array.

**Example:** using the same three directory listings as in the intersections
example above, the call<br/> `getUniques([dir1, dir2, dir3])` would yield these
results:
```
[
  ['pkg-c-1.0.2.tar.gz'],
  ['pkg-e-1.0.4.tar.gz']
]
```
In this example, if there had been no unique package file in dir1, the results
would have `undefined` at index 0.

------

**License: MIT**
