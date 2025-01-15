var MyBaseProcesser = (function () {

    const _cache = new Map();
    
    function _complete(data){
        const control = MyDownload.downloadingHolder.get(data.id);
        if (control != null) {
            MyDownload.downloadingHolder.delete(data.id);
            MyDownload.downloadBatchHolder.complete(control.batchName);
        }
        
        MyDownload.downloadTask();
    }

    function _downloadCallback(data){
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
        });
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
            rangeBoundary: MyChromeConfig.get("downloaderPageSize"),
            useRangeMode: task.custom == null || task.custom.useRangeMode == true
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