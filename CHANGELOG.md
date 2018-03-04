Changelog
=========

3.0 - March 4th, 2018
---------------------

  * Switched to Chromium backend and Media Stream Extension for audio playback instead of Flash plugin.
    Issue: tiliado/nuvola-app-deezer#12
  * Non-functional "Add to Favorite tracks" action was fixed. Issue: tiliado/nuvola-app-deezer#13

2.7 - July 19th, 2017
---------------------

  * Don't use Nuvola.parseTimeUsec in Nuvola 3 as it is available since Nuvola 4.5.
    Issue: tiliado/nuvola-app-deezer#11

2.6 - June 18th, 2017
---------------------

  * Metadata was updated according to the latest Nuvola SDK requirements.
  * Progress bar is fully integrated - it is possible to show track position and change it as well.
    Issue: tiliado/nuvolaruntime#155
  * Volume management is fully integrated - it is possible to show volume and change it as well.
    Issue: tiliado/nuvolaruntime#22
  * The button to add track to favourite tracks was integrated as a menu item shown in the menu of Unity launcher,
    Plank launcher and tray icon.

2.5 - November 26th, 2016
-------------------------

  * Fixed detection of playback state and play/pause button
  * Ported to use Nuvola SDK.

2.4 - May 22nd, 2016
--------------------

  * Added a complete icon set.
  * Added a license field to metadata.json.
  * Added information about contributing to the Deezer script.
