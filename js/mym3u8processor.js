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
            context.useChromeM3u8 = context.total >= context.chromeM3u8.threshold;
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
            _mergeM3u8Complete(context);
            return ;
        }
        if( (context.total - context.mergeM3u8.total) >= context.mergeM3u8.threshold
            || (context.completedCnt >= context.playListCnt && context.isEnd) ){
            _mergeContentAction(context);
        }
    }
    
    function _mergeContentAction(context){
        const reservedKeyRef = new Set();
        for(let x=0; x < context.parseResult.playList.length; x++){
            const playItem = context.parseResult.playList[x];
            if(playItem.content == null){
                reservedKeyRef.add(playItem.keyRef);
            }
        }
        MyUtils.deleteNotReserved(reservedKeyRef, context.parseResult.keyData);
        
        if(context.isLive){
            context.parseResult.discontinuity = [{ start: 0, end: context.parseResult.playList.length-1 }];
            context.mergeM3u8.disconLength = 1;
        }
        const discontinuity = context.parseResult.discontinuity;
        for(let d=0; d<discontinuity.length; d++){
            const disconItem = discontinuity[d];
            const allBytes = [];
            let currentTotal = 0;
            let targetIndex = -1;
            
            
            for(let p=disconItem.start; p<=disconItem.end; p++){
                const playItem = context.parseResult.playList[p];
                if(playItem.content == null){
                    return;
                }
                if(playItem.isInitSection){
                    if(p != disconItem.start){
                        throw "not support format";
                    }
                    context.mergeM3u8.disconInitSection.set(context.mergeM3u8.disconIndex, playItem.content);
                    allBytes.push(playItem.content);
                    currentTotal += playItem.content.byteLength;
                    continue;
                }
                const initSection = context.mergeM3u8.disconInitSection.get(context.mergeM3u8.disconIndex);
                const shouldAddInitSection = (initSection != null && ! context.parseResult.playList[disconItem.start].isInitSection );
                const threshold = shouldAddInitSection ? Math.max(context.mergeM3u8.threshold - initSection.byteLength, initSection.byteLength) : context.mergeM3u8.threshold;
                
                const sum = currentTotal + playItem.content.byteLength;
                if(sum == threshold){
                    targetIndex = p;
                    allBytes.push(playItem.content);
                    context.mergeM3u8.total += sum;
                }else if(sum > threshold){
                    const noPrevious = (p-1) < disconItem.start;
                    const index = noPrevious ? disconItem.start : (p-1);
                    const pi = context.parseResult.playList[index];
                    if(pi.isInitSection){
                        targetIndex = p;
                        allBytes.push(playItem.content);
                        context.mergeM3u8.total += sum;
                    }else{
                        targetIndex = index;
                        if(noPrevious){
                            allBytes.push(playItem.content);
                            currentTotal = sum;
                        }
                        context.mergeM3u8.total += currentTotal;
                    }
                }else{
                    if(p == disconItem.end){
                        targetIndex = p;
                        context.mergeM3u8.total += sum;
                    }
                    allBytes.push(playItem.content);
                    currentTotal = sum;
                }
                
                if(targetIndex == -1){
                    continue;
                }
                const shouldSplit = context.mergeM3u8.disconLength > 1;
                let serialNumber = "";
                const disconIndex = context.mergeM3u8.disconIndex;
                const partNumber = context.mergeM3u8.disconPart.get(disconIndex) || 1;
                context.mergeM3u8.disconPart.set(disconIndex, partNumber+1);
                const isOver = (targetIndex == disconItem.end);
                if(shouldSplit){
                    serialNumber = "-" + (disconIndex+1) + "-" + partNumber;
                }else{
                    const isAllOver = isOver && context.isEnd;
                    if(! (isAllOver && partNumber == 1)){
                        serialNumber = "-" + partNumber;
                    }
                }
                const suffix = MyUtils.getSuffix(context.mediaName, false);
                let fileName = context.downloadDirectory + "/" + MyUtils.trimSuffix(context.mediaName) + serialNumber + (suffix ? "."+suffix : "");
                if(MyChromeConfig.get("newFolderAtRoot") == "0" && ! serialNumber){
                    fileName = context.mediaName;
                }
                
                if(shouldAddInitSection){
                    allBytes.unshift(initSection);
                }
                
                _mergeContentImpl(allBytes, fileName, function(){
                    if(_isMergeM3u8Completed(context)){
                        _mergeM3u8Complete(context);
                    }
                });
                
                for(let x=disconItem.start, r=x; x<=targetIndex; x++){
                    context.parseResult.playList[r].content = null;
                    context.parseResult.playList.splice(r, 1);
                }
                
                const removeCnt = targetIndex - disconItem.start + 1;
                context.mergeM3u8.completedCnt += removeCnt;
                if(isOver){
                    for(let x=d+1; x< discontinuity.length; x++){
                        const discon = discontinuity[x];
                        discon.start = discon.start - removeCnt;
                        discon.end = discon.end - removeCnt;
                    }
                    discontinuity.splice(d, 1);
                    d --;
                    context.mergeM3u8.disconIndex = Math.min(context.mergeM3u8.disconIndex+1, context.mergeM3u8.disconLength-1);
                    allBytes.length = 0;
                }else{
                    disconItem.end = disconItem.end - removeCnt;
                    p = targetIndex - removeCnt;
                    for(let x=d+1; x< discontinuity.length; x++){
                        const discon = discontinuity[x];
                        discon.start = discon.start - removeCnt;
                        discon.end = discon.end - removeCnt;
                    }
                    allBytes.length = 0;
                    currentTotal = 0;
                    targetIndex = -1;
                }
            }

        }
        
    }
    
    
    function _mergeM3u8Complete(context){
        if(context.isCompleted){
            return ;
        }
        context.isCompleted = true;
        _stopDownload(context);
        context.mergeM3u8.mergeCallback();
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
            _chromeM3u8Complete(context);
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
                    _chromeM3u8Complete(context);
                }
            });
        }
        
        MyUtils.deleteNotReserved(reservedKeyRef, context.parseResult.keyData);
    }
        
    function _chromeM3u8Complete(context){
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
        
    
    function _isChromeM3u8Completed(context){
        return context.useChromeM3u8 && context.chromeM3u8.completedCnt >= context.playListCnt && context.isEnd ;
    }
    
    function _isMergeM3u8Completed(context){
        return !context.useChromeM3u8 && context.mergeM3u8.completedCnt >= context.playListCnt && context.isEnd ;
            
    }
    
    function _reloadM3u8(context){
        if(! context.isLive){
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
                    context.parseResult.content = parseResult.content;
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
            const changedPlayList = newPlayList.filter(newPi => newPi.sequence > lastMaxSequence && ! newPi.isInitSection);
            newPlayList.length = 0;
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
                threshold: MyChromeConfig.get("resultFileProcess") == "processor" ? 0 : Number.MAX_SAFE_INTEGER,
                completedCnt: 0
            },
            mediaName: mediaName,
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
            isCompleted: false,
            mergeM3u8: {
                threshold: MyChromeConfig.get("resultSplitThreshold") * 1024 * 1024,
                total: 0,
                disconIndex: 0,
                disconLength: parseResult.discontinuity.length,
                disconPart: new Map(),
                disconInitSection: new Map(),
                completedCnt: 0,
                mergeCallback: mergeCallback
            }
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
        if(context.isCompleted){
            MyDownload.downloadBatchHolder.reuse(context.batchName, false);
            MyDownload.downloadBatchHolder.complete(context.batchName);
            MyBaseProcessor.deleteDownloadContext(context);
        }else{
            _processM3u8(context);
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