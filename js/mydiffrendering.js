var MyDiffRendering = function(){
    
    const _dataHolder = new Array();
    const _dataDomMapping = new Map();
    
    let _container = null;
    
    this.renderingAll = function(options, data){
        const container = options.container;
        const renderingOne = options.renderingOne;
        const noDiffOne = options.noDiffOne;
        _container = container;
    
        const isInit = _dataHolder.length == 0;
        const fragment = isInit ? document.createDocumentFragment() : null;
        let r=0;
        for(; r<data.length; r++){
            const newObj = data[r];
            data[r] = null;
            if(isInit){
                const id = MyUtils.genRandomString();
                _dataHolder.push(newObj);
                _dataDomMapping.set(r, id);
                const newDom = renderingOne(newObj, r);
                if(newDom == null){
                    continue;
                }
                newDom.id = id;
                fragment.appendChild(newDom);
            }else{
                const isOverflow = r >= _dataHolder.length;
                const oldObj = isOverflow ? null : _dataHolder[r];
                if(MyUtils.diffObject(oldObj, newObj)){
                    const id = MyUtils.genRandomString();
                    const newDom = renderingOne(newObj, r);
                    if(newDom == null){
                        continue;
                    }
                    newDom.id = id;
                    if(isOverflow){
                        _dataHolder.push(newObj);
                        container.appendChild(newDom);
                        _dataDomMapping.set(r, id);
                    }else{
                        _dataHolder[r] = newObj;
                        const oldId = _dataDomMapping.get(r);
                        const oldDom = document.getElementById(oldId);
                        container.replaceChild(newDom, oldDom);
                        _dataDomMapping.set(r, id);
                    }
                }else{
                    noDiffOne && noDiffOne(newObj, r);
                }
            }
        }
        
        if(isInit){
            container.appendChild(fragment);
        }else{
            if(_dataHolder.length > data.length){
                for(let x=r; r<_dataHolder.length; r++, x++){
                    const oldId = _dataDomMapping.get(x);
                    const oldDom = document.getElementById(oldId);
                    container.removeChild(oldDom);
                    _dataDomMapping.delete(x);
                    _dataHolder.splice(r, 1);
                    r --;
                }
            }
        }
        
    }
    
    this.length = function(){
        return _dataHolder.length;
    }
    
    this.deleteByKey = function(deleteKey, getKey){
        if(deleteKey == null || getKey == null){
            return;
        }
        for(let r=0; r < _dataHolder.length; r++){
            if(deleteKey == getKey(_dataHolder[r])){
                const oldId = _dataDomMapping.get(r);
                const oldDom = document.getElementById(oldId);
                _container.removeChild(oldDom);
                _dataDomMapping.delete(r);
                _dataHolder.splice(r, 1);
                // reorder
                const size = _dataDomMapping.size;
                for(let x=r; x< size; x++){
                    _dataDomMapping.set(x, _dataDomMapping.get(x+1));
                }
                _dataDomMapping.delete(size);
                
                break;
            }
        }
    }
}