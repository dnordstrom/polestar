#!/usr/bin/env node
/**
 * Static site generator for Polestar.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.0.1
 * @license MPL 2.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var typogr = {
  typogrify: function (input) {
    var re_skip_tags =
      /<(\/)?(pre|code|kbd|script|math|title)[^>]*>/i;
      
    var re = function (regexp, flag) {
      return new RegExp(regexp, flag);
    };

    /**
     * Translates plain ASCII punctuation characters into
     * "smart" typographic punctuation HTML entities.
     */
    var smartypants = function(text) {
      var tokens = tokenize(text)
        , result = []
        , skipped_tag_stack = []
        , skipped_tag = ''
        , skip_match = ''
        , in_pre = false
        , prev_token_last_char = ''
        , last_char
        , t;

      tokens.forEach( function (token) {
        if (token.type === 'tag') {
          // Don't mess with quotes inside some tags.
          // This does not handle self <closing/> tags!
          result.push(token.txt);

          // is it a skipped tag ?
          if ( (skip_match = re_skip_tags.exec(token.txt)) !== null ) {
            skipped_tag = skip_match[2].toLowerCase();

            // closing tag
            if ( skip_match[1] ) {
              if ( skipped_tag_stack.length > 0 ) {
                if ( skipped_tag === skipped_tag_stack[skipped_tag_stack.length-1] ) {
                  skipped_tag_stack.pop();
                }
              }
              if (skipped_tag_stack.length === 0) {
                in_pre = false;
              }
            }
            // opening tag
            else {
              skipped_tag_stack.push(skipped_tag);
              in_pre = true;
            }
          }
        } else {
          t = token.txt;
          // Remember last char of this token before processing
          last_char = t.slice(-1);

          if ( !in_pre ) {
            t = smartEscapes(t);
            t = smartDashes(t);
            t = smartEllipses(t);
            // backticks need to be processed before quotes
            t = smartBackticks(t);
            // quotes
            switch(t) {
              case "'": // Special case: single-character ' token
                if (/\S/.test(prev_token_last_char)) { t = '&#8217;'; }
                                                else { t = '&#8216;'; }
                break;
              case '"': // Special case: single-character " token
                if (/\S/.test(prev_token_last_char)) { t = '&#8221;'; }
                                                else { t = '&#8220;'; }
                break;
              default: // Normal case
                t = smartQuotes(t);
            }
          }

          prev_token_last_char = last_char;
          result.push(t);
        }
      });

      return result.join('');
    };

    /**
     * Returns an array of the tokens comprising the input string.
     * Each token is either a tag (possibly with nested, tags contained
     * therein, such as <a href="<MTFoo>">, or a run of text between
     * tags. Each element of the array is an object with properties
     * 'type' and 'txt';
     *
     * Values for 'type': 'tag' or 'text'; 'txt' is the actual value.
     */
    var tokenize = function(text) {
      var tokens = []
        , lastIndex = 0
        , re_tag = /([^<]*)(<[^>]*>)/gi
        , curr_token;

      while ( (curr_token = re_tag.exec(text)) !== null ) {
        var pre_text = curr_token[1]
          , tag_text = curr_token[2];

        if (pre_text) {
          tokens.push({ type: 'text', txt: pre_text });
        }
        tokens.push({ type: 'tag', txt: tag_text });
        lastIndex = re_tag.lastIndex;
      }

      if (re_tag.lastIndex <= text.length) {
          // if last char is a dot and not a '…'
          // then push two tokens
          if (text.slice(-1) == "." && text.slice(-2) != '..' ) {
            tokens.push({ type: 'text', txt: text.slice(lastIndex, text.length-1) });
            tokens.push({ type: 'text', txt: text.slice(-1) });
          }
          else {
            tokens.push({ type: 'text', txt: text.slice(lastIndex) });
          }
      }

      return tokens;
    };

    /**
     * Returns input string, with after processing the following
     * backslash escape sequences. This is useful if you want to force a
     * "dumb" quote or other character to appear.
     */
    var smartEscapes = function(text) {
      return text.replace(/\\"/g, '&#34;')
                 .replace(/\\'/g, '&#39;')
                 .replace(/\\-/g, '&#45;')
                 .replace(/\\\./g, '&#46;')
                 .replace(/\\\\/g, '&#92;')
                 .replace(/\\`/g, '&#96;');
    };

    /**
     * Returns input text, with each instance of "--"
     * translated to an em-dash HTML entity.
     */
    var smartDashes = function(text) {
      return text.replace(/---/g, '&#8212;') // em (yes, backwards)
                 .replace(/--/g, '&#8211;'); // en (yes, backwards)
    };

    /**
     * Returns input string, with each instance of "..."
     * translated to an ellipsis HTML entity.
     */
    var smartEllipses = function(text) {
      return text.replace(/\.\.\./g, '&#8230;')
                 .replace(/\. \. \./g, '&#8230;');
    };

    /**
     * Returns input string, with ``backticks'' -style double quotes
     * translated into HTML curly quote entities.
     */
    var smartBackticks = function(text) {
      return text.replace(/``/g, '&#8220;')
                 .replace(/''/g, '&#8221;');
    };


    /**
     * Returns input string, with "educated" curly quote
     * HTML entities.
     */
    var smartQuotes = function(text) {
      var punct_cls = '[!"#\\$\\%\\\'()*+,-.\\/:;<=>?\\@\\[\\\\]\\^_`{|}~]'
        , re_punct_str = '(?=%s\\B)'.replace('%s', punct_cls)
        , close_cls = '[^\\ \\t\\r\\n\\[\\{\\(\\-]'
        , dec_dashes = '&#8211;|&#8212;'
        , re_opening_single_quotes = re(
            '('+
                        '\\s|'+ // a whitespace char, or
                     '&nbsp;|'+ // a non-breaking space entity, or
                         '--|'+ // dashes, or
                 '&[mn]dash;|'+ // named dash entities
              dec_dashes + '|'+ // or decimal entities
               '&#x201[34];'+ // or hex
            ')'+
            '\''+ // the quote
           '(?=\\w)', 'g') // followed by a word character
        , re_closing_single_quotes = re(
            '('+close_cls+')'+
            '\''+ // *
            '(?!\\s | s\\b | \\d)' , 'g') // ??? may be: '(?!\s | \s\b | \d)'
        , re_closing_single_quotes2 = re(
            '('+close_cls+')'+
            '\''+ // *
            '(?!\\s | s\\b)', 'g') // ??? may be: '(?!\s | \s\b)'
        , re_opening_double_quotes = re(
            '('+
                        '\\s|'+ // a whitespace char, or
                     '&nbsp;|'+ // a non-breaking space entity, or
                         '--|'+ // dashes, or
                 '&[mn]dash;|'+ // named dash entities
              dec_dashes + '|'+ // or decimal entities
               '&#x201[34];'+ // or hex
            ')'+
            '"'+ // the quote
            '(?=\\w)', 'g') // followed by a word character
        , re_closing_double_quotes = re('"(?=\\s)' , 'g')
        , re_closing_double_quotes2 = re('('+close_cls+')"', 'g');

      return text
          // Special case if the very first character is a quote
          // followed by punctuation at a non-word-break.
          // Close the quotes by brute force:
          .replace(re("^'%s".replace('%s', re_punct_str), 'g'), '&#8217;')
          .replace(re('^"%s'.replace('%s', re_punct_str), 'g'), '&#8221;')

          // Special case for double sets of quotes, e.g.:
          // <p>He said, "'Quoted' words in a larger quote."</p>
          .replace(/"'(?=\w)/g, '&#8220;&#8216;')
          .replace(/'"(?=\w)/g, '&#8216;&#8220;')

          // Special case for decade abbreviations (the '80s):
          .replace(/\b'(?=\d{2}s)/g, '&#8217;')

          // Opening single quotes
          .replace(re_opening_single_quotes, '$1&#8216;')
          // Closing single quotes
          .replace(re_closing_single_quotes, '$1&#8217;')
          .replace(re_closing_single_quotes2,'$1&#8217;$2')
          // Any remaining single quotes should be opening ones
          .replace("'", '&#8216;')

          // Opening double quotes
          .replace(re_opening_double_quotes, '$1&#8220;')
          // Closing double quotes
          .replace(re_closing_double_quotes, '&#8221;')
          .replace(re_closing_double_quotes2,'$1&#8221;')
          // Any remaining quotes should be opening ones.
          .replace('"', '&#8220;');
    };

    return smartypants(input)
  }
}

var cheerio = require('cheerio')
var program = require('commander')
var request = require('request')
var RSS = require('rss')
var fs = require('fs')

program.option('-r, --repo <repo>', 'GitHub repository')
program.option('-b, --branch <branch>', 'GitHub branch')
program.option('-u, --username <username>', 'GitHub username')
program.option('-p, --password <password>', 'GitHub password')
program.option('-i, --input <input>', 'input directory')
program.option('-o, --output <output>', 'output directory')
program.option('-s, --site <site>', 'site URL')
program.option('-i, --into <into>', 'writings container')
program.option('-n, --numberofitems <numberofitems>', 'feed items')
program.version('0.0.1')
program.parse(process.argv)

var loadedArticles = []
var indexFile = false
var inputDirectory = program.input
var outputDirectory = program.output
var siteURL = program.site
var numberOfFeedItems = parseInt(program.numberofitems) || 10

if (inputDirectory.slice(-1) !== '/') {
    inputDirectory = inputDirectory + '/'
}

if (outputDirectory.slice(-1) !== '/') {
    outputDirectory = outputDirectory + '/'
}

if (siteURL.slice(-1) !== '/') {
    siteURL = siteURL + '/'
}

function generateFromInput(input) {
  indexFile = cheerio.load(input)

  indexFile('*[data-at]').each(function (index, element) {
    var path = indexFile(element).attr('data-at')
    var content = fs.readFileSync(inputDirectory + path + '.md').toString()

    !(function (element, path, content) {
      var options = {
        body: content,
        method: 'POST',
        url: 'https://api.github.com/markdown/raw',
        auth: {
          'username': program.username,
          'password': program.password
        },
        headers: {
          'Content-Type': 'text/x-markdown',
          'User-Agent': 'polestar'
        }
      }

      request(options, function (error, response, body) {
        indexFile(element).html(typogr.typogrify(body))
      })
    }(element, path, content))
  })

  var parts = program.repo.split('/')
  var repository = parts.slice(0, 2).join('/')
  var dir = (parts.length > 2 ? '/' + parts.slice(2).join('/') : '')
  var url = 'https://api.github.com/repos/' + repository +
      '/contents' + dir + '?ref=' + (program.branch || 'master')
  var options = {
    url: url,
    auth: {
      'username': program.username,
      'password': program.password
    },
    headers: {
      'User-Agent': 'polestar'
    }
  }

  /**
   * Repository contents request
   */
  request(options, function (error, response, body) {
    var articles = JSON.parse(body).filter(function (article) {
      return article.type === "file";
    }).reverse()

    for (var i = 0; i < articles.length; ++i) {
      var file = articles[i].name

      !(function (index, id) {
        /**
         * File contents request
         */
        var options = {
          url: articles[i].url,
          auth: {
            'username': program.username,
            'password': program.password
          },
          headers: {
            'Accept': 'application/vnd.github.v3.raw',
            'User-Agent': 'polestar'
          }
        }

        request(options, function (error, response, body) {
          /**
           * Markdown request
           */
          var options = {
            body: body,
            method: 'POST',
            url: 'https://api.github.com/markdown/raw',
            auth: {
              'username': program.username,
              'password': program.password
            },
            headers: {
              'Content-Type': 'text/x-markdown',
              'User-Agent': 'polestar'
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
        })
      }(i, file.substr(0, file.lastIndexOf('.')) || file))
    }
  })
}

function renderArticles() {
  /* `indexFile` has the partials parsed and ready, so we grab the
   * HTML before we start appending writings to it, and use that to
   * create single article pages. */
  var inputHTML = indexFile.html()
  var feed = new RSS({
    title: indexFile('title').html(),
    description: indexFile('meta[name="description"]').attr('content'),
    generator: 'Polestar Static Generator',
    author: indexFile('meta[name="author"]').attr('content'),
    feed_url: siteURL + outputDirectory + 'feed.xml',
    site_url: siteURL
  })

  for (var i = 0; i < loadedArticles.length; ++i) {
    var article = loadedArticles[i]
    var articleFile = cheerio.load(inputHTML)
    var permalink =
      '<a href="' + article.id + '.html" class="permalink">#</a>'
    var articleHTML =
      '<article id=' + article.id + '>' +
      permalink +
      '<div>' +
      typogr.typogrify(article.content) +
      '</div></article>'

    if (i < numberOfFeedItems) {
      var articleMarkup = cheerio.load(article.content)
      var articleDateMatches =
        /^(\d{4})-?(\d{2})-?(\d{2}).+/.exec(article.id)
      
      if (articleDateMatches) {
        articleDate = articleDateMatches.splice(1).join('-')
      } else {
        articleDate = '1970-01-01'
      }

      if (articleMarkup('h1')) {
        var articleTitle = articleMarkup('h1').text()
      } else {
        var articleTitle = articleMarkup.text()

        if (articleTitle.length > 25) {
          articleTitle = articleTitle.substr(0, 25) + '...'
        }
      }

      feed.item({
        title: articleTitle,
        description: article.content,
        url: siteURL + outputDirectory + article.id + '.html',
        date: articleDate
      })
    }

    articleFile('.writings').html(articleHTML)
    indexFile('.writings').append(articleHTML)

    writeOutputToFile(articleFile.html(), article.id + '.html')
  }

  writeOutputToFile(indexFile.html(), 'index.html')
  writeOutputToFile(feed.xml(), 'feed.xml')
}

function writeOutputToFile(output, file) {
  fs.writeFile(outputDirectory + file, output, function (error) {
    if (error) {
      console.log(
        'Could not save file: "' + outputDirectory + file + '"'
      )
    } else {
      console.log(
        'Successfully saved file: "' + outputDirectory + file + '"'
      )
    }
  })
}

/**
 * Entry point
 */
fs.readFile(inputDirectory + 'static.html', function (error, data) {
  if (error) {
    console.log('Could not read index.html file.')
  } else {
    generateFromInput(data)
  }
})