var MyDiffRendering = function(){
    
    var _DomLink = function(key, obj, dom){
        this.key = key;
        this.obj = obj;
        this.dom = dom;
    }
    
    const _dataHolder = new Array();
    
    let _container = null;
    let _getKey = null;
    
    this.renderingAll = function(options, data){
        _container = options.container;
        _getKey = options.getKey;
        const renderingOne = options.renderingOne;
        const noDiffOne = options.noDiffOne;
    
        const isInit = _dataHolder.length == 0;
        let fragment = isInit ? document.createDocumentFragment() : null;
        let isOverflow = false;
        let r=0;
        for(; r<data.length; r++){
            const newObj = data[r];
            data[r] = null;
            if(isInit){
                const newDom = renderingOne(newObj, r);
                const key = _getKey(newObj);
                _dataHolder.push(new _DomLink(key, newObj, newDom));
                fragment.appendChild(newDom);
            }else{
                isOverflow = r >= _dataHolder.length;
                const oldObj = isOverflow ? null : _dataHolder[r].obj;
                if(MyUtils.diffObject(oldObj, newObj)){
                    const newDom = renderingOne(newObj, r);
                    const key = _getKey(newObj);
                    if(isOverflow){
                        if(fragment == null){
                            fragment = document.createDocumentFragment();
                        }
                        _dataHolder.push(new _DomLink(key, newObj, newDom));
                        fragment.appendChild(newDom);
                    }else{
                        const oldDom = _dataHolder[r].dom;
                        _container.replaceChild(newDom, oldDom);
                        _dataHolder[r] = new _DomLink(key, newObj, newDom);
                    }
                }else{
                    noDiffOne && noDiffOne(newObj, r);
                }
            }
        }
        
        if(isInit){
            _container.appendChild(fragment);
        }else{
            if(isOverflow){
                _container.appendChild(fragment);
            }
            if(_dataHolder.length > data.length){
                for(; r<_dataHolder.length; r++){
                    const oldDom = _dataHolder[r].dom;
                    _container.removeChild(oldDom);
                    _dataHolder.splice(r, 1);
                    r --;
                }
            }
        }
        
    }
    
    this.length = function(){
        return _dataHolder.length;
    }
    
    this.deleteByKey = function(deleteKey){
        for(let r=0; r < _dataHolder.length; r++){
            const domLink = _dataHolder[r];
            if(deleteKey == domLink.key){
                const oldDom = domLink.dom;
                _container.removeChild(oldDom);
                _dataHolder.splice(r, 1);
                r --;
                break;
            }
        }
    }
}
