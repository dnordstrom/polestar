/**
 * Adds CSS classes for styling list items with `<br>` tags
 * separating headings and body text.
 *
 * The following list item:

 * ```
 * <li>
 *   List Item
 *   <br>
 *   List item body text.
 * </li>
 * ```
 *
 * ...will be turned into this, which is easier to style:

 * ```
 * <li>
 *   <div class="hoverlist-heading">List Item</div>
 *   <div class="hoverlist-body">List item body text.</div>
 * </li>
 * ```
 *
 * @author  L. Daniel Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Polestar.HoverLists = function (polestar) {
  polestar.on('articleRendered', function (data) {
    var lists = data.article.element.querySelectorAll('li')

    for (var i = 0, length = lists.length; i < length; ++i) {
      if (lists[i].innerHTML.match(/<br>/)) {
        var parts = lists[i].innerHTML.split('<br>')
        parts[0] =
          '<div class="hoverlist-heading">' + parts[0] + '</div>'
        parts[1] = '<div class="hoverlist-body">' + parts[1]
        parts[parts.length - 1] = parts[parts.length - 1] + '</div>'

        lists[i].innerHTML = parts.join('')
      }
    }
  })
}