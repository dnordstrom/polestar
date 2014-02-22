/**
 * Loads a local article, specified as "preview" in the preferences,
 * and prepends it to the container (i.e., before other articles).
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Polestar.Preview = function (polestar) {
  polestar.on('initialize', function () {
    if (polestar.getPreferences().preview) {
      var article = {}
      var at = polestar.getPreferences().preview
      var id = at.split('/')[at.split('/').length - 1].split('.')[0]
      var url = at

      polestar.request({ url: url }, function (response) {
        article.meta = polestar.parseJsonFrontMatter(response.body)
        article.source = polestar.removeJsonFrontMatter(response.body)
        article.at = at
        article.id = id
        article.url = url

        polestar.parseMarkdown(article.source, function (content) {
          if (content) {
            var container = polestar.getContainer()
            var firstChild = polestar.getContainer().firstChild
            var element = document.createElement('article')
            var div = document.createElement('div')

            article.element = element
            article.content = content

            polestar.emit('articleParsed', { article: article })

            div.innerHTML = content
            element.appendChild(div)
            element.setAttribute('id', id)
            article.element = element

            if (firstChild) {
              container.insertBefore(element, firstChild)
            } else {
              container.appendChild(element)
            }

            polestar.emit('articleRendered', { article: article })
          }
        }.bind(this))
      }.bind(this))
    }
  }.bind(this))
}