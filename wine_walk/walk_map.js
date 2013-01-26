// walk_map variable at global scope - I have to be able to reference the handler functions
// the href on the a, which I'm passing as a string. Ideally, I'd attach an onclick
// handler which would be a function object, rather than eval'ing the string, but...
// <shrug> I've got bigger fish to fry.

var g_walk_map = new Object();
g_walk_map.newPOILocation = new Object({"lat":0, "long":0});

(function($){
	
	var m_image_width  = 300; // XXX placeholder value
	var m_image_height = 300; // XXX placeholder value
	
	var m_mapTransform;
	var m_mapInvTransform;
	
	var m_current_poi;
	
	
	// Using Drupal behaviors to hook into document.onready()
	// I'm adding all of the special functionality, and div overlays, programmatically
	// because I've got little idea how to get Drupal to do it for me, and even less
	// interest in trying to figure that out.
	Drupal.behaviors.walk_map = {
		attach: function(context, settings) { 
			if (context == document) {
			
				// First create create overlays and dialogs... 
				var main_img = $('.node-walk-map  .field-name-field-pic img');
				main_img.wrap("<div id='walk_map_content_frame' style='position:relative' />");
				main_img.wrap("<div id='walk_map_frame' style='position:relative;overflow:auto' />");
				main_img.wrap("<div id='walk_map_image' />");
	
				// control overlay
				$('#walk_map_content_frame').append(' <div id="walk_map_controls" style="position:absolute; z-index:100; top:0px; left:0px"> \
											   <a id="reset"      href="javascript:g_walk_map.reset()"      style="position:absolute; top:40px;  left:40px; display:block; width:25px; height:25px; background:url(../sites/default/files/walkmap/nav_widget.png) no-repeat -100px 0"></a>\
											   <a id="scale_down" href="javascript:g_walk_map.ensmallen()"  style="position:absolute; top:40px; left:10px; display:block; width:25px; height:25px; background:url(../sites/default/files/walkmap/nav_widget.png) no-repeat -125px 0"></a>\
											   <a id="scale_up"   href="javascript:g_walk_map.embiggen()"   style="position:absolute; top:40px; left:70px; display:block; width:25px; height:25px; background:url(../sites/default/files/walkmap/nav_widget.png) no-repeat -150px 0"></a>\
											  </div>');
				// point-of-interest overlay
				$('#walk_map_frame').append(' <div id="walk_map_pois" style="position:absolute; z-index:10; top:0px; left:0px"/>');
				
				// walk route overlay
				$('#walk_map_frame').append(' <div id="walk_map_route_overlay" style="position:absolute; z-index:9;top:0px; left:0px"/>');
				
				// point-of-interest popup dialog
				$('#walk_map_content_frame').append(' <div id="walk_map_img_dialog"> \
												 <div class="walk_map_poi_main_div"> \
													<h2></h2> \
													<div class="walk_map_poi_image"> \
													<img> \
													</div> \
													<div class="walk_map_poi_header"> \
													Posted by&nbsp;<span class="walk_map_poi_author"></span> \
													on&nbsp;<span class="walk_map_poi_date"></span></div> \
													<div class="walk_map_poi_text"></div> \
												 </div> \
												 <div class="walk_map_poi_comment_div"> \
													<h2>Comments</h2> \
													<div class="comment_container" style="max-height:350px;overflow:auto;background:#DDD;color:#111;padding:10px;margin-top:5px"></div><br>\
													<div class="walk_map_poi_add_comment_div" > \
														<h2>Add New Comment</h2> \
													   <textarea id="walk_map_poi_new_comment" rows="7" style="width:250px"></textarea><br> \
													   <input type="button" value="Save Comment" onclick="g_walk_map.saveComment()"></button> \
													</div> \
												  </div></div> ');
				
				// add-point-of-interest popup dialog
				$('#walk_map_content_frame').append(' <div id="walk_map_add_poi_dialog">\
												<div id="walk_map_add_poi_frame" style="visibility:visible">\
												<h1>Add New Point of Interest</h1> \
												<div id="walk_map_add_poi_img_div"> \
													<h2> Add Picture </h2>\
													<div> \
													<img id="walk_map_add_poi_img" src="" ><br> \
													</div>\
													<input type="file" size="6" name="poi_image" id="poi_image" accept="image/jpg,image/jpeg,image/png" /><br> \
													<input type="button" value="Rotate Image" onclick="g_walk_map.rotatePOI()"/>\
												</div>\
												<div id="walk_map_add_poi_title_div"> \
													<h2> Add Title </h2>\
													<input type="text" name="add_poi_title_textfield" size="50"/>\
												</div>\
												<div id="walk_map_add_poi_description_div"> \
													<h2> Add Description </h2>\
													<textarea name="add_poi_textarea"/>\
												</div>\
												<div id="walk_map_add_poi_location_div"> \
													<h2> Set Location </h2>\
													<input type="radio" name="poi_radio" value="photo" disabled/> Use GPS data in photo<br> \
													<input type="radio" name="poi_radio" value="manual" checked="checked"/> Set Coordinates on map \
													<input type="button" value="Go to Map" onclick="g_walk_map.showPOIMap(true)"/>\
													<span id="walk_map_add_poi_gps_coords">no coordinates selected</span>\
												<div id="walk_map_add_poi_submit_div">\
													<h2> Submit </h2> \
													<div id="walk_map_add_poi_error_div"></div>\
													<input type="button" value="Submit" onclick="g_walk_map.submitPOI()"/> Submit new point of interest!\
												</div>\
												</div>\
												</div>\
												<div id="walk_map_add_poi_dialog_map_div" style="visibility:hidden, display:none"> \
													<h1> Select Location for Point of Interest </h1>\
													<h3>Double click to choose a spot</h3>\
													<div id="add_poi_dialog_img_frame" style="position:relative;width:600px;height:600px;overflow:auto""> \
														<img id="walk_map_choose_location_map" src="" >\
														<img id="add_poi_dialog_image_thinger" src="../sites/default/files/walkmap/geo_marker.png" style="position:absolute; visibility:hidden;">\
													</div>\
													<input type="button" value="Continue" onclick="g_walk_map.showPOIMap(false)"/>\
												</div> \
											 </div>'); 
											 
				// controls at the bottom of the map (out of frame)
				$('#walk_map_frame').wrap("<div id='add_poi_div'/>");
				if (Drupal.settings.walk_map_js.create_poi) {
					$('#add_poi_div').append("<br><input type='button' id='add_poi_button' onclick='g_walk_map.addPOI()' value='Add Point of Interest'/>");
				}
				if (!Drupal.settings.walk_map_js.post_comment) {
					$('.walk_map_poi_add_comment_div').css('visibility','hidden');
					$('.walk_map_poi_add_comment_div').css('display','none');
				}

				// if we have a route overlay, set it up
				if (getParameterByName("overlay") != "") {
					$('#walk_map_route_overlay').append('<img src=' + getParameterByName("overlay") + '>');
					$('#add_poi_div').append("<br><input type='button' id='toggle_overlay' onclick='g_walk_map.toggleOverlay()' value='Toggle Route Display'/>");
				}
				
				// setup the a duplicate map to be used when the user is selecting a 
				// point of interest manually
				$('#walk_map_choose_location_map').attr("src", main_img.attr("src"));
				$('#walk_map_choose_location_map').dblclick( function(event) {
					var caret = $('#add_poi_dialog_image_thinger');
					caret.css("z-index", 10000);  // XXX this z-index is completely random. Should pop it one above the map.
					if (typeof event.offsetX === "undefined" || typeof event.offsetY === "undefined") {
						var targetOffset = $(event.target).offset();
						event.offsetX = event.pageX - targetOffset.left;
						event.offsetY = event.pageY - targetOffset.top;
					}
					caret.css("top",  (event.offsetY - caret.height()) + "px");
					caret.css("left", (event.offsetX - Math.floor(caret.width()/4))+ "px");
					caret.css("visibility", "visible");
				});

				// generate the transformation matrices from passed-in values
				var coords = Drupal.settings.walk_map_js.coords;
				console.log("*** Creating map transform ***");
				m_mapTransform   = twod_xform.createTransform({x:parseFloat(coords.long1), y:parseFloat(coords.lat1)},
										   {x:parseFloat(coords.long2), y:parseFloat(coords.lat2)},
										   {x:parseFloat(coords.X1),   y:parseFloat(coords.Y1)},
										   {x:parseFloat(coords.X2),   y:parseFloat(coords.Y2)}, -Math.cos(coords.lat1 * Math.PI/180), 1);
				console.log("*** Creating inverse map transform ***");
				m_mapInvTransform = twod_xform.createTransform({x:parseFloat(coords.X1), y:parseFloat(coords.Y1)},
										   {x:parseFloat(coords.X2), y:parseFloat(coords.Y2)},
										   {x:parseFloat(coords.long1),   y:parseFloat(coords.lat1)},
										   {x:parseFloat(coords.long2),   y:parseFloat(coords.lat2)}, 1, -Math.cos(coords.lat1 * Math.PI/180));
										   
				// sanity test ... I'm really getting inverse matrices ...
				var pt = twod_xform.transform({x:1,y:1},m_mapTransform);
				var ptt = twod_xform.transform(pt, m_mapInvTransform);
				console.log("ptt is (" + ptt.x + "," + ptt.y + ")!");
	

				// Currently, I'm allowing the main image to be the size of the source map.
				// Since all the overlays are the same size as the main image, I need to
				// wait until the main image has been loaded before I can set the size of
				// the overlays.
				// XXX - this is not entirely true any more...
				
				// Unfortunately, the main image may or may not have been loaded by the 
				// time we get to this point in the code. To handle this, I create a local
				// function for setting up the overlays. The function will either be 
				// called inline (if the main image has already been loaded) or later, as 
				// a callback (if the main image hasn't already been loaded).
				var setupOverlaysAndPOIs = function(main_image) {
					m_image_height = main_image.naturalHeight;
					m_image_width  = main_image.naturalWidth;
					console.log(" map width is "  + m_image_width);
					console.log(" map height is " + m_image_height);
					
					// size of the view is the minimum of the size of the image and the
					// size of the frame.
					console.log("initial width is " + $("#walk_map_image").width());
					$("#walk_map_frame").css("max-height", "800px"); // set maximum height to 800
					var view_height = Math.min(m_image_height, 800);
					var view_width  = Math.min(m_image_width, $("#walk_map_frame").width());
					
					// If the image is bigger than the view, scale down to fit.
					m_scale = Math.min(view_height/m_image_height, view_width/m_image_width);
					m_scale_min = m_scale;
					redraw_map();
				}
				
				if (main_img[0].complete || main_img[0].readyState == 4) {
					setupOverlaysAndPOIs(main_img[0]);
				} else {
					main_img.load(function() { 
						setupOverlaysAndPOIs(this);
					});
				}
				
				// Set handlers for the poi overlays // XXX this is where I ought to 
				// set the handlers for everything I defined in 'onclick' in the source,
				// but whatever for now.
				/*
				var pois = $('#walk_map_pois');
				pois.mousedown(mouseDownInImage);
				pois.mouseleave(mouseLeaveInImage);
				pois.mousemove(mouseMoveInImage);
				pois.mouseup(mouseUpInImage);
				*/
				
			}
		}
	}
	
	
	// thanks Artem Barger and Stack Overflow for the code below
	function getParameterByName(name)
	{
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.search);
		if (results == null)
			return "";
		else
			var decoded = decodeURI(results[1]);
			return decodeURIComponent(decodeURIComponent(results[1].replace(/\+/g, " "))); // yes, we get to do it twice.
	}
	
	/* 
	 * Toggle showing the route overlay
	 */
	var overlayOn = true;
	function toggleOverlay()
	{
		if (overlayOn) {
			$('#walk_map_route_overlay').css('visibility', 'hidden');
		}else {
			$('#walk_map_route_overlay').css('visibility', 'visible');
		}
		overlayOn = !overlayOn;
	}
	g_walk_map.toggleOverlay = toggleOverlay;


	/*
	 * Scaling functions - embiggen and ensmallen
	 */
	var SCALE_MAX   = 6;   // XXX Need to do a better job with the scaling...
	var m_scale    = 1;
	var m_scale_min = 1;
	
	function embiggen()
	{
		if (!control_enabled("scale_up")) {
			return;
		}
		console.log("scale up called");

		var old_scale = m_scale;
		m_scale = Math.min(SCALE_MAX, m_scale + 1);

		redraw_map(old_scale);		
	}
	g_walk_map.embiggen = embiggen;
	
	function ensmallen()
	{
		if (!control_enabled("scale_down")) {
			return;
		}
		
		console.log("scale down called");
	
		var old_scale = m_scale;
		m_scale = Math.max(m_scale_min, m_scale - 1);
		redraw_map(old_scale);		
	}
	g_walk_map.ensmallen = ensmallen;
	
	/* 
	 * Reset the scale
	 */
	function reset()
	{
		console.log("reset called");

		var old_scale = m_scale;
		m_scale = m_scale_min;

		redraw_map(old_scale);
	}
	g_walk_map.reset = reset;

	/*
	 * redraw_map
	 * Redraw the map and the overlays, set the controls appropriately
	 */
	function redraw_map(old_scale){
	
		// stash away some values for later
		var viewport = $('#walk_map_frame');
		var old_view_height = viewport.height();
		var old_view_width  = viewport.width();
		var offset_x = viewport.scrollLeft();
		var offset_y = viewport.scrollTop();
		
		// rescale the image
		var map = $('#walk_map_image img');
		var widthStr  = String(Math.round(m_scale * m_image_width)) + "px";
		var heightStr = String(Math.round(m_scale * m_image_height)) + "px";
		map.css("width", widthStr);
		map.css("height", heightStr);
		
		// keep the image centered if we can
		if (old_scale) {
			var new_view_height = viewport.height();
			var new_view_width  = viewport.width();
			var center_x = (offset_x + old_view_width/2)/old_scale;
			var center_y = (offset_y + old_view_height/2)/old_scale;
			
			var new_offset_x = (m_scale*center_x) - new_view_width/2;
			var new_offset_y = (m_scale*center_y) - new_view_height/2;
			
			if (new_offset_x > 0) {
				viewport.scrollLeft(new_offset_x);
			}
			
			if (new_offset_y > 0) {
				viewport.scrollTop(new_offset_y);
			}
		}
		
		// rescale the route overlay if it exists
		var route = $('#walk_map_route_overlay img');
		if (route) {
			route.css("width", widthStr);
			route.css("height", heightStr);
		}
		
		// place the POIs appropriately.
		redraw_POIs();
		
		control_enable("scale_down", m_scale > m_scale_min);
		control_enable("scale_up", m_scale < SCALE_MAX);
	}
	
	/*
	 * Control_enable(d)
	 * Utility functions for enabling the scale control buttons, and determining
	 * whether they are enabled.
	 */
	
	function control_enabled(control)
	{
		var pos = $('#' + control).css('background-position');
		if (pos && pos.length) {
			var pos_y = pos.split(' ');
			return (pos_y[1] == "0px");
		}
		return false;
	}
	
	function control_enable(control, tf)
	{
		var offset;
		if (tf) {
			offset = "0px";
		} else {
			offset = "-25px";
		}

		var pos = $('#' + control).css('background-position');
		if (pos && pos.length) {
			var pos_x = pos.split(' ')[0];
			$('#' + control).css('background-position', pos_x + " " + offset);
		}
	}
	
		
	/* 
	 * redraw_POIs - Put markers for points of interest on the map.
	 */
	function redraw_POIs()
	{
		// reset the points of interest div
		var POIDiv = document.getElementById("walk_map_pois");
		POIDiv.innerHTML = "";  // XXX - watch for memory leaks
		
		// place the points of interest on the map
		var POIArray = Drupal.settings.walk_map_js.poi_array;
		for (var i=0; i<POIArray.length; i++) {
			var POI = POIArray[i];
	
			// Get map coordinates of the POI for this particular view
			var mapCoords = twod_xform.transform({x:parseFloat(POI.long),y:parseFloat(POI.lat)}, m_mapTransform);
			mapCoords.x = mapCoords.x * m_scale; // - m_x_offset * m_scale;
			mapCoords.y = mapCoords.y * m_scale; // - m_y_offset * m_scale;
			
			console.log("POI at coordinates (" + mapCoords.x/m_scale+ "," + mapCoords.y/m_scale + ")");

			//  Place it on the map.
			var element = document.createElement("a");
//			if (POI.image != "" && POI.image != null){
				element.className = "walk_map_photo_link";
//			} else {
//				element.className = "walk_map_text_link";
//			}
			element.setAttribute("href","javascript:g_walk_map.showPOI("+ i + ")");
			
			element.style.top  = String(mapCoords.y - 34) + "px"; // XXX this is the offset for the caret... need a better way to handle this
			element.style.left = String(mapCoords.x - 9) + "px"; // XXX ditto above
			POIDiv.appendChild(element);
		}
	}
	
	/* 
	 * showPOI() - Show Point of interest. The point of interest is shown in a modal 
	 * dialog overlaying the map.
	 */
	function showPOI(idx)
	{
		// show specified POI
		console.log("would be showing POI " + idx);
		
		var poi = Drupal.settings.walk_map_js.poi_array[idx];
		if (poi == null || poi == undefined) {
			console.log("No POI at array id " + idx);
			return;
		}
		
		// GET /rest/node/poi.node_id
		// on successful GET, show dialog, GET image. (  // XXX - this should be in .ajax
		var promise = $.getJSON('../rest/node/' + poi.poi_id + '.json', function(data){

			// Add content to main part of dialog
			var title = $("#walk_map_img_dialog .walk_map_poi_main_div h2");
			if (data.title != undefined && data.title != "") {
				title.text(data.title);
				title.css("visibility", "visible");
			}else{
				title.css("visibility","hidden");
			}
			
			// add image to dialog
			var img = $("#walk_map_img_dialog .walk_map_poi_image img");
			var imgDiv = $("#walk_map_img_dialog .walk_map_poi_image");
			if (data.field_pic.und != undefined ) {
				console.log(" image is " + data.field_pic.und[0].filename);
				img.attr("src", '../sites/default/files/' + data.field_pic.und[0].filename);
				imgDiv.css("visibility", "visible");
				imgDiv.css("display", "block");
			} else {
				imgDiv.css("visibility", "hidden");
				imgDiv.css("display", "none");
			}
			
			// add author and date
			var author = $(".walk_map_poi_author");
			author.text(data.name);
			author.css("visibility", "visible");
			var date = $(".walk_map_poi_date");
			date.text(formatDate(new Date(data.created * 1000))); 
			date.css("visibility", "visible");
				
			// add text
			var text = $("#walk_map_img_dialog .walk_map_poi_text");
			if (data.body.und && data.body.und.length != 0) {
				text.html(data.body.und[0].safe_value);
				text.css("visibility", "visible");
			} else {
				text.css("visibility", "hidden");
			}
			
			$(".walk_map_poi_comment_div").css("visibility", "visible");
			$(".walk_map_poi_comment_div .comment_container").css("visibility", "hidden");
			$(".walk_map_poi_comment_div .comment_container").css("display", "none");
			
			// Now add comments in the side bar
			var commentReq = $.getJSON('../rest/node/' + poi.poi_id + '/comments.json', function(data){
				for (var each in data) {
					displayComment({author:data[each].name, date:data[each].created, text:data[each].comment_body.und[0].value});
				}
			});	
		});
		
		// set current point of interest 
		m_current_poi = idx;
		
		// Show as modal dialog
		$("#walk_map_img_dialog").modal();
	}
	g_walk_map.showPOI = showPOI;
	
	/* 
	 * Functions for displaying and adding comments.
	 */
	function displayComment(comment)
	{
		var comments = $(".walk_map_poi_comment_div .comment_container");
		comments.css("visibility", "visible");
		comments.css("display", "block");
	
		var author = comment.author;
		var date   = comment.date;
		var text   = comment.text;
		
		// create comment container
		var commentDiv = document.createElement("div");
		commentDiv.className = "walk_map_comment_class";
		
		// set up header
		var headerDiv = document.createElement("div");
		headerDiv.className = "walk_map_comment_header";
		var authorSpan = document.createElement("span");
		var dateSpan = document.createElement("span");
		dateSpan.className = "walk_map_comment_date";
		//headerDiv.appendChild(document.createTextNode("Author: "));
		headerDiv.appendChild(authorSpan);
		headerDiv.appendChild(document.createTextNode(" on "));
		headerDiv.appendChild(dateSpan);
		
		// set up comment text div
		var textDiv   = document.createElement("div");
		textDiv.className = "walk_map_comment_text";
		
		// more structure
		commentDiv.appendChild(headerDiv);
		commentDiv.appendChild(textDiv);
		commentDiv.appendChild(document.createElement("br")); 
		
		// now set actual content of elements
		authorSpan.innerHTML = author; // XXX make sure this is properly escaped!!!
		dateSpan.innerHTML = formatDate(new Date(date * 1000));
		textDiv.innerHTML = text;
		comments.prepend(commentDiv);
	}
	
	function saveComment()
	{
		// display the new comment with the other comments
		var comment_value = $("#walk_map_poi_new_comment").val()
		var new_comment = {author:Drupal.settings.walk_map_js.user, date:Math.floor(new Date().getTime()/1000), text:comment_value};
		displayComment(new_comment);
		
		// clear the new comment field
		$("#walk_map_poi_new_comment").val("");

		// construct comment for posting
		var POI = Drupal.settings.walk_map_js.poi_array[m_current_poi];
		var comment = new Object();
		comment.language = "und";
		comment['subject'] = "";
		comment['comment_body[und][0][value]'] = comment_value;
		comment['comment_body[und][0][format]'] = "plain_text";
		comment.nid = POI.poi_id;

		// post to back end
		$.ajax ({
			type: "POST",
			beforeSend: function(xhrObj) {sendSessionCookie(xhrObj);},
			url: '../rest/comment',
			data: comment, 
			success: function (data) {
				console.log("POST new comment successful!"); 
			}
    	});
	}
	g_walk_map.saveComment = saveComment;
	
	
	function formatDate(date) {
		return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
	}
	

	/*
	 * Functions that control adding a point of interest. Points of interest are added
	 * through a dialog box that pops up over the main map
	 */
	
	/* 
	 * addPOI() - pop up POI dialog
	 */
	function addPOI()
	{
		// show poi add dialog as modal dialog.
		resetAddPOIImage();
		resetNewPOILocation();
		$("#walk_map_add_poi_dialog").modal({onShow: function() {
			var input = $("#poi_image");
			input.on("change", function(evt) {
				console.log("input changed, is this an image file?");
				var preview = document.getElementById("walk_map_add_poi_img");
				preview.style.visiblity = "hidden";
				preview.style.display="none";
				resetAddPOIImage(); 		
				var file = this.files[0];
				if (file == null || file == undefined || file.type.match(/image.*/) == null) {
					// XXX - do I need to do the stuff below every time too?
					this.files[0] = null;
					preview.src = "";
					preview.style.width = "0px";
					preview.style.height = "0px";
					preview.parentNode.style.width = "0px";
					preview.parentNode.style.height = "0px";
					$("#walk_map_add_poi_location_div input:radio[name=poi_radio]:nth(0)").attr("disabled", "disabled");
					$("#walk_map_add_poi_location_div input:radio[name=poi_radio]:nth(1)").attr("checked", "true");
					preview.style.visibility = "visible";
					preview.style.display = "block";
				} else { 
					console.log("Have image file!");
					var preview = document.getElementById("walk_map_add_poi_img");
 					if (window.FileReader ) {  // Safari doesn't yet have filereader
						var reader = new FileReader();
						reader.onload = (function(file) {
							// Put image into preview 
							preview.src = file.target.result;
							preview.onload = function() {
								// set width and height appropriately...
								console.log(" file read - width is " + this.naturalWidth + ", height is " + this.naturalHeight);
								var heightScale = g_walk_map.maxheight/this.naturalHeight;
								var widthScale  = g_walk_map.maxwidth/this.naturalWidth;
								var width, height;
								if (this.naturalWidth * heightScale <= g_walk_map.maxwidth) { 
									width  = Math.floor(this.naturalWidth * heightScale) + "px";
									height = g_walk_map.maxheight + "px";
								} else {
									width  = g_walk_map.maxwidth + "px";
									height = Math.floor(this.naturalHeight * widthScale) + "px";
								}
								this.style.width = width;
								this.style.height = height;
								this.parentNode.style.width  = width;
								this.parentNode.style.height = height;
								// show image again
								this.style.visibility= "visible";
								this.style.display = "block";

								// enable GPS from image
								$("#walk_map_add_poi_location_div input:radio[name=poi_radio]:nth(0)").removeAttr("disabled");
							}
						});
						reader.readAsDataURL(file);
					} else {// end FileReader
						// enable GPS from image
						$("#walk_map_add_poi_location_div input:radio[name=poi_radio]:nth(0)").removeAttr("disabled");
					} // XXX shouldn't be having the disable attr set like this...
				}
			});
		}});
	}
	g_walk_map.addPOI = addPOI;

	/* addPOIShowError() - utility function for displaying an error string when adding
	 * the POI has failed.
	 */
	function addPOIShowError(errorStr)
	{
		var errorDiv = $("#walk_map_add_poi_error_div");
		if (errorStr == undefined || errorStr == null || errorStr == "") {
			errorDiv.css("margin", "0px");
			errorDiv.html("");
		} else {
			errorDiv.css("margin", "8px");
			errorDiv.html(errorStr);
		}
	}
	
	/* 
	 * rotatePOI() 
	 * Rotate (by 90 degrees) the current photo that the user is trying to associate
	 * with a point of interest
	 */
	g_walk_map.currentPOIRotation = 0;
	g_walk_map.maxwidth = 400;
	g_walk_map.maxheight = 200;
	function rotatePOI()
	{
		// rotate POI by 90 degrees
		g_walk_map.currentPOIRotation = (g_walk_map.currentPOIRotation + 90) % 360;
		
		// get image width and height, modify img element appropriately
		var previewJQ = $('#walk_map_add_poi_img');
		var preview = document.getElementById("walk_map_add_poi_img");
		var width  = preview.naturalWidth;
		var height = preview.naturalHeight;
		var rotated = false;
		console.log(" file rotate - width is " + width + ", height is " + height);
		if (g_walk_map.currentPOIRotation == 90 || g_walk_map.currentPOIRotation == 270) {
			var tmp = width;
			width  = height;
			height = tmp;
			rotated = true;
		}
		// set width and height appropriately...
		// XXX this is repeated code!!! see above, when initializing
		var heightScale = g_walk_map.maxheight/height;
		var widthScale  = g_walk_map.maxwidth/width;
		if (width * heightScale <= g_walk_map.maxwidth) { 
			// Scale so the height fills the space.
			var newWidth = Math.floor(width * heightScale);
			var newHeight = g_walk_map.maxheight;
			if (!rotated) {
				previewJQ.width(newWidth);
				previewJQ.height(newHeight);
				previewJQ.parent().width(newWidth);
				previewJQ.parent().height(newHeight);
				preview.style.top = "0px";
				preview.style.left = "0px";
			} else {
				preview.style.width  = newHeight + "px";
				preview.style.height = newWidth + "px";
				var offset = (previewJQ.offset());
				offset.left -=  Math.floor(newHeight/2 - newWidth/2);
				offset.top  -=  Math.floor(newWidth/2 - newHeight/2);
				previewJQ.offset(offset);
				previewJQ.parent().width(newWidth);
				previewJQ.parent().height(newHeight);
			}			
			console.log("scaling to maxheight, scale factor is " + heightScale);
		} else {
			preview.style.width  = g_walk_map.maxwidth + "px";
			preview.style.height = Math.floor(height * widthScale) + "px";
			console.log("scaling to maxwidth, scale factor is " + widthScale);
		}
		
		
		// Now do the rotation...
		var rotation = g_walk_map.currentPOIRotation;
		if (rotation == 0) {
			preview.className = 'rot0';
		} else if (rotation == 90) {
			preview.className = 'rot90';
		} else if (rotation == 180) {
			preview.className = 'rot180';
		} else {
			preview.className = 'rot270';
		}
	}
	g_walk_map.rotatePOI = rotatePOI;	
	
	/* 
	 * showPOIMap()
	 * As part of adding a point of interest, allow the user to set the POI location
	 * by selecting it on a map
	 */
	function showPOIMap(tf)
	{				
		if (tf) { // display map
			$("#walk_map_add_poi_frame").css("visibility", "hidden");
			$("#walk_map_add_poi_frame").css("display", "none");
			$("#walk_map_add_poi_dialog_map_div").css("visibility", "visible");
			$("#walk_map_add_poi_dialog_map_div").css("display", "block");
		} else {
			var caret = $('#add_poi_dialog_image_thinger');
			var caretSet = caret.css('visibility') != 'hidden'; // caret is not visible if the user did not double click
			var pos = caret.position(); // make sure to get the caret position before we hide the enclosing blocks!!
			var caretH = caret.height();
			var caretW = caret.width();
			console.log("CaretW is " + caretW + " caretH is " + caretH);
			var scrollTop = $('#add_poi_dialog_img_frame').scrollTop();
			var scrollLeft = $('#add_poi_dialog_img_frame').scrollLeft();
			$("#walk_map_add_poi_frame").css("visibility", "visible");
			$("#walk_map_add_poi_frame").css("display", "block");
			$("#walk_map_add_poi_dialog_map_div").css("visibility", "hidden");
			$("#walk_map_add_poi_dialog_map_div").css("display", "none");
			// Get the location of the poi from the current location of the caret.
			if (caretSet) {
				console.log("Setting caret position. ScrollTop is " + scrollTop + " scrollLeft is " + scrollLeft);
				var GPSpos = twod_xform.transform({x:pos.left + Math.floor(caretW/4) + scrollLeft,y:pos.top + caretH + scrollTop}, m_mapInvTransform);
				console.log(" add poi. (x,y) = (" + (pos.left + Math.floor(caretW/4) + scrollLeft) + "," + (pos.top + caretH + scrollTop) + "), (long,lat) = (" + Math.round(GPSpos.x * 1000000)/1000000 + ","  + Math.round(GPSpos.y*1000000)/1000000 + ")");
				setNewPOILocation(GPSpos.y, GPSpos.x);
			}
		}
	}
	g_walk_map.showPOIMap = showPOIMap;
	
	/* 
	 * submitPOI() - send new POI to the server 
	 */
	function submitPOI()
	{
		var poi_image = document.getElementById("poi_image").files[0];
		
		// first - basic validation
		
		// XXX - not currently doing client side checking for valid GPS information in the
		// photo.
		
		// need image, description, or both...
		if (!poi_image && (description.length == 0 || /^\s*$/.test(description))) {
			addPOIShowError("You need either a description or a picture (or both)");
			return;
		}

		// if we're setting the gps coordinates manually, verify that they have actually
		// been set
//		$("#walk_map_add_poi_location_div input:radio[name=poi_radio]:nth(1)").attr("checked", "true");

		var selected = $('#walk_map_add_poi_location_div input:radio[name=poi_radio]:checked');
		if (selected.val() == "manual"  && 
		   (!g_walk_map.newPOILocation || g_walk_map.newPOILocation.lat == 0 || g_walk_map.newPOILocation.long == 0)) {
			addPOIShowError("You need to set a location for your point of interest");
			return;
		}
		var useManualGPS = (selected.val() == "manual");
		console.log("selected value is " + selected.val());
				
		// clear error div
		addPOIShowError();
		
		var poiNodeSubmit = function(picId) {
			var node = new Object();
			node['language'] = "und";
			node['title'] = $('#walk_map_add_poi_title_div input').val();
			node['type']  = "poi";
			node['body[und][0][value]']  = $('#walk_map_add_poi_description_div textarea').val();
			node['body[und][0][format]'] = "plain_text"; // XXX would be nice to be able to do html text
			node['field_walk[und][0][value]']   = Drupal.settings.walk_map_js.walk_id;
			node['field_walkmap[und][0][value]']= Drupal.settings.walk_map_js.wmap_id;
			if (picId != undefined && picId != null) {
				node['field_pic[und][0][fid]'] = picId;
			}
			if (useManualGPS) {
				node['field_lat[und][0][value]']  = String(Math.round(g_walk_map.newPOILocation.lat  *10000)/10000);
				node['field_long[und][0][value]'] = String(Math.round(g_walk_map.newPOILocation.long *10000)/10000);
			} else {
				node['extract_geolocation'] = 'true';
				node['field_lat[und][0][value]'] = 0;  // XXX should not have to do this...
				node['field_long[und][0][value]'] = 0;
			}
			$.ajax({
				// what does a point of interest need? An author, a body, a picture (maybe), a date... that's it!
				url: "../rest/node.json",
				type: "POST",
				data: node,
				beforeSend: function(xhrObj) {sendSessionCookie(xhrObj);},
				success: function (result) {
					console.log("POST new poi successful, result is " + result);
					console.log("latitude is " + result['lat'] + " longitude is " + result['long']);
					$.modal.close();
					if (result['lat'] != undefined && result['long'] != undefined) {
						Drupal.settings.walk_map_js.poi_array.push({"poi_id":result['nid'], "lat":result['lat'], "long":result['long']});
						redraw_POIs();
					}
				},
				error: function (result) {
					console.log("POST new poi fails, error is " + result);
					addPOIShowError("Problem creating new point of interest");
				}
			});
		}
		
		// now do the submit. If we have an image, we submit that first
		if (poi_image) {
/*		
			if (window.FormData) {
				console.log("Window has form data");
				formdata = new FormData();
				document.getElementById("btn").style.display = "none";
			}
*/		
			var formdata = new FormData();  // XXX check for non-html 5 compatible browsers
			formdata.append("files[]", poi_image);
			console.log("Submitting image file!");
			// XXX - give the post a query option that I can use for scaling/cropping etc...
			var createPOIurl = "../rest/file/create_raw.json?poi_image=true&rotation=" + g_walk_map.currentPOIRotation;
			$.ajax({
				url:  createPOIurl,
				type: "POST",
				beforeSend: function(xhrObj) {sendSessionCookie(xhrObj);},
				data: formdata,
				cache: false,
				processData: false,
				contentType: false,
				success: function(result) {
					console.log("Image file successfully uploaded, now attempting to upload POI data");
					poiNodeSubmit(result[0]['fid']);					
				},
				error: function(result) {
					console.log("Problem submitting image!");
					addPOIShowError("Problem with image - try a smaller one");
				}
			});
		} else {
			poiNodeSubmit();
		}
	}
	g_walk_map.submitPOI = submitPOI;
	
	/*
	 * resetAddPOIImage()
	 * Utility function - reset offset and rotation used for displaying the image in the
	 * add poi dialog 
	 */
	function resetAddPOIImage()
	{
		g_walk_map.currentPOIRotation = 0;
		var preview = document.getElementById("walk_map_add_poi_img");
		preview.className = "rot0";
		preview.style.top = "0px";
		preview.style.left = "0px";
	}
	
	function resetNewPOILocation()
	{
		setNewPOILocation(0,0);
		var caret = $('#add_poi_dialog_image_thinger');
		caret.css("visibility", "hidden");
	}
	
	function setNewPOILocation(latitude, longitude)
	{
		g_walk_map.newPOILocation = new Object({"lat":latitude, "long":longitude});
		if (latitude == 0 && longitude == 0) {
			$("#walk_map_add_poi_gps_coords").html(" coordinates not set");
		} else {
			$("#walk_map_add_poi_gps_coords").html(" Lat: " + Math.round(latitude*10000)/10000 + " Long: " + Math.round(longitude*10000)/10000 );
		}
	}
	
	// Utility function for sending session information
	function sendSessionCookie(xhr){
		if (Drupal.settings.walk_map_js.sess_name != undefined) {
			xhr.setRequestHeader("Cooke", Drupal.settings.walk_map_js.sess_name + "=" + Drupal.settings.walk_map_js.sess_id);
		}
	}
	

})(jQuery);
;

