var MyDownload = (function () {
	
	var _downloadBatchHolder = (function(){
		var _queue = new Array();
		return {
			isFull: function(){
				return _queue.length >= MyChromeConfig.get("downloadBatchMax");
			},
			length: function(){
				return _queue.length;
			},
			forEach: function(callback){
				for(var x in _queue){
					callback(_queue[x]);
				}
			},
			offer: function(taskData, callback){
				var batchName = MyUtils.genRandomString();
                var copyTaskData = MyUtils.clone(taskData);
				var copyTasks = copyTaskData.tasks;
				for(var x in copyTasks){
					var task = copyTasks[x];
					task.control == null ? task.control = {} : null;
					task.control.batchName = batchName;
					task.control.fileName = task.options.filename;
                    task.control.url = task.options.url;
				}
				var batch = {
					batchName: batchName,
					tasks: copyTasks,
					showName: copyTaskData.showName,
					completedCnt: 0,
					mustCompleteCnt: copyTasks.length,
					downloadIds: [],
                    priority: copyTaskData.priority || false,
					callback: callback
				};
				_queue.push(batch);
			},
            element: function(){
                for(var x in _queue){
                    if(_queue[x].priority && _queue[x].tasks.length > 0){
                        return { batchName: _queue[x].batchName, priority: _queue[x].priority };
                    }
                }
                for(var x in _queue){
                    if(_queue[x].tasks.length > 0){
                        return { batchName: _queue[x].batchName, priority: _queue[x].priority };
                    }
                }
                return null;
            },
			takeTask: function(batchName){
                var task = null;
                for(var x in _queue){
                    if(_queue[x].batchName == batchName){
                        task = _queue[x].tasks.shift();
                        break;
                    }
                }
				return task;
			},
			clearWhenInterrupted: function(batchName){
				var batch = null;
				for(var x=0; x<_queue.length; x++){
					if(_queue[x].batchName == batchName){
						batch = _queue[x];
						_queue.splice(x, 1);
						break;
					}
				}
				if(batch != null){
					for(var w in batch.downloadIds){
						_cancelDownload(batch.downloadIds[w], false);
					}
				}
			},
			saveId: function(batchName, id){
				for(var x in _queue){
					if(_queue[x].batchName == batchName){
						_queue[x].downloadIds.push(id);
						return true;
					}
				}
                return false;
			},
			complete: function(batchName, id){
				for(var x=0; x<_queue.length; x++){
					var batch = _queue[x];
					if(batch.batchName == batchName){
						batch.completedCnt ++;
						if(batch.completedCnt >= batch.mustCompleteCnt){
							_queue.splice(x, 1);
							batch.callback == null ? null : batch.callback( batch.downloadIds );
						}
						break;
					}
				}
			}
		};
	})();
	
	
	var _downloadingHolder = (function(){
        var _map = new Map();
		var _actionCount = 0;
        return {
			actionIncr: function(){
				_actionCount ++;
			},
			actionDecr: function(){
				_actionCount = Math.max(-- _actionCount, 0);
			},
			actionValidate: function(){
				return _actionCount < MyChromeConfig.get("downloadingMax");
			},
			length: function(){
				return _map.size;
			},
        	put: function (k, v) {
        		_map.set(k, v);
        	},
			get: function(k){
				return _map.get(k);
			},
        	delete: function (k) {
        		_map.delete(k);
				this.actionDecr();
        	},
			forEach: function(callback){
				_map.forEach(function(v, k){
					callback(k, v);
				});
			}
        };
    })();
	
	
	function _metric(){
		var downloadingTasks = [];
		_downloadingHolder.forEach(function(id, control){
			downloadingTasks.push({
				id: id,
				fileName: control.fileName,
				canResume: control.canResume,
                url: control.url
			});
		});
		var downloadBatches = [];
		_downloadBatchHolder.forEach(function(batch){
			downloadBatches.push({
				showName: batch.showName,
				waitCnt: batch.tasks.length,
				completedCnt: batch.completedCnt,
				triggeredCnt: batch.downloadIds.length,
				sum: batch.mustCompleteCnt
			});
		});
		
		var retval = {
			downloadingTasks: downloadingTasks,
			downloadBatches: downloadBatches
		};
		return MyUtils.clone(retval);
	}
	
	
	function _download(taskData, callback){
        _downloadBatchHolder.offer(taskData, callback);
        _downloadTask();
        return true;
	}
    
    
	function _downloadTask(){
        var batch = _downloadBatchHolder.element();
        if(batch == null){
            return ;
        }
        if(! batch.priority && !_downloadingHolder.actionValidate()){
			return;
		}
        
		var task = _downloadBatchHolder.takeTask(batch.batchName);
		if(task == null){
			return ;
		}
        if(task.target == "chrome"){
            MyChromeDownload.downloadTask(task);
        }else{
            MyM3u8Processer.downloadDownload(task);
        }
	}

	function _cancelDownload(id, recurse){
        const callback = function(){
            var control = _downloadingHolder.get(id);
			_downloadingHolder.delete(id);
            
            if(recurse){
                if (control != null) {
                    _downloadBatchHolder.clearWhenInterrupted( control.batchName );
                }
            }
        };
        
        if(MyUtils.isChromeTarget(id)){
            MyChromeDownload.cancel(id, callback);
        }else{
            MyM3u8Processer.downloadCancel(id);
            callback();
        }
	}
	
    
	return {
        downloadBatchHolder: _downloadBatchHolder,
        downloadingHolder: _downloadingHolder,
        downloadTask: _downloadTask,
		download: _download,
        canDownload: function(){
            return ! _downloadBatchHolder.isFull();
        },
		cancel: function(id){
            _cancelDownload(id, true);
        },
		metric: _metric,
		info: function(){
			return [_downloadingHolder.length(), _downloadBatchHolder.length()];
		}
	};
    
})();