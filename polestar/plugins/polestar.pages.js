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

/**
 * A plugin is an object with methods acting as "hooks," such as
 * `beforeRender()` or `afterAll()`. All methods are called with the
 * polestar instance as the first argument. Article specific method
 * like `afterRender()` are also passed an object literal
 * representation of the article, with properties such as `id`,
 * `content` (HTML content) and `element` (containing HTML node).
 *
 * @method
 */
Polestar.Pages = (function () {
  var self = this

  /**
   * Appends an error message layer to the page.
   *
   * @method
   * @param {String} content Page content as HTML
   */
  function showPage(content) {
    var element = document.createElement('div')
    var innerElement = document.createElement('div')
    var closeLink = document.createElement('a')

    closeLink.setAttribute('class', 'close')
    closeLink.appendChild(document.createTextNode('Close'))
    closeLink.onclick = function (event) {
      event.preventDefault()

      document.body.removeChild(element)
    }

    innerElement.innerHTML = content
    element.setAttribute('class', 'page')
    element.appendChild(innerElement)
    element.appendChild(closeLink)

    document.body.appendChild(element)
  }
}())