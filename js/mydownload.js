var MyDownload = (function () {
	
	var _downloadBatchHolder = (function(){
		var _queue = new Map();
		return {
			isFull: function(){
				return _queue.size >= MyChromeConfig.get("downloadBatchMax");
			},
			length: function(){
				return _queue.size;
			},
			forEach: function(callback){
                for (const [batchName, batch] of _queue) {
					callback(batch);
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
                    task.control.state = "in_progress";
				}
                if(isUpdate){
                    const batch = _queue.get(batchName);
                    if(batch != null){
                        batch.tasks.push(...copyTasks);
                        batch.mustCompleteCnt += copyTasks.length;
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
				_queue.set(batchName, batch);
                return batchName;
			},
            takeTasks: function(actionData, actionMax, multiple){
                const tasks = [];
                if(!multiple){
                    // priority is always taken
                    for (const [batchName, batch] of _queue) {
                        if(batch.priority){
                            const task = batch.tasks.shift();
                            if(task != null){
                                tasks.push(task);
                            }
                        }
                    }
                    const allActionCount = Array.from(actionData.values()).map(p => p.actionCount).reduce((acc, curr) => acc + curr, 0);
                    const remainCount = actionMax - allActionCount;
                    if(remainCount > 0){
                        let cnt = 0;
                        for (const [batchName, batch] of _queue) {
                            const task = batch.tasks.shift();
                            if(task != null){
                                tasks.push(task);
                                cnt ++;
                            }
                            if(cnt >= remainCount){
                                break;
                            }
                        }
                    }
                    
                    return tasks;
                }
                for (const [batchName, batch] of _queue) {
                    const countInfo = actionData.get(batch.batchName);
                    const remainCount = (batch.priority || countInfo == null) ? actionMax : Math.max(actionMax - countInfo.actionCount, 0);
                    for(let a=0; a<remainCount; a++){
                        const task = batch.tasks.shift();
                        if(task == null){
                            break;
                        }
                        tasks.push(task);
                    }
                }
				return tasks;
			},
			clearWhenInterrupted: function(batchName){
				const batch = _queue.get(batchName);
                _queue.delete(batchName);
                
				if(batch != null){
					for(const id of batch.downloadIds){
						_cancelDownload(id, false);
					}
				}
			},
			saveId: function(batchName, id){
                const batch = _queue.get(batchName);
                if(batch != null){
                    batch.downloadIds.add(id);
                    batch.downloadIdSize ++;
                    return true;
				}
                return false;
			},
			complete: function(batchName, id, control){
                const batch = _queue.get(batchName);
                
                if(batch != null){
                    batch.completedCnt = Math.min(batch.completedCnt + 1, batch.mustCompleteCnt);
                    if(batch.completedCnt >= batch.logicMustCompleteCnt){
                        _queue.delete(batchName);
                        batch.callback && batch.callback( Array.from( batch.downloadIds ) );
                    }
                    if(id != null && control != null && control.removeDownloadId){
                        batch.downloadIds.delete(id);
                    }
                }
			},
            reuse: function(batchName, flag){
                const batch = _queue.get(batchName);
                if(batch != null){
                    batch.logicMustCompleteCnt = flag ? Number.MAX_SAFE_INTEGER : batch.mustCompleteCnt ;
                }
			}
		};
	})();
	
	
	var _downloadingHolder = (function(){
        var _map = new Map();
        return {
			actionValidate: function(){
                const data = new Map();
                
                _map.forEach(function(control, id){
                    let countInfo = data.get(control.batchName);
                    if(countInfo == null){
                        countInfo = { actionCount: 0 };
                        data.set(control.batchName, countInfo);
                    }
                    
                    if(control.state == "complete"){
                        return ;
                    }
                    countInfo.actionCount ++;
				});
                return data;
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
            let m3u8Info = null;
            if(batch.attributes && batch.attributes.mediaType == "m3u8"){
                const context = MyBaseProcessor.getDownloadContext(batch.attributes.contextId);
                if(context != null){
                    m3u8Info = {
                        contextId: batch.attributes.contextId,
                        isLive: context.isLive,
                        dlDuration: context.duration,
                        dlSize: context.total,
                        splitFileCnt: context.mergeM3u8.fileCnt,
                        spentTime: Math.trunc((Date.now() - context.beginTime) / 1000)
                    };
                }
            }
			downloadBatches.push({
				showName: batch.showName,
				waitCnt: batch.tasks.length,
				completedCnt: batch.completedCnt,
				triggeredCnt: batch.downloadIdSize,
				sum: batch.mustCompleteCnt,
                m3u8Info: m3u8Info
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
        MyUtils.delay(1, _downloadTaskImpl);
    }
    
	function _downloadTaskImpl(){
        const actionMax = MyChromeConfig.get("downloadingMax");
        const actionData = _downloadingHolder.actionValidate();
        const multiple = MyChromeConfig.get("batchConcurrent") == "1";
        const tasks = _downloadBatchHolder.takeTasks(actionData, actionMax, multiple);
        if(tasks == null || tasks.length == 0){
            return ;
        }
        
        for(let x in tasks){
            const task = tasks[x];
            if(task.target == "chrome"){
                MyChromeDownload.downloadTask(task);
            }else if(task.target == "custom"){
                MyBaseProcessor.downloadDownload(task);
            }
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