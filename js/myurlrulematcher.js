var MyUrlRuleMatcher = (function(){
    
    function _update(options){
    }
    
    function _matchAndParse(url, mode){
        return null;
    }
    
    function _verify(optionsString){
        return true;
    }
    
    return {
        update: _update,
        matchAndParse: _matchAndParse,
        verify: _verify,
        info: function(){
            return [0];
        }
    };
    
})();