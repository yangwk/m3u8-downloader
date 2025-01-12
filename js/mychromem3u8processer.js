var MyChromeM3u8Processer = (function () {
	
    /*
    data = {
        uniqueKey: "",
        downloadDirectory: "",
        reqConfig: {
            url: "",
            method: ""
        }, 
        mediaName: ""
    }
    */
	function _downloadM3u8Basic(data, parseResult, playListCnt, callback){
		var processerId = null;
		
		function stepDownloadm3u8processer1(){
			var processerName = MyUtils.isWindowsPlatform() ? "processer.bat" : "processer.sh.command" ;
			
			MyDownload.download({
                tasks: [{
                    options: {
                        url: chrome.extension.getURL(processerName),
                        filename: data.downloadDirectory + "/processer/"+processerName
                    },
                    target: "chrome"
                }],
                showName: data.mediaName + "1.txt",
                priority: true
            }, stepDownloadm3u8processer2 );
		}
		
		stepDownloadm3u8processer1();
		
		function stepDownloadm3u8processer2(ids){
			processerId = ids[0];
			
			MyDownload.download({
                tasks: [{
                    options: {
                        url: chrome.extension.getURL("processer.txt"),
                        filename: data.downloadDirectory + "/processer/" + MyUtils.trimSuffix(data.mediaName) + ".txt"
                    },
                    target: "chrome"
                }], 
                showName: data.mediaName + "2.txt",
                priority: true
            }, stepDownloadm3u8playlist);
		}
		
		
		function stepDownloadm3u8playlist(){
            var tasks = [];
            var shouldSplit = parseResult.discontinuity.length > 1;
            for(var r=0; r<parseResult.discontinuity.length; r++){
                var m3u8Name = MyUtils.padStart(r.toString(), 10,"0") + "-"
                    + (shouldSplit ? "1" : "0") + "-" + playListCnt + "-"
                    + parseResult.discontinuity[r].start + "-" + parseResult.discontinuity[r].end + "-"
                    + data.uniqueKey + ".m3u8";
                if(r == 0){
                    tasks.push({
                        options: {
                            url: data.reqConfig.url,
                            filename: data.downloadDirectory + "/m3u8/" + m3u8Name,
                            method: data.reqConfig.method
                        },
                        target: "chrome"
                    });
                }else{
                    tasks.push({
                        options: {
                            url: chrome.extension.getURL("processer.m3u8"),
                            filename: data.downloadDirectory + "/m3u8/" + m3u8Name
                        },
                        target: "chrome"
                    });
                }
            }
			MyDownload.download({
                tasks: tasks, 
                showName: data.mediaName + ".m3u8",
                priority: true
            }, function(){
                callback(processerId);
            });
		}
    }
       

    function _downloadM3u8Ts(data, playItem, callback){
        const allBytes = [ playItem.content ];
        const blob = new Blob(allBytes, {type: "text/plain"}); // faster Chrome security check
        
        const url = URL.createObjectURL(blob);
        var fileName = data.uniqueKey + "-" + MyUtils.padStart(playItem.logicSequence.toString(), 10,"0") + ".ts";
        
        MyDownload.download({
            tasks: [{
                options: {
                    url: url,
                    filename: data.downloadDirectory + "/segment/" + fileName
                },
                target: "chrome"
            }], 
            showName: fileName,
            priority: true
        }, function(){
            URL.revokeObjectURL(url);
            
            allBytes.splice(0);
            playItem.content = null;
            
            callback();
        });
    }
	
    
	function _openM3u8Processer(data, processerId){
        MyVideox.playCompleteSound();
        
        MyChromeDownload.open(processerId, {
            title: data.mediaName,
            message: chrome.i18n.getMessage("notificationOpenDownload", chrome.i18n.getMessage("processerName", data.mediaName) )
        });
	}
    
	
	return {
		downloadM3u8Basic: _downloadM3u8Basic,
        downloadM3u8Ts: _downloadM3u8Ts,
        openM3u8Processer: _openM3u8Processer
	}
})();