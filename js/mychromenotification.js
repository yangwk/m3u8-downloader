var MyChromeNotification = (function () {
	
	var _cache = new Map();
	
	var _Executable = function(_fn, _args){
		this.execute = function(){
			_fn.apply(null, _args);
		}
	}
		
	// TODO other hooks to free resource
	
	chrome.notifications.onClosed.addListener(function(id, byUser){
		_cache.delete(id);
	});
		
	chrome.notifications.onButtonClicked.addListener(function (id, buttonIndex) {
		var exe = _cache.get(id);
        if(exe == null){
			return ;
		}
		_cache.delete(id);
		chrome.notifications.clear(id, function(wasCleared){});
		if(buttonIndex == 0){
			exe.execute();
		}
    });
	
	function _create(options, callback, fn, args){
		if(fn == null || (args != null && ! Array.isArray(args)) ){
			throw "invalid arguments";
		}
		
		
		chrome.notifications.getPermissionLevel(function(level){
			if(level == "granted"){
				var id = MyUtils.genRandomString();
				_cache.set(id, new _Executable(fn,args));
				
				chrome.notifications.create(id, {
					type: "basic",
					requireInteraction: true,
					iconUrl: chrome.extension.getURL("img/icon128.png"),
					title: chrome.i18n.getMessage("appName") + options.title,
					message: options.message,
					buttons: [{ title: chrome.i18n.getMessage("notificationYes") }, 
						{ title: chrome.i18n.getMessage("notificationNo") }]
				}, function(nid){
					callback(nid);
				});
			}else{
				callback(null);
			}
		});
	}
	
	return {
		create: _create,
		info: function(){
			return [_cache.size];
		}
	}
})();