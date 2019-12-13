var MyBootstrap = (function () {
	if (document.readyState == "interactive") {
		_start();
	} else {
		document.addEventListener("DOMContentLoaded", _start);
	}

	function _start() {
		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			//console.log(request);
			
			if(request.action == "downloadmedia"){
				_downloadMedia(request.data);
				sendResponse({success: true});
			}else if(request.action == "loadmonitoredmedia"){
				sendResponse(MyChromeMediaMonitor.view());
			}else if(request.action == "downloadmonitoredmedia"){
				var mediaItem = MyChromeMediaMonitor.take(request.data.url);
				sendResponse({success: true});
				_downloadMonitoredMedia({ mediaItem: mediaItem, mediaName: request.data.mediaName });
			}else if(request.action == "deletemonitoredmedia"){
				MyChromeMediaMonitor.take(request.data.url);
				sendResponse({success: true});
			}else if(request.action == "metricdownload"){
				sendResponse(MyChromeDownload.metric());
			}else if(request.action == "canceldownload"){
				MyChromeDownload.cancel(request.data.id);
				sendResponse({success: true});
			}else if(request.action == "canceldownload"){
				MyChromeDownload.cancel(request.data.id);
				sendResponse({success: true});
			}else if(request.action == "resumedownload"){
				MyChromeDownload.resume(request.data.id);
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
					download: MyChromeDownload.info(),
					notification: MyChromeNotification.info()
				});
			}
			
		});
		
		
		
		chrome.browserAction.onClicked.addListener(function(tab) {
			chrome.tabs.create({
				url: chrome.extension.getURL("popup/index.html")
			}, function(){});
		});
	}
	
	
	function _downloadMedia(data){
		var toSend = {
			reqConfig: {
				url: data.url,
				method: data.method
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
				method: data.mediaItem.method
			}, 
			mediaName: data.mediaName
		};
		if(data.mediaItem.mediaType == "m3u8"){
			_downloadM3u8(toSend, data.mediaItem.parseResult);
		}else{
			_downloadOther(toSend);
		}
	}
	
	function _downloadM3u8(data, parseResult){
		if(parseResult == null){
			new MyAsyncM3u8Parser(data.reqConfig).parse(function(result){
				if(result == null || result.playList == null || result.playList.length == 0){
					return ;
				}
				_downloadM3u8Impl(data, result);
			});
		}else{
			_downloadM3u8Impl(data, parseResult);
		}
	}
	
	function _downloadM3u8Impl(data, parseResult){
		var downloadDirectory = chrome.i18n.getMessage("appName") + "-" + MyUtils.genRandomString();
		var baseFileName = MyUtils.genRandomString();
		var processerId = null;
		
		
		function stepDownloadm3u8processer1(){
			MyChromeDownload.download([{
				options: {
					url: chrome.extension.getURL("processer.bat.txt"),
					filename: downloadDirectory + "/processer/" + chrome.i18n.getMessage("processerName", data.mediaName) + ".bat"
				},
				control: {
					autoAcceptDanger: true
				}
			}], data.mediaName + "1.txt", stepDownloadm3u8processer2 );
		}
		
		stepDownloadm3u8processer1();
		
		function stepDownloadm3u8processer2(ids){
			processerId = ids[0];
			
			MyChromeDownload.download([{
				options: {
					url: chrome.extension.getURL("processer.txt"),
					filename: downloadDirectory + "/processer/" + data.mediaName + ".txt"
				}
			}], data.mediaName + "2.txt", stepDownloadm3u8playlist);
		}
		
		
		function stepDownloadm3u8playlist(){
			MyChromeDownload.download([{
				options: {
					url: data.reqConfig.url,
					filename: downloadDirectory + "/m3u8/" + baseFileName + ".m3u8",
					method: data.reqConfig.method
				}
			}], data.mediaName + ".m3u8", stepDownloadm3u8ts);
		}
		
		function stepDownloadm3u8ts(){
			var tasks = [];
			for(var x in parseResult.playList){
				var fileName = baseFileName + "-" + MyUtils.padStart(parseResult.playList[x].sequence.toString(), 10,"0") + ".ts";
				tasks.push({
					options: {
						url: parseResult.playList[x].url,
						filename: downloadDirectory + "/m3u8/" + fileName,
						method: data.reqConfig.method
					}
				});
			}
			
			MyChromeDownload.download(tasks, data.mediaName + ".multiplets", stepOpenm3u8processer);
		}
		
		
		function stepOpenm3u8processer(){
			MyChromeDownload.open(processerId, {
				title: data.mediaName,
				message: chrome.i18n.getMessage("notificationOpenDownload", chrome.i18n.getMessage("processerName", data.mediaName) )
			});
		}
		
	}
	
	
	function _downloadOther(data){
		var downloadDirectory = chrome.i18n.getMessage("appName") + "-" + MyUtils.genRandomString();
		downloadDirectory = MyChromeConfig.get("newFolderAtRoot") == "0" ? "" : downloadDirectory + "/";

		var suffix = MyUtils.getSuffix(data.mediaName, false);
		if(suffix){
			suffix = "";
		}else{
			suffix = MyUtils.getSuffix(data.reqConfig.url, true);
			suffix = suffix ? "."+suffix : "";
		}
		
		MyChromeDownload.download([{
			options: {
				url: data.reqConfig.url,
				filename: downloadDirectory + data.mediaName + suffix,
				method: data.reqConfig.method
			}
		}], data.mediaName + suffix);
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