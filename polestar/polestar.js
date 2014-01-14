/**
 * Polestar is a tiny Markdown site authoring and blogging tool in
 * JavaScript---GitHub flavored and fully client-side.
 *
 * @author  L. D. Nordstrom <d@mrnordstrom.com>
 * @version 0.1.0
 * @license MPL 2.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Global Polestar constructor.
 *
 * @class
 * @param {Object} userPreferences User defined preferences
 */ 
function Polestar(userPreferences) {
  var self = this

  /**
   * @property {Object} preferences Polestar preferences
   * @property {String} preferences.branch Git branch
   * @property {Boolean} preferences.cache Enable sessionStorage cache
   * @property {String} preferences.draft Draft article to load
   * @property {String} preferences.into CSS selector for container
   * @property {Boolean} preferences.loadAll Load all writings at once
   * @property {Array} preferences.plugins Plugins to run
   * @property {String} preferences.repo GitHub repository
   */
  var preferences = applyPreferencesToDefaults(userPreferences, {
    branch: 'master',
    cache: true,
    draft: '',
    into: '',
    loadAll: false,
    plugins: [],
    repo: ''
  })

  /** Holds element into which articles are rendered */
  var container = false

  /** Holds repository contents as returned from GitHub */
  var articlesMetaData = []
  
  /** Holds ETag for repository contents, for last modified check */
  var articlesETag = false

  /** Holds objects of loaded writings: { id, element, content } */
  var articles = []
  
  /** Holds objects of partials: { id, at, element, content } */
  var partials = []

  /** Cached page height for onscroll calculation */
  var pageHeight = 0

  /** Cached viewport height for onscroll calculation */
  var viewportHeight = 0

  /** Autoload until this target writing ID has been reached */
  var locationHashTarget = false

  /** Location hashbang debug parameters: abc.com#!key=value&... */
  var debugParameters = {}

  /** Various bits of text that may or may not be displayed */
  var messages = {
    error: 'Something just went horribly wrong',
    gitHubError: 'There was a problem with the GitHub response. ' +
      'Perhaps the rate limit was reached (try with credentials) ' +
      'or a local draft or partial couldn\u2019t be read (check ' +
      'files and paths).'
  }
  
  /**
   * Sets up initialization on document ready.
   *
   * @method
   */
  function constructor() {
    if (document.readyState === 'complete') {
      initialize()
    } else {
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
    setContainer()
    getDebugParameters()
    
    if (window.sessionStorage) {
      articlesETag = sessionStorage.getItem('etag')
    }
    
    if (preferences.draft) {
      loadDraft()
    }

    self.runPlugins('beforeAll')
    
    if (!preferences.cache || !loadPartialsFromCache()) {
      loadPartials()
    }
    
    if (preferences.repo) {
      loadArticles()
      
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
        if (scrollTop === pageHeight - viewportHeight) {
          loadNextArticle()
        }
      }
    }
  }

  /**
   * Parses debug parameters into key-value pairs stored in
   * `this.debugParameters`. These are passed via a "location
   * hashbang": a location hash starting with an exclamation point.
   * As opposed to query strings, they're never sent to the server.
   *
   * For example, `example.com#!username=myself&auth` gives us
   * `{ username: 'myself', auth: true }`
   */
  function getDebugParameters() {
    if (location.hash && location.hash.charAt(1) === '!') {
      var parameters = location.hash.substr(2).split('&')

      for (var i = 0; i < parameters.length; ++i) {
        parameter = decodeURI(parameters[i])

        if (parameter.indexOf('=') === -1) {
            debugParameters[parameter.trim()] = true
        } else {
            var pair = parameter.split('=')
            debugParameters[pair[0].trim()] = pair[1].trim()
        }
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
    heading.appendChild(document.createTextNode(messages.error))
    paragraph.appendChild(document.createTextNode(message))

    document.body.appendChild(element)
  }

  /**
   * Makes sure the writing ID specified in location hash refers to an
   * actual writing, so they all won't be loaded unnecessarily. If it
   * finds the ID, it stores it in `this.locationHashTarget`.
   *
   * @method
   */
  function checkLocationHashTarget() {
    if (location.hash) {
      var target =
        location.hash.substr(1, location.hash.length - 1)
      
      for (var i = 0; i < articlesMetaData.length; ++i) {
        var file = articlesMetaData[i].name
        var id = file.substr(0, file.lastIndexOf('.')) || file

        if (target === id) {
          locationHashTarget = target
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
    viewportHeight = document.documentElement.clientHeight
    pageHeight = Math.max(
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
   * Logs a message to console if debug mode has been turned on.
   *
   * @param {String} speaker Name of what speaks the message
   * @param {String} message The message spoken
   */
  function log(speaker, message) {
    if (debugParameters.hasOwnProperty('debug')) {
      console.log('<' + speaker + '> ' + message)
    }
  }

  /**
   * Sends an XMLHTTPRequest to a given URL (specified in `options`
   * parameter along with request headers), and returns an object
   * representing the response to a callback function. This response
   * object contains only selected details we need; currently `body`
   * and `headers` (the only header we need is the `ETag`.
   *
   * @method
   * @public
   * @param {Object} options Object (`url` and `headers` properties)
   * @param {Function} callback Callback function to pass response
   */
  self.getURL = function (options, callback) {
    var xhr = new XMLHttpRequest()

    xhr.open('GET', options.url, true)
    
    if (options.hasOwnProperty('headers')) {
      for (var header in options.headers) {
        xhr.setRequestHeader(header, options.headers[header])
      }
    }

    if (options.url.match(/^https:\/\/api.github.com/)) {
      setGitHubAuthenticationHeadersOnXHR(xhr)
    }
    
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.getResponseHeader('X-RateLimit-Remaining')) {
          log('Polestar#getURL', 'You can make another ' +
            xhr.getResponseHeader('X-RateLimit-Remaining') +
            ' GitHub API requests within the rate limit. If you' +
            ' are using your credentials, it should be plenty.'
          )
        }

        if (xhr.status === 200) {
          callback({
            body: xhr.responseText,
            headers: { 'ETag': xhr.getResponseHeader('ETag') }
          })
        } else if (xhr.status === 304) {
          callback(false)
        } else {
          log('Polestar#getURL', 'Hey, I got status code ' +
            xhr.status + ' from URL \'' + options.url + '\'.')
          displayError(messages.gitHubError)
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
   * @public
   * @param {String} source Markdown source to parse
   * @param {Function} callback Callback function to pass HTML
   */
  self.parseMarkdown = function (source, callback) {
    var xhr = new XMLHttpRequest()

    xhr.open('POST', 'https://api.github.com/markdown/raw', true)
    xhr.setRequestHeader('Content-Type', 'text/x-markdown')

    setGitHubAuthenticationHeadersOnXHR(xhr)

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          callback(xhr.responseText)
        } else {
          displayError(messages.gitHubError)
          callback(false)
        }
      }
    }
    
    xhr.send(source)
  }

  /**
   * Sets the basic authentication headers for the GitHub API on an
   * XMLHttpRequest object if credentials have been specified.
   *
   * @param {XMLHttpRequest} XMLHttpRequest object to set headers on
   */
  function setGitHubAuthenticationHeadersOnXHR(xhr) {
    if (debugParameters.hasOwnProperty('username') &&
        debugParameters.hasOwnProperty('password')) {
      var username = debugParameters.username
      var password = debugParameters.password

      xhr.setRequestHeader(
        'Authorization',
        'Basic ' + btoa(username + ':' + password)
      )
    }
  }

  /**
   * Simply sets the container member to the appropriate element,
   * based on the "into" preference (defaults to document body).
   *
   * @method
   */
  function setContainer() {
    container =
      document.querySelector(preferences.into) || document.body
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
    var parts = preferences.repo.split('/')
    var repository = parts.slice(0, 2).join('/')
    var dir = (parts.length > 2 ? '/' + parts.slice(2).join('/') : '')
    var url = 'https://api.github.com/repos/' + repository +
      '/contents' + dir + '?ref=' + preferences.branch
    var options = { url: url }

    if (preferences.cache && articlesETag) {
      options.headers = { 'If-None-Match': articlesETag }
    }
    
    self.getURL(options, function (response) {
      if (response === false) {
        loadArticlesFromCache()
      } else {
        articlesETag = response.headers['ETag']
        articlesMetaData = JSON.parse(response.body)
          .filter(function (article) {
            return article.type === "file"
          })
          .reverse()

        checkLocationHashTarget()
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
    if (articles.length < articlesMetaData.length) {
      var nextIndex = articles.length
      var url = articlesMetaData[nextIndex].url
      var file = articlesMetaData[nextIndex].name
      var id = file.substr(0, file.lastIndexOf('.')) || file
      var options = {
        url: url,
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
      }
      
      self.getURL(options, function (response) {
        self.parseMarkdown(response.body, function (content) {
          var done = nextIndex + 1 >= articlesMetaData.length
          var matchesTarget = id === locationHashTarget
          var article = {
            content: content,
            id: id
          }

          /* Conditional prevents double rendering of same article */
          if (!articles[nextIndex]) {
            articles[nextIndex] = article
            
            self.runPlugins('beforeRender', article)
            renderArticle(article)
            self.runPlugins('afterRender', article)
          }

          /* Go to location hash if done loading without specific
             location hash target, or when specific target is reached */
          if ((done && !locationHashTarget) || matchesTarget) {
            refreshLocationHash()
          }

          /* Load next if we're loading all or target isn't reached */
          if (!done && (preferences.loadAll || !matchesTarget)) {
            loadNextArticle()
          }
          
          cache()
        })
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

    container.appendChild(element)

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
        self.getURL({ url: at + '.md' }, function (response) {
          self.parseMarkdown(response.body, function (content) {
            var partial = {
              at: at,
              content: content,
              element: element,
              id: id
            }
            
            partials.push(partial)
            
            self.runPlugins('beforeRender', partial)
            element.innerHTML = partial.content
            self.runPlugins('afterRender', partial)
            
            cache()
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
      articles = JSON.parse(
        sessionStorage.getItem('articles')
      )
      
      for (var i = 0; i < articles.length; ++i) {
        var article = articles[i]
        
        self.runPlugins('beforeRender', article)
        renderArticle(article)
        self.runPlugins('afterRender', article)
      }
    }
  }
  
  /**
   * Loads and renders partials from sessionStorage cache.
   *
   * @method
   */
  function loadPartialsFromCache() {
    var containers = document.querySelectorAll('*[data-at]').length
    
    if (containers && window.sessionStorage) {
      partials = JSON.parse(
        sessionStorage.getItem('partials')
      ) || []

      for (var i = 0; i < partials.length; ++i) {
        var partial = partials[i]
        var element =
          document.querySelector('*[data-at="' + partial.at + '"]')
      
        if (partial && element) {
          self.runPlugins('beforeRender', partial)
          element.innerHTML = partial.content
          partial.element = element
          self.runPlugins('afterRender', partial)
        }
      }
    }
    
    return partials.length === containers
  }
  
  /**
   * Renders draft specified in the `draft` preference into the
   * writings container, always reloading (bypassing `cache` setting).
   *
   * @method
   */
  function loadDraft() {
    if (preferences.draft) {
      var at = preferences.draft
      var id = at.split('/')[at.split('/').length - 1]
      
      self.getURL({ url: at + '.md' }, function (response) {
        self.parseMarkdown(response.body, function (content) {
          if (content) {
            var element = document.createElement('article')
            var div = document.createElement('div')
            var article = {
              at: at,
              content: content,
              element: element,
              id: id
            }
            
            self.runPlugins('beforeRender', article)
            
            div.innerHTML = article.content
            element.appendChild(div)
            element.setAttribute('id', article.id)
            article.element = element

            if (articles.length) {
              container.insertBefore(
                element,
                articles[articles.length - 1].element
              )
            } else {
              container.appendChild(element)
            }
            
            self.runPlugins('afterRender', article)
          }
        })
      })
    }
  }
  
  /**
   * Caches current ETag, repository contents, writings, and partials
   * in `window.sessionStorage` to avoid further requests and, in
   * particular, the GitHub API rate limit during development. **Turn
   * this off (e.g. to preview drafts) using the "cache" preference.**
   *
   * @method
   */
  function cache() {
    if (preferences.cache && window.sessionStorage) {
      sessionStorage.setItem('etag', articlesETag)
      sessionStorage.setItem('meta', JSON.stringify(
        articlesMetaData
      ))
      
      sessionStorage.setItem('articles', JSON.stringify(
        articles.map(function (article) {
          article.element = false
          return article
        })
      ))
      
      sessionStorage.setItem('partials', JSON.stringify(
        partials.map(function (partial) {
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
  self.runPlugins = function (method, writing) {
    if (preferences.plugins) {
      for (var i = 0; i < preferences.plugins.length; ++i) {
        var plugin = preferences.plugins[i]
        var hasMethod = plugin.hasOwnProperty(method)
        var canRunMethod = typeof plugin[method] === 'function'

        if (hasMethod && canRunMethod) {
          writing ?
            plugin[method](self, writing) : plugin[method](self)
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
    if (location.hash) {
      location.hash = location.hash
    }
  }

  /* Set up instance */
  constructor()
}