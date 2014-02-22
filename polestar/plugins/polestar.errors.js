/**
 * Appends an error element to the page when something goes wrong,
 * with a title and a message.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Polestar.Errors = function (polestar) {
  polestar.on('error', function (data) {
    var element = document.createElement('div')
    var heading = document.createElement('h1')
    var paragraph = document.createElement('p')

    element.setAttribute('class', 'error')
    element.appendChild(heading)
    element.appendChild(paragraph)
    heading.appendChild(
      document.createTextNode('Something just went horribly wrong')
    )
    paragraph.appendChild(
      document.createTextNode(data.message)
    )

    document.body.appendChild(element)
  })
}