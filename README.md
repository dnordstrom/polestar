Polestar
========

Polestar is a tiny Markdown site authoring and blogging tool in JavaScript—GitHub flavored and fully client-side. It's currently about 7 kB minified, and around 600 lines fully commented and wrapped hard at 70 columns. It should preferably weigh in at no more than that.

Polestar itself can be found at `polestar/polestar.js`. The latest version is always in use at [mrnordstrom.com](https://github.com/dnordstrom/mrnordstrom.com).

**This is alpha software.** Some things may not work and others will definitely change. The documentation is a quickly put together work in progress.

*Since much of the information in this README made its original appearance in the introductory post at [mrnordstrom.com](http://mrnordstrom.com), this copy is admittedly a blatant copy.*

Notable Notes
-------------

- **Minification Script**<br>1/8/2014 &middot; Added a Node.js-based minification script at `polestar/tools/polestar.minify.js` (see usage below).
- **Syntax Highlighting**<br>1/8/2014 &middot; The CSS now includes stylish GitHub-style styling of code blocks&mdash;just [specify the language](https://help.github.com/articles/github-flavored-markdown#syntax-highlighting).
- **GitHub Credentials**<br>1/8/2014 &middot; You may now *increase the GitHub API rate limit from 60 to 5000 requests* by specifying your credentials in "username" and "password" debug parameters (immensely useful during preview and development), as such: `example.com#!username=dnordstrom&password=whatever`
- **Static Site and Feed Generator**<br>1/6/2014 &middot; An early alpha is available at `polestar/tools/polestar.static.js`. It's a quick and dirty Node.js-based command line tool I use to generate a feed.xml file and search engine indexable HTML versions of posts in a `/static` subdirectory of my site. It needs a gigantic drop of miserably heart-straining work before it's a beta.

Featured Features
-----------------

- **Writings and Partials**<br>Writings are pulled from GitHub, partials from local files.
- **Repository, Branch, and Directory**<br>Writings may be loaded from a specific branch and subdirectory.
- **GitHub Flavored Markdown**<br>Markdown is parsed by the GitHub API.
- **Autoload on Scroll**<br>Setting `loadAll: true` instead loads all writings on page load.
- **Linking**<br>Writings are linkable using location hash, despite their dynamic loading. For instance, "example.com#the-filename" loads each writing until reaching "the-filename.md" (but only if it exists).
- **Caching**<br>Writings are cached in sessionStorage to avoid unnecessary requests and the GitHub API rate limit.
- **Previewing**<br>Preview a local, unpublished writing using the "draft" preference (`draft: 'writings/new-article'`). It won't be cached.
- **Plugins**<br>These are currently objects with `beforeRender` or `afterRender` methods that are called for each writing and partial. The mechanism will be improved.
- **Debug Mode and Parameters**<br>Set debug parameters with a location hashbang. Use the "debug" key to enable console output. While previewing, set GitHub credentials with "username" and "password" to increase the rate limit from 60 to 5000. For example: "http://localhost:8000#!username=me&password=gosh&debug"
- **Example Plugins**
- **Example Site and Theme**

Polestar has no dependencies, but requires a browser that supports things like `XMLHttpRequest` and `document.querySelector`.

**Note:** When previewing a local article, keep in mind GitHub's rate limit of 60 unauthenticated requests per hour unless you use your credentials (the API is used to parse the Markdown on each page load).

Useful Usage
------------

The following tells Polestar to parse files in the `writings` subdirectory of the GitHub Pages branch of `dnordstrom/polestar`, and append the results to the element with the class "writings":

```html
<script>
  new Polestar({
    repo: 'dnordstrom/polestar/writings',
    branch: 'gh-pages',
    into: '.writings',
    plugins: [
      Polestar.Mailto,
      Polestar.Permalinks,
      Polestar.Typogr
    ]
  })
</script>
```

To render a local partial, specifying the Markdown file (without the file extension) in the element's `data-at` attribute:

```html
<header data-at="about" class="about">
  <!-- Renders /about.md here -->
</header>
```

You may, of course, specify a subdirectory as well: `data-at="partials/about"`

**To preview changes or writings locally**, use any web server (just opening the HTML file won't allow Polestar to request content). For Mac users, or anyone with Python installed, the easiest way is to use Python's built-in server by running the following command from the site's directory:

```
python -m SimpleHTTPServer
```

While far from ready for general use, the following is the command I personally use to run the static site and feed generator (note that details for the RSS feed are also fetched from meta tags in `index.html`):

```
./polestar/tools/polestar.static.js --output static --input . --branch gh-pages --repo dnordstrom/mrnordstrom.com/writings --username dnordstrom --password ****** --site http://mrnordstrom.com
```

The minification script makes your eyes bleed considerably less. It sports a single `--polestar` flag for pointing to the directory of `polestar.js` and `polestar.css`, which can be omitted as it defaults to (you guessed it) `polestar/`: 

```
$ ./polestar/tools/polestar.minify.js
Successfully minified Polestar's JavaScript.
Successfully minified Polestar's CSS.
```

Planned Plans
-------------

* **Refactoring**<br>Refactor as much as possible into plugins to keep things modular and lightweight.
* **Date feature**<br>The permalink plugin should check for dates in filenames (e.g. `20130106-an-article.md`), and show those instead of the hash mark---or, a new plugin may parse such dates and do something fun with them.
* **Markdown parser feature**<br>Because the GitHub API parser strips away useful tags like `small`, `cite`, and `figure`, it should be possible to choose your own parser or disable parsing altogether (to use a plugin or other solution).
* **YAML Front Matter plugin**<br>The data can be used as classes (`class="tag-one tag-two"`) or data-attributes (`data-tagone="value"`), giving more flexibility to plugins and styling.
* **Pages plugin**<br>This may simply be a plugin that adds functionality to open and close partials (with `data-page` attributes) as modal pages on top of other content.
* **Error handling**<br>Exceptions, pretty messages, console output, you name it---the real deal.
* **Plugin mechanism**<br>Make it smarter. Add methods as necessary---a drafts plugin could run `onReady`. Refactor to avoid `Function#call()`, and offer some interfacing with the Polestar instance.
* **Local version**<br>Create a smaller version of Polestar for rendering only local files, with no GitHub support. The example site will be a quick drop-in solution for rendering a README.md file.