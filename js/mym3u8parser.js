/*
@See https://tools.ietf.org/html/rfc8216
very simple parser: 
    not support the encryption method of SAMPLE-AES
*/
var MyM3u8Parser = function(_reqConfig, _content){
	
	var _PlayItem = function(logicSequence, sequence, url, keyRef, keyIV, duration){
        this.logicSequence = logicSequence;
		this.sequence = sequence;
		this.url = url;
        this.discontinuity = false;
        this.keyRef = keyRef;
        this.keyIV = keyIV;
        this.duration = duration;
        this.content = null;
	}
    
	var _MasterPlayItem = function(bandwidth, mediaType, url, isDirect, renditionGroups){
		this.bandwidth = bandwidth;
        this.mediaType = mediaType;
		this.url = url;
        this.isDirect = isDirect;
        this.renditionGroups = renditionGroups;
	}
    
    var _DiscontinuityItem = function(start, end){
		this.start = start;
		this.end = end;
	}
    
    var _KeyItem = function(method, url, iv){
		this.method = method;
		this.url = url;
        this.iv = iv;
        this.content = null;
	}
    
    var _RenditionGroupItem = function(groupId, type){
        this.groupId = groupId;
		this.type = type;
	}
    
    var _RenditionItem = function(type, url, groupId, name, bandwidth, isDirect, language, kind){
		this.type = type;
		this.url = url;
        this.groupId = groupId;
        this.name = name;
        this.bandwidth = bandwidth;
        this.isDirect = isDirect;
        this.language = language;
        this.kind = kind;
	}
	
	var _myReader = new MyReader(_content);
	var _parseResult = null;
	
	function _readStatement(){
		var statement = null;
		var line = null;
		while((line = _myReader.readLine()) != null){
			if(! line){
				continue;
			}
			var again = line.lastIndexOf("\\");
            if(again != -1 && ! line.substring(Math.min(again+1, line.length)).trim()){
                statement = statement == null ? line.substring(0, again) : statement + line.substring(0, again);
            }else{
                statement = statement == null ? line : statement + line;
				break;
            }
		}
		return statement;
	}
    
    
    function _parseAttributeList(str){
        const regex = new RegExp('([A-Z0-9\-]+)\=("([^"]*)"|([^\,"]+))', 'g');
        let arr = null;
        let nameValue = {};
        while ((arr = regex.exec(str)) !== null) {
            let attributeName = arr[1];
            let attributeValue = arr[3] || arr[4];
            nameValue[attributeName] = attributeValue;
        }
        return nameValue;
    }
    
    
    function _parseAttributeValue(attributeValue, type){
        if(! attributeValue){
            return attributeValue;
        }
        // decimal-integer
        if(type == 0){
            return parseInt(attributeValue, 10);
        }
        // hexadecimal-sequence
        else if(type == 1){
            let arr = [];
            let content = attributeValue.substring(2);
            for(let s=content.length; s>0; s=s-2){
                let hex = content.substring(Math.max(s-2, 0), s);
                arr.push(parseInt(hex, 16));
            }
            return arr.reverse();
        }
        // decimal-floating-point, signed-decimal-floating-point
        else if(type == 2){
            return parseFloat(attributeValue);
        }
        // decimal-resolution
        else if(type == 3){
            let arr = attributeValue.split("x", 2);
            return {width: parseInt(arr[0], 10), height: parseInt(arr[1], 10)};
        }
        // quoted-string, enumerated-string
        else if(type == 4){
            return attributeValue;
        }
        throw "unknown type: " + type;
    }
    
    function _paddingIV(iv){
        if(iv.length < 16){
            let arr = [];
            for(let r=0; r<(16 - iv.length); r++){
                arr.push(0);
            }
            return arr.concat(iv);
        }
        return iv;
    }
	
	function _parse(){
		var statement = null;
		var playList = [], firstSequence = 0, index = 0, logicIndex = 0, duration = 0, keyData = new Map(), keyRef = 0, existEXT = false;
        var isMasterPlaylist = false, bandwidth = 0, mediaType = null, renditionGroups = null, renditionData = {};
        var firstDiscSequence = 0, firstDiscIndex = -1, discIndex = -1;
        const emptyCheck = " \f\n\r\t\v";
        var targetDuration = 0, hasEnd = false, playlistType = null, segmentType = "mpegts"; // mpegts, fmp4
		while((statement = _readStatement()) != null){
			if(! statement){
				continue;
			}
            let isURI = true, isInitializationSection = false, contentURI = statement;
			if(statement.charAt(0) === "#"){
                // either comments or tags. Tags begin with #EXT.
                if(! statement.startsWith("#EXT")){
                    continue;
                }
                existEXT = true;
                isURI = false;
				var colonIdx = statement.indexOf(":");
				var tag = statement.substring(1, colonIdx == -1 ? statement.length : colonIdx);
				if(tag == "EXT-X-MEDIA-SEQUENCE"){
                    firstSequence = _parseAttributeValue(statement.substring("#EXT-X-MEDIA-SEQUENCE:".length).trim() ,0);
				} else if(tag == "EXT-X-KEY"){
					let nameValue = _parseAttributeList(statement.substring("#EXT-X-KEY:".length));
                    let method = _parseAttributeValue(nameValue["METHOD"], 4);
                    let uri = _parseAttributeValue(nameValue["URI"], 4);
                    if(method == "AES-128"){
                        let iv = nameValue["IV"] ? _parseAttributeValue(nameValue["IV"], 1) : null;
                        let key = new _KeyItem(method, MyUtils.concatUrl(uri, _reqConfig.url), iv == null ? null : new Uint8Array(_paddingIV(iv)));
                        keyRef ++;
                        keyData.set(keyRef, key);
                    }else if(method == "NONE"){
                        keyRef ++;
                    }else if(method == "SAMPLE-AES"){
                        throw "not support the encryption method of SAMPLE-AES";
                    }
				} else if(tag == "EXT-X-STREAM-INF"){
					const nameValue = _parseAttributeList(statement.substring("#EXT-X-STREAM-INF:".length));
                    bandwidth  = _parseAttributeValue(nameValue["BANDWIDTH"], 0);
                    mediaType = _getMediaType( _parseAttributeValue(nameValue["CODECS"], 4) );
                    if(nameValue["X-DIRECT-DURATION"]){
                        duration = _parseAttributeValue(nameValue["X-DIRECT-DURATION"], 2);
                    }
                    renditionGroups = [];
                    const renTypeList = ["AUDIO", "VIDEO", "SUBTITLES", "CLOSED-CAPTIONS"];
                    for(let x in renTypeList){
                        const renType = renTypeList[x];
                        if(nameValue[renType]){
                            const groupId = _parseAttributeValue(nameValue[renType], 4);
                            const ren = renditionData[groupId];
                            const renItem = ren ? ren[renType] : null;
                            renItem && renditionGroups.push(new _RenditionGroupItem(groupId, renType));
                        }
                    }
                    isMasterPlaylist = true;
				} else if(tag == "EXT-X-MEDIA"){
                    const nameValue = _parseAttributeList(statement.substring("#EXT-X-MEDIA:".length));
                    const type = _parseAttributeValue(nameValue["TYPE"], 4);
                    let uri = nameValue["URI"] ? _parseAttributeValue(nameValue["URI"], 4) : null;
                    const groupId = _parseAttributeValue(nameValue["GROUP-ID"], 4);
                    const name = _parseAttributeValue(nameValue["NAME"], 4);
                    bandwidth  = _parseAttributeValue(nameValue["X-BANDWIDTH"], 0);
                    const language = _parseAttributeValue(nameValue["LANGUAGE"], 4);
                    const kind = _parseAttributeValue(nameValue["X-KIND"], 4);
                    const requireUri = (type == "AUDIO" || type == "VIDEO" || type == "SUBTITLES");
                    if((requireUri && uri) || !requireUri){
                        let ren = renditionData[groupId];
                        if(ren == null){
                            ren = {};
                            renditionData[groupId] = ren;
                        }
                        let renTypeItem = ren[type];
                        if(renTypeItem == null){
                            renTypeItem = [];
                            ren[type] = renTypeItem;
                        }
                        const isDirect = uri && uri.startsWith("direct://");
                        uri = isDirect ? uri.substring("direct://".length) : uri;
                        renTypeItem.push(new _RenditionItem(type, uri ? MyUtils.concatUrl(uri, _reqConfig.url) : null, groupId, name, bandwidth, isDirect, language, kind));
                    }
                } else if(tag == "EXTINF"){
					var commaIdx = statement.indexOf(",");
                    duration = _parseAttributeValue(statement.substring("#EXTINF:".length, commaIdx == -1 ? statement.length : commaIdx).trim(), 2);
				} else if(tag == "EXT-X-DISCONTINUITY"){
                    if(playList.length > 0){
                        playList[playList.length-1].discontinuity = true;
                    }
                    discIndex = index;
                    // The EXT-X-DISCONTINUITY-SEQUENCE tag MUST appear before the first Media Segment in the Playlist.
                    // The EXT-X-DISCONTINUITY-SEQUENCE tag MUST appear before any EXT-X-DISCONTINUITY tag.
                    if(firstDiscIndex != discIndex){
                        firstDiscSequence = 0;
                    }
                    keyRef ++;
                } else if(tag == "EXT-X-DISCONTINUITY-SEQUENCE"){
                    firstDiscSequence = _parseAttributeValue(statement.substring("#EXT-X-DISCONTINUITY-SEQUENCE:".length).trim() ,0);
                    firstDiscIndex = index;
				} else if(tag == "EXT-X-MAP"){
					let nameValue = _parseAttributeList(statement.substring("#EXT-X-MAP:".length));
                    contentURI = _parseAttributeValue(nameValue["URI"], 4);
                    isInitializationSection = true;
                    segmentType = "fmp4";
				} else if(tag == "EXT-X-TARGETDURATION"){
                    targetDuration = _parseAttributeValue(statement.substring("#EXT-X-TARGETDURATION:".length).trim(), 0);
                } else if(tag == "EXT-X-ENDLIST"){
                    hasEnd = true;
                } else if(tag == "EXT-X-PLAYLIST-TYPE"){
                    playlistType = _parseAttributeValue(statement.substring("#EXT-X-PLAYLIST-TYPE:".length).trim(), 4);
                }
			}
            
            if(isURI || isInitializationSection){
                if(! existEXT || emptyCheck.indexOf( contentURI.charAt(0) ) != -1){
					throw "invalid m3u8 format";
				}
                if(isMasterPlaylist){
                    const isDirect = contentURI.startsWith("direct://");
                    contentURI = isDirect ? contentURI.substring("direct://".length) : contentURI;
                    playList.push( new _MasterPlayItem(bandwidth, mediaType, MyUtils.concatUrl(contentURI, _reqConfig.url), isDirect, _sortRenditionGroup(renditionGroups)) );
                    continue;
                }
                let keyIV = null;
                let key = keyData.get(keyRef);
                const ivSequence = discIndex >= 0 ? firstDiscSequence+(index-discIndex) : firstSequence+index;
                if(key != null && key.iv == null){
                    let iv = _parseAttributeValue("0x" + ivSequence.toString(16), 1);
                    keyIV = new Uint8Array(_paddingIV(iv));
                }
				playList.push( new _PlayItem(firstSequence+logicIndex, ivSequence, MyUtils.concatUrl(contentURI, _reqConfig.url), keyRef, keyIV, duration) );
				if(isURI){  // Media Initialization Section can not change the Media Sequence Number
                    index ++;
                }
                logicIndex ++;
			}
		}
        

		return {
			duration: isMasterPlaylist ? duration : playList.map(p => p.duration).reduce((acc, curr) => acc + curr, 0) ,
			playList: isMasterPlaylist ? _sortPlayList(playList) : playList,
            discontinuity: ! isMasterPlaylist ? _handleDiscontinuity(playList) : null,
            keyData: keyData,
            isMasterPlaylist: isMasterPlaylist,
            suffix: _determineSuffix(segmentType, playList.length > 0 ? playList[0].url : null),
            renditionData: _sortRendition(renditionData),
            targetDuration: targetDuration,
            isLive: ! isMasterPlaylist && ! playlistType && ! hasEnd
		};
	}
	

	function _sortPlayList(playList){
		playList.sort(function(a, b){
            const num = b.mediaType.localeCompare(a.mediaType);
			return num != 0 ? num : b.bandwidth - a.bandwidth;
		});
        return playList;
	}
    
	function _sortRenditionGroup(list){
		list.sort(function(a, b){
            return b.type.localeCompare(a.type);
		});
        return list;
	}
    
	function _sortRendition(data){
        const sortFunc = function(list){
            list.sort(function(a, b){
                const num = b.type.localeCompare(a.type);
                return num != 0 ? num : (b.bandwidth || 0) - (a.bandwidth || 0);
            });
        }
        
        for(let groupId in data){
            const ren = data[groupId];
            for(let type in ren){
                sortFunc(ren[type]);
            }
        }
        
        return data;
	}
    
    function _handleDiscontinuity(playList){
        var retval = [];
        if(playList.length == 0){
            return retval;
        }
        if(MyChromeConfig.get("splitDiscontinuity") != "1"){
            retval.push( new _DiscontinuityItem(0, playList.length-1) );
            return retval;
        }
        for(var r=0, start=0, end=0; r<playList.length; r++){
            if(playList[r].discontinuity == true || r == playList.length-1){
                end = r;
                retval.push( new _DiscontinuityItem(start, end) );
                start = r+1;
            }
        }
        return retval;
    }
    
    function _getMediaType(codecsStr){
        let isVideo = true;
        if(codecsStr){
            const codecsArr = codecsStr.split(",");
            let video = 0 , audio = 0;
            for(let x in codecsArr){
                const idx = codecsArr[x].indexOf(".");
                const codecs = codecsArr[x].substring(0, idx == -1 ? codecsArr[x].length : idx);
                if(MyMp4raCodecs.containsVideo(codecs)){
                    video ++;
                }else if(MyMp4raCodecs.containsAudio(codecs)){
                    audio ++;
                }
            }
            isVideo = !(video == 0 && audio > 0);
        }
        return isVideo ? "video" : "audio";
    }
    
    function _determineSuffix(segmentType, url){
        if(segmentType == "fmp4"){
            return "mp4";
        }else if(MyUtils.getSuffix(url, true) == "vtt"){
            return "vtt";
        }
        return "mpeg";
    }
    
	this.parse = function(){
		try{
			return _parse();
		}catch(err){
		}
        return null;
	};

}
