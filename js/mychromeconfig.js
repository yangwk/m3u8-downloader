var MyChromeConfig = (function () {
	var _USER_AGENT = {
		pc: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
		mobile: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"
	};
	
	
	var _config = {
		environment: "nothing",
		showTab: "1",
		showDuration: "1",
		monitoredQueueMax: 50,
		downloadingMax: 3,
		downloadBatchMax: 5,
		popupWidth: 462,
		popupHeight: 435,
		promptWhenExist: "0",
		newFolderAtRoot: "1",
		playSoundWhenComplete: "1",
        splitDiscontinuity: "1",
        processerThreshold: 500,
        downloaderPageSize: 5 * 1024 * 1024,
        convertSubtitles: "1",
        matchingRuleEnable: "0",
        matchingRule:   '[\r\n' +
                        '    {\r\n         "url": {\r\n             "host": "*.googlevideo.com",\r\n             "pathname": null\r\n         },\r\n         "rule": {\r\n             "identifier": {\r\n                 "pathIndex": null,\r\n                 "queryParam": ["id"]\r\n             },\r\n             "ignorer": {\r\n                 "queryParam": ["range", "rn"]\r\n             }\r\n         }\r\n     },\r\n' +
                        '    {\r\n         "url": {\r\n             "host": "www.youtube.com",\r\n             "pathname": "/watch"\r\n         },\r\n         "rule": {\r\n             "contentscript": {\r\n                 "func": "if(window.ytInitialPlayerResponse == null){ return null; } const data = window.ytInitialPlayerResponse; const allFormats = []; data && data.streamingData && data.streamingData.formats && data.streamingData.formats.forEach((e) => allFormats.push(e)); data && data.streamingData && data.streamingData.adaptiveFormats && data.streamingData.adaptiveFormats.forEach((e) => allFormats.push(e)); let mainMedia = null; for(let a=0; a < allFormats.length; a++){ const item = allFormats[a]; if(! item.url || ! item.bitrate){ continue ; } if(mainMedia == null){ mainMedia = { uri: item.url, bandwidth: item.bitrate, codecs: item.mimeType && item.mimeType.startsWith(\\"audio\\") ? \\"mp4a\\" : null, isDirect: true, duration: Number( (Number(item.approxDurationMs || \\"0\\") / 1000).toFixed(2) ), renditions: [], rendition: [] }; }else{ const type = item.mimeType && item.mimeType.startsWith(\\"audio\\") ? \\"AUDIO\\" : \\"VIDEO\\"; const groupId = type.toLowerCase(); mainMedia.renditions.push({ type: type, uri: item.url, groupId: groupId, name: item.qualityLabel || item.quality || groupId, bandwidth: item.bitrate, isDirect: true }); } } if(mainMedia == null){ return null; } const allSubtitles = []; data && data.captions && data.captions.playerCaptionsTracklistRenderer && data.captions.playerCaptionsTracklistRenderer.captionTracks && data.captions.playerCaptionsTracklistRenderer.captionTracks.forEach((e) => allSubtitles.push(e)); for(let k in allSubtitles){ const item = allSubtitles[k]; if(! item.baseUrl){ continue ; } const type = \\"SUBTITLES\\"; const groupId = type.toLowerCase(); mainMedia.renditions.push({ type: type, uri: item.baseUrl, groupId: groupId, name: (item.name && item.name.simpleText) ? item.name.simpleText : (item.languageCode || groupId), bandwidth: null, isDirect: true, language: (item.languageCode || \\"\\").toLowerCase(), kind: (item.kind || \\"\\").toLowerCase() }); } const renditionSet = new Set(); for(let w in mainMedia.renditions){ const rend = mainMedia.renditions[w]; const key = rend.groupId + rend.type; if(! renditionSet.has(key)){ renditionSet.add(key); mainMedia.rendition.push({ groupId: rend.groupId, type: rend.type }); } } const builderData = { isMaster: true, playList: [mainMedia] }; return {isUrl: false, content: null, builder: builderData};"\r\n             }\r\n         }\r\n     }\r\n' +
                        ']'
	};
	
	chrome.storage.local.get(_config, function(items){
		if(items){
			for(var key in items){
				_config[key] = items[key];
			}
		}
        
        MyUrlRuleMatcher.update(JSON.parse(_config.matchingRule));
	});

	return {
		update: function (newConfig) {
			newConfig = MyUtils.clone(newConfig);
			for(var key in newConfig){
				if(! (key in _config)){
					throw "not exists key " + key;
				}
			}
            
            if(newConfig.matchingRule != null){
                if(! MyUrlRuleMatcher.verify(newConfig.matchingRule)){
                    delete newConfig.matchingRule;
                }else{
                    MyUrlRuleMatcher.update(JSON.parse(newConfig.matchingRule));
                }
            }
            
			for(var k in newConfig){
				_config[k] = newConfig[k];
			}
			chrome.storage.local.set(newConfig, function () {});
		},
		get: function (key) {
			return _config[key];
		},
		getUserAgent: function () {
			return _USER_AGENT[_config.environment];
		},
		view: function(){
			return MyUtils.clone(_config);
		}
	}

})();
