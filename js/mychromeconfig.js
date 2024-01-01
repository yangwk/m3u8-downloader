var MyChromeConfig = (function () {
	var _USER_AGENT = {
		pc: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
		mobile: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"
	};
	
	
	var _config = {
		environment: "nothing",
		showTab: "1",
		showDuration: "1",
		monitoredQueueMax: 50,
		downloadingMax: 3,
		downloadBatchMax: 5,
		popupWidth: 462,
		popupHeight: 435,
		promptWhenExist: "0",
		newFolderAtRoot: "1",
		playSoundWhenComplete: "1",
        splitDiscontinuity: "1",
        processerThreshold: 500,
        matchingRuleEnable: "0",
        matchingRule: '[]'
	};
	
	chrome.storage.local.get(_config, function(items){
		if(items){
			for(var key in items){
				_config[key] = items[key];
			}
		}
        
        MyUrlRuleMatcher.update(JSON.parse(_config.matchingRule));
	});

	return {
		update: function (newConfig) {
			newConfig = MyUtils.clone(newConfig);
			for(var key in newConfig){
				if(! (key in _config)){
					throw "not exists key " + key;
				}
			}
            
            if(newConfig.matchingRule != null){
                if(! MyUrlRuleMatcher.verify(newConfig.matchingRule)){
                    delete newConfig.matchingRule;
                }else{
                    MyUrlRuleMatcher.update(JSON.parse(newConfig.matchingRule));
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
