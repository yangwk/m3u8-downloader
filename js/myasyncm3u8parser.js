var MyAsyncM3u8Parser = function (_reqConfig) {

    function _getContent(callback) {
		
        var xhr = new MyXMLHttpRequest({
                method: _reqConfig.method,
                url: _reqConfig.url,
                header: _reqConfig.header
            });

        xhr.send({
            error: function () {
                callback(null);
            },
            success: function (data) {
                callback(data);
            }
        });
    }

    this.parse = function (callback) {
        _getContent(function (content) {
            callback(content ? new MyM3u8Parser({url: _reqConfig.relatedUrl}, content).parse() : null);
        });
    }

}