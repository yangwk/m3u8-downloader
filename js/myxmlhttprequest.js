/*
_settings {
	method: "required",
	url: "required",
	header: {},
	responseType:"",
	data: {}
}
callback {
	error: function(){},
	success: function(res){}
}
 */
var MyXMLHttpRequest = function (_settings) {
	
	var _errored = false;
	var _sended = false;
	
	function _fireError(fn){
		if(! _errored){
			_errored = true;
			fn();
		}
	}
	

    this.send = function (callback) {
		if(_sended){
			throw "sended XMLHttpRequest";
		}

        var xhr = new XMLHttpRequest();

        xhr.timeout = 3000;
        xhr.withCredentials = true;

        xhr.open(_settings.method, _settings.url, true);

        if (_settings.header) {
            for (var name in _settings.header) {
                xhr.setRequestHeader(name, _settings.header[name]);
            }
        }

        if (_settings.responseType) {
			if(! ["", "text", "document"].includes(_settings.responseType)){
				throw "unknown responseType: " + _settings.responseType;
			}
            xhr.responseType = _settings.responseType;
        }

        xhr.onreadystatechange = function () {
            if (this.readyState == 4) {
				if((this.status >= 200 && this.status < 300) || this.status == 304){
					var data = null;
					if(this.responseType == null || this.responseType == ""){
						data = this.response;
					}else if(this.responseType == "text"){
						data = this.responseText;
					}else if(this.responseType == "document"){
						data = this.responseXML;
					}
					callback.success(data);
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

        try {
			_sended = true;
            xhr.send(_settings.data);
        } catch (err) {
            _fireError(callback.error);
        }
    }

}