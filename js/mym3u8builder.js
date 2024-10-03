/*
_data {
    isMaster: false,    // optional
    media: {
        targetDur: 5,   // optional
        firstSeq: 0     // optional
    },
    playList: [
        // media
        {
            uri: "",    // optional when key's method NONE
            duration: 0,    // optional when isInitSec true or key exists
            isInitSec: false,  // optional
            isDiscon: false,     // optional
            key: {  // optional
                method: "",
                iv: ""  // optional   
            }
        }
        // master
        {
            uri: "",
            bandwidth: 0,
            codecs: "",  // optional
            isDirect: false,    // optional
            duration: 0, // optional
            renditions: // optional
            [
                {
                    type: "",    // "AUDIO", "VIDEO", "SUBTITLES"
                    uri: "",
                    groupId: "",
                    name: "",
                    bandwidth: 0    // optional
                }
            ],
            rendition:  // optional
            [
                {
                    groupId: "",
                    type: ""
                }
            ]
        }
    ]
}
*/
var MyM3u8Builder = function(_data){
    const _buffer = [];
    
    function _write(s){
        _buffer.push(s);
    }
    
    function _flush(){
        return _buffer.join("\n");
    }
    
    function _quotedString(s){
        return '"' + s + '"';
    }
    
    function _buildBasic(){
        _write("#EXTM3U");
        _write("#EXT-X-VERSION:6");
    }
    
    function _buildMediaPlaylist(){
        _buildBasic();
        _write("#EXT-X-TARGETDURATION:" + (_data.media.targetDur || 5));
        _write("#EXT-X-MEDIA-SEQUENCE:" + (_data.media.firstSeq || 0));
        _write("#EXT-X-PLAYLIST-TYPE:VOD");
        for(let r in _data.playList){
            const item = _data.playList[r];
            if(item.key){
                _write("#EXT-X-KEY:METHOD=" + item.key.method + (item.uri ? ",URI=" + _quotedString(item.uri) : "") + (item.key.iv ? ",IV=" + item.key.iv : "") );
                continue;
            }
            
            if(item.isInitSec){
                _write("#EXT-X-MAP:URI=" + _quotedString(item.uri));
            }else{
                _write("#EXTINF:" + item.duration + ",");
                _write(item.uri);
            }
            
            if(item.isDiscon){
                _write("#EXT-X-DISCONTINUITY");
            }
        }
        _write("#EXT-X-ENDLIST");
        return _flush();
    }
    
    function _buildMasterPlaylist(){
        _buildBasic();
        for(let r in _data.playList){
            const item = _data.playList[r];
            for(let j=0; item.renditions != null && j < item.renditions.length; j++){
                const rendition = item.renditions[j];
                _write("#EXT-X-MEDIA:TYPE=" + rendition.type + ",GROUP-ID=" + _quotedString(rendition.groupId) + ",NAME=" + _quotedString(rendition.name) + ",URI=" + _quotedString(rendition.uri) + (rendition.bandwidth != null ? ",X-BANDWIDTH=" + rendition.bandwidth : "" ) );
            }
            let renditionAttr = "";
            for(let k=0; item.rendition != null && k < item.rendition.length; k++){
                const rendition = item.rendition[k];
                renditionAttr += ( "," + rendition.type + "=" + _quotedString(rendition.groupId) );
            }
            _write("#EXT-X-STREAM-INF:BANDWIDTH=" + item.bandwidth + (item.codecs ? ",CODECS=" + _quotedString(item.codecs) : "") + (item.duration ? ",X-DIRECT-DURATION=" + item.duration : "") + renditionAttr );
            _write((item.isDirect ? "direct://" : "") + item.uri);
        }
        return _flush();
    }
	
	this.build = function(){
        if(_data.playList == null || _data.playList.length == 0){
            return null;
        }
		if(_data.isMaster){
            return _buildMasterPlaylist();
        }
        return _buildMediaPlaylist();
	};

}
