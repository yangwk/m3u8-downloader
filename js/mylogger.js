var MyLogger = (function () {
    
    function _error(message){
        if(!message){
            return;
        }
        chrome.runtime.sendMessage({
            action: "log.error",
            data: {
                message: message
            }
        }, function(response){
        });
    }
    
    
	return {
        error: _error
	};
    
})();