// Bug List:
//p1
// - When there's a problem with uploading the image, the help text pushes the submit button off the bottom of the form
// - Horizontal pictures don't seem to get scaled right? Or was it just my pic of Inspiration point?

//p2
// - Logo!!
// - Get drush working, and get backup and restore working
// - Source control!!! - looks like it may have to be git. Sigh.
// - underlines on the view - border-bottom: 1px wheat - doesn't work. wtf?
// - Don't have scale factors scale quite so fast!
// - ?? js error in android browser?


//p3
// *** Feature Galleries ***
// Create galleries for each walk, each park, each winery. - see drupal form submit, and there's got to be a hook_node_create or something.
// Automatically add POI images to the gallery for the walk, park, etc - ditto.
// Link to gallery for walk, park, or winery on the main walk, park, or winery page.
// If we're going to do image galleries, it would be nice to save the images bigger than 580/600. That's sort of small!
// *** Feature - POI aggregation ***
// How do you handle many points of interest on top of one another?
// *** Feature - POI teaser title ***
// Roll over POIs - show title
// *** Feature - All POIs in a park ***
// show all pois on a map for a park
//
// *** BUGS ***
// Warning if the image geolocation is off the map
// Add user picture for me.
// OpenId REST authentication
// Comment width doesn't expand to take advantage of the picture not being at max width
// Add New comment not the same width as the current comments
// popup dialog doesn't expand/contract when picture is smaller.
// Breadcrumbs


