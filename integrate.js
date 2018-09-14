/*
 * Copyright 2014-2018 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  // Translations
  var C_ = Nuvola.Translate.pgettext

  var ACTION_LOVE_TRACK = 'love-track'

  // Create media player component
  var player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  var PlaybackState = Nuvola.PlaybackState
  var PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  var WebApp = Nuvola.$WebApp()

  WebApp._onInitAppRunner = function (emitter) {
    Nuvola.WebApp._onInitAppRunner.call(this, emitter)
    Nuvola.actions.addAction('playback', 'win', ACTION_LOVE_TRACK, C_('Action', 'Favorite track'),
      null, null, null, true)
  }

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    var state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    this.changeVolumeStylesheet = Nuvola.makeElement('style', {},
    '   .page-sidebar .player-controls > .controls.controls-options .volume {margin: 0;}' +
    ' .page-sidebar .player-controls > .controls.controls-options .volume ~ li {display: none !important;}' +
    ' .page-sidebar .player-controls > .controls.controls-options .volume > .control-volume > .is-volume-default {display: none !important;}' +
    ' .page-sidebar .player-controls > .controls.controls-options .volume > .control-volume > .is-volume-min {display: inline-block;}' +
    ' .page-sidebar .player-controls > .controls.controls-options .volume > .control-volume-max,' +
    ' .page-sidebar .player-controls > .controls.controls-options .volume > .volume-progress {display: inline-block;}'
    )

    player.addExtraActions([ACTION_LOVE_TRACK])

    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)

    // Start update routine
    this.update()
  }

  // Extract data from the web page
  WebApp.update = function () {
    var track = { album: null }
    var elms = this._getElements()
    track.title = Nuvola.queryText('.player .player-track .player-track-title')
    track.artist = Nuvola.queryText('.player .player-track-artist .player-track-link')
    track.artLocation = Nuvola.queryAttribute('.player .player-cover img', 'src')
    track.length = this._getTrackLength()
    var elapsed = Nuvola.queryText('.player .player-progress .progress-time')
    var volume = elms.volumeHandler ? elms.volumeHandler.getAttribute('aria-valuenow') / 100 : 1.0
    player.setTrack(track)

    var state = elms.play ? PlaybackState.PAUSED : (elms.pause ? PlaybackState.PLAYING : PlaybackState.UNKNOWN)
    player.setPlaybackState(state)
    player.setCanPlay(!!elms.play)
    player.setCanPause(!!elms.pause)
    player.setCanGoPrev(!!elms.prev)
    player.setCanGoNext(!!elms.next)

    Nuvola.actions.updateEnabledFlag(ACTION_LOVE_TRACK, state !== PlaybackState.UNKNOWN && !!elms.love.button)
    Nuvola.actions.updateState(ACTION_LOVE_TRACK, elms.love.state)

    if (Nuvola.checkVersion && Nuvola.checkVersion(4, 4, 18)) {
      if (state !== PlaybackState.UNKNOWN) { player.setTrackPosition(elapsed) }
      player.setCanSeek(state !== PlaybackState.UNKNOWN)
      player.setCanChangeVolume(!!elms.volumeHandler)
      player.updateVolume(volume)
    }

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  WebApp._getTrackLength = function () {
    var elm = document.querySelector('.player .player-progress .progress-length')
    return Nuvola.parseTimeUsec ? Nuvola.parseTimeUsec(elm ? elm.innerText || null : null) : 0
  }

  WebApp._getLoveButton = function () {
    var button = (document.querySelector('.player .player-actions .svg-icon-love-outline') ||
      document.querySelector('.player .player-actions .icon-love'))
    var state = false
    if (button) {
      state = button.classList.contains('is-active') || button.classList.contains('active')
      button = button.parentNode
    }
    return {button: button, state: state}
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    var elms = this._getElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        Nuvola.clickOnElement(elms.pause || elms.play)
        break
      case PlayerAction.PLAY:
        Nuvola.clickOnElement(elms.play)
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        Nuvola.clickOnElement(elms.pause)
        break
      case PlayerAction.PREV_SONG:
        Nuvola.clickOnElement(elms.prev)
        break
      case PlayerAction.NEXT_SONG:
        Nuvola.clickOnElement(elms.next)
        break
      case PlayerAction.SEEK:
        var seekBar = document.querySelector('.player .player-progress .progress-buffer')
        var total = this._getTrackLength()
        if (seekBar && total >= param) {
          Nuvola.clickOnElement(seekBar, param / total, 0.5)
        }
        break
      case PlayerAction.CHANGE_VOLUME:
        var head = document.getElementsByTagName('head')[0]
        head.appendChild(this.changeVolumeStylesheet)
        var volumeBar = document.querySelector('.player .volume .volume-progress .volume-progress-bar')
        if (volumeBar) {
          Nuvola.clickOnElement(volumeBar, param, 0.5)
        }
        head.removeChild(this.changeVolumeStylesheet)
        break
      case ACTION_LOVE_TRACK:
        Nuvola.clickOnElement(elms.love.button)
        break
    }
  }

  WebApp._getElements = function () {
    var elms = {
      volumeHandler: document.querySelector('.player .volume .volume-progress .volume-handler'),
      prev: document.querySelector('.player button.control.control-prev'),
      next: document.querySelector('.player button.control.control-next'),
      play: document.querySelector('.player button.control.control-play'),
      pause: null,
      love: this._getLoveButton()
    }
     // Ignore disabled buttons
    for (var key in elms) {
      if (elms[key] && elms[key].disabled) {
        elms[key] = null
      }
    }

    if (elms.play && elms.play.querySelector('svg.svg-icon-pause')) {
      elms.pause = elms.play
      elms.play = null
    }
    return elms
  }

  WebApp.start()
})(this)  // function(Nuvola)
