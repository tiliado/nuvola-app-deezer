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
  const C_ = Nuvola.Translate.pgettext

  const ACTION_LOVE_TRACK = 'love-track'

  // Create media player component
  const player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  const PlaybackState = Nuvola.PlaybackState
  const PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  const WebApp = Nuvola.$WebApp()

  WebApp._onInitAppRunner = function (emitter) {
    Nuvola.WebApp._onInitAppRunner.call(this, emitter)
    Nuvola.actions.addAction('playback', 'win', ACTION_LOVE_TRACK, C_('Action', 'Favorite track'),
      null, null, null, true)
  }

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    const state = document.readyState
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

    // Fixes Uncaught `TypeError: Cannot read property 'formats' of null` on prev/next button click
    window.sas_manager = { formats: {} }

    // Start update routine
    this.update()
  }

  // Extract data from the web page
  WebApp.update = function () {
    const track = { album: null }
    const elms = this._getElements()
    track.title = (Nuvola.queryText('.player-full .queuelist-cover-title .queuelist-cover-link') ||
      Nuvola.queryText('.player-bottom .track-title a.track-link:first-child'))
    track.artist = (Nuvola.queryText('.player-full .queuelist-cover-subtitle') ||
      Nuvola.queryText('.player-bottom .track-title a.track-link:last-child'))
    track.artLocation = (Nuvola.queryAttribute('.player .player-cover img', 'src') ||
      Nuvola.queryAttribute(
        '.player-bottom button.queuelist img', 'src', (src) => src.replace('/28x28-', '/380x380-')))
    track.length = this._getTrackLength()
    const elapsed = (Nuvola.queryText('.player .player-progress .progress-time') ||
      Nuvola.queryText('.track-seekbar .slider-counter-current'))

    player.setTrack(track)

    const state = elms.play ? PlaybackState.PAUSED : (elms.pause ? PlaybackState.PLAYING : PlaybackState.UNKNOWN)
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

    const repeat = this._getRepeatStatus(elms.repeat)
    Nuvola.actions.updateEnabledFlag(PlayerAction.REPEAT, repeat !== null)
    Nuvola.actions.updateState(PlayerAction.REPEAT, repeat || 0)

    let shuffle = null
    if (elms.shuffle && elms.shuffle.firstChild) {
      const classes = elms.shuffle.firstChild.classList
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
    const buttons = document.querySelectorAll('.player-bottom .track-actions button')
    const fullPlayerButtons = document.querySelectorAll('.player-full .queuelist-cover-actions button')
    const button = (
      (fullPlayerButtons.length >= 3 ? fullPlayerButtons[2] : null) ||
        (buttons.length >= 3 ? buttons[2] : null)
    )
    let state = false
    if (button) {
      state = button.firstChild.classList.contains('is-active')
    }
    return { button: button, state: state }
  }

  WebApp._getRepeatStatus = function (button) {
    if (!button || !button.firstChild) {
      return null
    }

    const path = button.firstElementChild.firstElementChild.firstElementChild.getAttribute('d')
    if (path.startsWith('M9 ')) {
      if (button.firstElementChild.classList.contains('ewlift')) {
        return Nuvola.PlayerRepeat.PLAYLIST
      }
      if (button.firstElementChild.classList.contains('hyAbfI')) {
        return Nuvola.PlayerRepeat.NONE
      }
      return null
    }
    if (path.startsWith('M5.2 ')) {
      return Nuvola.PlayerRepeat.TRACK
    }
    return null
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
    const elms = this._getElements()
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
      case PlayerAction.SEEK: {
        // The second selector is new Deezer 2018
        const seekBar = (document.querySelector('.player .player-progress .progress-buffer') ||
          document.querySelector('.track-seekbar input.slider-track-input'))
        const total = this._getTrackLength()
        if (seekBar && total >= param) {
          if (seekBar.nodeName === 'INPUT') {
            Nuvola.setInputValueWithEvent(seekBar, param / total * seekBar.max)
            Nuvola.clickOnElement(seekBar, param / total, 0.5)
          } else {
            Nuvola.clickOnElement(seekBar, param / total, 0.5)
          }
        }
        break
      }

      case PlayerAction.CHANGE_VOLUME: {
        // TODO: Integrate volume management
        const head = document.getElementsByTagName('head')[0]
        head.appendChild(this.changeVolumeStylesheet)
        const volumeBar = document.querySelector('.player .volume .volume-progress .volume-progress-bar')
        if (volumeBar) {
          Nuvola.clickOnElement(volumeBar, param, 0.5)
        }
        head.removeChild(this.changeVolumeStylesheet)
        break
      }

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
    const playbackButtons = document.querySelectorAll('.player-bottom .player-controls button') // new Deezer 2018
    const playerOptions = document.querySelectorAll('.player-bottom .player-options button') // new Deezer 2018
    const elms = {
      volumeHandler: document.querySelector('.player .volume .volume-progress .volume-handler'),
      prev: playbackButtons[0] || null,
      next: playbackButtons[2] || null,
      play: playbackButtons[1] || null,
      pause: null,
      love: this._getLoveButton(),
      repeat: playerOptions[1] || null,
      shuffle: playerOptions[2] || null
    }

    // Ignore disabled buttons
    for (const key in elms) {
      if (elms[key] && elms[key].disabled) {
        elms[key] = null
      }
    }

    if (elms.play && elms.play.firstElementChild.firstElementChild.firstElementChild.getAttribute('d').startsWith('M10')) {
      elms.pause = elms.play
      elms.play = null
    }
    return elms
  }

  WebApp.start()
})(this) // function(Nuvola)
