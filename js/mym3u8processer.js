var MyM3u8Processer = (function () {

    function _completeCallback(buf, context, data){
    
        if(data.attributes.phase == "key"){
            context.parseResult.keyData.get(data.attributes.keyRef).content = _decodeKey(buf);
        }else if(data.attributes.phase == "ts"){
            const playItem = context.parseResult.playList[data.attributes.index];
            playItem.content = _decodeContent(context.parseResult.keyData, playItem, buf);
            context.completedCnt ++;
            
            context.total += playItem.content.byteLength;
            context.useChromeM3u8 = context.total > context.chromeM3u8.threshold;
            MyDownload.downloadBatchHolder.reuse(context.batchName, context.parseResult.isLive);
            if(context.useChromeM3u8){
                if(! context.isLive){
                    _doChromeM3u8(context);
                }
            }
            
            if(context.completedCnt >= context.playListCnt){
                _reloadM3u8(context);
            }
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
            showName: fileName,
            priority: true
        }, function(){
            URL.revokeObjectURL(url);
            
            callback();
        });
    }
    
    function _doChromeM3u8(context, callback){
        if(context.parseResult.playList.length == 0){
            chromeM3u8Complete();
            return ;
        }
        for(let x=context.chromeM3u8.index; x < context.parseResult.playList.length; x++){
            if(context.parseResult.playList[x].content == null){
                context.chromeM3u8.index = x;
                callback && callback();
                return ;
            }
            MyChromeM3u8Processer.downloadM3u8Ts(context.chromeM3u8.data, context.parseResult.playList[x], function(){
                context.chromeM3u8.completedCnt ++;
                chromeM3u8Complete();
            });
        }
        
        function chromeM3u8Complete(){
            if(context.chromeM3u8.completedCnt >= context.playListCnt){
                context.parseResult.playList.splice(0);
                context.chromeM3u8.index = 0;
                if(context.isEnd){
                    if(context.isLive){
                        context.parseResult.discontinuity = [{ start: 0, end: context.playListCnt-1 }];
                    }
                    MyChromeM3u8Processer.downloadM3u8Basic(context.chromeM3u8.data, context.parseResult, context.playListCnt, function(processerId){
                        MyChromeM3u8Processer.openM3u8Processer(context.chromeM3u8.data, processerId);
                    });
                }
                callback && callback();
            }
        }
    }
    
    
    function _reloadM3u8(context){
        if(! context.parseResult.isLive){
            end();
            return ;
        }
        const delayMs = calcDelay();
        if(context.useChromeM3u8){
            _doChromeM3u8(context, function(){
                MyUtils.delay(delayMs, loadM3u8);
            });
        }else{
            MyUtils.delay(delayMs, loadM3u8);
        }
        
        function loadM3u8() {
            MyVideox.getInfo({
                mediaType: "m3u8",
                url: context.reqConfig.url, 
                method: context.reqConfig.method, 
                relatedUrl: context.reqConfig.url, 
                headers: context.reqConfig.headers
            }, function(parseResult){
                if(parseResult == null){
                    end();
                    return ;
                }
                if(MyBaseProcesser.getDownloadContext(context.id) == null){
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
                }else{
                    context.noChangedCnt ++;
                    if(context.noChangedCnt >= 5){
                        end();
                        return ;
                    }
                    MyUtils.delay(calcDelay(true), loadM3u8);
                }
            });
        }
        
        function end(){
            _stopDownload(context, false);
        }
        
        function calcDelay(period){
            const elapsed = Date.now() - context.lastTimeStamp;
            context.lastTimeStamp = Date.now();
            const targetDuration = context.parseResult.targetDuration || 2;
            if(period){
                return targetDuration * 1000;
            }
            return targetDuration * 1000 - elapsed;
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
            const targetKeyData = new Map();
            const lastKey = oldKeyData.get(lastKeyRef);
            if(lastKey != null){
                targetKeyData.set(lastKeyRef, lastKey);
            }
            oldKeyData.clear();
            newKeyData.forEach(function(key, keyRef){
                targetKeyData.set(lastKeyRef + keyRef, key);
            });
            newKeyData.clear();
            for(let r=0; changedPlayList != null && r<changedPlayList.length; r++){
                changedPlayList[r].keyRef += lastKeyRef;
            }
            
            return targetKeyData;
        }
        
    }
    
    
    function _downloadM3u8(data, parseResult){
        if(parseResult.isMasterPlaylist){
            return false;
        }

        const uniqueKey = data.originalContextId || MyUtils.genRandomString();
		const downloadDirectory = chrome.i18n.getMessage("appName") + "-" + uniqueKey;
        const mediaName = MyUtils.buildMediaName(data.mediaName, data.reqConfig.url, parseResult.suffix);
        
        const context = MyBaseProcesser.saveDownloadContext({
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
                threshold: MyChromeConfig.get("processerThreshold") * 1024 * 1024,
                index: 0,
                completedCnt: 0
            },
            mediaName: mediaName,
            mergeCallback: mergeCallback,
            completeCallback: _completeCallback,
            batchName: null,
            useChromeM3u8: false,
            reqConfig: data.reqConfig,
            isLive: parseResult.isLive,
            lastTimeStamp: Date.now(),
            noChangedCnt: 0,
            playListCnt: parseResult.playList.length,
            isEnd: ! parseResult.isLive,
            lastMaxSequence: parseResult.playList[parseResult.playList.length - 1].sequence,
            lastKeyRef: parseResult.playList[parseResult.playList.length - 1].keyRef
        });
        stepDownloadKey();
        
        function stepDownloadKey(){
            const tasks = [];
            parseResult.keyData.forEach(function(key, keyRef){
                if(key.content != null){
                    return ;
                }
                tasks.push({
                    options: {
                        url: key.url,
                        filename: downloadDirectory + "/custom/key-" + keyRef,
                        method: data.reqConfig.method
                    },
                    target: "custom",
                    custom: { phase: "key", contextId: uniqueKey, keyRef: keyRef, useRangeMode: !context.isLive }
                });
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
                if(parseResult.playList[x].content != null){
                    continue;
                }
                tasks.push({
                    options: {
                        url: parseResult.playList[x].url,
                        filename: downloadDirectory + "/custom/ts-" + x,
                        method: data.reqConfig.method
                    },
                    target: "custom",
                    custom: { phase: "ts", contextId: uniqueKey, index: x, useRangeMode: !context.isLive }
                });
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
                        
            MyBaseProcesser.updateDownloadContext({
                id: uniqueKey,
                batchName: batchName
            });
        }
        
        function mergeCallback(){
            MyVideox.playCompleteSound();
        }
        return true;
    }
    
        
    function purgeContext(context){
        if(context.useChromeM3u8){
            context.playListCnt = context.chromeM3u8.completedCnt;
            context.parseResult.playList.splice(0);
        }else{
            context.playListCnt = context.completedCnt;
        }
    }
    
    function _stopDownload(context, forceStop){
        if(forceStop){
            purgeContext(context);
        }
        context.isEnd = true;
        MyDownload.downloadBatchHolder.reuse(context.batchName, false);
        MyDownload.downloadBatchHolder.complete(context.batchName);
        MyBaseProcesser.deleteDownloadContext(context);
        if(! context.useChromeM3u8){
            _mergeContent(context);
        }else if(context.isLive){
            _doChromeM3u8(context);
        }
    }
    
    function _stopDownloadByContextId(id){
        const context = MyBaseProcesser.getDownloadContext(id);
        if(context != null){
            _stopDownload(context, true);
        }
    }
    
    
    return {
        downloadM3u8: _downloadM3u8,
        stopDownloadByContextId: _stopDownloadByContextId
    };
    
})();