var MyBaseProcessor = (function () {

    const _cache = new Map();
    
    function _complete(data){
        const control = MyDownload.downloadingHolder.get(data.id);
        if (control != null) {
            MyDownload.downloadingHolder.delete(data.id);
            MyDownload.downloadBatchHolder.complete(control.batchName, data.id, control);
        }        
    }

    function _downloadCallback(data){
        const control = MyDownload.downloadingHolder.get(data.id);
        if (control != null) {
            if(control.state != data.state){
                if(data.state == "interrupted"){
                    MyLogger.error(chrome.i18n.getMessage("errorCode0007"));
                }
                MyDownload.downloadTask();
                control.state = data.state;
            }
        }

        if(data.state != "complete"){
            return;
        }
        const content = MyDownloader.getDownloadedContent(data.id);
        const blob = new Blob(content);
        MyUtils.readAsArrayBuffer(blob).then((buf) => {
            const context = _cache.get( data.attributes.contextId );
            if(context == null){
                _complete(data);
                return ;
            }
            context.completeCallback && context.completeCallback(buf, context, data);
            
            _complete(data);
        }).catch((e) => {
            MyDownload.cancel(data.id);
            _cache.delete(data.attributes.contextId);
            MyLogger.error(MyUtils.obtainExceptionContent(e));
        });
    }
    
     
    function _downloadDownload(task){
        _downloadDownloadImpl(task, function(id){
            if(MyDownload.downloadBatchHolder.saveId(task.control.batchName, id)){
                MyDownload.downloadingHolder.put(id, task.control);
            }
        });
    }
    
    function _downloadDownloadImpl(task, callback){
        const options = {
            url: task.options.url,
            method: task.options.method.toUpperCase(),
            attributes: task.custom,
            rangeBoundary: MyChromeConfig.get("downloaderPageSize") * 1024 * 1024,
            useRangeMode: task.custom == null || (task.custom.useRangeMode == null || task.custom.useRangeMode == true) ,
            header: MyUtils.headersToHeader(task.options.headers),
            data: task.options.body
        };
        if(task.proxy){
            MyUtils.toHexString(options.data, function(hex){
                const proxyData = {
                    url: options.url,
                    method: options.method,
                    header: options.header,
                    body: hex
                };
                const proxyOptions = {
                    url: MyChromeConfig.get("proxyAddress") + "/proxy/index",
                    method: "POST",
                    attributes: options.attributes,
                    rangeBoundary: options.rangeBoundary,
                    useRangeMode: options.useRangeMode,
                    header: { "Content-Type": "application/json" },
                    data: JSON.stringify(proxyData)
                };
                
                callback( MyDownloader.download(proxyOptions, _downloadCallback) );
            });
        }else{
            callback( MyDownloader.download(options, _downloadCallback) );
        }
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
    
    function _saveDownloadContext(context){
        const thisContext = _cache.get(context.id);
        if(thisContext == null){
            _cache.set(context.id, context);
            return context;
        }
        return thisContext;
    }
    
    function _deleteDownloadContext(context){
        _cache.delete(context.id);
    }
    
    function _updateDownloadContext(newContext){
        const context = _cache.get(newContext.id);
        if(context != null){
            for(var k in newContext){
				context[k] = newContext[k];
			}
        }
    }
    
    function _getDownloadContext(id){
        return _cache.get(id);
    }
    
    return {
        downloadDownload: _downloadDownload,
        downloadResume: _downloadResume,
        downloadRestart: _downloadRestart,
        downloadCancel: _downloadCancel,
        info: _info,
        saveDownloadContext: _saveDownloadContext,
        deleteDownloadContext: _deleteDownloadContext,
        updateDownloadContext: _updateDownloadContext,
        getDownloadContext: _getDownloadContext
    };
    
})();