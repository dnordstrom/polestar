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
  var instance = false

  /**
   * Appends an page layer to the page and returns container node.
   *
   * @method
   * @param {String} content Page content as HTML
   * @returns {DOMNode} Container node appended to body node
   */
  function renderPage(content) {
    var element = document.createElement('div')
    var innerElement = document.createElement('div')
    var closeLink = document.createElement('a')

    closeLink.setAttribute('class', 'page-close-link')
    closeLink.setAttribute('href', '#')
    closeLink.appendChild(document.createTextNode('+'))
    closeLink.onclick = function (event) {
      event.preventDefault()

      document.body.removeChild(element)
    }

    innerElement.innerHTML = content
    innerElement.setAttribute('class', 'page-inner')
    element.setAttribute('class', 'page')
    element.appendChild(innerElement)
    element.appendChild(closeLink)

    document.body.appendChild(element)

    setTimeout(function () {
      element.setAttribute('class', 'page page-visible')
    }, 50)

    return element
  }

  function bindLinksInContainer(container) {
    var links = container.querySelectorAll('a[href^="#!"]')

    for (var i = 0; i < links.length; ++i) {
      var link = links[i]
      var at = link.getAttribute('href').split('#!')[1]
      var id = link.getAttribute('id')

      !(function (link, at, id) {
        link.onclick = function (event) {
          event.preventDefault()

          instance.getURL({ url: at + '.md' }, function (response) {
            instance.parseMarkdown(response.body, function (content) {
              var page = {
                at: at,
                content: content,
                id: ''
              }
              
              instance.runPlugins('beforeRender', page)
              page.element = renderPage(content)
              instance.runPlugins('afterRender', page)
            })
          })
        }
      }(link, at, id))
    }
  }

  self.beforeAll = function (polestar) {
    instance = polestar
    bindLinksInContainer(document)
  }

  self.afterRender = function (polestar, writing) {
    instance = polestar
    bindLinksInContainer(writing.element)
  }

  return self
}())