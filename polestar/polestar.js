/**
 * Polestar is a tiny Markdown site authoring and blogging tool in
 * JavaScript---GitHub flavored and fully client-side.
 *
 * @author    0.0.1
 * @version   L. D. Nordstrom <d@mrnordstrom.com>
 * @license   MPL 2.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * @class
 * Global Polestar constructor.
 *
 * @param {Object} preferences User defined preferences
 */ 
function Polestar(preferences) {
  // Self reference as closures change scope; use instead of `this`
  var self = this

  /**
   * @property {Object} preferences Polestar preferences
   * @property {String} preferences.into Element to append articles to
   * @property {String} preferences.repo GitHub repository
   * @property {String} preferences.branch GitHub branch
   * @property {Boolean} preferences.loadAll Load all on page load
   * @property {Boolean} preferences.permalinks Display '#' permalinks
   * @property {Array} preferences.plugins Plugins to run
   */
  self.preferences = applyPreferencesToDefaults(preferences, {
    into: 'body',
    repo: false,
    branch: 'master',
    loadAll: false,
    plugins: false
  })

  /** Holds element into which articles are rendered */
  self.container = false

  /** Holds repository contents as returned from GitHub */
  self.articlesMetaData = []
  
  /** Holds ETag for repository contents, for last modified check */
  self.articlesETag = false

  /** Holds objects of loaded articles ({ id, element, content }) */
  self.articles = []
  
  /** Holds objects of partials ({ id, at, element, content }) */
  self.partials = []

  /** Cached page height for onscroll calculation */
  self.pageHeight = 0

  /** Cached viewport height for onscroll calculation */
  self.viewportHeight = 0

  /** Used to autoload until this target article ID has been reached */
  self.locationHashTarget = false

  /** Various bits of text that may or may not be displayed */
  self.messages = {
    error: 'Something just went horribly wrong',
    rateLimitExceeded: 'GitHub\u2019s hourly rate-limit was ' +
     'exceeded for your IP address, but things will work again soon.'
  }
  
  /**
   * Sets up initialization on document ready.
   *
   * @method
   */
  function constructor() {
    if (document.readyState === 'complete') {
      // Document already loaded
      initialize()
    } else {
      // Document not yet loaded
      document.addEventListener('DOMContentLoaded', function () {
        initialize()
      }, false)
    }    
  }

  /**
   * Initializes a new instance by getting container element, loading
   * articles and partials, setting up event listeners, etc.
   *
   * @method
   */
  function initialize() {
    if (typeof window.sessionStorage !== 'undefined') {
      self.articlesETag = sessionStorage.getItem('etag')
    }
    
    setContainer()
    loadArticles()
    
    if (!loadPartialsFromCache()) {
      loadPartials()
    }

    window.onscroll = function (event) {
      if (window.pageYOffset !== undefined) {
        var scrollTop = window.pageYOffset
      } else {
        var scrollTop =
          (document.documentElement ||
           document.body.parentNode ||
           document.body).scrollTop
      }

      /* If scroll reaches bottom of page */
      if (scrollTop === self.pageHeight - self.viewportHeight) {
        loadNextArticle()
      }
    }
  }

  /**
   * Appends an error message layer to the page.
   *
   * @method
   * @param {String} message Error message to display
   */
  function displayError(message) {
    var element = document.createElement('div')
    var heading = document.createElement('h1')
    var paragraph = document.createElement('p')

    element.setAttribute('class', 'error')
    element.appendChild(heading)
    element.appendChild(paragraph)
    paragraph.appendChild(document.createTextNode(message))
    heading.appendChild(document.createTextNode(self.messages.error))

    document.body.appendChild(element)
  }

  /**
   * Determines the target article ID from location hash, and checks
   * to see that the article actually exists (to make sure all
   * articles will not be loaded unnecessarily).
   *
   * @method
   */
  function setLocationHashTarget() {
    if (window.location.hash) {
      var target =
        window.location.hash.substr(1, window.location.hash.length - 1)
      
      for (var i = 0; i < self.articlesMetaData.length; ++i) {
        var file = self.articlesMetaData[i].name
        var id = file.substr(0, file.lastIndexOf('.')) || file

        if (target === id) {
          self.locationHashTarget = target
          break
        }
      }
    }
  }

  /**
   * Updates cached page and viewport height used in onscroll
   * calculations.
   *
   * @method
   */
  function updateScrollValues() {
    self.viewportHeight = document.documentElement.clientHeight
    self.pageHeight = Math.max(
      document.documentElement.clientHeight,
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    )
  }

  /**
   * Overrides a set of default preferences with user defined values.
   * Only allows setting preferences that exist in defaults.
   *
   * @method
   * @param {Object} userPreferences User defined preferences.
   * @param {Object} defaults Default preferences to override.
   */
  function applyPreferencesToDefaults(userPreferences, defaults) {
    for (var option in userPreferences) {
      var defaultExists = defaults.hasOwnProperty(option)
      var userSetExists = userPreferences.hasOwnProperty(option)
      
      if (defaultExists && userSetExists) {
        defaults[option] = userPreferences[option]
      }
    }
    
    return defaults
  }

  /**
   * Sends an XMLHTTPRequest to a given URL (specified in `options`
   * parameter along with request headers), and returns an object
   * representing the response to a callback function. This response
   * object contains only selected details we need; currently `body`
   * and `headers` (the only header we need is the `ETag`.
   *
   * @method
   * @param {Object} options Object (`url` and `headers` properties)
   * @param {Function} callback Callback function to pass response
   */
  function getURL(options, callback) {
    var xhr = new XMLHttpRequest()

    xhr.open('GET', options.url, true)
    
    if (options.hasOwnProperty('headers')) {
      for (var header in options.headers) {
        xhr.setRequestHeader(header, options.headers[header])
      }
    }
    
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          callback({
            body: xhr.responseText,
            headers: { 'ETag': xhr.getResponseHeader('ETag') }
          })
        } else if (xhr.status === 304) {
          callback(false)
        } else {
          displayError(self.messages.rateLimitExceeded)
          callback(false)
        }
      }
    }
  
    xhr.send(null)
  }

  /**
   * Parses Markdown using a POST request to the GitHub API, and
   * returns the resulting HTML to a callback function.
   *
   * @method
   * @param {String} source Markdown source to parse
   * @param {Function} callback Callback function to pass HTML
   */
  function getParsedMarkdown(source, callback) {
    var xhr = new XMLHttpRequest()

    xhr.open('POST', 'https://api.github.com/markdown/raw', true)
    xhr.setRequestHeader('Content-Type', 'text/x-markdown')
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          callback(xhr.responseText)
        } else {
          callback(false)
        }
      }
    }
    
    xhr.send(source)
  }

  /**
   * Gets raw content from GitHub at given URL and runs it through the
   * GitHub Markdown parser, returning the results.
   *
   * @method
   * @param {String} url Request URL
   * @param {Function} callback Callback function to pass results
   */
  function getParsedContent(url, callback) {
    var options = {
      url: url,
      headers: { 'Accept': 'application/vnd.github.v3.raw' }
    }
    
    getURL(options, function (response) {
      getParsedMarkdown(response.body, function (content) {
        if (content) {
          callback(content)
        } else {
          displayError(self.messages.rateLimitExceeded)
        }
      })
    })
  }

  /**
   * Simply sets the container member to the appropriate element,
   * based on the "into" preference (defaults to document body).
   *
   * @method
   */
  function setContainer() {
    self.container =
      document.querySelector(self.preferences.into) || document.body
  }

  /**
   * Loads articles from the GitHub repository specified by the "repo"
   * preference (or from cache, if cached content is still valid),
   * calling the render method for each, and storing them in the
   * `articles` member to later be cached to sessionStorage.
   *
   * @method
   */
  function loadArticles() {
    var parts = self.preferences.repo.split('/')
    var repository = parts.slice(0, 2).join('/')
    var dir = (parts.length > 2 ? '/' + parts.slice(2).join('/') : '')
    var url = 'https://api.github.com/repos/' +
      repository +
      '/contents' +
      dir +
      '?ref=' +
      self.preferences.branch
    var options = { url: url }

    if (self.articlesETag) {
      options.headers = { 'If-None-Match': self.articlesETag }
    }
    
    getURL(options, function (response) {
      if (response === false) {
        loadArticlesFromCache()
      } else {
        self.articlesETag = response.headers['ETag']
        self.articlesMetaData = JSON.parse(response.body)
          .filter(function (article) {
            return article.type === "file"
          })
          .reverse()

        setLocationHashTarget()
        loadNextArticle()
      }
    })
  }

  /**
   * Loads one article from its GitHub URL, and continues loading more
   * articles sequentially and synchronously if the "loadAll"
   * preference is `true`. It looks at how many articles are loaded
   * and loads the next index in line. Once done, it refreshes the
   * location hash to make it jump to the right location.
   *
   * @method
   */
  function loadNextArticle() {
    if (self.articles.length < self.articlesMetaData.length) {
      var nextIndex = self.articles.length
      var url = self.articlesMetaData[nextIndex].url
      var file = self.articlesMetaData[nextIndex].name
      var id = file.substr(0, file.lastIndexOf('.')) || file

      getParsedContent(url, function (content) {
        var done = nextIndex + 1 >= self.articlesMetaData.length
        var matchesTarget = id === self.locationHashTarget
        var article = {
          content: content,
          id: id
        }

        /* Conditional prevents double rendering of same article */
        if (!self.articles[nextIndex]) {
          self.articles[nextIndex] = article
          
          runPlugins('beforeRender', article)
          renderArticle(article)
          runPlugins('afterRender', article)
        }

        /* Go to location hash if done loading without specific
           location hash target, or when specific target is reached */
        if ((done && !self.locationHashTarget) || matchesTarget) {
          refreshLocationHash()
        }

        /* Load next if we're loading all or target isn't reached */
        if (!done && (self.preferences.loadAll || !matchesTarget)) {
          loadNextArticle()
        }
        
        refreshCache()
      })
    }
  }
  
  /**
   * Outputs article to the page by appending it to the container
   * element specified by the "into" option in preferences.
   *
   * @method
   * @param {Object} article Object literal article representation
   */
  function renderArticle(article) {
    var element = document.createElement('article')
    var div = document.createElement('div')

    div.innerHTML = article.content
    element.appendChild(div)
    element.setAttribute('id', article.id)
    article.element = element

    self.container.appendChild(element)

    updateScrollValues()
  }

  /**
   * Loads content for partials. Partials are added in markup using a
   * `data-at` attribute pointing to the local markdown file
   * containing the content.
   *
   * @method
   */
  function loadPartials() {
    var elements = document.querySelectorAll('*[data-at]')
    
    for (var i = 0; i < elements.length; ++i) {
      var element = elements[i]
      var at = element.getAttribute('data-at')
      var id = element.getAttribute('id')
      
      !(function (element, at, id) {
        getURL({ url: at + '.md' }, function (response) {
          getParsedMarkdown(response.body, function (content) {
            var partial = {
              at: at,
              content: content,
              element: element,
              id: id
            }
            
            self.partials.push(partial)
            
            runPlugins('beforeRender', partial)
            element.innerHTML = partial.content
            runPlugins('afterRender', partial)
            
            refreshCache()
          })
        })
      }(element, at, (id ? id : element.getAttribute('data-at'))))
    }
  }
  
  /**
   * Loads and renders articles from sessionStorage cache.
   *
   * @method
   */
  function loadArticlesFromCache() {
    if (typeof window.sessionStorage !== 'undefined') {
      self.articles = JSON.parse(
        sessionStorage.getItem('articles')
      )
      
      for (var i = 0; i < self.articles.length; ++i) {
        var article = self.articles[i]
        
        runPlugins('beforeRender', article)
        renderArticle(article)
        runPlugins('afterRender', article)
      }
    }
  }
  
  /**
   * Loads and renders partials from sessionStorage cache.
   *
   * @method
   */
  function loadPartialsFromCache() {
    if (typeof window.sessionStorage !== 'undefined') {
      self.partials = JSON.parse(
        sessionStorage.getItem('partials')
      ) || []
      
      for (var i = 0; i < self.partials.length; ++i) {
        var partial = self.partials[i]
      
        runPlugins('beforeRender', partial)
        var element =
          document.querySelector('*[data-at="' + partial.at + '"]')
        element.innerHTML = partial.content
        partial.element = element
        runPlugins('afterRender', partial)
      }
    }
    
    return !!self.partials.length
  }
  
  /**
   * Caches articles and partials in session storage (HTML5 API);
   * subsequent requests don't count towards GitHub API's rate limit.
   *
   * @method
   */
  function refreshCache() {
    if (typeof window.sessionStorage !== 'undefined') {
      sessionStorage.setItem('etag', self.articlesETag)
      
      sessionStorage.setItem('meta', JSON.stringify(
        self.articlesMetaData
      ))
      
      sessionStorage.setItem('articles', JSON.stringify(
        self.articles.map(function (article) {
          article.element = false
          return article
        })
      ))
      
      sessionStorage.setItem('partials', JSON.stringify(
        self.partials.map(function (partial) {
          partial.element = false
          return partial
        })
      ))
    }
  }

  /**
   * Calls all functions specified in preferences as plugins.
   *
   * @method
   */
  function runPlugins(method, article) {
    if (self.preferences.plugins) {
      for (var i = 0; i < self.preferences.plugins.length; ++i) {
        var plugin = self.preferences.plugins[i]
        var hasMethod = plugin.hasOwnProperty(method)
        var runsMethod = typeof plugin[method] === 'function'

        if (hasMethod && runsMethod) {
          plugin[method].call(article)
        }
      }
    }
  }

  /**
   * Makes the window jump to the currently set location hash.
   *
   * @method
   */
  function refreshLocationHash() {
    if (window.location.hash) {
      window.location.hash = window.location.hash
    }
  }

  /* Set up instance */
  constructor()
}