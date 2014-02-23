/**
 * Polestar is a tiny Markdown site authoring tool in JavaScript.
 * It's GitHub flavored and fully client-side.
 *
 * @author  L. D. Nordstrom <d@mrnordstrom.com>
 * @version 0.1.1
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
  'use strict'

  /* *********
   * Private *
   ********* */

  /** Self reference for closures */
  var self = this

  /**
   * @property {Object} preferences Polestar preferences
   * @property {Boolean} preferences.cache Enable sessionStorage cache
   * @property {Array} preferences.plugins Plugins to run
   * @property {String} preferences.repo GitHub repository
   */
  var preferences = applyPreferencesToDefaults(userPreferences, {
    cache: true,
    plugins: [],
    repo: ''
  })

  /** Holds objects of partials: { id, at, element, content } */
  var partials = []

  /** Location hashbang debug parameters: abc.com#!key=value&... */
  var urlParameters = getUrlParameters()

  /**
   * Performs any initialization that needs to run once DOM is loaded,
   * fetching articles and partials, setting up event listeners, etc.
   *
   * @method
   * @private
   */
  function initialize() {
    if (preferences.plugins instanceof Array) {
      preferences.plugins.forEach(self.use)
    }

    self.emit('initialize')

    self.on('error', function (error) {
      if (urlParameters.debug) {
        console.error('<Polestar> ' + error.message)
      }
    })

    self.on('render', function (partial) {
      var count = document.querySelectorAll('*[data-at]').length

      if (partials.length === count) {
        refreshLocationHash()
        cache()
      }
    })

    if (!preferences.cache || !loadPartialsFromCache()) {
      loadPartials()
    }
  }

  /**
   * Overrides a set of default preferences with user defined values.
   * Allows user to add preferences that are not in defaults.
   *
   * @method
   * @private
   * @param {Object} userPreferences User defined preferences
   * @param {Object} defaults Default preferences to override
   * @return {Object} Defaults overriden by user preferences
   */
  function applyPreferencesToDefaults(userPreferences, defaults) {
    var option

    for (option in userPreferences) {
      if (userPreferences.hasOwnProperty(option)) {
        defaults[option] = userPreferences[option]
      }
    }

    return defaults
  }

  /**
   * Parses URL parameters into key-value pairs stored in
   * `this.urlParameters`. These are passed via a "location
   * hashbang": a location hash starting with an exclamation point.
   * As opposed to query strings, they're never sent to the server.
   *
   * @method
   * @private
   * @example
   * `example.com#!user=me&auth => { user: 'me', auth: true }`
   * @returns {Object} Object containing key/value URL parameters
   */
  function getUrlParameters() {
    var index = location.hash.indexOf('!')
    var parameters = []
    var parameter
    var parts

    if (index !== -1) {
      parts = decodeURI(location.hash.substr(index + 1)).split('&')
      index = parts.length

      while (index--) {
        parameter = parts[index]

        if (parameter.indexOf('=') === -1) {
            parameters[parameter.trim()] = true
        } else {
            parameter = parameter.split('=')
            parameters[parameter[0].trim()] = parameter[1].trim()
        }
      }
    }

    return parameters
  }

  /**
   * Sets the basic authentication headers for the GitHub API on an
   * XMLHttpRequest object if credentials have been specified.
   *
   * @method
   * @private
   * @param {XMLHttpRequest} XMLHttpRequest object to set headers on
   */
  function setGitHubAuthenticationHeadersOnXHR(xhr) {
    var username
    var password

    if (urlParameters.hasOwnProperty('username') &&
        urlParameters.hasOwnProperty('password')) {
      username = urlParameters.username
      password = urlParameters.password

      xhr.setRequestHeader(
        'Authorization',
        'Basic ' + btoa(username + ':' + password)
      )
    }
  }

  /**
   * Loads a partial from a GitHub URL if `repo` is specified in
   * preferences, otherwise from a local file. If the file is
   * a Markdown file, it's parsed. The content is appended to the
   * given container element.
   *
   * @method
   * @private
   * @param {HTMLElement} Element with `data-at` file path
   */
  function loadPartialForElement(element) {
    var at = element.getAttribute('data-at')
    var partial = { element: element, at: at }
    var options = { url: '' }

    if (preferences.repo) {
      options.url += 'https://api.github.com/repos/'
      options.url += preferences.repo + '/contents/'
      options.headers = { 'Accept': 'application/vnd.github.v3.raw' }
    }

    options.url += partial.at

    self.request(options, function (response) {
      if (options.url.match(/.md$/)) {
        self.parseMarkdown(response.body, function (content) {
          partial.content = content
          element.innerHTML = content

          partials.push(partial)
          self.emit('render', partial)
        })
      } else {
        partial.content = response.body
        element.innerHTML = response.body

        partials.push(partial)
        self.emit('render', partial)
      }
    })
  }

  /**
   * Loads partials. Partials are added in markup using a `data-repo`
   * attribute pointing to a repository file, or a 'data-local'
   * attribute pointing to a local file.
   *
   * @private
   * @method
   */
  function loadPartials() {
    Array.prototype.forEach.call(
      document.querySelectorAll('*[data-at]'),
      loadPartialForElement
    )
  }

  /**
   * Loads and renders partials from sessionStorage cache.
   *
   * @private
   * @method
   */
  function loadPartialsFromCache() {
    var containerCount = document.querySelector('*[data-at]').length

    if (containerCount && window.sessionStorage) {
      partials = JSON.parse(
        sessionStorage.getItem('partials')
      ) || []

      partials.forEach(function (partial) {
        partial.element =
          document.querySelector('*[data-at="' + partial.at + '"]')

        if (partial.element) {
          element.innerHTML = partial.content
          partials.push(partial)
          emit('render', partial)
        }
      })
    }

    return partials.length === containerCount
  }

  /**
   * Caches partials in sessionStorage to avoid further requests and
   * GitHub's rate limit. **Turn off with the "cache" preference.**
   *
   * @private
   * @method
   */
  function cache() {
    if (preferences.cache && window.sessionStorage) {
      sessionStorage.setItem('partials', JSON.stringify(
        partials.map(function (partial) {
          partial.element = false
          return partial
        })
      ))
    }
  }

  /**
   * Makes the window jump to the currently set location hash.
   *
   * @private
   * @method
   */
  function refreshLocationHash() {
    location.hash = location.hash
  }

  /* ************
   * Public API *
   ************ */

  /**
   * Subscribe method for events.
   *
   * @method
   * @public
   */
  this.on = function on(topic, func) {
    if (!this.topics) this.topics = {}
    if (!(topic instanceof Array)) topic = [topic]

    topic.forEach(function (t) {
      this[t] ? this[t].push(func) : this[t] = [func]
    }.bind(this.topics))
  }

  /**
   * Publish method for events.
   *
   * @method
   * @public
   */
  this.emit = function emit(topic, data) {
    if (!this.topics) return
    (this.topics[topic] || []).forEach(function (fn) { fn(data) })
  }

  /**
   * Unsubscribe method for events.
   *
   * @method
   * @public
   */
  this.off = function off(topic, func) {
    (this.topics[topic] || []).some(function (fn, index, array) {
      if (fn === func) return array.splice(index, 1)
    })
  }

  /**
   * Returns the preferences object for this instance.
   *
   * @method
   * @public
   * @return {Object} Preferences object
   */
  this.getPreferences = function getPreferences() {
    return preferences
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
  this.request = function request(options, callback) {
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
        callback({
          body: xhr.responseText,
          headers: { 'ETag': xhr.getResponseHeader('ETag') },
          status: xhr.status
        })
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
  this.parseMarkdown = function parseMarkdown(source, callback) {
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
   * Runs a plugin method with this instance as only parameter.
   *
   * @method
   * @public
   */
  this.use = function use(func) {
    func(self)
  }

  /* ****************
   * Initialization *
   **************** */

  /* Confirm browser requirements and initialize */
  if (Array.prototype.filter && Array.prototype.some &&
      Array.prototype.forEach && document.querySelector) {
    if (document.readyState === 'complete') {
      initialize()
    } else {
      document.addEventListener('DOMContentLoaded', initialize, false)
    }

    document.documentElement.className ?
      document.documentElement.className += ' polestarted' :
      document.documentElement.className += 'polestarted'
  }
}