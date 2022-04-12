# dltracker-dir-compare
Compare directories of packages obtained by the `npm download` command

## Overview
*The `npm download` command is only available when an installation of `npm` has been overlaid with [npm-two-stage](https://github.com/mmraff/npm-two-stage#readme).
The official `npm` interface **does not** have a `download` command at this time.*

In short, `npm download` fetches named packages, and all the packages of their dependency trees, as a means of collecting all that is needed for offline installation on another system.

If one has used this command several times, retaining the results but not always reusing the same target directory, it may result in many duplicate copies of packages distributed across multiple directories.

This module provides a command line interface to compare the contents of two or more such directories, and report what they have in common - or, alternately, what each has that none of the other directories have.

## To Install

Typical CLI use is from a global installation:
```
$ npm install -g dltracker-dir-compare
```
But local installation is valid, and possibly useful for the submodules:
```
$ npm install --save dltracker-dir-compare
```
*See documentation for the submodules in lib_API.md.*

## Usage
Enter the `dltdir-compare` command with the paths of two or more `npm download` directories.
```
$ dltdir-compare PATH_1 PATH_2 [... PATH_n]
```

A Posix glob expression may be given for one or more of the path arguments, provided that the argument list resolves to at least two existing directories. *See [documentation for **node-glob**](https://github.com/isaacs/node-glob/tree/v7.1.7#readme).*

By default, `dltdir-compare` reports only the files that directories have in common. An option is provided to report files unique to each directory instead:
```
$ dltdir-compare --unique PATH_1 PATH_2 [... PATH_n]
```

Another option is provided to get counts rather than lists of files, whether in common for sets of directories or unique to each:
```
$ dltdir-compare --count PATH_1 PATH_2 [... PATH_n]
$ dltdir-compare --unique --count PATH_1 PATH_2 [... PATH_n]
```

Show version and exit:
```
$ dltdir-compare --version
```

------

**License: MIT**
