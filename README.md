Geo Tweet Visualization
======================

A geospatial representation of tweet data collected from the twitter fire hose api.

[Check it out!](http://dwaltz.github.io/geo-tweet-visual/)
For best visual results view use Chrome.

Middleware for this project is written in node.js and can be found [here](https://github.com/dwaltz/geo-tweet-visual-middleware).
Middleware is hosted on heroku making use of web-sockets impractical. For now, im just long polling data.

Base code for a [orthographic global D3 projection](https://github.com/mbostock/d3/wiki/Geo-Projections) was used as a reference for this project.
