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
			var array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return Date.now().toString() + array[0];
		},
		clone: function(obj, exclusions, inverse){
            if(inverse == null){
                inverse = false;
            }
			if(exclusions != null && Array.isArray(exclusions)){
				if(! Array.isArray(obj) && (obj instanceof Object)){
					var copy = {};
					for(var key in obj){
						var out = inverse ? true : false;
						for(var x in exclusions){
							if(exclusions[x] == key){
								out = inverse ? false : true;
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
					path = this.getLastPathName(path);
				}
				var idx = path ? path.lastIndexOf(".") : -1;
				return idx == -1 ? null : ( idx+1 >= path.length ? null : path.substring(idx+1) );
			}
			return null;
		},
		trimSuffix: function(path){
            var idx = path ? path.lastIndexOf(".") : -1;
            return idx == -1 ? path : path.substring(0, idx);
		},
		getLastPathName: function(url){
			var u = new URL(url);
			var idx = u.pathname ? u.pathname.lastIndexOf("/") : -1;
			return idx == -1 ? null : ( idx+1 >= u.pathname.length ? null : u.pathname.substring(idx+1) );
		},
        removeLastPathName: function(pathname){
            var idx = pathname ? pathname.lastIndexOf("/") : -1;
            return ( idx == -1 ? pathname : pathname.substring(0, idx) ) || "/";
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
			const difference = targetLen - str.length;
            const count = Math.trunc(difference / padStr.length);
            let addStr = "";
            for(let r=0; r<count; r++){
                addStr += padStr;
            }
            const remainder = difference % padStr.length;
            if(remainder != 0){
                addStr += padStr.substring(0, remainder);
            }
			return addStr + str;
		},
		formatHms: function(sec){
			var fsec = sec < 1 ? 1 : Number(sec.toFixed(0));
			var hour = Math.trunc(fsec / 3600);
			var tail = fsec % 3600;
			var minute = Math.trunc(tail / 60);
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
			
			return headers.length == 0 ? null : headers;
		},
		isWindowsPlatform: function(){
			if(navigator.userAgentData){
				return navigator.userAgentData.platform == "Windows";
			}
			
			return navigator.platform == "Win32" || navigator.platform == "Win64";
		},
        isSuccessful: function(sc){
            return (sc >= 200 && sc < 300) || sc == 304 ;
		},
        isChromeTarget: function(downloadId){
            return ! (typeof downloadId == "string" || downloadId instanceof String );
        },
        formatBandwidth: function(bandwidth){
            let dividend = 1 , unit = "bps";
            if(1000 * 1000 <= bandwidth){
                dividend = 1000 * 1000;
                unit = "Mbps";
            }else if(1000 <= bandwidth){
                dividend = 1000;
                unit = "Kbps";
            }
            const num = bandwidth / dividend;
            const intPart = Math.trunc(num);
            let fraPart = Number((num - intPart).toFixed(2));
            if(fraPart != 0){
                fraPart = Math.trunc(fraPart * 10) / 10;
            }
            return (intPart + fraPart) + unit;
        },
        readAsArrayBuffer: function(blob){
            if(Blob.prototype.arrayBuffer){
                return blob.arrayBuffer();
            }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if(reader.readyState == 2){
                        resolve(reader.result);
                    }
                };
                reader.onabort = (e) => {
                    reject(e);
                };
                reader.onerror = (e) => {
                    reject(e);
                };
                reader.readAsArrayBuffer(blob);
            });
        },
        escapeRegExp: function(string, exclusions) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, function(match){
                let ignore = false;
                if(exclusions != null && Array.isArray(exclusions)){
                    ignore = exclusions.includes(match);
                }
                return ignore ? match : "\\" + match;
            });
        },
        run: function(funcExpression, funcArgs){
            try{
                return Function(`"use strict";return (${funcExpression})`)()(
                    funcArgs
                );
            }catch(e){
                // ignore
            }
            return null;
        },
        headersToHeader: function(headers){
            if(headers != null && headers.length != 0){
                const header = {};
                for(let r in headers){
                    header[headers[r].name] = headers[r].value;
                }
                return header;
            }
            return null;
        },
        outerHeight: function(dom){
            const marginHeight = parseFloat( dom.style.marginTop || 0 ) + parseFloat( dom.style.marginBottom || 0 );
            return dom.offsetHeight + marginHeight;
        },
        getMimeType: function(mime){
            if(mime){
                var idx = mime.indexOf("/");
                return mime.substring(0, idx == -1 ? mime.length : idx);
            }
            return null;
        }
    };
})();
