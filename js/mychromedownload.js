var MyChromeDownload = (function () {
	
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
			offer: function(tasks, showName, callback){
				if(this.isFull()){
					throw "download batch is full";
				}
				var batchName = MyUtils.genRandomString();
				var copyTasks = MyUtils.clone(tasks);
				for(var x in copyTasks){
					var task = copyTasks[x];
					task.control == null ? task.control = {} : null;
					task.control.batchName = batchName;
					task.control.fileName = task.options.filename;
				}
				var batch = {
					batchName: batchName,
					tasks: copyTasks,
					showName: showName,
					completedCnt: 0,
					mustCompleteCnt: copyTasks.length,
					downloadIds: [],
					callback: callback
				};
				_queue.push(batch);
			},
			takeTask: function(){
				var batch = _queue.length > 0 ? _queue[0] : null;
				return batch == null ? null : batch.tasks.shift();
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
						_cancelDownload(batch.downloadIds[w]);
					}
				}
			},
			saveId: function(batchName, id){
				for(var x in _queue){
					if(_queue[x].batchName == batchName){
						_queue[x].downloadIds.push(id);
						break;
					}
				}
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
        return {
			isFull: function(){
				return _map.size >= MyChromeConfig.get("downloadingMax");
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
				canResume: control.canResume
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
	
	
	chrome.downloads.onChanged.addListener(function (delta) {
		var control = _downloadingHolder.get(delta.id);
		if (control == null) {
			return;
		}
		
		if(delta.state && delta.state.current == "interrupted"){
			if(! (delta.canResume && delta.canResume.current == true)){
				_cancelDownload(delta.id);
				return ;
			}else{
				control.canResume = delta.canResume.current;
			}
		}
		
		if (control.autoAcceptDanger && delta.danger && delta.danger.current != "safe" && delta.danger.current != "accepted") {
            chrome.downloads.acceptDanger(delta.id, function(){
				if(chrome.runtime.lastError){
				}
			});
		}
		if (delta.state && delta.state.current == "complete") {
			_downloadingHolder.delete(delta.id);
			_downloadBatchHolder.complete(control.batchName, delta.id);
			
			_downloadTask();
		}
	});
	
	chrome.downloads.onErased.addListener(function(id){
		var control = _downloadingHolder.get(id);
		// complete or not from this
		if (control == null) {
			return;
		}
		_downloadingHolder.delete(id);
		_downloadBatchHolder.clearWhenInterrupted( control.batchName );
	});
	
	
	function _download(tasks, showName, callback){
		if(tasks == null || ! Array.isArray(tasks) || showName == null){
			throw "invalid arguments";
		}
		if(! _downloadBatchHolder.isFull()){
			_downloadBatchHolder.offer(tasks, showName, callback);
			_downloadTask();
		}
	}
	
	function _downloadTask(){
		if(_downloadingHolder.isFull()){
			return;
		}
		_downloadTaskImpl();
	}
	
	function _downloadTaskImpl(){
		try{
			if(_downloadingHolder.isFull()){
				return;
			}
			var task = _downloadBatchHolder.takeTask();
			if(task == null){
				return ;
			}
			if(task.options.method){
				task.options.method = task.options.method.toUpperCase();
			}
			
			task.options.saveAs = false;
			if(MyChromeConfig.get("promptWhenExist") == "1"){
				task.options.conflictAction = "prompt";
			}
			
			chrome.downloads.download(task.options, function (id) {
				if(chrome.runtime.lastError){
					_downloadBatchHolder.clearWhenInterrupted(task.control.batchName);
				}else{
					if(id){
						_downloadBatchHolder.saveId(task.control.batchName, id);
						_downloadingHolder.put(id, task.control);
						_downloadTask();
					}else{
						_downloadBatchHolder.clearWhenInterrupted(task.control.batchName);
					}
				}
			});
		}catch(err){
			_downloadBatchHolder.clearWhenInterrupted(task.control.batchName);
			throw err;
		}
	}

	function _cancelDownload(id){
		chrome.downloads.cancel(id, function(){
			if(chrome.runtime.lastError){
			}
			// fire onErased
			chrome.downloads.erase({
				id: id
			}, function(erasedIds){
				if(chrome.runtime.lastError){
				}
			});
		});
	}
	
    
	return {
		download: _download,
		open: function(id, options){
			MyChromeNotification.create({
				title: options.title,
				message: options.message
			}, function(nid){
				if(! nid){
					chrome.downloads.show(id);
				}
			}, function(id){
				chrome.downloads.open(id);
			}, [id]);
		},
		cancel: _cancelDownload,
		resume: function(id){
			chrome.downloads.resume(id, function(){
				if(chrome.runtime.lastError){
				}
			});
		},
		metric: _metric,
		info: function(){
			return [_downloadingHolder.length(), _downloadBatchHolder.length()];
		}
	};
    
})();