var MyVideox = (function () {

    var _MyVideo = function (_parent, _callback) {
        var _video = null;
        var _destroyed = false;
        var _fired = false;

        function _fireCallback(arg) {
            if (!_fired) {
                _fired = true;
                _callback(arg);
            }
        }

        function _destroy() {
            if (!_destroyed) {
                _destroyed = true;
                if (_video != null) {
                    _parent.removeChild(_video);
                }
            }
        }

        this.getInfo = function (url) {
            _video = document.createElement("video");
            _video.muted = true;
            _video.controls = false;
            _video.autoplay = false;
            _video.width = 100;
            _video.height = 100;
            _video.preload = "metadata";
            _video.src = url;

            _video.onerror = function () {
                _destroy();
                _fireCallback(null);
            }

            _video.ondurationchange = function () {
                var duration = _video.duration;
                _destroy();
                _fireCallback((duration != null && !isNaN(duration)) ? {
                    duration: duration
                } : null);
            }

            _parent.appendChild(_video);
        }

    };

    var _videoCount = 0;

    return {
        getInfo: function (mediaType, url, method, callback) {
			if(mediaType == "m3u8"){
				var reqConfig = {
					url: url,
					method: method
				};
				new MyAsyncM3u8Parser(reqConfig).parse(function(result){
					callback( (result == null || result.playList == null || result.playList.length == 0) ? null : result );
				});
			}else{
				if (_videoCount >= 10) {
					callback(null);
				} else {
					_videoCount++;
					var mv = new _MyVideo(document.body, function(result) {
						_videoCount--;
						callback(result);
					});
					mv.getInfo(url);
				}
			}
        },
		info: function(){
			return [_videoCount];
		}
    };

})();