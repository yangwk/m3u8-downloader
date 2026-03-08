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
                var copyTaskData = taskData;
                const isUpdate = copyTaskData.batchName != null;
				var batchName = isUpdate ? copyTaskData.batchName : MyUtils.genRandomString();
				var copyTasks = copyTaskData.tasks;
				for(var x in copyTasks){
					var task = copyTasks[x];
                    task.proxy = MyChromeConfig.get("proxyAddressEnable") == "1";
					task.control = {};
					task.control.batchName = batchName;
					task.control.fileName = task.options.filename;
                    task.control.url = task.options.url;
                    task.control.canResume = false;
                    task.control.target = task.target;
                    task.control.hideInDownloadList = task.hideInDownloadList || false;
                    task.control.batchShowName = copyTaskData.showName;
                    task.control.removeDownloadId = task.removeDownloadId || false;
                    task.control.state = null;
				}
                if(isUpdate){
                    for(var x in _queue){
                        if(_queue[x].batchName == batchName){
                            _queue[x].tasks.push(...copyTasks);
                            _queue[x].mustCompleteCnt += copyTasks.length;
                            break;
                        }
                    }
                    return batchName;
                }
                
				var batch = {
					batchName: batchName,
					tasks: copyTasks,
					showName: copyTaskData.showName,
					completedCnt: 0,
					mustCompleteCnt: copyTasks.length,
                    logicMustCompleteCnt: copyTasks.length,
					downloadIds: new Set(),
                    priority: copyTaskData.priority || false,
                    attributes: copyTaskData.attributes,
                    downloadIdSize: 0,
					callback: callback
				};
				_queue.push(batch);
                return batchName;
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
					for(const id of batch.downloadIds){
						_cancelDownload(id, false);
					}
				}
			},
			saveId: function(batchName, id){
				for(var x in _queue){
					if(_queue[x].batchName == batchName){
						_queue[x].downloadIds.add(id);
                        _queue[x].downloadIdSize ++;
						return true;
					}
				}
                return false;
			},
			complete: function(batchName, id, control){
				for(var x=0; x<_queue.length; x++){
					var batch = _queue[x];
					if(batch.batchName == batchName){
						batch.completedCnt = Math.min(batch.completedCnt + 1, batch.mustCompleteCnt);
						if(batch.completedCnt >= batch.logicMustCompleteCnt){
							_queue.splice(x, 1);
							batch.callback && batch.callback( Array.from( batch.downloadIds ) );
						}
                        if(id != null && control != null && control.removeDownloadId){
                            batch.downloadIds.delete(id);
                        }
						break;
					}
				}
			},
            reuse: function(batchName, flag){
				for(var x in _queue){
					if(_queue[x].batchName == batchName){
						_queue[x].logicMustCompleteCnt = flag ? Number.MAX_SAFE_INTEGER : _queue[x].mustCompleteCnt ;
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
                url: control.url,
                batchShowName: control.batchShowName
			});
		});
		var downloadBatches = [];
		_downloadBatchHolder.forEach(function(batch){
			downloadBatches.push({
				showName: batch.showName,
				waitCnt: batch.tasks.length,
				completedCnt: batch.completedCnt,
				triggeredCnt: batch.downloadIdSize,
				sum: batch.mustCompleteCnt,
                attributes: batch.attributes
			});
		});
		
		var retval = {
			downloadingTasks: downloadingTasks,
			downloadBatches: downloadBatches,
            downloadingTasksCustom: MyDownloader.metric()
		};
		return MyUtils.clone(retval);
	}
	
	
	function _download(taskData, callback){
        var batchName = _downloadBatchHolder.offer(taskData, callback);
        _downloadTask();
        return batchName;
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
        }else if(task.target == "custom"){
            MyBaseProcessor.downloadDownload(task);
        }
	}

	function _cancelDownload(id, recurse){
        const callback = function(){
            const control = _downloadingHolder.get(id);
            if (control != null) {
                _downloadingHolder.delete(id);
            }
            
            if(recurse){
                if (control != null) {
                    _downloadBatchHolder.clearWhenInterrupted( control.batchName );
                    _downloadTask();
                }
            }
        };
        
        const control = _downloadingHolder.get(id);
        if(control == null){
            return ;
        }
        if(control.target == "chrome"){
            MyChromeDownload.cancel(id, callback);
        }else if(control.target == "custom"){
            MyBaseProcessor.downloadCancel(id);
            callback();
        }
        
	}
    
    function _resumeDownload(id){
        const control = _downloadingHolder.get(id);
        if(control == null){
            return ;
        }
        if(control.target == "chrome"){
            MyChromeDownload.resume(id);
        }else if(control.target == "custom"){
            MyBaseProcessor.downloadResume(id);
        }
    }
    
    function _restartDownload(id){
        const control = _downloadingHolder.get(id);
        if(control == null){
            return ;
        }
        if(control.target == "custom"){
            MyBaseProcessor.downloadRestart(id);
        }
    }
    
    function _pauseDownload(id){
        MyDownloader.pause(id);
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
        resume: function(id){
            _resumeDownload(id);
        },
        restart: function(id){
            _restartDownload(id);
        },
        pause: function(id){
            _pauseDownload(id);
        },
		metric: _metric,
		info: function(){
			return [_downloadingHolder.length(), _downloadBatchHolder.length()];
		}
	};
    
})();