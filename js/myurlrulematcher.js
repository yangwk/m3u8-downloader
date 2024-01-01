var MyUrlRuleMatcher = (function(){
    var _normalizedOptions = null;
    var _m3u8NormalizedOptions = null;
    var _contentscriptNormalizedOptions = null;
    
    function _pattern(s){
        const escaped = MyUtils.escapeRegExp( s, ["*"] );
        return "^" + escaped.replace(/[*]/g, ".*") + "$";
    }

    function _normalize(options) {
        for(let r in options){
            options[r].url.host = _pattern( options[r].url.host );
            if(options[r].url.pathname != null){
                options[r].url.pathname = _pattern( options[r].url.pathname );
            }
        }
        return options;
    }
    
    function _update(options){
        if(options != null){
            _normalizedOptions = _normalize( MyUtils.clone(options) );
            
            _m3u8NormalizedOptions = [];
            _contentscriptNormalizedOptions = [];
            for(let r=0; r<_normalizedOptions.length; r++){
                let ref = null;
                if(_normalizedOptions[r].rule != null && _normalizedOptions[r].rule.m3u8 != null){
                    ref = _m3u8NormalizedOptions;
                }else if(_normalizedOptions[r].rule != null && _normalizedOptions[r].rule.contentscript != null){
                    ref = _contentscriptNormalizedOptions;
                }
                
                if(ref != null){
                    ref.push( _normalizedOptions[r] );
                    _normalizedOptions.splice(r, 1);
                    r --;
                }
            }
        }
    }
    
    function _matchAndParse(url, mode){
        if(MyChromeConfig.get("matchingRuleEnable") == "0"){
            return null;
        }
        const options = (mode == "m3u8") ? _m3u8NormalizedOptions : (mode == "contentscript" ? _contentscriptNormalizedOptions : _normalizedOptions );
        if(! url || options == null || options.length == 0){
            return null;
        }
        const urlJS = new URL(url);
        for(let r in options){
            let reg = new RegExp(options[r].url.host, "g");
            if( reg.test(urlJS.host) ){
                if(options[r].url.pathname != null){
                    reg = new RegExp(options[r].url.pathname, "g");
                    if( reg.test(urlJS.pathname) ){
                        return _parseRule(urlJS, url, options[r].rule);
                    }
                }else{
                    return _parseRule(urlJS, url, options[r].rule);
                }
            }
        }
        return null;
    }
    
    function _parseRule(urlJS, url, rule){
        if(rule == null){
            return null;
        }
        let targetIdentifier = null, targetUrl = null, targetM3u8 = null, targetContentscript = null;
        
        if(rule.identifier != null){
            let identifier1 = null, identifier2 = null;
            if(rule.identifier.pathIndex != null){
                const arr = urlJS.pathname.split("/");
                for(let r in rule.identifier.pathIndex){
                    const index = rule.identifier.pathIndex[r];
                    if(0 <= index && index <= arr.length - 1){
                        identifier1 = identifier1 == null ? arr[index] : identifier1 + arr[index];
                    }
                }
            }
            if(rule.identifier.queryParam != null){
                for(let r in rule.identifier.queryParam){
                    const values = urlJS.searchParams.getAll( rule.identifier.queryParam[r] );
                    for(let x in values){
                        identifier2 = identifier2 == null ? values[x] : identifier2 + values[x];
                    }
                }
            }
            
            if(identifier1 != null || identifier2 != null){
                targetIdentifier = urlJS.host + (identifier1 || urlJS.pathname) + (identifier2 || "");
            }
        }
        
        if(rule.ignorer != null){
            if(rule.ignorer.queryParam != null){
                for(let r in rule.ignorer.queryParam){
                    urlJS.searchParams.delete( rule.ignorer.queryParam[r] );
                }
                targetUrl = urlJS.href;
            }
        }
        
        if(rule.m3u8 != null){
            targetM3u8 = rule.m3u8;
        }
        
        if(rule.contentscript != null){
            targetContentscript = rule.contentscript;
        }
        
        return { targetIdentifier: targetIdentifier, targetUrl: targetUrl, targetM3u8: targetM3u8, targetContentscript: targetContentscript  };
    }
    
    
    function _verify(optionsString){
        try {
            const options = JSON.parse(optionsString);
            if(! Array.isArray(options)){
                throw "invalid";
            }
            for(let r in options){
                if(options[r].url.host == null){
                    throw "invalid";
                }
                if(options[r].rule.identifier != null){
                    if(options[r].rule.identifier.pathIndex != null && ! Array.isArray(options[r].rule.identifier.pathIndex)){
                        throw "invalid";
                    }
                    if(options[r].rule.identifier.queryParam != null && ! Array.isArray(options[r].rule.identifier.queryParam)){
                        throw "invalid";
                    }
                }
                if(options[r].rule.ignorer != null){
                    if(options[r].rule.ignorer.queryParam != null && ! Array.isArray(options[r].rule.ignorer.queryParam)){
                        throw "invalid";
                    }
                }
            }
        } catch (e) {
            return false;
        }
        
        return true;
    }
    
    return {
        update: _update,
        matchAndParse: _matchAndParse,
        verify: _verify,
        info: function(){
            return [_normalizedOptions ? _normalizedOptions.length : 0, 
                    _m3u8NormalizedOptions ? _m3u8NormalizedOptions.length : 0,
                    _contentscriptNormalizedOptions ? _contentscriptNormalizedOptions.length : 0];
        }
    };
    
})();