Polestar
========

**Note:** The previous, blogging capable version of Polestar is available in the "blogging" branch. This version is minimized and optimized for authoring small sites, such as a project page.

Polestar is a tiny (1.5 kB minified and compressed) Markdown site authoring tool in JavaScript—GitHub flavored and fully client-side. It pulls partials locally or from a specified GitHub repository. If the partial is a Markdown file, it will be parsed using the GitHub API.

It's great for super-quick GitHub Pages sites (default styles are included), rendering README's and whatnot. However, keep in mind that the content cannot be indexed by search engines.

## Usage

Simply specify a file path in an element's `data-at` attribute, and the contents will be loaded into that element:

```
<div data-at="README.md" class="partial"></div>
```

Run Polestar by creating an instance. To pull partials from a GitHub repository instead of local files, specify the repository with the `repo` option:

```
<script>new Polestar({ repo: 'dnordstrom/polestar' })</script>
```

Other options include `cache` to cache partials in `window.sessionStorage` (default is `true`), and `plugins`, which is an array of plugin methods to run (see below).

## Example

This repository is an example site that uses Polestar to load this README and the sample.md Markdown file. See `index.html`.

Polestar itself can be found at `polestar/polestar.js`, and the default styles at `polestar/polestar.css`. A plugin to enhance typography is also included.

## Plugins

Polestar plugins are just functions that are called with the Polestar instance as only argument. That instance has `on()`, `off()`, and `emit()` methods for publishing and subscribing to events.

For example, the included `Polestar.Typogr` plugin subscribes to `render` to enhance typography of rendered partials. The following nonsense plugin alerts a message when a partial is rendered:

```
Polestar.Alert = function (polestar) {
  polestar.on('render', function (partial) {
    alert('A partial was rendered')
  })
}
```

You tell Polestar to use plugins by adding them to the `plugins` option:

```
<script>
  new Polestar({
    repo: 'dnordstrom/polestar',
    plugins: [
      Polestar.Alert,
      Polestar.Typogr
    ]
  })
</script>
```

**Events:**
- `initialize` receives no data.
- `render` receives `partial { at, content, element }`