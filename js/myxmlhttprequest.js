/*
_settings {
	method: "required",
	url: "required",
	header: {},
    mimeType: "",
    timeout: 0,
	responseType: "",
	data: {},
    listener: {
        changed: function(d){},
        headersStatusReceived: function(){}
    }
}
callback {
	error: function(){},
	success: function(res){}
}
 */
var MyXMLHttpRequest = function (_settings) {
    
	var _xhr = null;
    
	var _errored = false;
	var _sended = false;
    
	const _LoadDeltaItem = function(timeStamp, loaded, total, lengthComputable){
		this.timeStamp = timeStamp;
		this.loaded = loaded;
        this.total = total;
        this.lengthComputable = lengthComputable;
        this.state = "in_progress"; // in_progress, interrupted, complete
	}
    
    const _loadDelta = {
        current: null,
        previous: null
    };
	
	function _fireChanged(newState){
        if(_settings.listener == null || _settings.listener.changed == null){
            return ;
        }
        if(_loadDelta.current == null){
            _loadDelta.current = new _LoadDeltaItem(0, 0, 0, false);
        }
        if(_loadDelta.current.state == "interrupted" || _loadDelta.current.state == "complete"){
            return ;
        }
        _loadDelta.current.state = newState;
        
        let percent = 0 , speed = 0 , speedUnit = "B/s" , speedBS = 0 , remainSec = -1;
        if(_loadDelta.previous != null){
            const elapsed = Math.abs(_loadDelta.current.timeStamp - _loadDelta.previous.timeStamp);
            const bytes = Math.abs(_loadDelta.current.loaded - _loadDelta.previous.loaded);
            speedBS = (elapsed == 0) ? bytes : Math.floor(bytes / elapsed * 1000);
            if(1024 <= speedBS){
                speed = Math.floor(speedBS / 1024);
                speedUnit = "KB/s";
            }else{
                speed = speedBS;
            }
            
            if(_loadDelta.current.lengthComputable){
                percent = (_loadDelta.current.total <= 0) ? 0 : Math.min( Math.floor(_loadDelta.current.loaded * 100 / _loadDelta.current.total), 100 );
                const remain = (_loadDelta.current.total <= 0) ? 0 : Math.abs(_loadDelta.current.total - _loadDelta.current.loaded);
                remainSec = (speedBS == 0) ? -1 : Math.floor(remain / speedBS);
            }
        }
            
        _settings.listener.changed({
            percent: percent,
            speed: speed,
            speedUnit: speedUnit,
            speedBS: speedBS,
            remainSec: remainSec,
            loaded: _loadDelta.current.loaded,
            total: _loadDelta.current.total,
            lengthComputable: _loadDelta.current.lengthComputable,
            state: _loadDelta.current.state
        });
	}
    
	function _fireError(fn){
        
        _fireChanged("interrupted");
        
		if(! _errored){
			_errored = true;
            
            fn();
		}
	}
    
    
	function _check(expect, message){
        if(_sended != expect){
            throw message;
        }
	}

    this.send = function (callback) {
        _check(false, "sended XMLHttpRequest");

        const xhr = new XMLHttpRequest();

        xhr.open(_settings.method, _settings.url, true);
        
        if(_settings.mimeType){
            xhr.overrideMimeType(_settings.mimeType);
        }
        
        if(_settings.timeout != null){
            xhr.timeout = _settings.timeout;
        }
        
        xhr.withCredentials = true;

        if (_settings.header) {
            for (var name in _settings.header) {
                xhr.setRequestHeader(name, _settings.header[name]);
            }
        }

        if (_settings.responseType) {
			if(! ["", "text", "document", "arraybuffer"].includes(_settings.responseType)){
				throw "unknown responseType: " + _settings.responseType;
			}
            xhr.responseType = _settings.responseType;
        }

        xhr.onreadystatechange = function () {
            if (this.readyState == 2) {
                if(_settings.listener != null && _settings.listener.headersStatusReceived != null){
                    _settings.listener.headersStatusReceived();
                }
            }
            
            if (this.readyState == 4) {
				if(MyUtils.isSuccessful(this.status)){
					var data = null;
					if(this.responseType == null || this.responseType == ""){
						data = this.response;
					}else if(this.responseType == "text"){
						data = this.responseText;
					}else if(this.responseType == "document"){
						data = this.responseXML;
					}else if(this.responseType == "arraybuffer"){
						data = this.response;
					}
                    
                    try{
                        _fireChanged("complete");
                    }finally{
                        callback.success(data);
                    }
				}else{
					_fireError(callback.error);
				}
            }
        };

        xhr.ontimeout = function () {
            _fireError(callback.error);
        };
        xhr.onerror = function () {
            _fireError(callback.error);
        };
        xhr.onabort = function () {
            _fireError(callback.error);
        };
        
        
        
        xhr.onloadstart = function (e) {
            _loadDelta.previous = _loadDelta.current;
            _loadDelta.current = new _LoadDeltaItem(e.timeStamp, e.loaded, e.total, e.lengthComputable);
            _fireChanged("in_progress");
        };
        xhr.onprogress = function (e) {
            _loadDelta.previous = _loadDelta.current;
            _loadDelta.current = new _LoadDeltaItem(e.timeStamp, e.loaded, e.total, e.lengthComputable);
            _fireChanged("in_progress");
        };
        

        try {
            _xhr = xhr;
			_sended = true;
            xhr.send(_settings.data);
        } catch (err) {
            _fireError(callback.error);
        }
    }
    
    
    this.getResponse = function(){
        _check(true, "must send XMLHttpRequest");
        return _xhr.response;
    }
    
    this.getResponseHeader = function(headerName){
        _check(true, "must send XMLHttpRequest");
        return _xhr.getResponseHeader(headerName);
    }
    
    this.getStatus = function(){
        _check(true, "must send XMLHttpRequest");
        return _xhr.status;
    }
    
    this.destroy = function(){
        _check(true, "must send XMLHttpRequest");
        _xhr.abort();
    }

}