/**
 * Adds simple hash mark permalinks to Polestar articles, or uses the
 * link text specified in "permalink" in the JSON Front Matter.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Polestar.Permalinks = function (polestar) {
  polestar.on('articleRendered', function (data) {
    var permalink = document.createElement('a')

    if (data.article.meta && data.article.meta.permalink) {
      permalink.appendChild(
        document.createTextNode(data.article.meta.permalink)
      )
    } else {
      permalink.appendChild(document.createTextNode('#'))
    }

    permalink.setAttribute('class', 'permalink')
    permalink.setAttribute('href', '#' + data.article.id)
    data.article.element.appendChild(permalink)
  })
}