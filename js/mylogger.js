var MyLogger = (function () {
    
    const _logBus = new Map();
    const _maxSize = 1000;
    let _lastId = null;
    
    var _MessageItem = function(message){
        this.id = MyUtils.genRandomString();
        this.message = message;
    };
    
    function _error(message){
        if(!message){
            return;
        }
        if(_logBus.size >= _maxSize){
            return ;
        }
        if(_lastId != null){
            const item = _logBus.get(_lastId);
            if(item != null && item.message == message){
                return ;
            }
        }
        const item = new _MessageItem(message);
        _logBus.set(item.id, item);
        _lastId = item.id;
        
        chrome.runtime.sendMessage({
            action: "log.error",
            data: item
        }, function(response){
            if(chrome.runtime.lastError){
            }
        });
    }
    
    function _snapshot(){
        const data = Array.from(_logBus.values());
        return MyUtils.clone(data);
    }
    
    function _remove(ids){
        if(MyUtils.isString(ids)){
            _logBus.clear();
            _lastId = null;
            return;
        }
        for(let r=0; ids != null && r < ids.length; r++){
            const id = ids[r];
            _logBus.delete(id);
        }
        if(_logBus.size == 0){
            _lastId = null;
        }
    }
    
    
	return {
        error: _error,
        snapshot: _snapshot,
        remove: _remove,
        info: function(){
			return [_logBus.size];
		}
	};
    
})();
