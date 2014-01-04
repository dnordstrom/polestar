Polestar
========

Polestar is a tiny Markdown site authoring and blogging tool in JavaScript—GitHub flavored and fully client-side. It's currently around 550 lines fully commented and wrapped hard at 70 columns.

This repository is an example copy of [my own blog](https://github.com/dnordstrom/mrnordstrom.com), so if you're interested, take a look at `index.html` for usage, `polestar/polestar.js` for the source, or [mrnordstrom.com](https://mrnordstrom.com) to see it in the wild.

**This is alpha software**—some things may not work, other things will definitely change. This README (and other documentation) is a quickly put together work in progress.**

Features
--------

It's task is to remain tiny at all cost, while simply loading Markdown content from a specified GitHub repository, directory, and branch (the content is currently parsed using the GitHub API). By default, it autoloads more content on scroll, and if the location hash points to an existing article, it autoloads each until reaching it (to make it possible to link to specific articles despite dynamic loading).

Caching in sessionStorage is used to avoid hitting the GitHub API rate-limit. Simple per-article plugins are available: objects with `beforeRender` or `afterRender` methods that are called in the context of the object representation of each article.

Examples of such plugins can be found in the `polestar/plugins` directory—such as Polestar.Mailto, which reverses mailto addresses to prevent spam (allowing you to use `mailto:moc.em@em` in place of `mailto:me@me.com`).

Roadmap
-------

* Markdown parser preference: GitHub API's parser strips away tons of useful HTML (e.g. `small`, `cite`, and `figure`)—it should be possible to plug in your favorite parser or disable parsing altogether (to parse "manually," or in a plugin).