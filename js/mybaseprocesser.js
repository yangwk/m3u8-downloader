var MyBaseProcesser = (function () {

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
            const context = _cache.get( data.attributes.contextId );
            if(context == null){
                return ;
            }
            context.completeCallback && context.completeCallback(buf, context, data);
        }).catch((e) => {
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
    
    function _saveDownloadContext(context){
        _cache.set(context.id, context);
    }
    
    function _deleteDownloadContext(context){
        _cache.delete(context.id);
    }
    
    return {
        downloadDownload: _downloadDownload,
        downloadResume: _downloadResume,
        downloadRestart: _downloadRestart,
        downloadCancel: _downloadCancel,
        info: _info,
        saveDownloadContext: _saveDownloadContext,
        deleteDownloadContext: _deleteDownloadContext
    };
    
})();