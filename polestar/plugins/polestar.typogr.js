/**
 * Uses functions from Eugene Kalinin's typogr.js to improve
 * typography. Repeated dashes are turned into en-dashes and em
 * dashes, straight quotes are turned into curly quotes, and so on.
 * Typogr.js is smart; it does not touch contents of tags such as
 * `<pre>` or `<code>`.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * This function is called for each article, in the context of the
 * object representing the article. This object has properties for
 * the ID (`id`), content (`content`), and HTML node (`element`).
 *
 * @method
 */
Polestar.Typogr = {
  beforeRender: function () {
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

    this.content = smartypants(this.content)
  }
}