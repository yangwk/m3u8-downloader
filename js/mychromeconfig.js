var MyChromeConfig = (function () {
	var _USER_AGENT = {
		pc: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36",
		mobile: "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Mobile Safari/537.36"
	};
	
	
	var _config = {
		environment: "nothing",
		showTab: "1",
		showDuration: "1",
		monitoredQueueMax: 20,
		downloadingMax: 3,
		downloadBatchMax: 5,
		popupWidth: 462,
		popupHeight: 435,
		popupInTab: "0"
	};
	
	chrome.storage.local.get(_config, function(items){
		if(items){
			for(var key in items){
				_config[key] = items[key];
			}
		}
	});

	return {
		update: function (newConfig) {
			newConfig = MyUtils.clone(newConfig);
			for(var key in newConfig){
				if(! (key in _config)){
					throw "not exists key " + key;
				}
			}
			for(var k in newConfig){
				_config[k] = newConfig[k];
			}
			chrome.storage.local.set(newConfig, function () {});
		},
		get: function (key) {
			return _config[key];
		},
		getUserAgent: function () {
			return _USER_AGENT[_config.environment];
		},
		view: function(){
			return MyUtils.clone(_config);
		}
	}

})();
