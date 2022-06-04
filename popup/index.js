document.addEventListener("DOMContentLoaded", function () {
	
    //global
	function __addClass(dom, clz){
		var cln = dom.className.replace(clz, "").trim();
		dom.className = cln ? cln + " " + clz : clz;
	}
	function __removeClass(dom, clz){
		dom.className = dom.className.replace(clz, "").trim();
	}
	
	//show ui
	(function(){
		var _showIds = [
			["monitor-show", "monitor-page"],
			["manual-show", "manual-page"],
			["download-show", "download-page"],
			["settings-show", "settings-page"],
			["running-show", "running-page"]
		];
		
		for(var x in _showIds){
			_showIds[x][0] = document.getElementById(_showIds[x][0]);
			_showIds[x][1] = document.getElementById(_showIds[x][1]);
			_showIds[x][0].onclick = showPage;
		}
		
		function showPage(e){
			e.preventDefault();
			e.stopPropagation();
			
			for(var x in _showIds){
				if(this.id == _showIds[x][0].id){
					__addClass(_showIds[x][0].parentElement, "active");
					__removeClass(_showIds[x][1], "hide");
					__addClass(_showIds[x][1], "show");
				}else{
					__removeClass(_showIds[x][0].parentElement, "active");
					__removeClass(_showIds[x][1], "show");
					__addClass(_showIds[x][1], "hide");
				}
			}
		}
		
	})();
	
	
	//monitor
	(function(){
		document.getElementById("monitor-reload").onclick = function(e){
			e.stopPropagation();
			loadMonitoredMedia();
		};
		
		document.getElementById("monitor-clean").onclick = function(e){
			e.stopPropagation();
			cleanMonitoredMedia();
		};
		
		
		function cleanMonitoredMedia(){
			chrome.runtime.sendMessage({
				action: "cleanmonitoredmedia"
			}, function(response){
				loadMonitoredMedia();
			});
		}
		
		function loadMonitoredMedia(){
			var contentDom = document.getElementById("monitor-content");
			contentDom.innerHTML = "......";
			
			chrome.runtime.sendMessage({
				action: "loadmonitoredmedia"
			}, function(response){
				var data = response;
				
				contentDom.innerHTML = data.length == 0 ? chrome.i18n.getMessage("nothing") : "";
				document.getElementById("monitor-count").innerHTML = data.length;
			
				for(var x in data){
					var obj = data[x];
					
					var nameId = "monitor-name-"+x;
					
					var dom = document.createElement("div");
					var html = (
						'<hr/>' +
						'<span class="badge badge-url" data-title="url">' + obj.url + '</span>' +
						( obj.tabItem ? '<span data-title="monitorFromTab">' + ( obj.tabItem.favIconUrl ? '<img class="favIcon" src="'+ obj.tabItem.favIconUrl +'"/>' : '' ) + '<span class="badge">' + obj.tabItem.title + '</span></span>' : '' ) +
						( obj.duration ? '<span class="badge" data-title="duration">' + MyUtils.formatHms(obj.duration) + '</span>' : '' ) +
						( obj.length ? '<span class="badge">' + obj.length + '</span>' : '' ) +
						'<span class="badge">' + obj.method + '</span>' +
						'<span class="badge">' + obj.mediaType + '</span>' +
						( obj.mime ? '<span class="badge">' + obj.mime + '</span>' : '' ) +
						'<input type="text" data-place="inputFileName" id="' + nameId + '" />'
					);
					dom.innerHTML = html;
					
					
					var dom2 = document.createElement("span");
					dom2.innerHTML = '<span class="badge badge-b" data-msg="download">download</span>';
					dom2.dataset["url"] = obj.url;
					dom2.dataset["nameId"] = nameId;
					dom2.onclick = downloadMonitoredMedia;
					
					var dom3 = document.createElement("span");
					dom3.innerHTML = '<span class="badge badge-b" data-msg="delete">delete</span>';
					dom3.dataset["url"] = obj.url;
					dom3.onclick = deleteMonitoredMedia;
					
					var dom4 = document.createElement("span");
					dom4.innerHTML = '<span class="badge badge-b" data-msg="copyUrl">copyUrl</span>';
					dom4.dataset["url"] = obj.url;
					dom4.onclick = copyMonitoredUrl;
					
					contentDom.appendChild(dom);
					dom.appendChild(dom2);
					dom.appendChild(dom3);
					dom.appendChild(dom4);
				}
			});
		}
		
		
		function copyMonitoredUrl(e){
			e.stopPropagation();
			var copyholder = document.getElementById("monitor-copyholder");
			copyholder.value = this.dataset["url"];
			copyholder.select();
			document.execCommand("copy");
		}
		
		
		function deleteMonitoredMedia(e){
			e.stopPropagation();
			var url = this.dataset["url"];
			
			chrome.runtime.sendMessage({
				action: "deletemonitoredmedia",
				data: {
					url: url
				}
			}, function(response){
				loadMonitoredMedia();
			});
		}
		
		
		function downloadMonitoredMedia(e){
			e.stopPropagation();
			var url = this.dataset["url"];
			var mediaName = document.getElementById(this.dataset["nameId"]).value.trim();
			mediaName = mediaName || MyUtils.getLastPathName(url) || MyUtils.genRandomString();
			if(! mediaName){
				document.getElementById(this.dataset["nameId"]).focus();
				return ;
			}
			
			chrome.runtime.sendMessage({
				action: "downloadmonitoredmedia",
				data: {
					url: url,
					mediaName: MyUtils.escapeFileName(mediaName)
				}
			}, function(response){
				loadMonitoredMedia();
			});
		}
	})();
	
	
	//manual
	(function(){
		document.getElementById("manual-download").onclick = function(e){
			e.stopPropagation();
			var url = document.getElementById("manual-url").value.trim();
            if(! url){
				document.getElementById("manual-url").focus();
				return ;
			}
			try{
				new URL(url);
			}catch(err){
				document.getElementById("manual-url").focus();
				return ;
			}
            
			var mediaName = document.getElementById("manual-name").value.trim();
			mediaName = mediaName || MyUtils.getLastPathName(url) || MyUtils.genRandomString();
			var mediaType = document.getElementById("manual-m3u8").checked ? "m3u8" : "video";
			
			if(! mediaName){
				document.getElementById("manual-name").focus();
				return ;
			}
			
			chrome.runtime.sendMessage({
				action: "downloadmedia",
				data: {
					url: url,
					method: "GET",
					mediaName: MyUtils.escapeFileName(mediaName),
					mediaType: mediaType
				}
			}, function(response){
			});
		}
		
		
		document.getElementById("manual-clean").onclick = function(e){
			e.stopPropagation();
			document.getElementById("manual-url").value = "";
			document.getElementById("manual-name").value = "";
		}
		
	})();
	
	
	//download
	(function(){
		//download ui
		(function(){
			var _showIds = [
				["download-downloading-show", "download-downloading-page"],
				["download-batch-show", "download-batch-page"]
			];
			
			for(var x in _showIds){
				_showIds[x][0] = document.getElementById(_showIds[x][0]);
				_showIds[x][1] = document.getElementById(_showIds[x][1]);
				_showIds[x][0].onclick = showPage;
			}
			
			function showPage(e){
				e.preventDefault();
				e.stopPropagation();
				
				for(var x in _showIds){
					if(this.id == _showIds[x][0].id){
						__addClass(_showIds[x][0], "active");
						__removeClass(_showIds[x][1], "hide");
						__addClass(_showIds[x][1], "show");
					}else{
						__removeClass(_showIds[x][0], "active");
						__removeClass(_showIds[x][1], "show");
						__addClass(_showIds[x][1], "hide");
					}
				}
			}
			
		})();
		
	
		document.getElementById("download-reload").onclick = function(e){
			e.stopPropagation();
			metricDownload();
		}
		
		
		function metricDownload(){
			chrome.runtime.sendMessage({
				action: "metricdownload"
			}, function(response){
				metricDownloadDownloading(response.downloadingTasks);
				metricDownloadBatch(response.downloadBatches);
			});
		}
		
		function metricDownloadBatch(data){
			var contentDom = document.getElementById("download-batch-content");
			contentDom.innerHTML = data.length == 0 ? chrome.i18n.getMessage("nothing") : "";
			document.getElementById("download-batch-count").innerHTML = data.length;
			
			for(var x in data){
				var obj = data[x];
				
				var dom = document.createElement("div");
				var html = (
					'<hr/>' +
					'<span class="badge badge-name" data-title="downloadDatchName">' + obj.showName + '</span>' +
					'<span class="badge" data-title="downloadTaskWaitCnt">' + obj.waitCnt + '</span>' +
					'<span class="badge" data-title="downloadTaskCompletedCnt">' + obj.completedCnt + '</span>' +
					'<span class="badge" data-title="downloadTaskTriggeredCnt">' + obj.triggeredCnt + '</span>' +
					'<span class="badge" data-title="downloadTaskSum">' + obj.sum + '</span>'
				);
				dom.innerHTML = html;
				contentDom.appendChild(dom);
			}
		}
		
		function metricDownloadDownloading(data){
			var contentDom = document.getElementById("download-downloading-content");
			contentDom.innerHTML = data.length == 0 ? chrome.i18n.getMessage("nothing") : "";
			document.getElementById("download-downloading-count").innerHTML = data.length;
			
			for(var x in data){
				var obj = data[x];
				
				var dom = document.createElement("div");
				var html = '<hr/><span class="badge badge-name" data-title="fileName">' + obj.fileName + '</span>';
				dom.innerHTML = html;
				
				var dom2 = document.createElement("span");
				dom2.innerHTML = '<span class="badge badge-b" data-msg="cancel">cancel</span>';
				dom2.dataset["downloadId"] = obj.id;
				dom2.onclick = cancelDownload;
				
				contentDom.appendChild(dom);
				dom.appendChild(dom2);
				
				if(obj.canResume){
					var dom3 = document.createElement("span");
					dom3.innerHTML = '<span class="badge badge-b" data-msg="resume">resume</span>';
					dom3.dataset["downloadId"] = obj.id;
					dom3.onclick = resumeDownload;
					
					dom.appendChild(dom3);
				}
                
                var dom4 = document.createElement("span");
                dom4.innerHTML = '<span class="badge badge-b" data-msg="copyUrl">copyUrl</span>';
                dom4.dataset["url"] = obj.url;
                dom4.onclick = copyDownloadUrl;
                dom.appendChild(dom4);
			}
		}
		
		function cancelDownload(e){
			e.stopPropagation();
			var downloadId = parseInt(this.dataset["downloadId"], 10);
			chrome.runtime.sendMessage({
				action: "canceldownload",
				data: {
					id: downloadId
				}
			}, function(response){
				metricDownload();
			});
		}
		
		function resumeDownload(e){
			e.stopPropagation();
			var downloadId = parseInt(this.dataset["downloadId"], 10);
			chrome.runtime.sendMessage({
				action: "resumedownload",
				data: {
					id: downloadId
				}
			}, function(response){
			});
		}
        
		function copyDownloadUrl(e){
			e.stopPropagation();
			var copyholder = document.getElementById("download-copyholder");
			copyholder.value = this.dataset["url"];
			copyholder.select();
			document.execCommand("copy");
		}
		
	})();
	
	
	//settings
	(function(){
		
		function init(){
			chrome.runtime.sendMessage({
				action: "getconfig"
			}, function(response){
				var data = response;
				windowResize(data.popupWidth, data.popupHeight);
				var senv = document.getElementById("settings-environment");
				for(var s=0; s<senv.length; s++){
					if(senv[s].value == data.environment){
						senv.selectedIndex = s;
						break;
					}
				}
				document.getElementById("settings-tab").checked = data.showTab == "1";
				document.getElementById("settings-duration").checked = data.showDuration == "1";
				document.getElementById("settings-mntmax").value = data.monitoredQueueMax;
				document.getElementById("settings-dlingmax").value = data.downloadingMax;
				document.getElementById("settings-dlbtmax").value = data.downloadBatchMax;
				document.getElementById("settings-popwidth").value = data.popupWidth;
				document.getElementById("settings-popheight").value = data.popupHeight;
				document.getElementById("settings-popupintab").checked = data.popupInTab == "1";
				document.getElementById("settings-pwe").checked = data.promptWhenExist == "1";
				document.getElementById("settings-nfar").checked = data.newFolderAtRoot == "1";
				document.getElementById("settings-pswc").checked = data.playSoundWhenComplete == "1";
                document.getElementById("settings-sd").checked = data.splitDiscontinuity == "1";
			});
		}
		
		init();
		
		function windowResize(w, h){
			document.body.style.width = w + "px";
			document.querySelector('.page-wrapper').style.maxHeight = h + "px";
		}
		
		
		document.querySelectorAll('input[type="number"]').forEach(function(dom){
			dom.onkeydown = function(){
				return false;
			};
		});
		
		document.getElementById("settings-submit").onclick = function(e){
			e.stopPropagation();
			var data = {};
			var senv = document.getElementById("settings-environment");
			data.environment = senv[senv.selectedIndex].value;
			data.showTab = document.getElementById("settings-tab").checked ? "1" : "0";
			data.monitoredQueueMax = parseInt(document.getElementById("settings-mntmax").value, 10);
			data.downloadingMax = parseInt(document.getElementById("settings-dlingmax").value, 10);
			data.downloadBatchMax = parseInt(document.getElementById("settings-dlbtmax").value, 10);
			data.popupWidth = parseInt(document.getElementById("settings-popwidth").value, 10);
			data.popupHeight = parseInt(document.getElementById("settings-popheight").value, 10);
			data.popupInTab = document.getElementById("settings-popupintab").checked ? "1" : "0";
			data.showDuration = document.getElementById("settings-duration").checked ? "1" : "0";
			data.promptWhenExist = document.getElementById("settings-pwe").checked ? "1" : "0";
			data.newFolderAtRoot = document.getElementById("settings-nfar").checked ? "1" : "0";
			data.playSoundWhenComplete = document.getElementById("settings-pswc").checked ? "1" : "0";
            data.splitDiscontinuity = document.getElementById("settings-sd").checked ? "1" : "0";
			
			chrome.runtime.sendMessage({
					action: "updateconfig",
					data: data
				}, function(response){
				windowResize(data.popupWidth, data.popupHeight);
				
				if(! document.getElementById("settings-popupintab").disabled ){
					chrome.browserAction.setPopup({
						popup: data.popupInTab == "1" ? "" : chrome.extension.getURL("popup/index.html")
					});
				}
			});
		};
	})();
	
	
	//i18n
	(function(){
		
		document.title = chrome.i18n.getMessage("appName");
	
		function setupI18n(root){
			
			function setup(dom){
				if(dom.dataset != null){
					if(dom.dataset["title"]){
						dom.title = chrome.i18n.getMessage( dom.dataset["title"] );
					}else if(dom.dataset["msg"]){
						dom.innerHTML = chrome.i18n.getMessage( dom.dataset["msg"] );
					}else if(dom.dataset["place"]){
						dom.placeholder = chrome.i18n.getMessage( dom.dataset["place"] );
					}
				}
			}
			
			root.querySelectorAll("[data-msg] , [data-title] , [data-place]").forEach(function(dom){
				setup(dom);
			});
			
			setup(root);
		}
		
		setupI18n(document);
		
		var observer = new MutationObserver(function(mutationList){
			mutationList.forEach((mutation) => {
			    switch (mutation.type) {
			    case "childList":
					mutation.addedNodes.forEach((node) => {
						if(node.tagName && node.dataset){
							setupI18n(node);
						}
					});
			        break;
				default:
					break;
			    }
			});
		});
		
		observer.observe(document, {
			subtree: true,
			childList: true
		});
		
	})();
	
	
	//running
	(function(){
		document.getElementById("running-reload").onclick = function(e){
			e.stopPropagation();
			loadRunningInfo();
		};
		
		function loadRunningInfo(){
			var contentDom = document.getElementById("running-content");
			contentDom.innerHTML = "......";
			
			chrome.runtime.sendMessage({
				action: "loadrunninginfo"
			}, function(response){
				var data = response;
				
				var html = "";
				for(var key in data){
					var arr = data[key];
					arr.unshift( key );
					html += ('<div><span class="badge">' + arr.join("&nbsp;&nbsp;&nbsp;&nbsp;") + '</span></div>');
				}
				
				contentDom.innerHTML = html;
			});
		}
	})();
	
});
