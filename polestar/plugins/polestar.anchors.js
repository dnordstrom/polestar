/**
 * Adds anchors to headings in Polestar articles. Only works
 * effectively on first article unless the `loadAll` preference is set
 * to `true` (otherwise, the article containing the anchor may not
 * have loaded and thus the location hash will not work).
 *
 * The anchor is unstyled, but you may easily use an icon font (such
 * as Font Awesome) to get a nice icon like the ones you see on GitHub.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.0.1
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
Polestar.Anchors = {
  afterRender: function () {
    /**
     * Turns a piece of text into a so called "slug": lowercase, spaces * replaced with hyphens.
     *
     * @method
     */
    function slugify(text) {
      return text
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g,'-')
    }

    /**
     * Adds an ID attribute and an anchor to the given list of nodes.
     *
     * @method
     * @param {NodeList/Array} headings List of heading nodes.
     */
    function processHeadings(headings) {
      for (var i = 0; i < headings.length; ++i) {
        var heading = headings[i]
        var slug = slugify(heading.textContent)
        var link = document.createElement('a')

        link.setAttribute('href', '#' + slug)
        link.setAttribute('class', 'anchor')
        heading.setAttribute('id', slug)
        heading.appendChild(link)
      }
    }

    processHeadings(this.element.querySelectorAll('h1'))
    processHeadings(this.element.querySelectorAll('h2'))
  }
}