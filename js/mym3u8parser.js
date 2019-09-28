/*
@See https://tools.ietf.org/html/rfc8216
very simple parser: 
	not support encrypted stream
	not support EXT-X-STREAM-INF for Variant Stream
*/
var MyM3u8Parser = function(_reqConfig, _content){
	
	var _PlayItem = function(sequence, url){
		this.sequence = sequence;
		this.url = url;
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
			if(again == -1){
				statement = statement == null ? line : statement + line;
				break;
			}else{
				statement = statement == null ? line.substring(0, again) : statement + line.substring(0, again);
			}
		}
		return statement;
	}
	
	function _parse(){
		var statement = null;
		var playList = [], sequence = 0, duration = 0;
		while((statement = _readStatement()) != null){
			if(! statement){
				continue;
			}
			if(statement.charAt(0) === "#"){
				var colonIdx = statement.indexOf(":");
				var tag = statement.substring(1, colonIdx == -1 ? statement.length : colonIdx);
				if(tag == "EXT-X-MEDIA-SEQUENCE"){
					sequence = parseInt(statement.substring("#EXT-X-MEDIA-SEQUENCE:".length).trim() ,10);
				} else if(tag == "EXT-X-KEY"){
					// Every encrypted Media Segment MUST have an EXT-X-KEY tag
					// Any unencrypted Media Segment in a Playlist that is preceded by an encrypted Media Segment MUST have an EXT-X-KEY tag applied to it with a METHOD attribute of NONE.	
					if(statement.substring("#EXT-X-KEY:".length).indexOf("METHOD=NONE") == -1){
						throw "not support encrypted stream";
					}
				} else if(tag == "EXT-X-STREAM-INF"){
					throw "not support EXT-X-STREAM-INF";
				} else if(tag == "EXTINF"){
					var commaIdx = statement.indexOf(",");
					duration += parseFloat(statement.substring("#EXTINF:".length, commaIdx == -1 ? statement.length : commaIdx).trim());
				}
			}else{
				if(statement.charAt(0) === "\t" || statement.charAt(0) === " "){
					throw "invalid m3u8 format";
				}
				playList.push( new _PlayItem(sequence, MyUtils.concatUrl(statement, _reqConfig.url)) );
				sequence ++;
			}
		}

		_sortPlayList(playList);
							
		return {
			duration: duration,
			playList: playList
		};
	}
	
	
	function _sortPlayList(playList){
		playList.sort(function(a, b){
			return a.sequence - b.sequence;
		});
	}
	
	this.parse = function(){
		try{
			return _parse();
		}catch(err){
			return null;
		}
	};

}
