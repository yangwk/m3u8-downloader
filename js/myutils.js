var MyUtils = (function(){
	
	function _findTag(rootDom, tagNames, result) {
        if (rootDom == null) {
            return;
        }
		
		for(var t in tagNames){
			if(rootDom.tagName == tagNames[t]){
				result.push(rootDom);
				break;
			}
		}

        if (rootDom.tagName == "IFRAME" || rootDom.tagName == "FRAME") {
            _findTag(rootDom.contentDocument, tagNames, result);
        } else {
            if (rootDom.children != null && rootDom.children.length > 0) {
                for (var x in rootDom.children) {
                    _findTag(rootDom.children[x], tagNames, result);
                }
            }
        }
    }
	
    return {
        findMediaElement: function() {
            var result = [];
            _findTag(document, ["VIDEO", "APPLET", "OBJECT", "EMBED", "AUDIO"], result);
            return result;
        },
		genRandomString: function() {
			return Date.now() + "" + parseInt(Math.random()*90000000+10000000, 10);
		},
		clone: function(obj, exclusions){
			if(exclusions != null && Array.isArray(exclusions)){
				if(! Array.isArray(obj) && (obj instanceof Object)){
					var copy = {};
					for(var key in obj){
						var out = false;
						for(var x in exclusions){
							if(exclusions[x] == key){
								out = true;
								break;
							}
						}
						if(! out){
							copy[key] = obj[key];
						}
					}
					return JSON.parse(JSON.stringify(copy));
				}
			}
			return JSON.parse(JSON.stringify(obj));
		},
		concatUrl: function(url, base){
			return new URL(url, base).toString();
		},
		getSuffix: function(path, isUrl){
			if(path){
				if(isUrl){
					var url = new URL(path);
					path = url.pathname;
				}
				var idx = path ? path.lastIndexOf(".") : -1;
				return idx == -1 ? null : ( idx+1 >= path.length ? null : path.substring(idx+1) );
			}
			return null;
		},
		getLastPathName: function(url){
			var u = new URL(url);
			var idx = u.pathname ? u.pathname.lastIndexOf("/") : -1;
			return idx == -1 ? null : ( idx+1 >= u.pathname.length ? null : u.pathname.substring(idx+1) );
		},
		escapeFileName: function(fileName){
			// \ / : * ? " < > | ! # ~ ` @ $ % ^ &
			return fileName.replace(new RegExp('[\\\\/\:\*\?"\<>\|\!#~`@\\$%\\^&]', "g"), "").trim();
		},
		padStart: function(str, targetLen, padStr){
			if(String.prototype.padStart){
				return str.padStart(targetLen, padStr);
			}
			if(str.length >= targetLen){
				return str;
			}
			var yx = targetLen - str.length;
			var tostr = padStr;
			var tolen = padStr.length;
			while(tolen < yx){
				tostr += padStr;
				tolen += padStr.length;
			}
			return tostr.substring(0, yx) + str;
		},
		formatHms: function(sec){
			var fsec = sec.toFixed(0);
			var hour = parseInt(fsec / 3600);
			var tail = fsec % 3600;
			var minute = parseInt(tail / 60);
			var second = tail % 60;
			return this.padStart(hour.toString(), 2, "0") + ":" + this.padStart(minute.toString(), 2, "0") + ":" + this.padStart(second.toString(), 2, "0");
		},
		getEntityLength: function(contentRange, contentLength){
			if(contentRange){
				var sizeStr = contentRange.substring( contentRange.lastIndexOf("/")+1).trim();
				if(sizeStr != "*"){
					return parseInt(sizeStr);
				}
			}
			if(contentLength){
				return parseInt(contentLength.trim());
			}
			return -1;
		},
		parseHeaders: function(content){
			var myReader = new MyReader(content);
			var headers = [];
			var line = null;
			while((line = myReader.readLine()) != null){
				if(! line){
					continue;
				}
				var idx = line.indexOf(":");
				if(idx != -1){
					headers.push({
						name: line.substring(0, idx).trim(),
						value: line.substring(idx+1).trim()
					});
				}
			}
			
			return headers;
		},
		isWindowsPlatform: function(){
			if(navigator.userAgentData){
				return navigator.userAgentData.platform == "Windows";
			}
			
			return navigator.platform == "Win32" || navigator.platform == "Win64";
		}
	
    };
})();
