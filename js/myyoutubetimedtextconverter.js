var MyYoutubeTimedTextConverter = function(){
    
    var _SrtItem = function(sequence, appearMs, disappearMs, text){
        this.sequence = sequence;
        this.appearMs = appearMs;
        this.disappearMs = disappearMs;
        this.text = text;
    }
    
    function _srt(content){
        const result = [];
        if(!content){
            return result;
        }
        const data = JSON.parse(content);
        
        let sequence = 0;
        for(let r=0; data.events != null && r< data.events.length; r++) {
            const item = data.events[r];
            
            if(item.tStartMs == null || item.dDurationMs == null || item.segs == null || item.segs.length == 0){
                continue;
            }
            let text = "";
            for(let s=0; s< item.segs.length; s++){
                const seg = item.segs[s];
                if(!seg.utf8){
                    continue;
                }
                text += seg.utf8;
            }
            
            if(!text || text == "\n"){
                continue;
            }
            result.push(new _SrtItem(
                ++ sequence,
                item.tStartMs,
                item.tStartMs + item.dDurationMs,
                text
            ));
        }
        
        return _formatSrt(result);
    }
    
    function _formatSrt(result){
        const _buffer = [];
        for(let r in result){
            const item = result[r];
            _buffer.push(item.sequence);
            _buffer.push(MyUtils.formatHmsMs(item.appearMs) + " --> " + MyUtils.formatHmsMs(item.disappearMs));
            _buffer.push(item.text + "\n");
        }
        
        return _buffer.join("\n");
    }
    
	this.convertToSrt = function(content){
        return _srt(content);
	};

}
