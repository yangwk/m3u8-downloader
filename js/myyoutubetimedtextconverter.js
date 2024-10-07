var MyYoutubeTimedTextConverter = function(){
    
    var _SrtItem = function(sequence, appearMs, disappearMs, text){
        this.sequence = sequence;
        this.appearMs = appearMs;
        this.disappearMs = disappearMs;
        this.text = text;
    }
    
    function _srtJson(content){
        if(!content){
            return null;
        }
        let data = null;
        try{
            data = JSON.parse(content);
        }catch(e){
        }
        if(! data){
            return null;
        }
        
        const result = [];
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
    
    function _srtXml(content){
        if(!content){
            return null;
        }
        let data = null;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/xml");
        const errorNode = doc.querySelector("parsererror");
        if (errorNode) {
            return null;
        }
        
        const result = [];
        let sequence = 0;
        doc.querySelectorAll("transcript text").forEach(function(dom){
            const start = dom.getAttribute("start");
            const dur = dom.getAttribute("dur");
            let text = dom.textContent;
            if(start == null || dur == null || ! text){
                return;
            }
            // handle character reference
            const element = new DOMParser().parseFromString("<text>"+ text +"</text>", "text/xml");
            text = element.querySelector("text").textContent;
            
            const appearMs = Number((parseFloat(start) * 1000).toFixed(0));
            result.push(new _SrtItem(
                ++ sequence,
                appearMs,
                appearMs + Number((parseFloat(dur) * 1000).toFixed(0)),
                text
            ));
        });
        
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
        return _srtJson(content) || _srtXml(content);
	};

}
