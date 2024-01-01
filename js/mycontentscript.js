(function(){
	if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", _fire);
	} else {
		_fire();
	}
    
        
    function _fire(){
        chrome.runtime.sendMessage({
            action: "contentscript.match",
            data: {
                url: window.location.href
            }
        }, function(response){
            if(response.content){
                _start(response.content);
            }
        });

        function _start(getm3u8Content) {
            const script = document.createElement("script");
            const scriptContent =
            'window.addEventListener("message", function(event){                                              ' +
            '    if(event.source != window){                                                                  ' +
            '        return ;                                                                                 ' +
            '    }                                                                                            ' +
            '    if(event.data.action == "getm3u8"){                                                          ' +
            '        const retval = (function(){ %s })();                                                     ' +
            '        event.source.postMessage({ action: "setm3u8", data: retval }, event.origin);             ' +
            '    }                                                                                            ' +
            '});                                                                                              ' ;

            script.text = scriptContent.replace("%s", getm3u8Content);
            document.body.appendChild(script);

            window.addEventListener("message", function(event){
                if(event.source != window){
                    return ;
                }
                if(event.data.action == "setm3u8"){
                    chrome.runtime.sendMessage({
                        action: "contentscript.setm3u8",
                        data: {
                            result: event.data.data,
                            url: window.location.href
                        }
                    }, function(response){
                    });
                }
            });

            const dom = document.body;
        
            const onceHandler = function(e){
                e.stopPropagation();
                
                window.postMessage({ action: "getm3u8" }, "*");
                
                dom.removeEventListener("mouseover", onceHandler);
                dom.removeEventListener("touchstart", onceHandler);
            };
            
            dom.addEventListener("mouseover", onceHandler);
            dom.addEventListener("touchstart", onceHandler);
        }

    }

})();