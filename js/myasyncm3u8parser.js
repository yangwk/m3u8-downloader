var MyAsyncM3u8Parser = function (_reqConfig) {

    function _getContent(callback) {
        const uniqueKey = MyUtils.genRandomString();
        const mediaName = MyUtils.buildMediaName("", _reqConfig.url, "");
		
        MyBaseProcessor.saveDownloadContext({
            id: uniqueKey,
            completeCallback: completeCallback
        });
        
		MyDownload.download({
            tasks: [{
                options: {
                    url: _reqConfig.url,
                    filename: mediaName,
                    method: _reqConfig.method,
                    headers: _reqConfig.headers
                },
                target: "custom",
                custom: { contextId: uniqueKey, useRangeMode: false }
            }], 
            showName: mediaName
        }, null);
		
        function completeCallback(buf, context){
            const content = new TextDecoder().decode(buf);
            
            MyBaseProcessor.deleteDownloadContext(context);
            
            callback(content);
        }
    }

    this.parse = function (callback) {
        _getContent(function (content) {
            callback(content ? new MyM3u8Parser({url: _reqConfig.relatedUrl}, content).parse() : null);
        });
    }

}