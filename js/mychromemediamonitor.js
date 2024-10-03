var MyChromeMediaMonitor = (function () {
    
    var _TabItem = function(title, favIconUrl){
        this.title = title;
        this.favIconUrl = favIconUrl;
    };
    
	var _MediaItem = function(identifier, url, tabItem, method, mediaType, mime, length){
        this.identifier = identifier;
        this.url = url;
        this.tabItem = tabItem;
        this.method = method;
        this.mediaType = mediaType;
        this.mime = mime;
        this.length = length;
        this.duration = null;
        this.parseResult = null;
        this.isMasterPlaylist = null;
        this.immutableInfo = false;
        this.requestData = null;
        
        _MediaItem.prototype.buildInfo = function(result){
            if(this.immutableInfo){
                throw "illegal state";
            }
            this.duration = result == null ? null : result.duration;
            if(this.mediaType == "m3u8"){
                this.parseResult = result;
                this.isMasterPlaylist = result == null ? null : result.isMasterPlaylist;
            }
            this.immutableInfo = true;
        }
	};
	
	var _monitoredQueue = (function(){
		var _map = new Map();
        
        function _clone(item){
            return MyUtils.clone(item, ( item.mediaType == "m3u8" && item.isMasterPlaylist ) ? ["requestData"] : ["requestData", "parseResult"]);
        }
        
        return {
			length: function(){
				return _map.size;
			},
            isFull: function(){
                return _map.size >= MyChromeConfig.get("monitoredQueueMax");
            },
        	offer: function (mediaItem) {
				var zeroJump = (_map.size == 0);
				
				_map.set(mediaItem.identifier, mediaItem);
				
				if(zeroJump){
					MyBootstrap.updateIcon(true);
				}
        	},
			take: function(identifier){
				var item = _map.get(identifier);
				_map.delete(identifier);
				
				if(_map.size == 0){
					MyBootstrap.updateIcon(false);
				}
				return item;
			},
            element: function(identifier){
                return _map.get(identifier);
            },
            contains: function(identifier){
                return _map.has(identifier);
            },
			view: function(){
				var retval = [];
				for(let entry of _map){
                    let item = entry[1];
					retval.push( _clone(item) );
				}
				return retval;
			},
			clear: function(){
				_map.clear();
				MyBootstrap.updateIcon(false);
			}
        };
	})();
    
    
    var _RequestData = function(requestId, requestHeaders, requestBodyRaw){
        this.requestId = requestId;
        this.requestHeaders = requestHeaders;
        this.requestBodyRaw = requestBodyRaw;
	};
    
    
    var _monitoredRequestCache = (function(){
        var _map = new Map();
        
        return {
            length: function(){
				return _map.size;
			},
            put: function(data, mode){
                const requestData = _map.get(data.requestId);
                if(requestData != null){
                    if("headers" == mode){
                        requestData.requestHeaders = data.requestHeaders;
                    }else if("bodyraw" == mode){
                        requestData.requestBodyRaw = data.requestBodyRaw;
                    }
                }else{
                    _map.set(data.requestId, data);
                }
            },
            obtain: function(requestId){
                return _map.get(requestId);
            },
            remove: function(requestId){
                _map.delete(requestId);
            }
        };
    })();
    
	
    // @See https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers#browser_compatibility
    const _videoSuffix = [ "flv", "f4v", "m4s", "ogv", "ogg", "webm", "3gp", "mpg", "mpeg", "mp4", "m4v", "m4p", "mov" ];
    const _audioSuffix = [ "mp3", "m4a", "wav", "flac", "aac", "oga" ];
    
	
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
				var type = MyUtils.getMimeType(mime);
				if(type == "audio" || type == "video"){
					mediaType = type;
				}
			}
		}
		
        const urlJS = url ? new URL(url) : null;
		if(mediaType != "m3u8" && urlJS){
			var suffix = MyUtils.getSuffix(urlJS, true);
			if(suffix){
				suffix = suffix.toLowerCase();
				
				if(suffix == "m3u8" || suffix == "m3u"){
					mediaType = "m3u8";
				}else if(suffix == "ts" || suffix == "m4s"){
					return null;
				}else if(mime == "application/octet-stream"){
					if( _videoSuffix.includes(suffix) ){
						mediaType = "video";
					}else if( _audioSuffix.includes(suffix) ){
						mediaType = "audio";
					}
				}
			}
		}
        
        if(! mediaType && urlJS){
            for (const [k, v] of urlJS.searchParams.entries()) {
                if(k.toLowerCase() == "mime"){
                    const str = decodeURIComponent(v);
                    var type = MyUtils.getMimeType(str);
                    if(type == "audio" || type == "video"){
                        mediaType = type;
                        break;
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
    
    
    function _handleRunResult(runResult, originalUrl, details, matcherResult, requestData, callback){
        runResult = runResult || {isUrl: false, content: null, builder: null};
        if(runResult.content || runResult.builder){
            let reqUrl = null, reqMethod = null;
            if(! runResult.isUrl){
                const toEncode = runResult.content ? runResult.content : new MyM3u8Builder(runResult.builder).build();
                if(! toEncode){
                    callback(null);
                    return ;
                }
                const ua = new TextEncoder().encode(toEncode);
                const blob = new Blob([ua], {type: "application/octet-stream"});
                reqUrl = URL.createObjectURL(blob);
                reqMethod = "GET";
            }else{
                reqUrl = MyUtils.concatUrl(runResult.content, originalUrl);
                reqMethod = details.method;
            }
            
            const mediaItem = new _MediaItem(details.url, details.url, null, details.method, "m3u8", null, null);
            
            MyVideox.getInfo({
                mediaType: "m3u8", 
                url: reqUrl, 
                method: reqMethod, 
                relatedUrl: originalUrl, 
                headers: MyHttpHeadersHandler.filterForbidden(requestData ? requestData.requestHeaders : null)
            }, function(result){
                if(! runResult.isUrl){
                    URL.revokeObjectURL(reqUrl);
                }
                
                mediaItem.buildInfo(result);
                callback({ matcherResult: matcherResult, mediaItem: mediaItem });
            });
        }else{
            callback(null);
        }
    }
    
    
    function _getM3u8Async(details, requestData, callback){
        const matcherResult = MyUrlRuleMatcher.matchAndParse( details.url, "m3u8" );
        if(matcherResult != null && matcherResult.targetM3u8 != null){
            const originalUrl = matcherResult.targetUrl || details.url;
            const xhr = new MyXMLHttpRequest({
                method: details.method,
                url: originalUrl,
                responseType: matcherResult.targetM3u8.responseType,
                header: MyUtils.headersToHeader( MyHttpHeadersHandler.filterForbidden(requestData ? requestData.requestHeaders : null) ),
                data: requestData ? requestData.requestBodyRaw : null
            });

            xhr.send({
                error: function () {
                    callback(null);
                },
                success: function (data) {
                    const runResult = MyUtils.run( matcherResult.targetM3u8.func, data );
                    _handleRunResult(runResult, originalUrl, details, matcherResult, requestData, callback);
                }
            });
        }else{
            callback(null);
        }
    }
	
    
    chrome.webRequest.onBeforeRequest.addListener(function (details) {
        // ignore details.requestBody.formData
		if(details.requestBody && details.requestBody.raw && details.requestBody.raw.length != 0){
            const content = [];
            for(let r in details.requestBody.raw){
                if(details.requestBody.raw[r].bytes){
                    content.push(details.requestBody.raw[r].bytes);
                }
            }
            if(content.length != 0){
                const blob = new Blob(content);
                _monitoredRequestCache.put(new _RequestData(details.requestId, null, blob), "bodyraw");
            }
        }
	}, { urls: ["<all_urls>"] }, ["requestBody"]);
    
	
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

	
    function _onSendHeadersCallback(details) {
        const headers = MyHttpHeadersHandler.filter( MyUtils.clone( details.requestHeaders ) );
        _monitoredRequestCache.put(new _RequestData(details.requestId, headers, null), "headers");
    }
    try{
        chrome.webRequest.onSendHeaders.addListener(_onSendHeadersCallback,
        { urls: ["<all_urls>"] }, ["requestHeaders", "extraHeaders"]);
    }catch(e){
        chrome.webRequest.onSendHeaders.addListener(_onSendHeadersCallback,
        { urls: ["<all_urls>"] }, ["requestHeaders"]);
    }
    
	
	chrome.webRequest.onHeadersReceived.addListener(function(details){
		if(details.tabId == null || details.tabId < 0){
			return ;
		}
		if(MyUtils.isSuccessful(details.statusCode)){
            if(_monitoredQueue.isFull()){
                return ;
            }
            const requestData = _monitoredRequestCache.obtain(details.requestId);
			var media = _getMedia(details.url, details.responseHeaders);
            
            if(media != null){
                const mediaItem = new _MediaItem(details.url, details.url, null, details.method, media.mediaType, media.mime, media.length);
                _handleMediaItem(mediaItem, null, details, requestData);
            }else{
                _getM3u8Async(details, requestData, function(data){
                    if(data != null){
                        _handleMediaItem(data.mediaItem, data.matcherResult, details, requestData);
                    }
                });
            }
		}
	}, { urls: ["<all_urls>"] }, ["responseHeaders"]);
    
    
    chrome.webRequest.onBeforeRedirect.addListener(function(details){
        // If a request is redirected to a data:// URL, onBeforeRedirect is the last reported event.
        if(details.redirectUrl && details.redirectUrl.startsWith("data://")){
            _monitoredRequestCache.remove(details.requestId);
        }
    }, { urls: ["<all_urls>"] });
    
    
    chrome.webRequest.onCompleted.addListener(function(details){
        _monitoredRequestCache.remove(details.requestId);
    }, { urls: ["<all_urls>"] });
    
    
    chrome.webRequest.onErrorOccurred.addListener(function(details){
        _monitoredRequestCache.remove(details.requestId);
    }, { urls: ["<all_urls>"] });
    
    
    function _addSimpleMedia(url, method, runResult){
        chrome.tabs.query({
            url: url
        }, function(tabs){
            let tab = null;
            if(tabs != null && tabs.length > 0){
                for(let r in tabs){
                    if(tabs[r].url == url){
                        tab = tabs[r];
                        break;
                    }
                }
                tab = tab || tabs[0];
            }
            if(tab){
                const details = { url: url, method: method, tabId: tab.id };
                _handleRunResult(runResult, url, details, null, null, function(data){
                    if(data != null){
                        _handleMediaItem(data.mediaItem, data.matcherResult, details, null);
                    }
                });
            }
        });
    }
    
    function _handleMediaItem(mediaItem, matcherResult, details, requestData){
        if(mediaItem != null){
            matcherResult = matcherResult || MyUrlRuleMatcher.matchAndParse( mediaItem.url );
            if(matcherResult != null){
                if(matcherResult.targetIdentifier != null){
                    mediaItem.identifier = matcherResult.targetIdentifier + mediaItem.mediaType; // group by mediaType
                }
                if(matcherResult.targetUrl != null){
                    mediaItem.url = matcherResult.targetUrl;
                }
            }
            if(_monitoredQueue.contains(mediaItem.identifier)){
                return ;
            }
            mediaItem.requestData = requestData;
            
            if(MyChromeConfig.get("showTab") == "1"){
                chrome.tabs.get(details.tabId, function(tab){
                    if(tab != null){
                        mediaItem.tabItem = new _TabItem(
                            tab.title,
                            tab.favIconUrl
                        );
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
	
	
	function _getMediaInfo(mediaItem){
        if(mediaItem.immutableInfo){
            _monitoredQueue.offer(mediaItem);
            return ;
        }
		MyVideox.getInfo({
            mediaType: mediaItem.mediaType, 
            url: mediaItem.url, 
            method: mediaItem.method, 
            relatedUrl: mediaItem.url, 
            headers: MyHttpHeadersHandler.filterForbidden(mediaItem.requestData ? mediaItem.requestData.requestHeaders : null)
        }, function(result){
            mediaItem.buildInfo(result);
			_monitoredQueue.offer(mediaItem);
		});
	}
	
	
	return {
		view: _monitoredQueue.view,
		take: _monitoredQueue.take,
        element: _monitoredQueue.element,
		clear: _monitoredQueue.clear,
		info: function(){
			return [_monitoredQueue.length(), _monitoredRequestCache.length()];
		},
        isEmpty: function(){
            return _monitoredQueue.length() == 0;
        },
        add: _addSimpleMedia,
        isFull: _monitoredQueue.isFull
	}
})();