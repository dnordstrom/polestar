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

/**
 * This function is called for each article, in the context of the
 * object representing the article. This object has properties for
 * the ID (`id`), content (`content`), and HTML node (`element`).
 *
 * @method
 */
Polestar.HoverLists = {
  afterRender: function () {
    var lists = this.element.querySelectorAll('li')

    for (var i = 0; i < lists.length; ++i) {
      if (lists[i].innerHTML.match(/<br>/)) {
        var parts = lists[i].innerHTML.split('<br>')
        parts[0] =
          '<div class="hoverlist-heading">' + parts[0] + '</div>'
        parts[1] = '<div class="hoverlist-body">' + parts[1]
        parts[parts.length - 1] = parts[parts.length - 1] + '</div>'

        lists[i].innerHTML = parts.join('')
      }
    }
  }
}