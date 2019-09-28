var MyReader = function(_input){
    var _offset = 0;
    var _length = _input == null ? 0 : _input.length;
    var _lastLineReaded = false;    // last one is line , can read again for line counting
    
    function set(x){
        if(! _lastLineReaded){
            _lastLineReaded = (x == _length-1);
            _offset = (x == _length-1) ? x : x+1;
        }else{
            _offset = x+1;
        }
    }
    
    //  \r  \n  \r\n
    this.readLine = function(){
        var result = null;
        for(var start=_offset, end=0, flag=false, x=_offset; x<_length; x++){
            var ch = _input.charAt(x);
            if(ch === "\r"){
                flag = true;
                set(x);
                end = x;
                if(x+1<_length && _input.charAt(x+1) === "\n"){
                    set(x+1);
                }
            }else if(ch === "\n"){
                flag = true;
                set(x);
                end = x;
            }else{ // normal
                if(x == _length-1){ // last one none line
                    flag = true;
                    _offset = x+1;
                    end = _length;
                }
            }
            
            if(flag){
                result = _input.substring(start, end);
                break;
            }
        }

        return result;
    }
}