//p4
// Errors on upload are not necessarily correct...
// Error handling when submitting an image that is too big. (We allow up to 8MB now, so that shouldn't be too much of an issue)
// FF add file thinger looks really weird - no obvious way to change this
// ?? Mailing list ?? how to get that up and running?
// Would really like if I could create the content types programmatically. Still not sure how to do this, and not high priority

/*
function poiAggregate(POIArray)
{
	var arrayLen = POIArray.length;
	var POIAggregates = new Array();
	for (var i=0; i<arrayLen; i++) {
		var curPOI = POIArray[i];
		if (curPOI.processed) {
			continue;
		}
		var POIAggregate = new Array();
		POIAggregate.push(curPOI);
		curPOI.processed = true;
		for (var j=i+1; j<arrayLen; j++) {
			var testPOI = POIArray[j];
			if (testPOI.processed) {
				continue;
			}
			if (POIDistance(curPOI, testPOI) < POI_AGGREGATE_DISTANCE) {
				POIAggregate.push(testPOI);
				testPOI.processed = true;
			}
		}
		POIAggregates.push(POIAggregate);
	}
	return POIAggregates;
}
// hook node insert - for hooking on node creation. To create appropriate gallery

// rollover - use the hover handler.
// Pop up a tiny little dialog that shows the title of the POI(s).
*/
// POI aggregation:
// - set POI aggregation radius
// For each poi, if POI has not been process
//   Look at each unprocessed POI. If within radius of current POI, add it to aggregation list for that POI and set it to processed.
// To test:

