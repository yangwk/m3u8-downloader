var MyM3u8Processor = (function () {

    function _completeCallback(buf, context, data){
    
        if(data.attributes.phase == "key"){
            context.parseResult.keyData.get(data.attributes.keyRef).content = _decodeKey(buf);
        }else if(data.attributes.phase == "ts"){
            let playItem = null;
            for(let x in context.parseResult.playList){
                if(context.parseResult.playList[x].logicSequence == data.attributes.sequence){
                    playItem = context.parseResult.playList[x];
                    break;
                }
            }
            playItem.content = _decodeContent(context.parseResult.keyData, playItem, buf);
            context.completedCnt ++;
            
            context.total += playItem.content.byteLength;
            context.useChromeM3u8 = context.total > context.chromeM3u8.threshold;
            MyDownload.downloadBatchHolder.reuse(context.batchName, context.parseResult.isLive);
            
            _reloadM3u8(context);
            _processM3u8(context);
        }

    }
    
    function _decodeKey(buf){
        if(buf.byteLength == 16){
            return new Uint8Array(buf);
        }
        throw "invalid key";
    }
    
    function _decodeContent(keyData, playItem, buf){
        const key = keyData.get(playItem.keyRef);
        if(key != null){
            const iv = (key.iv != null) ? key.iv : playItem.keyIV;
            // @See https://github.com/ricmoo/aes-js.git
            const aesCbc = new aesjs.ModeOfOperation.cbc(key.content, iv);
            const encryptedBytes = new Uint8Array(buf);
            const decryptedBytes = aesCbc.decrypt(encryptedBytes);
            const strippedBytes = aesjs.padding.pkcs7.strip(decryptedBytes);
            return strippedBytes;
        }
        return new Uint8Array(buf);
    }
    
    function _mergeContent(context){
        // for reenter
        if(_isMergeM3u8Completed(context)){
            _mergeContentAction(context);
            return ;
        }
    }
    
    function _mergeContentAction(context){
        if(context.isCompleted){
            return ;
        }
        context.isCompleted = true;
        if(context.isLive){
            context.parseResult.discontinuity = [{ start: 0, end: context.playListCnt-1 }];
        }
        const discontinuity = context.parseResult.discontinuity;
        const shouldSplit = discontinuity.length > 1;
        let doneCount = 0, mainIndex = 0;
        for(let d=0; d< discontinuity.length; d++){
            const allBytes = [];
            for(let p=discontinuity[d].start; p<=discontinuity[d].end; p++){
                allBytes.push(context.parseResult.playList[p].content);
            }
            
            const suffix = MyUtils.getSuffix(context.mediaName, false);
            let fileName = context.downloadDirectory + "/" + MyUtils.trimSuffix(context.mediaName) + (shouldSplit ? "-" + (++mainIndex) : "") + (suffix ? "."+suffix : "");
            if(MyChromeConfig.get("newFolderAtRoot") == "0" && ! shouldSplit){
                fileName = context.mediaName;
            }
            
            _mergeContentImpl(allBytes, fileName, function(){
                allBytes.splice(0);
                for(let p=discontinuity[d].start; p<=discontinuity[d].end; p++){
                    context.parseResult.playList[p].content = null;
                }
                
                if(++doneCount >= discontinuity.length){
                    _stopDownload(context);
                    context.mergeCallback();
                }
            });
        }
        
    }
    
    
    function _mergeContentImpl(allBytes, fileName, callback){
        const blob = new Blob(allBytes, {type: "application/octet-stream"});
        const url = URL.createObjectURL(blob);
        
        MyDownload.download({
            tasks: [{
                options: {
                    url: url,
                    filename: fileName
                },
                target: "chrome"
            }], 
            showName: MyUtils.buildSimpleShowName( fileName ),
            priority: true
        }, function(){
            URL.revokeObjectURL(url);
            
            callback();
        });
    }
    
    function _doChromeM3u8(context){
        // for reenter
        if(_isChromeM3u8Completed(context)){
            chromeM3u8Complete();
            return ;
        }
        
        const reservedKeyRef = new Set();
        for(let x=0; x < context.parseResult.playList.length; x++){
            const playItem = context.parseResult.playList[x];
            if(playItem.content == null){
                reservedKeyRef.add(playItem.keyRef);
                continue;
            }
            context.parseResult.playList.splice(x, 1);
            x --;
            
            MyChromeM3u8Processor.downloadM3u8Ts(context.chromeM3u8.data, playItem, function(){
                context.chromeM3u8.completedCnt ++;
                if(_isChromeM3u8Completed(context)){
                    chromeM3u8Complete();
                }
            });
        }
        
        MyUtils.deleteNotReserved(reservedKeyRef, context.parseResult.keyData);
        
        
        function chromeM3u8Complete(){
            if(context.isCompleted){
                return ;
            }
            context.isCompleted = true;
            if(context.isLive){
                context.parseResult.discontinuity = [{ start: 0, end: context.playListCnt-1 }];
            }
            MyChromeM3u8Processor.downloadM3u8Basic(context.chromeM3u8.data, context.parseResult, context.playListCnt, function(processorId){
                MyChromeM3u8Processor.openM3u8Processor(context.chromeM3u8.data, processorId);
            });
            _stopDownload(context);
        }
        
    }
    
    function _isChromeM3u8Completed(context){
        return context.useChromeM3u8 && context.chromeM3u8.completedCnt >= context.playListCnt && context.isEnd ;
    }
    
    function _isMergeM3u8Completed(context){
        return !context.useChromeM3u8 && context.completedCnt >= context.playListCnt && context.isEnd ;
    }
    
    function _reloadM3u8(context){
        if(! context.isLive){
            _stopDownload(context);
            return ;
        }
        if(context.isScheduled){
            return ;
        }
        
        MyUtils.delay(( context.parseResult.targetDuration || 2 ) * 1000, loadM3u8);
        context.isScheduled = true;
        
        function loadM3u8() {
            if(context.isEnd){
                return ;
            }
            MyVideox.getInfo({
                mediaType: "m3u8",
                url: context.reqConfig.url, 
                method: context.reqConfig.method, 
                relatedUrl: context.reqConfig.url, 
                headers: context.reqConfig.headers
            }, function(parseResult){
                if(context.isEnd){
                    return ;
                }
                if(parseResult == null){
                    _stopDownload(context);
                    return ;
                }
                
                const changedPlayList = comparePlayList(parseResult.playList, context.lastMaxSequence);
                if(changedPlayList != null){
                    context.noChangedCnt = 0;
                    const changedKeyData = compareKeyData(context.lastKeyRef, context.parseResult.keyData, parseResult.keyData, changedPlayList);
                    context.parseResult.duration += changedPlayList.map(p => p.duration).reduce((acc, curr) => acc + curr, 0);
                    context.parseResult.playList.push(...changedPlayList);
                    context.parseResult.keyData = changedKeyData;
                    context.parseResult.targetDuration = parseResult.targetDuration;
                    context.parseResult.isLive = parseResult.isLive;
                    context.playListCnt += changedPlayList.length;
                    context.lastMaxSequence = changedPlayList[changedPlayList.length - 1].sequence;
                    context.lastKeyRef = changedPlayList[changedPlayList.length - 1].keyRef;
                    
                    _downloadM3u8({
                        originalContextId: context.id,
                        mediaName: context.mediaName,
                        reqConfig: context.reqConfig,
                        originalBatchName: context.batchName
                    }, context.parseResult);
                    
                    if(! context.parseResult.isLive){
                        _stopDownload(context);
                        return ;
                    }
                    
                    MyUtils.delay(( context.parseResult.targetDuration || 2 ) * 1000, loadM3u8);
                }else{
                    context.noChangedCnt ++;
                    if(context.noChangedCnt >= 3){
                        _stopDownload(context);
                        return ;
                    }
                    MyUtils.delay(( context.parseResult.targetDuration || 2 ) * 1000, loadM3u8);
                }
            });
        }
        
                
        function comparePlayList(newPlayList, lastMaxSequence){
            const changedPlayList = newPlayList.filter(newPi => newPi.sequence > lastMaxSequence);
            if(changedPlayList.length > 0){
                if(MyChromeConfig.get("stopBrokenSequence") == "0"){
                    return changedPlayList;
                }else if(MyChromeConfig.get("stopBrokenSequence") == "1" && changedPlayList[0].sequence == lastMaxSequence + 1){
                    return changedPlayList;
                }
            }
            return null;
        }
        
        function compareKeyData(lastKeyRef, oldKeyData, newKeyData, changedPlayList){
            newKeyData.forEach(function(key, keyRef){
                oldKeyData.set(lastKeyRef + keyRef, key);
            });
            for(let r=0; changedPlayList != null && r<changedPlayList.length; r++){
                if(changedPlayList[r].keyRef != 0){
                    changedPlayList[r].keyRef += lastKeyRef;
                }
            }   
            newKeyData.clear();
            
            return oldKeyData;
        }
        
    }
    
    
    function _downloadM3u8(data, parseResult){
        if(parseResult.isMasterPlaylist){
            MyLogger.error(chrome.i18n.getMessage("errorCode0001"));
            return false;
        }

        const uniqueKey = data.originalContextId || MyUtils.genRandomString();
        const mediaName = MyUtils.buildMediaName(data.mediaName, data.reqConfig.url, parseResult.suffix);
		const downloadDirectory = MyUtils.buildDownloadDirectory(mediaName, uniqueKey);
        
        const context = MyBaseProcessor.saveDownloadContext({
            id: uniqueKey,
            downloadDirectory: downloadDirectory,
            parseResult: parseResult,
            completedCnt: 0,
            total: 0,
            chromeM3u8 : {
                data : {
                    uniqueKey: uniqueKey,
                    downloadDirectory: downloadDirectory,
                    reqConfig: data.reqConfig,
                    mediaName: mediaName
                },
                threshold: parseResult.isLive ? 0 : MyChromeConfig.get("processorThreshold") * 1024 * 1024,
                completedCnt: 0
            },
            mediaName: mediaName,
            mergeCallback: mergeCallback,
            completeCallback: _completeCallback,
            batchName: null,
            useChromeM3u8: false,
            reqConfig: data.reqConfig,
            isLive: parseResult.isLive,
            isScheduled: false,
            noChangedCnt: 0,
            playListCnt: parseResult.playList.length,
            isEnd: ! parseResult.isLive,
            lastMaxSequence: parseResult.playList[parseResult.playList.length - 1].sequence,
            lastKeyRef: parseResult.playList[parseResult.playList.length - 1].keyRef,
            queuedSequence: -1,
            queuedKeyRef: -1,
            isCompleted: false
        });
        stepDownloadKey();
        
        function stepDownloadKey(){
            const tasks = [];
            parseResult.keyData.forEach(function(key, keyRef){
                if(key.content != null || keyRef <= context.queuedKeyRef){
                    return ;
                }
                tasks.push({
                    options: {
                        url: key.url,
                        filename: downloadDirectory + "/custom/key-" + keyRef,
                        method: data.reqConfig.method,
                        headers: data.reqConfig.headers
                    },
                    target: "custom",
                    custom: { phase: "key", contextId: uniqueKey, keyRef: keyRef, useRangeMode: !context.isLive }
                });
                context.queuedKeyRef = keyRef;
            });
            
            if(tasks.length == 0){
                stepDownloadTs();
                return ;
            }
            MyDownload.download({
                tasks: tasks, 
                showName: mediaName + ".multiplekey"
            }, stepDownloadTs);
        }
        
        function stepDownloadTs(){
            const tasks = [];
            for(let x in parseResult.playList){
                const sequence = parseResult.playList[x].logicSequence;
                if(parseResult.playList[x].content != null || sequence <= context.queuedSequence){
                    continue;
                }
                tasks.push({
                    options: {
                        url: parseResult.playList[x].url,
                        filename: downloadDirectory + "/custom/ts-" + x,
                        method: data.reqConfig.method,
                        headers: data.reqConfig.headers
                    },
                    target: "custom",
                    custom: { phase: "ts", contextId: uniqueKey, sequence: sequence, useRangeMode: !context.isLive },
                    removeDownloadId: true
                });
                context.queuedSequence = sequence;
            }
            
            if(tasks.length == 0){
                return ;
            }
            const batchName = MyDownload.download({
                batchName: data.originalBatchName,
                tasks: tasks, 
                showName: mediaName + ".multiplets",
                attributes: {
                    contextId: context.id,
                    isLive: context.isLive
                }
            }, null);
                        
            MyBaseProcessor.updateDownloadContext({
                id: uniqueKey,
                batchName: batchName
            });
        }
        
        function mergeCallback(){
            MyVideox.playCompleteSound();
        }
        return true;
    }
    
    function _processM3u8(context){
        if(context.useChromeM3u8){
            _doChromeM3u8(context);
        }else{
           _mergeContent(context); 
        }
    }
    
    
    function _stopDownload(context){
        context.isEnd = true;
        if( _isChromeM3u8Completed(context) || _isMergeM3u8Completed(context) ){
            if(context.isCompleted){
                MyDownload.downloadBatchHolder.reuse(context.batchName, false);
                MyDownload.downloadBatchHolder.complete(context.batchName);
                MyBaseProcessor.deleteDownloadContext(context);
            }else{
                _processM3u8(context);
            }                  
        }
    }
    
    function _stopDownloadByContextId(id){
        const context = MyBaseProcessor.getDownloadContext(id);
        if(context != null){
            _stopDownload(context);
        }
    }
    
    
    return {
        downloadM3u8: _downloadM3u8,
        stopDownloadByContextId: _stopDownloadByContextId
    };
    
})();