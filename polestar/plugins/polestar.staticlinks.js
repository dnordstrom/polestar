/**
 * This is a variation of the Permalinks plugin, adding links instead
 * to static versions of articles (assuming they are located in a
 * `/static` subdirectory). It should later be possible to specify
 * this directory, of course.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Polestar.Staticlinks = function (polestar) {
  polestar.on('articleRendered', function (data) {
    var permalink = document.createElement('a')

    if (data.article.meta && data.article.meta.permalink) {
      permalink.appendChild(
        document.createTextNode(data.article.meta.permalink)
      )
    } else {
      permalink.appendChild(document.createTextNode('#'))
    }

    permalink.setAttribute('class', 'staticlink')
    permalink.setAttribute('href', 'static/' + data.article.id + '.md')
    data.article.element.appendChild(permalink)
  })
}