// done
// Remove view/edit buttons. (Permissions issue. I've got permissions turned off locally, does not appear to be a big problem on real site.)
// FF puts the squiggly thing in the wrong place
// Can't add a second POI - image widget doesn't update properly
// Map in add poi draws outside the lines
// Send session information with request. I'm getting logged out!!
//   This requires a Cookie header with <sessionname> = <sessionid> as the field. 
//   This data is set at login, and with each page request... it's not clear to me how the page regenerates it. (also requires
//   authentication to be on at the service level... otherwise, it simply swaps over to the anonymous user.
// Make sure author name gets put into POI creation
// How come anonymous can comment on links but can't create POIs? (may be irrelevant once I get the sign on working)
// Comment name is anonymous? still?
// Need to add Parks and Wineries to main WW site
// Remove recent comments?
// Create new account for me that I can use..
// What's with the embedded map in the About Us dialog?
// Change name from test to real...
// What does Search button do and why do I have it?
// Remove showing title on comments
// change path to REST service - it's currently 'test'
// When adding a comment, the comment looks bad
// Add comment button should go away once you are actually adding a comment
// Comments won't scroll
// Remove any annoying penis spam.
// If the map is too big, it will draw entirely over the add POI dialog when you go to place the image on the map
// Make user add title when adding poi
// When adding an image, we nuke the manually set coordinates. Probably don't want to do this. (If we do, we should reset the coordinates displayed, and the thinger location)
// POI image looks bad
// height scaling isn't quite working right now... check the size of things wrt the popup dialogs...
// Safari doesn't allow you to use the geocoordinates in your image since the filereader check fails.
// Scale thingers not grayed out at appropriate times
// reset doesn't always reset offsets correctly
// Remove loss of precision math from floating point calculation. Not needed.
// - On the walk page, make headings stand out (like they do on the Winery and Park pages) - in general, make the walk page
//   look as nice as the other pages.
// Scaling, cropping, and the walkmap image. There's an assumption right now that the map isn't scaled, which isn't always true...
// It appears that my coordinates are wrong when trying to double click to set a poi
// ** Unauthorized people should not see a button to add a poi. Just view please.
// ** Unauthorized people should not see a button to add comments on the POI.
// ** Add openId stuff to main site
// - ** Need a way to allow users to download/view the PDFs. (View in new window? Download? Just view in new window would be fine. Simply want a way 
// for people to see the pdf) - File + File Download.
// New comment added with username 'anon'
// ** Change over to browser scroll
// ** Nav buttons don't work in FF
// Remove test points of interest
// ** add path overlays
// Maps for Huddart, Phleger, Steven's Creek, Pichetti, Fremont Older, Big Basin
// - 'Add poi' can be set too low. Need to change the size of the frame if the image is small.
// - On scale, maintain center position if possible





