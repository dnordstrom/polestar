/**
 * Reverses email addresses in mailto links to prevent spam. For
 * example, `<a href="mailto:moc.mortsdronrm@d">` will magically turn
 * into `<a href="mailto:d@mrnordstrom.com">`.
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Polestar.Mailto = function (polestar) {
  polestar.on(['articleRendered', 'partialRendered'], function (data) {
    var object = data.article || data.partial
    var links = object.element.querySelectorAll('a[href^="mailto:"]')

    for (var i = 0; i < links.length; ++i) {
      var address = links[i].getAttribute('href').split(':')[1]
      var newLink = 'mailto:' + address.split('').reverse().join('')

      links[i].setAttribute('href', newLink)
    }
  })
}