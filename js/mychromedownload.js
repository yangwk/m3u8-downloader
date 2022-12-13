var MyChromeDownload = (function () {
		
	chrome.downloads.onChanged.addListener(function (delta) {
		var control = MyDownload.downloadingHolder.get(delta.id);
		if (control == null) {
			return;
		}
		
		if(delta.canResume){
			control.canResume = delta.canResume.current;
		}
		
		if(delta.state && delta.state.current == "interrupted"){
			if(delta.canResume && delta.canResume.current != true){
				// TODO interrupted and can't resume
			}
		}

		if (delta.state && delta.state.current == "complete") {
			MyDownload.downloadingHolder.delete(delta.id);
			MyDownload.downloadBatchHolder.complete(control.batchName, delta.id);
		}
		
		if (delta.state){
			MyDownload.downloadTask();
		}
	});
	
	chrome.downloads.onErased.addListener(function(id){
		var control = MyDownload.downloadingHolder.get(id);
		if (control == null) {
			return;
		}
		MyDownload.downloadingHolder.delete(id);
		MyDownload.downloadBatchHolder.clearWhenInterrupted( control.batchName );
	});
	
	
	function _downloadTask(task){
		if(task.options.method){
			task.options.method = task.options.method.toUpperCase();
		}
		
		task.options.saveAs = false;
		if(MyChromeConfig.get("promptWhenExist") == "1"){
			task.options.conflictAction = "prompt";
		}
		
		try{
			// sync calculate, incr firstly, decr if error
			MyDownload.downloadingHolder.actionIncr();
			
			chrome.downloads.download(task.options, function (id) {
				if(chrome.runtime.lastError){
					MyDownload.downloadingHolder.actionDecr();
					MyDownload.downloadBatchHolder.clearWhenInterrupted(task.control.batchName);
				}else{
					if(id){
						if(MyDownload.downloadBatchHolder.saveId(task.control.batchName, id)){
                            MyDownload.downloadingHolder.put(id, task.control);
                            MyDownload.downloadTask();
                        }
					}else{
						MyDownload.downloadingHolder.actionDecr();
						MyDownload.downloadBatchHolder.clearWhenInterrupted(task.control.batchName);
					}
				}
			});
		}catch(err){
			MyDownload.downloadingHolder.actionDecr();
			MyDownload.downloadBatchHolder.clearWhenInterrupted(task.control.batchName);
			throw err;
		}
	}
    
    
	return {
        downloadTask: _downloadTask,
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
		cancel: function(id, callback){
            chrome.downloads.cancel(id, function(){
                if(chrome.runtime.lastError){
                }
                callback();
            });
        },
		resume: function(id){
			chrome.downloads.resume(id, function(){
				if(chrome.runtime.lastError){
				}
			});
		}
	};
    
})();