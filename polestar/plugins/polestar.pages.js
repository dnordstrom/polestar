/**
 * Adds functionality to open content as pages by using `data-at`
 * attributes on anchors. For example, for an about page, we may use
 * `<a href="pages/about.md" data-page="pages/about">About</a>`. Now,
 * as it's already in `href`, we may omit the file from `data-page`:
 * `<a href="pages/about.md" data-page>About</a>`
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Polestar.Pages = (function () {
  var self = this

  /**
   * Appends an error message layer to the page.
   *
   * @method
   * @param {String} message Error message to display
   */
  self.displayPage = function (message) {
    var element = document.createElement('div')
    var heading = document.createElement('h1')
    var paragraph = document.createElement('p')
    var closeLink = document.createElement('a')

    closeLink.setAttribute('class', 'close')
    closeLink.appendChild(document.createTextNode('Close'))
    closeLink.onclick = function (event) {
      event.preventDefault()

      document.body.removeChild(element)
    }

    element.setAttribute('class', 'error')
    element.appendChild(heading)
    element.appendChild(paragraph)
    element.appendChild(closeLink)
    heading.appendChild(document.createTextNode(self.messages.error))
    paragraph.appendChild(document.createTextNode(message))

    document.body.appendChild(element)
  }
}())