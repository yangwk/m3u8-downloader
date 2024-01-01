document.addEventListener("DOMContentLoaded", function () {
	
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
					_showIds[x][0].parentElement.classList.add("active");
					_showIds[x][1].classList.remove("hide");
					_showIds[x][1].classList.add("show");
				}else{
					_showIds[x][0].parentElement.classList.remove("active");
					_showIds[x][1].classList.remove("show");
					_showIds[x][1].classList.add("hide");
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
				
				contentDom.innerHTML = "";
                let dataCount = 0;
                let monitorFilter = document.getElementById("monitor-filter");
                let targetMediaType = monitorFilter[monitorFilter.selectedIndex].value;
				for(var x in data){
					var obj = data[x];
					if(targetMediaType && obj.mediaType != targetMediaType){
                        continue;
                    }
                    dataCount ++;
					var nameId = "monitor-name-"+x;
					var playlistId = "monitor-playlist-"+x;
                    
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
					
                    const isMasterPlaylist = obj.mediaType == "m3u8" && obj.isMasterPlaylist;
					
					var dom2 = document.createElement("span");
					dom2.innerHTML = '<span class="badge badge-b" data-msg="download">download</span>';
                    dom2.dataset["identifier"] = obj.identifier;
					dom2.dataset["url"] = obj.url;
					dom2.dataset["nameId"] = nameId;
                    dom2.dataset["playlistId"] = isMasterPlaylist ? playlistId : "";
					dom2.onclick = downloadMonitoredMedia;
					
					var dom3 = document.createElement("span");
					dom3.innerHTML = '<span class="badge badge-b" data-msg="delete">delete</span>';
					dom3.dataset["identifier"] = obj.identifier;
					dom3.onclick = deleteMonitoredMedia;
					
					var dom4 = document.createElement("span");
					dom4.innerHTML = '<span class="badge badge-b" data-msg="copyUrl">copyUrl</span>';
					dom4.dataset["url"] = obj.url;
					dom4.onclick = copyMonitoredUrl;
                    
                    
                    contentDom.appendChild(dom);
                    
                    if(isMasterPlaylist){
                        let dom5 = document.createElement("span");
                        const mtSet = new Set();
                        const spl = document.createElement("select");
                        spl.id = playlistId;
                        spl.className = "empty-select";
                        for(let r in obj.parseResult.playList){
                            let pi = obj.parseResult.playList[r];
                            const opt = document.createElement("option");
                            opt.value = pi.url;
                            opt.text = pi.mediaType + " - " + MyUtils.formatBandwidth(pi.bandwidth);
                            opt.dataset["direct"] = pi.isDirect ? String(pi.isDirect) : "";
                            spl.appendChild(opt);
                            mtSet.add( pi.mediaType );
                        }
                        spl.dataset["destroy"] = mtSet.size <= 1 ? String(true) : "";
                        dom5.appendChild(spl);
                        dom.appendChild(dom5);
                    }
					
					dom.appendChild(dom2);
					dom.appendChild(dom3);
					dom.appendChild(dom4);
				}
                
                if(dataCount == 0){
                    contentDom.innerHTML = chrome.i18n.getMessage("nothing");
                }
				document.getElementById("monitor-count").innerHTML = dataCount;
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
			var identifier = this.dataset["identifier"];
			
			chrome.runtime.sendMessage({
				action: "deletemonitoredmedia",
				data: {
					identifier: identifier
				}
			}, function(response){
				loadMonitoredMedia();
			});
		}
		
		
		function downloadMonitoredMedia(e){
			e.stopPropagation();
            var identifier = this.dataset["identifier"];
			
            let urlMaster = null, destroy = true, isDirect = false;
            if(this.dataset["playlistId"]){
                let spl = document.getElementById(this.dataset["playlistId"]);
                urlMaster = spl[spl.selectedIndex].value;
                destroy = spl.dataset["destroy"] ? true : false;
                isDirect = spl[spl.selectedIndex].dataset["direct"] ? true : false;
            }
            
            var mediaName = document.getElementById(this.dataset["nameId"]).value.trim();
			mediaName = mediaName || MyUtils.getLastPathName( urlMaster || this.dataset["url"] ) || MyUtils.genRandomString();
			
            
			chrome.runtime.sendMessage({
				action: "downloadmonitoredmedia",
				data: {
                    identifier: identifier,
                    destroy: destroy,
                    urlMaster: urlMaster,
                    isDirect: isDirect,
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
			
            var methodDom = document.getElementById("manual-method");
            var method = methodDom[methodDom.selectedIndex].value;
            
            var headersContent = document.getElementById("manual-headers").value.trim();
			
			chrome.runtime.sendMessage({
				action: "downloadmedia",
				data: {
					url: url,
					method: method,
                    headers: MyUtils.parseHeaders(headersContent),
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
						_showIds[x][0].classList.add("active");
						_showIds[x][1].classList.remove("hide");
						_showIds[x][1].classList.add("show");
					}else{
						_showIds[x][0].classList.remove("active");
						_showIds[x][1].classList.remove("show");
						_showIds[x][1].classList.add("hide");
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
				metricDownloadDownloading(response.downloadingTasks, response.downloadingTasksCustom);
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
		
		function metricDownloadDownloading(data, custom){
			var contentDom = document.getElementById("download-downloading-content");
			contentDom.innerHTML = data.length == 0 ? chrome.i18n.getMessage("nothing") : "";
			document.getElementById("download-downloading-count").innerHTML = data.length;
			
			for(var x in data){
				var obj = data[x];
				
                if(MyUtils.isChromeTarget(obj.id)){
                    metricDownloadDownloadingChrome(contentDom, obj);
                }else{
                    metricDownloadDownloadingCustom(contentDom, obj, custom);
                }
                
			}
		}
        
        function metricDownloadDownloadingChrome(contentDom, obj){
            var dom = document.createElement("div");
            var html = '<hr/><span class="badge badge-name" data-title="fileName">' + obj.fileName + '</span>';
            dom.innerHTML = html;
            
            var dom2 = document.createElement("span");
            dom2.innerHTML = '<span class="badge badge-b" data-msg="cancel">cancel</span>';
            dom2.dataset["downloadId"] = obj.id;
            dom2.addEventListener("click", cancelDownload);
            
            contentDom.appendChild(dom);
            dom.appendChild(dom2);
            
            if(obj.canResume){
                var dom3 = document.createElement("span");
                dom3.innerHTML = '<span class="badge badge-b" data-msg="resume">resume</span>';
                dom3.dataset["downloadId"] = obj.id;
                dom3.addEventListener("click", resumeDownload);
                
                dom.appendChild(dom3);
            }
            
            var dom4 = document.createElement("span");
            dom4.innerHTML = '<span class="badge badge-b" data-msg="copyUrl">copyUrl</span>';
            dom4.dataset["url"] = obj.url;
            dom4.onclick = copyDownloadUrl;
            dom.appendChild(dom4);
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
			});
            this.removeEventListener("click", cancelDownload);
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
            this.removeEventListener("click", resumeDownload);
		}
        
		function copyDownloadUrl(e){
			e.stopPropagation();
			var copyholder = document.getElementById("download-copyholder");
			copyholder.value = this.dataset["url"];
			copyholder.select();
			document.execCommand("copy");
		}
		
        
        function buildOperationalDom(data, msg){
            const dom = document.createElement("span");
            dom.innerHTML = '<span class="badge badge-b" data-msg="' + msg + '">' +  msg + '</span>';
            const onceClickHandler = function(e){
                e.stopPropagation();
                chrome.runtime.sendMessage({
                    action: "download." + msg,
                    data: {
                        id: data.id
                    }
                }, function(response){
                });
                dom.removeEventListener("click", onceClickHandler);
            };
            dom.addEventListener("click", onceClickHandler);
            return dom;
        }
    
        function metricDownloadDownloadingCustom(contentDom, obj, custom){
            const data = custom[obj.id];
            const itemDom = document.createElement("div");
            itemDom.innerHTML = '<hr/><div class="line-wrapping">' + data.url + '</div>';
            const statusDom = document.createElement("div");
            statusDom.className = "line-wrapping";
            const progressDom1 = document.createElement("div");
            progressDom1.className = "download-progress-outer";
            const progressDom2 = document.createElement("div");
            progressDom2.className = "download-progress-inner";
            const operationDom = document.createElement("div");
            const pauseDom = buildOperationalDom(data, "pause");
            const resumeDom = buildOperationalDom(data, "resume");
            const restartDom = buildOperationalDom(data, "restart");
            const cancelDom = buildOperationalDom(data, "cancel");
            
            contentDom.appendChild(itemDom);
            itemDom.appendChild(statusDom);
            itemDom.appendChild(progressDom1);
            progressDom1.appendChild(progressDom2);
            itemDom.appendChild(operationDom);
            operationDom.appendChild(pauseDom);
            operationDom.appendChild(resumeDom);
            operationDom.appendChild(restartDom);
            operationDom.appendChild(cancelDom);
            
            if(data.state == "in_progress"){
                statusDom.innerText = data.speed + ' ' + data.speedUnit + ' - ' + data.loaded + ' B' + ( data.lengthComputable ? ' , '+chrome.i18n.getMessage("downloadTotal")+' ' + data.total + ' B' + (data.remainSec >= 0 ? ' , '+chrome.i18n.getMessage("downloadRemaining")+' ' + data.remainSec  + ' '+chrome.i18n.getMessage("second") : '') : '' );
                statusDom.style.display = "block";
                if(data.lengthComputable){
                    progressDom2.style.width = data.percent + "%";
                    progressDom1.style.display = "block";
                }else{
                    progressDom1.style.display = "none";
                }
                cancelDom.style.display = "block";
                resumeDom.style.display = "none";
                if(data.restart){
                    pauseDom.style.display = "none";
                    restartDom.style.display = "block";
                }else{
                    pauseDom.style.display = data.resumable ? "block" : "none";
                    restartDom.style.display = "none";
                }
            }else if(data.state == "interrupted"){
                statusDom.innerText = data.loaded + ' B' + ( data.lengthComputable ? ' , '+chrome.i18n.getMessage("downloadTotal")+' ' + data.total + ' B' : '' ) + ' , '+chrome.i18n.getMessage("downloadError");
                statusDom.style.display = "block";
                progressDom1.style.display = "none";
                pauseDom.style.display = "none";
                cancelDom.style.display = "block";
                if(data.restart){
                    resumeDom.style.display = "none";
                    restartDom.style.display = "block";
                }else{
                    resumeDom.style.display = data.resumable ? "block" : "none";
                    restartDom.style.display = !data.resumable ? "block" : "none";
                }
            }else if(data.state == "complete"){
                statusDom.style.display = "none";
                progressDom1.style.display = "none";
                pauseDom.style.display = "none";
                cancelDom.style.display = "none";
                resumeDom.style.display = "none";
                restartDom.style.display = "none";
            }
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
				document.getElementById("settings-pwe").checked = data.promptWhenExist == "1";
				document.getElementById("settings-nfar").checked = data.newFolderAtRoot == "1";
				document.getElementById("settings-pswc").checked = data.playSoundWhenComplete == "1";
                document.getElementById("settings-sd").checked = data.splitDiscontinuity == "1";
                document.getElementById("settings-prothr").value = data.processerThreshold;
                document.getElementById("settings-mrenable").checked = data.matchingRuleEnable == "1";
                document.getElementById("settings-mr").value = data.matchingRule;
			});
		}
		
		init();
		
		function windowResize(w, h){
			document.body.style.width = w + "px";
            const pnh = MyUtils.outerHeight( document.getElementById("page-nav") );
			document.getElementById("page-wrapper").style.maxHeight = (h-pnh) + "px";
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
			data.showDuration = document.getElementById("settings-duration").checked ? "1" : "0";
			data.promptWhenExist = document.getElementById("settings-pwe").checked ? "1" : "0";
			data.newFolderAtRoot = document.getElementById("settings-nfar").checked ? "1" : "0";
			data.playSoundWhenComplete = document.getElementById("settings-pswc").checked ? "1" : "0";
            data.splitDiscontinuity = document.getElementById("settings-sd").checked ? "1" : "0";
            data.processerThreshold = parseInt(document.getElementById("settings-prothr").value, 10);
            data.matchingRuleEnable = document.getElementById("settings-mrenable").checked ? "1" : "0";
            data.matchingRule = document.getElementById("settings-mr").value.trim();
			
			chrome.runtime.sendMessage({
					action: "updateconfig",
					data: data
				}, function(response){
				windowResize(data.popupWidth, data.popupHeight);
			});
		};
        
        document.getElementById("settings-mr").onclick = function(e){
            e.stopPropagation();
            if(! this.classList.contains("textarea-mr-max")){
                this.classList.remove("textarea-mr");
                this.classList.add("textarea-mr-max");
            }
        };
        
        
		document.getElementById("settings-popupintab").onclick = function(e){
			e.stopPropagation();
			chrome.runtime.sendMessage({
                action: "popupintab"
            }, function(response){});
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
					}
                    if(dom.dataset["msg"]){
						dom.innerHTML = chrome.i18n.getMessage( dom.dataset["msg"] );
					}
                    if(dom.dataset["place"]){
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
