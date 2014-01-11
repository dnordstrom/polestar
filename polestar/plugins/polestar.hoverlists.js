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
 * A plugin is an object with methods acting as "hooks," such as
 * `beforeRender()` or `afterAll()`. All methods are called with the
 * polestar instance as the first argument. Article specific method
 * like `afterRender()` are also passed an object literal
 * representation of the article, with properties such as `id`,
 * `content` (HTML content) and `element` (containing HTML node).
 *
 * @method
 */
Polestar.HoverLists = {
  afterRender: function (polestar, writing) {
    var lists = writing.element.querySelectorAll('li')

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