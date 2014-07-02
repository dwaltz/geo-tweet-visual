define(function(require){
	"use strict";

	var topojson = require('topojson.v1');
	var d3 = require('d3');

	require('jquery');


	var width = $('.twitter-tour-canvas').width();
	var height = $('.twitter-tour-canvas').height();

	var $text = $('.user-text');
	var $textSection = $('#text-section');
	var $cover = $('.cover');
	var $textLoc = $('#text-location span');
	var tweetStats = [];
	var curCoordinates = [0,0];
	var curIndex = 0;
	var startedLoop;
	var projection, path, λ, φ, svg, backgroundCircle,
		userCircle,userItems,userImage, pulseCircle;

	(function createProjection(){
		projection = d3.geo.orthographic()
			.scale(480)
			.translate([width / 2, height / 2])
			.clipAngle(90);

		path = d3.geo.path()
			.projection(projection);

		λ = d3.scale.linear()
			.domain([0, width])
			.range([-180, 180]);

		φ = d3.scale.linear()
			.domain([0, height])
			.range([90, -90]);

		svg = d3.select(".twitter-tour-canvas").append("svg")
			.attr("class", "canvas")
			.attr("width", width)
			.attr("height", height);

		backgroundCircle = svg.append("svg:circle")
			.attr('cx', width / 2)
			.attr('cy', height / 2)
			.attr('r', projection.scale())
			.attr('class', 'geo-globe');

		d3.json("public/data/world.json", function(error, world) {
			svg.insert("path", ".graticule")
				.datum(topojson.feature(world, world.objects.land))
				.attr("class", "land")
				.attr("d", path);

			svg.insert("path", ".graticule")
				.datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
				.attr("class", "boundary")
				.attr("d", path);

			pulseCircle = svg.append("circle")
				.attr("r", 1)
				.attr("class","user-pulse")
				.attr("transform", function(d) { return "translate(" + width/2 + "," + height/2 + ")";})
				.attr("opacity",0);

			if(/chrom(e|ium)/.test(navigator.userAgent.toLowerCase())){
				pulse();
			}

			userCircle = svg.append("circle")
				.attr("r", 24)
				.attr("class","user-ping")
				.attr("opacity",0)
				//.style({"fill":'#16a765',"opacity":.6,"z-index":100})
				.attr("transform", function(d) { return "translate(" + width/2 + "," + height/2 + ")";});

			userItems = svg.append('defs').append('pattern').attr('id','user-image-ref')
				.attr('x',0).attr('y',0).attr('height',48).attr('width',48);

			userImage = userItems.append("image").attr('x',0).attr('y',0).attr('height',48).attr('width',48);
		});
	})();

	function switchLocation( index ){
		var data;

		if( index !== 0 && !index ) return false;
		data = tweetStats[index];

		if( !data ){
			curIndex = 0;
			data = tweetStats[0];
		}

		$text.html('<span class="user-name">@' + data.user.screen_name + ':</span> ' + data.text);
		$textLoc.html(data.place ? data.place.full_name : '');
		userImage.attr('xlink:href',data.user.profile_image_url_https);
		userCircle.style('fill', 'url(#user-image-ref)');
		translateGlobe([data.geo.coordinates[1] * (-1), data.geo.coordinates[0] * (-1)]);
		//animateGlobe([data.geo.coordinates[1] * (-1), data.geo.coordinates[0] * (-1)]);

		if( tweetStats.length && (index > tweetStats.length - 2) ) {
			makeDataRequest();
		}
	}

	function translateGlobe ( newCord ){
		var x = (curCoordinates[1] - newCord[1]) * Math.cos((curCoordinates[0] + newCord[0])/2);
		var y = (curCoordinates[0] - newCord[0]);
		var scaleFactor = Math.sqrt(x*x + y*y)/110;
		curCoordinates = newCord;

		d3.transition()
			.duration(2000)
			.tween("rotate", function() {
				var p = newCord,
					r = d3.interpolate(projection.rotate(), [p[0], p[1]]);
				return function(t) {
					projection.rotate(r(t))
						.scale(480 - quadratic(t)*100*scaleFactor);
					backgroundCircle.attr('r', projection.scale());
					svg.selectAll("path").attr("d", path);
				};
			})
			.each("end", function(){
				$textSection.fadeIn();
				$textLoc.fadeIn();
				pulseCircle.attr('opacity',.6);
				userCircle.attr('opacity',1);
			});
	}

	function quadratic(x){
		return ((((x-0.5)*(x- 0.5))/-2.5)+.1)*10
	}

	//old method used for transitions
	function animateGlobe( newCord ){
		var totalxdif, totalydif, xit, yit, curx, cury, difx, dify, scale, scaleCorrection, dilation;
		var count = 1;

		if( !xit ){
			totalxdif = Math.abs(curCoordinates[0] - newCord[0]);
			totalydif = Math.abs(curCoordinates[1] - newCord[1]);
			scale = 7.1 * Math.sqrt(totalxdif*totalxdif+totalydif*totalydif)/120;
			scale = scale > 7.1 ? 7.1 : scale;

			scaleCorrection = 357.911 - scale * scale * scale;

			difx = totalxdif/40;
			dify = totalydif/40;
			xit = (curCoordinates[0] > newCord[0] ? -1 : 1) * difx;
			yit = (curCoordinates[1] > newCord[1] ? -1 : 1) * dify;
			curx = curCoordinates[0];
			cury = curCoordinates[1];
		}

		(function change(){
			dilation = ((count > 20 ? count - 20 : count)/20) * 10 + 10 ;

			setTimeout(function(){
				curx = curx + xit;
				cury = cury + yit;

				projection
					.rotate([curx,cury])
					.scale( count < 20 ? 360 + ((scale - (scale/20)*count)*(scale - (scale/20)*count)*(scale - (scale/20)*count)) + scaleCorrection : 360 + (((scale/20)*count - scale)*((scale/20)*count - scale)*((scale/20)*count - scale)) + scaleCorrection);
				svg.selectAll("path").attr("d", path);
				backgroundCircle.attr('r', projection.scale());


				if( count < 40 ){
					count++;
					change();
				} else {
					curCoordinates = newCord;
					fadeIn();
				}
			}, dilation);
		})();
	}

	function fadeIn(){
		$textSection.fadeIn();
		$textLoc.fadeIn();
		pulseCircle.attr('opacity',.6);
		userCircle.attr('opacity',1);
	}

	function pulse() {
		(function repeat() {
			pulseCircle.transition()
				.duration(1500)
				.attr('stroke-width', 0.5)
				.attr("r", 50)
				.ease('sine')
				.each("end", function(){
					pulseCircle.attr("r", 10).attr('stroke-width', 20);
					repeat();
				});
		})();
	}

	function loop( first ){
		setTimeout(function(){
			if( tweetStats.length ){
				$cover.hide();
				$textSection.fadeOut(800);
				$textLoc.fadeOut(800);
				pulseCircle
					.attr('opacity',0);
				userCircle.transition()
					.duration(800)
					.attr('opacity',0)
					.each("end", function(){
						switchLocation( curIndex );
						curIndex++;
						loop();
					});
			}
		}, first ? 0 : 10000);
	}

	function makeDataRequest(){
		$.ajax({
			//url: 'http://geo-tweet-visual-middleware.herokuapp.com/tweets',
			method: 'GET',
			url: window.location.protocol + '//geo-tweet-visual-middleware.herokuapp.com/tweets',
			contentType: 'application/json',
			success: function(data){
				if( data.length ) {
					curIndex = 0;
					tweetStats = data;
					if( !startedLoop ) {
						startedLoop = true;
						loop( true );
					}
				}
			},
			error: function(){

			}
		});
		//setTimeout(makeDataRequest,20000);
	}

	makeDataRequest();
});