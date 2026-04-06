var MyChromeM3u8Processor = (function () {
	
    /*
    data = {
        uniqueKey: "",
        downloadDirectory: "",
        reqConfig: {
            url: "",
            method: "",
            headers: null
        }, 
        mediaName: ""
    }
    */
	function _downloadM3u8Basic(data, parseResult, playListCnt, callback){
		
		function stepDownloadm3u8processor1(){
			var processorName = MyUtils.isWindowsPlatform() ? "processor.bat" : "processor.sh.command" ;
			
			MyDownload.download({
                tasks: [{
                    options: {
                        url: chrome.extension.getURL(processorName),
                        filename: data.downloadDirectory + "/processor/"+processorName
                    },
                    target: "chrome"
                }],
                showName: data.mediaName + "1.txt",
                priority: true
            }, stepDownloadm3u8processor2 );
		}

		
		function stepDownloadm3u8processor2(ids){
			const processorId = ids[0];
			
			MyDownload.download({
                tasks: [{
                    options: {
                        url: chrome.extension.getURL("processor.txt"),
                        filename: data.downloadDirectory + "/processor/" + MyUtils.trimSuffix(data.mediaName) + ".txt"
                    },
                    target: "chrome"
                }], 
                showName: data.mediaName + "2.txt",
                priority: true
            }, function(){
                callback(processorId);
            });
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
                            method: data.reqConfig.method,
                            headers: data.reqConfig.headers
                        },
                        target: "chrome",
                        proxy: true
                    });
                }else{
                    tasks.push({
                        options: {
                            url: chrome.extension.getURL("processor.m3u8"),
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
            }, stepDownloadm3u8processor1 );
		}
        
        stepDownloadm3u8playlist();
        
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
                target: "chrome",
                hideInDownloadList: true
            }], 
            showName: MyUtils.buildSimpleShowName( fileName ),
            priority: true
        }, function(){
            URL.revokeObjectURL(url);
            
            allBytes.length = 0;
            playItem.content = null;
            
            callback();
        });
    }
	
    
	function _openM3u8Processor(data, processorId){
        MyVideox.playCompleteSound();
        
        MyChromeDownload.open(processorId, {
            message: chrome.i18n.getMessage("notificationOpenDownload", chrome.i18n.getMessage("processorName", data.mediaName) )
        });
	}
    
	
	return {
		downloadM3u8Basic: _downloadM3u8Basic,
        downloadM3u8Ts: _downloadM3u8Ts,
        openM3u8Processor: _openM3u8Processor
	}
})();