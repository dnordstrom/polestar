#!/usr/bin/env node
/**
 * Static site generator for Polestar.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var cheerio = require('cheerio')
var program = require('commander')
var request = require('request')
var fs = require('fs')

/**
 * Prints a message to log, as an error if the second argument is true
 *
 * - message
 * - isError: Set this to true to use `console#error`
 */
function log(message, isError) {
  if (program.verbose) {
    if (typeof isError === "undefined") {
      console.log(message)
    } else {
      console.error(message)
    }
  }
}

/**
 * Options and help
 *
 * - --query sets the search query (required)
 * - --verbose enables output (optional) 
 */
program.option('-r, --repo <repo>', 'GitHub repository for content')
program.option('-f, --file <file>', 'output file')
program.option('-i, --into <into>', 'element to render articles into')
program.option('-v, --verbose', 'verbose mode enables output')
program.version('0.0.1')
program.parse(process.argv)

var loadedArticles = []
var $ = false

function generateFromInput(input) {
  $ = cheerio.load(input)

  $('*[data-at]').each(function (index, element) {
    var path = $(element).attr('data-at')
    var content = fs.readFileSync('../' + path + '.md').toString()

    $(element).html(content)
  })

  var url = 'https://api.github.com/repos/' +
    program.repo +
    '/contents'
  var options = {
    url: url,
    headers: {
      'User-Agent': 'polestar'
    }
  }

  request(options, function (error, response, body) {
    var articles = JSON.parse(body)

    var articles = articles.filter(function (article) {
      return article.type === "file";
    }).reverse()

    for (var i = 0; i < articles.length; ++i) {
      var file = articles[i].name

      !(function (index, id) {
        var options = {
          url: articles[i].url,
          headers: {
            'Accept': 'application/vnd.github.v3.raw'
          }
        }

        request(options, function (error, response, body) {
          var article = {
            content: body,
            id: id
          }

          loadedArticles[index] = article

          /* If all articles have been loaded */
          if (loadedArticles.length === articles.length) {
            renderArticles()
          }
        })
      }(i, file.substr(0, file.lastIndexOf('.')) || file))
    }
  })
}

function renderArticles() {
  for (var i = 0; i < loadedArticles.length; ++i) {
    var article = loadedArticles[i]

    $('.writings').append(
      '<article id=' + article.id + '><div>' +
      parseMarkdown(article.content) +
      '</div></article>'
    )
  }
}

function writeOutputToFile(output) {
  fs.writeFile(program.file || 'static.html', output, function (error) {
    if (error) {
      log('Could not save file.')
    } else {
      log('Successfully saved file.')
    }
  })
}

/**
 * Tiny multi-markdown parser originally written by Mathieu Henri.
 * Added underscore syntax since ellipsis emphasis at the beginning
 * of a sentence is interpreted as a list item.
 *
 * @method
 * @see https://github.com/p01/mmd.js
 * @param {String} source - Markdown source to parse into HTML
 * @returns {String} HTML output
 */
function parseMarkdown(source) {
  var h = ''

  function escape(t) {
    return new Option(t).innerHTML
  }
  
  function inlineEscape(s) {
    return escape(s)
      .replace(/!\[([^\]]*)]\(([^(]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)]\(([^(]+)\)/g, '$1'.link('$2'))
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/__([^*]+)__/g, '<strong>$1</strong>')
      .replace(/_([^*]+)_/g, '<em>$1</em>')
      .replace(/---/g, '&mdash;')
      .replace(/--/g, '&ndash;')
  }

  source
    .replace(/^\s+|\r|\s+$/g, '')
    .replace(/\t/g, '    ')
    .split(/\n\n+/)
    .forEach(function(b, f, R) {
      f = b[0]
      R = {
        '*': [/\n\* /, '<ul><li>', '</li></ul>'],
        '1': [/\n[1-9]\d*\.? /, '<ol><li>', '</li></ol>'],
        ' ': [/\n    /, '<pre><code>', '</pre></code>', '\n'],
        '>': [/\n> /, '<blockquote>', '</blockquote>', '\n']
      }[f]
      h += R ? R[1] + ('\n' + b)
        .split(R[0])
        .slice(1)
        .map(R[3] ? escape : inlineEscape)
        .join(R[3] || '</li>\n<li>') + R[2] :
        f == '#' ? '<h' + (f = b.indexOf(' ')) + '>' + inlineEscape(b.slice(f + 1)) + '</h' + f + '>' :
        f == '<' ? b : '<p>' + inlineEscape(b) + '</p>'
    })

  return h
}

/**
 * Entry point
 */
fs.readFile('../index.html', function (error, data) {
  if (error) {
    log('Could not read file.')
  } else {
    generateFromInput(data)
  }
})