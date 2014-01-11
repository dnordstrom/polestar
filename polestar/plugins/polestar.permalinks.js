/**
 * Adds simple hash mark permalinks to Polestar articles.
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
Polestar.Permalinks = {
  afterRender: function (polestar, writing) {
    var permalink = document.createElement('a')
    var dateMatches =
        /^(\d{4})-?(\d{2})-?(\d{2}).+/.exec(writing.id)
      
    if (dateMatches) {
      var monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ]

      var date = new Date(dateMatches.splice(1).join('-'))
      var dateString =
        monthNames[date.getMonth()] + ' ' +
        date.getDate() + ', ' +
        date.getFullYear()

      permalink.appendChild(document.createTextNode(dateString))
    } else {
      permalink.appendChild(document.createTextNode('#'))
    }

    permalink.setAttribute('class', 'permalink')
    permalink.setAttribute('href', '#' + writing.id)
    writing.element.appendChild(permalink)
  }
}