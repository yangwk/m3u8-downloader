var MyBootstrap = (function () {
	if (document.readyState == "interactive") {
		_start();
	} else {
		document.addEventListener("DOMContentLoaded", _start);
	}

	function _start() {
		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			if(request.action == "downloadmedia"){
                if(MyDownload.canDownload()){
                    _downloadMedia(request.data);
                }
				sendResponse({success: true});
			}else if(request.action == "loadmonitoredmedia"){
				sendResponse(MyChromeMediaMonitor.view());
			}else if(request.action == "downloadmonitoredmedia"){
                if(!MyDownload.canDownload()){
                    sendResponse({success: true});
                    return ;
                }
				var mediaItem = request.data.destroy ? MyChromeMediaMonitor.take(request.data.identifier) : MyChromeMediaMonitor.element(request.data.identifier);
                if(request.data.urlMaster){
                    mediaItem.url = request.data.urlMaster;
                    mediaItem.parseResult = null;
                    mediaItem.requestData = null;
                }
                if(request.data.isDirect){
                    mediaItem.mediaType = "video";
                }
                if(request.data.mediaType == "subtitles"){
                    mediaItem.mediaType = request.data.mediaType;
                    mediaItem.kind = request.data.kind;
                }
				sendResponse({success: true});
				_downloadMonitoredMedia({ mediaItem: mediaItem, mediaName: request.data.mediaName });
			}else if(request.action == "deletemonitoredmedia"){
				MyChromeMediaMonitor.take(request.data.identifier);
				sendResponse({success: true});
			}else if(request.action == "metricdownload"){
                const metric = MyDownload.metric();
                sendResponse(metric);
			}else if(request.action == "canceldownload" || request.action == "download.cancel"){
				MyDownload.cancel(request.data.id);
				sendResponse({success: true});
			}else if(request.action == "resumedownload" || request.action == "download.resume"){
				MyDownload.resume(request.data.id);
				sendResponse({success: true});
			}else if(request.action == "getconfig"){
				sendResponse(MyChromeConfig.view());
			}else if(request.action == "updateconfig"){
				MyChromeConfig.update(request.data);
				sendResponse({success: true});
			}else if(request.action == "cleanmonitoredmedia"){
				MyChromeMediaMonitor.clear();
				sendResponse({success: true});
			}else if(request.action == "loadrunninginfo"){
                sendResponse({
                    monitor: MyChromeMediaMonitor.info(),
                    videox: MyVideox.info(),
                    download: MyDownload.info(),
                    notification: MyChromeNotification.info(),
                    processer: MyBaseProcesser.info(),
                    downloader: MyDownloader.info(),
                    matchingRule: MyUrlRuleMatcher.info()
                });
			}else if(request.action == "download.restart"){
                MyDownload.restart(request.data.id);
                sendResponse({success: true});
			}else if(request.action == "download.pause"){
                MyDownload.pause(request.data.id);
                sendResponse({success: true});
			}else if(request.action == "contentscript.match"){
                if(MyChromeMediaMonitor.isFull()){
                    sendResponse({ content: null });
                    return;
                }
                const matcherResult = MyUrlRuleMatcher.matchAndParse( request.data.url, "contentscript" );
                sendResponse({ content: (matcherResult != null && matcherResult.targetContentscript != null) ? matcherResult.targetContentscript.func : null });
			}else if(request.action == "contentscript.setm3u8"){
                MyChromeMediaMonitor.add(request.data.url, "GET", request.data.result);
                sendResponse({success: true});
			}else if(request.action == "popupintab"){
                chrome.tabs.create({
                    url: chrome.extension.getURL("popup/index.html")
                }, function(){});
                sendResponse({success: true});
			}else if(request.action == "stopm3u8livedownload"){
                MyM3u8Processer.stopDownloadByContextId(request.data.id);
                sendResponse({success: true});
            }
		});
        
        _updateIcon(! MyChromeMediaMonitor.isEmpty() );
	}
	
	
	function _downloadMedia(data){
		var toSend = {
			reqConfig: {
				url: data.url,
				method: data.method,
                headers: MyHttpHeadersHandler.filterForbidden( MyHttpHeadersHandler.filter(data.headers) )
			}, 
			mediaName: data.mediaName
		};
		if(data.mediaType == "m3u8"){
			_downloadM3u8(toSend);
		}else{
			_downloadOther(toSend);
		}
	}
	
	
	function _downloadMonitoredMedia(data){
		if(data == null || data.mediaItem == null){
			return ;
		}
		var toSend = {
			reqConfig: {
				url: data.mediaItem.url,
				method: data.mediaItem.method,
                headers: MyHttpHeadersHandler.filterForbidden(data.mediaItem.requestData ? data.mediaItem.requestData.requestHeaders : null)
			}, 
			mediaName: data.mediaName
		};
		if(data.mediaItem.mediaType == "m3u8"){
			_downloadM3u8(toSend, data.mediaItem.parseResult != null && data.mediaItem.parseResult.isLive ? null : data.mediaItem.parseResult );
		}else if(data.mediaItem.mediaType == "subtitles"){
            _downloadSubtitles(toSend, data.mediaItem.kind);
        }else{
			_downloadOther(toSend);
		}
	}
	
	function _downloadM3u8(data, parseResult){
		if(parseResult == null){
            MyVideox.getInfo({
                mediaType: "m3u8",
                url: data.reqConfig.url, 
                method: data.reqConfig.method, 
                relatedUrl: data.reqConfig.url, 
                headers: data.reqConfig.headers
            }, function(result){
                if(result == null){
					return ;
				}
                _downloadM3u8CustomImpl(data, result);
            });
		}else{
			_downloadM3u8CustomImpl(data, parseResult);
		}
	}
	
    
    function _downloadM3u8CustomImpl(data, parseResult){
        MyM3u8Processer.downloadM3u8(data, parseResult);
    }
	
    
	function _downloadOther(data){
		var downloadDirectory = chrome.i18n.getMessage("appName") + "-" + MyUtils.genRandomString();
		downloadDirectory = MyChromeConfig.get("newFolderAtRoot") == "0" ? "" : downloadDirectory + "/";
        const mediaName = MyUtils.buildMediaName(data.mediaName, data.reqConfig.url, "");
		
		MyDownload.download({
            tasks: [{
                options: {
                    url: data.reqConfig.url,
                    filename: downloadDirectory + mediaName,
                    method: data.reqConfig.method,
                    headers: data.reqConfig.headers
                },
                target: "chrome"
            }], 
            showName: mediaName
        }, function(){
			MyVideox.playCompleteSound();
		});
		
	}
    
    
    function _downloadSubtitles(data, kind){
        const uniqueKey = MyUtils.genRandomString();
		let downloadDirectory = chrome.i18n.getMessage("appName") + "-" + uniqueKey;
        downloadDirectory = MyChromeConfig.get("newFolderAtRoot") == "0" ? "" : downloadDirectory + "/";
        const mediaName = MyUtils.buildMediaName(data.mediaName, data.reqConfig.url, kind);
        
        MyBaseProcesser.saveDownloadContext({
            id: uniqueKey,
            completeCallback: completeCallback
        });
        
        MyDownload.download({
            tasks: [{
                options: {
                    url: data.reqConfig.url,
                    filename: downloadDirectory + mediaName,
                    method: data.reqConfig.method,
                    headers: data.reqConfig.headers
                },
                target: "custom",
                custom: { contextId: uniqueKey }
            }],
            showName: mediaName
        }, null);
        
                
        function completeCallback(buf, context){
            let bytes = null;
            if(MyChromeConfig.get("convertSubtitles") == "1"){
                if(kind == "asr"){
                    const content = new TextDecoder().decode(buf);
                    const srt = new MyYoutubeTimedTextConverter().convertToSrt(content);
                    if(srt){
                        bytes = new TextEncoder().encode(srt);
                    }
                }
            }
            if(bytes == null){
                bytes = new Uint8Array(buf);
            }
            
            const blob = new Blob([ bytes ], {type: "application/octet-stream"});
            const url = URL.createObjectURL(blob);
            
            MyDownload.download({
                tasks: [{
                    options: {
                        url: url,
                        filename: downloadDirectory + mediaName
                    },
                    target: "chrome"
                }], 
                showName: mediaName,
                priority: true
            }, function(){
                URL.revokeObjectURL(url);
                
                MyVideox.playCompleteSound();
            });
            
            MyBaseProcesser.deleteDownloadContext(context);
        }
    }
	
	
	function _updateIcon(marked){
		chrome.browserAction.setIcon({
			path: chrome.extension.getURL("img/icon128" + (marked ? "marked" : "") + ".png")
		});
	}
	
	
	return {
		updateIcon: _updateIcon
	}
})();