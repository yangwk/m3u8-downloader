var MyM3u8Processer = (function () {

    const _cache = new Map();
    
    function _handleStateCallback(data){
        if(! (data.state == "interrupted" || data.state == "complete")){
            return ;
        }
        
        const control = MyDownload.downloadingHolder.get(data.id);
        if (control == null) {
            return;
        }
        if (data.state == "complete") {
            MyDownload.downloadingHolder.delete(data.id);
            MyDownload.downloadBatchHolder.complete(control.batchName, data.id);
        }
    
        MyDownload.downloadTask();
    }

    function _downloadCallback(data){
        _handleStateCallback(data);
        
        if(data.state != "complete"){
            return;
        }
        const content = MyDownloader.getDownloadedContent(data.id);
        if(content.length == 0){
            _cache.delete(data.attributes.contextId);
            return ;
        }
        const blob = new Blob(content);
        MyUtils.readAsArrayBuffer(blob).then((buf) => {
            if(data.attributes.phase == "key"){
                const context = _cache.get( data.attributes.contextId );
                if(context == null){
                    return ;
                }
                context.parseResult.keyData.get(data.attributes.keyRef).content = _decodeKey(buf);
            }else if(data.attributes.phase == "ts"){
                const context = _cache.get( data.attributes.contextId );
                if(context == null){
                    return ;
                }
                const playItem = context.parseResult.playList[data.attributes.index];
                playItem.content = _decodeContent(context.parseResult.keyData, playItem, buf);
                context.completedCnt ++;
                
                context.total += playItem.content.byteLength;
                const useChromeM3u8 = context.total > context.chromeM3u8.threshold;
                if(useChromeM3u8){
                    if(! context.chromeM3u8.basic){
                        context.chromeM3u8.basic = true;
                        MyChromeM3u8Processer.downloadM3u8Basic(context.chromeM3u8.data, context.parseResult, function(processerId){
                            context.chromeM3u8.processerId = processerId;
                            _doChromeM3u8(context);
                        });
                    }
                    if(context.chromeM3u8.basic && context.chromeM3u8.processerId != null){
                        _doChromeM3u8(context);
                    }
                }
                
                if(context.completedCnt >= context.parseResult.playList.length){
                    _cache.delete(context.id);
                    ! useChromeM3u8 ? _mergeContent(context) : null;
                }
            }
        }).catch((e) => {
            _cache.delete(data.attributes.contextId);
        });
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
        const discontinuity = context.parseResult.discontinuity;
        const shouldSplit = discontinuity.length > 1;
        let doneCount = 0, mainIndex = 0;
        for(let d=0; d< discontinuity.length; d++){
            const allBytes = [];
            for(let p=discontinuity[d].start; p<=discontinuity[d].end; p++){
                allBytes.push(context.parseResult.playList[p].content);
            }
            
            let suffix = MyUtils.getSuffix(context.mediaName, false);
            if(suffix && [ "m3u8", "m3u" ].includes(suffix.toLowerCase())){
                suffix = "";
            }
            suffix = suffix || context.parseResult.suffix;
            let fileName = context.downloadDirectory + "/" + MyUtils.trimSuffix(context.mediaName) + (shouldSplit ? "-" + (++mainIndex) : "") + "."+suffix;
            if(MyChromeConfig.get("newFolderAtRoot") == "0" && ! shouldSplit){
                fileName = MyUtils.trimSuffix(context.mediaName) + "."+suffix;
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
    
    function _doChromeM3u8(context){
        for(let x=context.chromeM3u8.index; x < context.parseResult.playList.length; x++){
            if(context.parseResult.playList[x].content == null){
                context.chromeM3u8.index = x;
                break;
            }
            MyChromeM3u8Processer.downloadM3u8Ts(context.chromeM3u8.data, context.parseResult.playList[x], function(){
                context.chromeM3u8.completedCnt ++;
                if(context.chromeM3u8.completedCnt >= context.parseResult.playList.length){
                    MyChromeM3u8Processer.openM3u8Processer(context.chromeM3u8.data, context.chromeM3u8.processerId);
                }
            });
        }
    }
    
    
    function _downloadDownload(task){
        MyDownload.downloadingHolder.actionIncr();
        const id = _downloadDownloadImpl(task);
        if(MyDownload.downloadBatchHolder.saveId(task.control.batchName, id)){
            MyDownload.downloadingHolder.put(id, task.control);
            MyDownload.downloadTask();
        }
    }
    
    function _downloadDownloadImpl(task){
        const options = {
            url: task.options.url,
            method: task.options.method.toUpperCase(),
            attributes: task.custom,
            rangeBoundary: MyChromeConfig.get("downloaderPageSize")
        };
        return MyDownloader.download(options, _downloadCallback);
    }
    
    function _downloadResume(id){
        MyDownloader.resume(id, _downloadCallback);
    }
    
    function _downloadRestart(id){
        MyDownloader.restart(id, _downloadCallback);
    }
    
    function _downloadCancel(id){
        const data = MyDownloader.cancel(id);
        if(data != null){
            _cache.delete(data.attributes.contextId);
        }
    }
    
    function _info(){
        return [_cache.size];
    }
    
    function _saveDownloadContext(data){
        _cache.set(data.id, data);
    }
    
    return {
        downloadDownload: _downloadDownload,
        downloadResume: _downloadResume,
        downloadRestart: _downloadRestart,
        downloadCancel: _downloadCancel,
        info: _info,
        saveDownloadContext: _saveDownloadContext
    };
    
})();