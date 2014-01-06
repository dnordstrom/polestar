Polestar
========

Polestar is a tiny Markdown site authoring and blogging tool in JavaScript—GitHub flavored and fully client-side. It's currently around 600 lines fully commented and wrapped hard at 70 columns. It should preferably weigh in at no more than 500 lines.

This repository is an example copy of [my own blog](https://github.com/dnordstrom/mrnordstrom.com), so if you're interested, take a look at `index.html` for usage, `polestar/polestar.js` for the source, or [mrnordstrom.com](https://mrnordstrom.com) to see it in the wild.

**This is alpha software**—some things may not work, other things will definitely change. This README (and other documentation) is a quickly put together work in progress.**

Features
--------

- Load writings from GitHub, and partials from local files
- Specify GitHub repository, branch, and directory
- Markdown parsed by GitHub API
- Articles autoload on scroll (can be disabled)
- Articles linkable despite dynamic loading (e.g. `example.com#the-filename` loads next until reaching article in location hash)
- Caching in sessionStorage (avoid GitHub API rate-limit)
- Preview local, unpublished article using "draft" preference (e.g. `draft: 'writings/20140106-new-article'`)
- Plugins (with `beforeRender` or `afterRender` methods)
- Example plugins included
- Example site included (with theme)

Polestar has no dependencies, but requires a browser that supports things like `XMLHttpRequest` and `document.querySelector`.

**Note:** When previewing a local article, keep in mind GitHub's rate limit of 60 unauthenticated requests per hour (the API will be used to parse the Markdown).

Usage
-----

The following is used on my blog to load writings from the `writings` subdirectory of the GitHub Pages branch of `dnordstrom/mrnordstrom.com`, and append them to the element with the class "writings":

    <script>
      new Polestar({
        repo: 'dnordstrom/mrnordstrom.com/writings',
        branch: 'gh-pages',
        into: '.writings',
        plugins: [Polestar.Mailto, Polestar.Permalinks, Polestar.Typogr]
      })
    </script>

To render a local partial, specifying the Markdown file (without the file extension) in the element's `data-at` attribute:

    <header data-at="about" class="about">
      <!-- Renders /about.md here -->
    </header>

You may, of course, specify a subdirectory as well: `data-at="partials/about"`

Roadmap
-------

* **~~Draft preview feature~~**<br>This could be a `draft: 'writings/a-new-article'` preference to preview a local article not yet commited, and exclude it from caching.<br>**Updated 1/6/2014:** This is now possible, but it adds unnecessary production weight---around 40 lines---and shall thus be refactored into a plugin.
* **Date feature**<br>The permalink plugin should check for dates in filenames (e.g. `20130106-an-article.md`), and show those instead of the hash mark---or, a new plugin may parse such dates and do something fun with them.
* **Markdown parser feature**<br>Because the GitHub API parser strips away useful tags like `small`, `cite`, and `figure`, it should be possible to choose your own parser or disable parsing altogether (to use a plugin or other solution).
* **YAML Front Matter feature**<br>This YAML data can be outputted in classes (`class="tag-one tag-two"`) or data-attributes (`data-tagone="value"`), giving more flexibility to plugins and styling.
* **Error handling**<br>Exceptions, pretty messages, console output, you name it---the real deal.
* **Plugin mechanism**<br>Make it smarter. Add methods as necessary---a drafts plugin could run `onReady`. Refactor to avoid `Function#call()`, and offer some interfacing with the Polestar instance.
* **Local version**<br>Create a smaller version of Polestar for rendering only local files, with no GitHub support. The example site will be a quick drop-in solution for rendering a README.md file.
* **Default theme**<br>Improve default theme with better structured CSS.