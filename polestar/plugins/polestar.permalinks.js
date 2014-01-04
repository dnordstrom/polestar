/**
 * Adds simple hash mark permalinks to Polestar articles.
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
Polestar.Permalinks = {
  afterRender: function () {
    var permalink = document.createElement('a')
    permalink.setAttribute('class', 'permalink')
    permalink.setAttribute('href', '#' + this.id)
    permalink.appendChild(document.createTextNode('#'))
    this.element.appendChild(permalink)
  }
}