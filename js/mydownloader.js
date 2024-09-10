var MyDownloader = (function () {
    
	var _data = new Map();
	
    const _DownloadItem = function(id, url, method, attributes, rangeBoundary){
		this.id = id;
        this.url = url;
        this.method = method;
        this.restart = false;
		this.resumable = false;
        this.etag = null;
        this.speed = 0;
        this.speedUnit = "B/s";
        this.remainSec = 0;
        this.total = 0;
        this.lengthComputable = false;
        this.state = "in_progress";
        this.percent = 0;
        this.loaded = 0;
        this.attributes = attributes;
        this.loadedOriginal = 0;
        this.content = [];
        this.request = null;
        this.rangeBoundary = rangeBoundary || 50 * 1024 * 1024;
        this.rangeMode = false;
	}
    
    function _download(options, callback){
        const id = MyUtils.genRandomString();
        const op = MyUtils.clone(options);
        _data.set(id, new _DownloadItem(id, op.url, op.method, op.attributes, op.rangeBoundary));
        const header = {
            "Range": "bytes=0-0"
        };
        // XXX loadstart run synchronously, so can not use id to do something when in_progress
        _downloadImpl(id, op.url, op.method, header, false, true, callback);
        return id;
    }
    
    // @See https://docs.microsoft.com/zh-cn/archive/blogs/ieinternals/download-resumption-in-internet-explorer
    function _resume(id, callback){
        const item = _data.get(id);
        if(item == null){
            return ;
        }
        if(item.state == "complete"){
            return ;
        }
        let rangeEnd = "";
        if(item.lengthComputable){
            const remain = item.total <= 0 ? 0 : item.total - item.loaded;
            if(remain > item.rangeBoundary){
                rangeEnd = (item.loaded + item.rangeBoundary - 1).toString();
            }
        }
        const header = {
            "Range": "bytes=" + item.loaded + "-" + rangeEnd
        };
        if(item.etag != null){
            header["If-Range"] = item.etag;
        }
        _downloadImpl(id, item.url, item.method, header, true, true, callback);
    }
    
    function _restart(id, callback){
        const item = _data.get(id);
        if(item == null){
            return ;
        }
        if(item.state == "complete"){
            return ;
        }
        const base = MyUtils.clone(item, ["id", "url", "method", "attributes", "rangeBoundary"], true);
        _data.delete(id);
        _data.set(base.id, new _DownloadItem(base.id, base.url, base.method, base.attributes, base.rangeBoundary));
        _downloadImpl(base.id, base.url, base.method, null, false, false, callback);
    }
    
    
    function _pause(id){
        const item = _data.get(id);
        if(item == null){
            return ;
        }
        if(item.state != "complete"){
            item.request.destroy();
        }
    }
    
    function _cancel(id){
        _pause(id);
        const item = _data.get(id);
        _data.delete(id);
        return item;
    }
    
    function _getDownloadedContent(id){
        const item = _data.get(id);
        if(item == null){
            return null;
        }
        if(item.state != "complete"){
            return null;
        }
        _data.delete(id);
        return item.content;
    }
    
    function _metric(){
        const retval = {};
        _data.forEach(function(item, id){
            const toSend = MyUtils.clone(item, ["loadedOriginal", "content", "request", "rangeBoundary", "rangeMode"]);
            retval[id] = toSend;
        });
        return retval;
    }
    
    
    function _notify(item, callback){
        if(callback != null){
            const toSend = MyUtils.clone(item, ["loadedOriginal", "content", "request", "rangeBoundary", "rangeMode"]);
            callback(toSend);
        }
    }
    
    
    function _downloadImpl(id, url, method, header, isResume, useRangeMode, callback){
        
        const request = new MyXMLHttpRequest({
            method: method,
            url: url,
            mimeType: "text/plain; charset=utf-8",
            header: header,
            responseType: "arraybuffer",
            data: null,
            listener: {
                changed: function(d){
                    const item = _data.get(id);
                    if(item == null){
                        return ;
                    }
                    if(item.restart){
                        item.state = "interrupted";
                        _notify(item, callback);
                        return ;
                    }
                    item.speed = d.speed;
                    item.speedUnit = d.speedUnit;
                    item.loaded = item.loadedOriginal + d.loaded;
                    if(item.lengthComputable){
                        item.percent = (item.total <= 0) ? 0 : Math.min( Math.floor(item.loaded * 100 / item.total), 100 );
                        const remain = (item.total <= 0) ? 0 : Math.abs(item.total - item.loaded);
                        item.remainSec = (d.speedBS == 0) ? -1 : Math.floor(remain / d.speedBS);
                    }
                    
                    if(useRangeMode && ! item.rangeMode){
                        if(! isResume && item.resumable && item.lengthComputable && item.total > 0){
                            item.rangeMode = true;
                            _pause(id);
                            item.loaded = item.loadedOriginal;
                            _resume(id, callback);
                            return ;
                        }
                    }
                    
                    item.state = d.state;
                    if(d.state == "interrupted"){
                        item.loaded = item.loadedOriginal;
                    }else if(d.state == "complete"){
                        item.loadedOriginal = item.loaded;
                        if(item.lengthComputable && item.total > 0 && item.percent < 100){
                            item.state = "in_progress";
                        }
                        item.content.push( request.getResponse() );
                        
                        if(item.rangeMode){
                            _resume(id, callback);
                        }
                    }
                    
                    _notify(item, callback);
                },
                headersStatusReceived: function(){
                    const item = _data.get(id);
                    if(item == null){
                        return ;
                    }
                    const ar = request.getResponseHeader("Accept-Ranges");
                    const etag = request.getResponseHeader("ETag");
                    const cr = request.getResponseHeader("Content-Range");
                    const cl = request.getResponseHeader("Content-Length");
                    const entityLength = MyUtils.getEntityLength(cr, cl);
                    let resumable0 = false;
                    if(isResume){
                        resumable0 = request.getStatus() == 206 && (ar == null || ar.trim() != "none");
                    }else{
                        if(useRangeMode){
                            resumable0 = request.getStatus() != 200 && cr != null && entityLength != -1 && (ar == null || ar.trim() != "none");
                        }else{
                            resumable0 = ar != null && ar.trim() != "none";
                        }
                    }
                    item.resumable = resumable0;
                    if(etag != null && !etag.trim().startsWith("W/")){
                        item.etag = etag;
                    }
                    
                    const lengthComputable = (entityLength != -1);
                    const total = lengthComputable ? entityLength : 0;
                    if(! isResume){
                        item.total = total;
                        item.lengthComputable = lengthComputable;
                    }
                    
                    // restart it from the beginning
                    item.restart = (isResume && ! item.resumable) || (! isResume && useRangeMode && ! item.resumable && request.getStatus() != 200);
                    if(item.restart){
                        request.destroy();
                        if(! isResume && useRangeMode){
                            _restart(id, callback);
                        }
                    }
                }
            }
        });
        
        const item = _data.get(id);
        item.request = request;
        
        item.request.send({
            error: function(){
            },
            success: function(res){
            }
        });
        
    }
    
    
    return {
        download: _download,
        resume: _resume,
        restart: _restart,
        pause: _pause,
        cancel: _cancel,
        getDownloadedContent: _getDownloadedContent,
        metric: _metric,
        info: function(){
			return [_data.size];
		}
    };
    
})();