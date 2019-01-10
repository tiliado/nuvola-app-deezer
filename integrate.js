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
    // The second selector is new Deezer 2018
    track.title = (Nuvola.queryText('.player .player-track .player-track-title') ||
      Nuvola.queryText('.player-bottom .track-title a.track-link:first-child'))
    track.artist = (Nuvola.queryText('.player .player-track-artist .player-track-link') ||
      Nuvola.queryText('.player-bottom .track-title a.track-link:last-child'))
    track.artLocation = (Nuvola.queryAttribute('.player .player-cover img', 'src') ||
      Nuvola.queryAttribute(
        '.player-bottom button.queuelist img', 'src', (src) => src.replace('/28x28-', '/380x380-')))
    track.length = this._getTrackLength()
    var elapsed = (Nuvola.queryText('.player .player-progress .progress-time') ||
      Nuvola.queryText('.track-seekbar .slider-counter-current'))
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

    if (state !== PlaybackState.UNKNOWN) {
      player.setTrackPosition(elapsed)
    }
    player.setCanSeek(state !== PlaybackState.UNKNOWN)
    player.setCanChangeVolume(!!elms.volumeHandler)
    player.updateVolume(volume)

    var repeat = this._getRepeatStatus(elms.repeat)
    Nuvola.actions.updateEnabledFlag(PlayerAction.REPEAT, repeat !== null)
    Nuvola.actions.updateState(PlayerAction.REPEAT, repeat || 0)

    var shuffle = null
    if (elms.shuffle && elms.shuffle.firstChild) {
      var classes = elms.shuffle.firstChild.classList
      shuffle = classes.contains('is-active') || classes.contains('active')
    }
    Nuvola.actions.updateEnabledFlag(PlayerAction.SHUFFLE, shuffle !== null)
    Nuvola.actions.updateState(PlayerAction.SHUFFLE, !!shuffle)

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  WebApp._getTrackLength = function () {
    // The second selector is new Deezer 2018
    return Nuvola.parseTimeUsec(Nuvola.queryText('.player .player-progress .progress-length') ||
      Nuvola.queryText('.track-seekbar .slider-counter-max') || null)
  }

  WebApp._getLoveButton = function () {
    var buttons = document.querySelectorAll('.player-bottom .track-actions button') // new Deezer 2018
    var button = (document.querySelector('.player .player-actions .svg-icon-love-outline') ||
      document.querySelector('.player .player-actions .icon-love') || (buttons[2] ? buttons[2].firstChild : null))
    var state = false
    if (button) {
      state = button.classList.contains('is-active') || button.classList.contains('active')
      button = button.parentNode
    }
    return { button: button, state: state }
  }

  WebApp._getRepeatStatus = function (button) {
    if (!button || !button.firstChild) {
      return null
    }
    var classes = button.firstChild.classList
    if (!classes.contains('is-active') && !classes.contains('active')) {
      return Nuvola.PlayerRepeat.NONE
    }
    return classes.contains('svg-icon-repeat-one') ? Nuvola.PlayerRepeat.TRACK : Nuvola.PlayerRepeat.PLAYLIST
  }

  WebApp._setRepeatStatus = function (button, repeat) {
    if (!button) {
      console.log('Do not have repeat button!')
      return
    }
    while (this._getRepeatStatus(button) !== repeat) {
      Nuvola.clickOnElement(button)
    }
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
        // The second selector is new Deezer 2018
        var seekBar = (document.querySelector('.player .player-progress .progress-buffer') ||
          document.querySelector('.track-seekbar input.slider-track-input'))
        var total = this._getTrackLength()
        if (seekBar && total >= param) {
          if (seekBar.nodeName === 'INPUT') {
            Nuvola.setInputValueWithEvent(seekBar, param / total * seekBar.max)
            Nuvola.clickOnElement(seekBar, param / total, 0.5)
          } else {
            Nuvola.clickOnElement(seekBar, param / total, 0.5)
          }
        }
        break
      case PlayerAction.CHANGE_VOLUME:
        // TODO: Integratevolume management
        var head = document.getElementsByTagName('head')[0]
        head.appendChild(this.changeVolumeStylesheet)
        var volumeBar = document.querySelector('.player .volume .volume-progress .volume-progress-bar')
        if (volumeBar) {
          Nuvola.clickOnElement(volumeBar, param, 0.5)
        }
        head.removeChild(this.changeVolumeStylesheet)
        break
      case PlayerAction.REPEAT:
        this._setRepeatStatus(elms.repeat, param)
        break
      case PlayerAction.SHUFFLE:
        Nuvola.clickOnElement(elms.shuffle)
        break
      case ACTION_LOVE_TRACK:
        Nuvola.clickOnElement(elms.love.button)
        break
    }
  }

  WebApp._getElements = function () {
    var playbackButtons = document.querySelectorAll('.player-bottom .player-controls button') // new Deezer 2018
    var playerOptions = document.querySelectorAll('.player-bottom .player-options button') // new Deezer 2018
    var elms = {
      volumeHandler: document.querySelector('.player .volume .volume-progress .volume-handler'),
      prev: document.querySelector('.player button.control.control-prev') || playbackButtons[0],
      next: document.querySelector('.player button.control.control-next') || playbackButtons[2],
      play: document.querySelector('.player button.control.control-play') || playbackButtons[1],
      pause: null,
      love: this._getLoveButton(),
      repeat: document.querySelector('.player button.control.control-repeat') || playerOptions[0],
      shuffle: document.querySelector('.player button.control.control-shuffle') || playerOptions[1]
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
})(this) // function(Nuvola)
