var MyChromeMediaMonitor = (function () {
	
	var _monitoredQueue = (function(){
		var _map = new Map();
        return {
			length: function(){
				return _map.size;
			},
        	offer: function (mediaItem) {
				if(_map.size >= MyChromeConfig.get("monitoredQueueMax")){
					return ;
				}
				var zeroJump = (_map.size == 0);
				
				_map.set(mediaItem.url, mediaItem);
				
				if(zeroJump){
					MyBootstrap.updateIcon(true);
				}
        	},
			take: function(url){
				var item = _map.get(url);
				_map.delete(url);
				
				if(_map.size == 0){
					MyBootstrap.updateIcon(false);
				}
				return item;
			},
			view: function(){
				var retval = [];
				for(let entry of _map){
					retval.push( MyUtils.clone(entry[1], ["parseResult"]) );
				}
				return retval;
			},
			clear: function(){
				_map.clear();
				MyBootstrap.updateIcon(false);
			}
        };
	})();
	

	
	function _getMedia(url, responseHeaders){
		/*
		Browsers use the MIME type, not the file extension, to determine how to process a URL
		*/
		var contentType = null;
		var contentRange = null;
		var contentLength = null;
		if(responseHeaders){
			for(var x in responseHeaders){
				var name = responseHeaders[x].name.toLowerCase();
				if(contentType == null && name == "content-type"){
					contentType = responseHeaders[x].value;
				}else if(contentRange == null && name == "content-range"){
					contentRange = responseHeaders[x].value;
				}else if(contentLength == null && name == "content-length"){
					contentLength = responseHeaders[x].value;
				}
				
				if(contentType != null && contentRange != null && contentLength != null){
					break;
				}
			}
		}
		
		
		// m3u8 , video , audio
		var mediaType = null;
		var mime = null;
		if(contentType){
			var m = contentType.indexOf(";");
			mime = contentType.substring(0, m == -1 ? contentType.length : m).trim().toLowerCase();
			
			/*
			Each Playlist file MUST be identifiable either by the path component
			of its URI or by HTTP Content-Type.  In the first case, the path MUST
			end with either .m3u8 or .m3u.  In the second, the HTTP Content-Type
			MUST be "application/vnd.apple.mpegurl" or "audio/mpegurl".  Clients
			SHOULD refuse to parse Playlists that are not so identified.
			*/
			if(mime == "application/vnd.apple.mpegurl" || mime == "audio/mpegurl"){
				mediaType = "m3u8";
			}else if(mime == "video/mp2t"){
				return null;
			}else{
				var type = mime.substring(0, mime.indexOf("/"));
				if(type == "audio" || type == "video"){
					mediaType = type;
				}
			}
		}
		
		if(mediaType != "m3u8" && url){
			var suffix = MyUtils.getSuffix(url, true);
			if(suffix){
				suffix = suffix.toLowerCase();
				
				if(suffix == "m3u8" || suffix == "m3u"){
					mediaType = "m3u8";
				}else if(suffix == "ts"){
					return null;
				}else if(mime == "application/octet-stream"){
					//frequently
					if( [ "mp4", "flv", "f4v", "m4s", "ogm", "ogv", "ogg", "webm" ].includes(suffix) ){
						mediaType = "video";
					}else if(suffix == "mp3" || suffix == "m4a" || suffix == "wav"){
						mediaType = "audio";
					}
				}
			}
		}
		
		if(mediaType){
			var retval = { mediaType: mediaType , mime: mime };
			var len = MyUtils.getEntityLength(contentRange, contentLength);
			if(len != -1){
				retval.length = len;
			}
			return retval;
		}
		
		return null;
	}
	
	
	chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
		var userAgent = MyChromeConfig.getUserAgent();
		if(userAgent){
			for (var r = 0; details.requestHeaders != null && r < details.requestHeaders.length; r ++) {
				if (details.requestHeaders[r].name === "User-Agent") {
					details.requestHeaders[r].value = userAgent;
					break;
				}
			}
		}
		
		return {
			requestHeaders: details.requestHeaders
		};
	}, { urls: ["<all_urls>"] }, ["blocking", "requestHeaders"]);

	
	
	chrome.webRequest.onHeadersReceived.addListener(function(details){
		if(details.tabId == null || details.tabId < 0){
			return ;
		}
		if((details.statusCode >= 200 && details.statusCode < 300) || details.statusCode == 304){
			var media = _getMedia(details.url, details.responseHeaders);
			if(media != null){
				var mediaItem = {
					url: details.url,
					tabItem: null,
					method: details.method,
					mediaType: media.mediaType,
					mime: media.mime,
					length: media.length
				};
				if(MyChromeConfig.get("showTab") == "1"){
					chrome.tabs.get(details.tabId, function(tab){
						if(tab != null){
							mediaItem.tabItem = {
								title: tab.title,
								favIconUrl: tab.favIconUrl
							};
						}
						if(MyChromeConfig.get("showDuration") == "1"){
							_getMediaInfo(mediaItem);
						}else{
							_monitoredQueue.offer(mediaItem);
						}
					});
				}else{
					if(MyChromeConfig.get("showDuration") == "1"){
						_getMediaInfo(mediaItem);
					}else{
						_monitoredQueue.offer(mediaItem);
					}
				}
			}
		}
	}, { urls: ["<all_urls>"] }, ["responseHeaders"]);
	
	
	function _getMediaInfo(mediaItem){
		MyVideox.getInfo(mediaItem.mediaType, mediaItem.url, mediaItem.method, function(result){
			mediaItem.duration = result == null ? null : result.duration;
			if(mediaItem.mediaType == "m3u8"){
				// attach m3u8 parseResult
				mediaItem.parseResult = result;
			}
			_monitoredQueue.offer(mediaItem);
		});
	}
	
	
	return {
		view: _monitoredQueue.view,
		take: _monitoredQueue.take,
		clear: _monitoredQueue.clear,
		info: function(){
			return [_monitoredQueue.length()];
		}
	}
})();