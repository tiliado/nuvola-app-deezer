/*
 * Copyright 2014-2015 Jiří Janoušek <janousek.jiri@gmail.com>
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

/*
 * TODO: Love song action.
 */
 
"use strict";

(function(Nuvola)
{

var CHANGE_VOLUME_STYLE = Nuvola.makeElement("style", {},
"   .page-sidebar .player-controls > .controls.controls-options .volume {margin: 0;}"
+ " .page-sidebar .player-controls > .controls.controls-options .volume ~ li {display: none !important;}"
+ " .page-sidebar .player-controls > .controls.controls-options .volume > .control-volume > .is-volume-default {display: none !important;}"
+ " .page-sidebar .player-controls > .controls.controls-options .volume > .control-volume > .is-volume-min {display: inline-block;}"
+ " .page-sidebar .player-controls > .controls.controls-options .volume > .control-volume-max,"
+ " .page-sidebar .player-controls > .controls.controls-options .volume > .volume-progress {display: inline-block;}"
);

// Create media player component
var player = Nuvola.$object(Nuvola.MediaPlayer);

// Handy aliases
var PlaybackState = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;

// Create new WebApp prototype
var WebApp = Nuvola.$WebApp();

// Initialization routines
WebApp._onInitWebWorker = function(emitter)
{
    Nuvola.WebApp._onInitWebWorker.call(this, emitter);

    var state = document.readyState;
    if (state === "interactive" || state === "complete")
        this._onPageReady();
    else
        document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
}

// Page is ready for magic
WebApp._onPageReady = function()
{
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect("ActionActivated", this);

    // Start update routine
    this.update();
}

// Extract data from the web page
WebApp.update = function()
{
    var track = { album: null }
    var elm;
    elm = document.querySelector(".player .player-track .player-track-title");
    track.title = elm ? elm.innerText || null : null;
    elm = document.querySelector(".player .player-track-artist .player-track-link");
    track.artist = elm ? elm.innerText || null : null;
    elm = document.querySelector(".player .player-cover img");
    track.artLocation = elm ? elm.src || null : null;
    track.length = this._getTrackLength();
    elm = document.querySelector(".player .player-progress .progress-time");
    var elapsed = elm ? elm.innerText || null : null;
    var volumeHandler = document.querySelector(".player .volume .volume-progress .volume-handler");
    var volume = volumeHandler ? volumeHandler.getAttribute("aria-valuenow") / 100 : 1.0;
    
    /*
     * No idea where #document comes from.
     * https://github.com/tiliado/nuvola-app-deezer/issues/2
     */
    if (track.title != "#document" && track.artist != "#document")
        player.setTrack(track);
   
    var playButton  = this._isButtonEnabled("play");
    var pauseButton = !playButton && this._isButtonEnabled("pause");
    var state = playButton ? PlaybackState.PAUSED : (pauseButton ? PlaybackState.PLAYING: PlaybackState.UNKNOWN);
    player.setPlaybackState(state);    
    player.setCanPlay(playButton);
    player.setCanPause(pauseButton);
    player.setCanGoPrev(this._isButtonEnabled("prev"));
    player.setCanGoNext(this._isButtonEnabled("next"));
    
    if (Nuvola.checkVersion && Nuvola.checkVersion(4, 4, 18))
    {
        if (state !== PlaybackState.UNKNOWN)
            player.setTrackPosition(elapsed);
        player.setCanSeek(state !== PlaybackState.UNKNOWN);
        player.setCanChangeVolume(!!volumeHandler);
        player.updateVolume(volume);
    }
    
    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
}

WebApp._getTrackLength = function()
{
    var elm = document.querySelector(".player .player-progress .progress-length");
    return Nuvola.parseTimeUsec(elm ? elm.innerText || null : null);
}

WebApp._isButtonEnabled = function(name)
{
    var button = this._getButton(name);
    return button && !button.disabled;
}

WebApp._clickButton = function(name)
{
    var button = this._getButton(name);
    if (button && !button.disabled)
    {
        Nuvola.clickOnElement(button);
        return true;
    }
    return false;
}

WebApp._getButton = function(name)
{
    if (name == "play" || name == "pause")
    {
		var button = document.querySelector(".player button.control.control-play");
		return (button && button.querySelector("svg.svg-icon-" + name)) ? button : null;
	}
    return document.querySelector(".player button.control.control-" + name);
}

// Handler of playback actions
WebApp._onActionActivated = function(emitter, name, param)
{
    switch (name)
    {
    case PlayerAction.TOGGLE_PLAY:
        if (!this._clickButton("play"))
            this._clickButton("pause");
        break;
    case PlayerAction.PLAY:
        this._clickButton("play");
        break;
    case PlayerAction.PAUSE:
    case PlayerAction.STOP:
        this._clickButton("pause");
        break;
    case PlayerAction.PREV_SONG:
        this._clickButton("prev");
        break;
    case PlayerAction.NEXT_SONG:
        this._clickButton("next");
        break;
    case PlayerAction.SEEK:
        var bar = document.querySelector(".player .player-progress .progress-buffer");
        var total = this._getTrackLength();
        if (bar && total >= param)
            Nuvola.clickOnElement(bar, param / total, 0.5);
        break;
    case PlayerAction.CHANGE_VOLUME:
        var head = document.getElementsByTagName("head")[0];
        head.appendChild(CHANGE_VOLUME_STYLE);
        var bar = document.querySelector(".player .volume .volume-progress .volume-progress-bar");
        if (bar)
            Nuvola.clickOnElement(bar, param, 0.5);
        head.removeChild(CHANGE_VOLUME_STYLE); 
        break;
    }
}

WebApp.start();

})(this);  // function(Nuvola)
