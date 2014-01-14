#!/usr/bin/env node
/**
 * Minification of Polestar's JavaScript and CSS.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.0.1
 * @license MPL 2.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var compressor = require('node-minify')
var program = require('commander')

program.option('-p, --polestar <polestar>', 'Polestar directory')
program.version('0.0.1')
program.parse(process.argv)

var inputDirectory = program.polestar || 'polestar'

if (inputDirectory.slice(-1) !== '/') {
    inputDirectory = inputDirectory + '/'
}

new compressor.minify({
  type: 'yui-js',
  fileIn: inputDirectory + 'polestar.js',
  fileOut: inputDirectory + 'polestar.min.js',
  callback: function(error, min){
    if (error) {
      console.log(
        'Failed to minify Polestar\'s JavaScript. Error: ' + error
      )
    } else {
      console.log('Successfully minified Polestar\'s JavaScript.')
    }
  }
})