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
        let _autoReloadIntervalId = null;
        
        document.getElementById("monitor-reload").onclick = function(e){
			e.stopPropagation();
			loadMonitoredMedia();
		};
        document.getElementById("monitor-reload").addEventListener("autoReload", (e) => {
            if(_autoReloadIntervalId != null){
                clearInterval(_autoReloadIntervalId);
                _autoReloadIntervalId = null;
            }
            const delay = e.data.delay;
            if(delay > 0){
                _autoReloadIntervalId = setInterval(function(){
                    loadMonitoredMedia();
                }, delay);
            }
        });
        
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
        
        const _myDiffRendering = new MyDiffRendering();
        
		function loadMonitoredMedia(){
			chrome.runtime.sendMessage({
				action: "loadmonitoredmedia"
			}, function(response){
				var data = response;
				
                let dataCount = 0;
                let monitorFilter = document.getElementById("monitor-filter");
                let targetMediaType = monitorFilter[monitorFilter.selectedIndex].value;
                const filteredData = [];
                for(var x in data){
					var obj = data[x];
					if(targetMediaType && obj.mediaType != targetMediaType){
                        continue;
                    }
                    filteredData.push(obj);
                    dataCount ++;
                }
				function renderingOne(obj, x){
					var nameId = "monitor-name-"+x;
					var playlistId = "monitor-playlist-"+x;
                    
					var dom = document.createElement("div");
					var html = (
						'<hr/>' +
						'<span class="badge badge-url" data-title="url">' + obj.url + '</span>' +
						( obj.tabItem ? '<span data-title="monitorFromTab">' + ( obj.tabItem.favIconUrl ? '<img class="favIcon" src="'+ obj.tabItem.favIconUrl +'"/>' : '' ) + '<span class="badge">' + obj.tabItem.title + '</span></span>' : '' ) +
						( obj.duration ? '<span class="badge media-duration" data-title="duration">' + MyUtils.formatHms(obj.duration) + '</span>' : '' ) +
						( obj.length ? '<span class="badge">' + obj.length + '</span>' : '' ) +
						'<span class="badge">' + obj.method + '</span>' +
						'<span class="badge">' + obj.mediaType + '</span>' +
						( obj.mime ? '<span class="badge">' + obj.mime + '</span>' : '' ) +
                        ( obj.isLive ? '<span class="badge media-live" data-msg="live">live</span>' : '' ) +
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
                    
                    if(isMasterPlaylist){
                        let dom5 = document.createElement("span");
                        const spl = document.createElement("select");
                        spl.id = playlistId;
                        spl.className = "empty-select select-tweak2";
                        for(let r in obj.parseResult.playList){
                            let pi = obj.parseResult.playList[r];
                            const opt = document.createElement("option");
                            opt.value = pi.url;
                            opt.text = pi.mediaType + " - " + MyUtils.formatBandwidth(pi.bandwidth);
                            opt.dataset["direct"] = pi.isDirect ? String(pi.isDirect) : "";
                            spl.appendChild(opt);
                            
                            for(let z in pi.renditionGroups){
                                const groupId = pi.renditionGroups[z].groupId;
                                const type = pi.renditionGroups[z].type;
                                if( obj.parseResult.renditionData[groupId] && obj.parseResult.renditionData[groupId][type] ){
                                    const renTypeItem = obj.parseResult.renditionData[groupId][type];
                                    for(let k in renTypeItem){
                                        const renItem = renTypeItem[k];
                                        const thisMediaType = renItem.type.toLowerCase();
                                        const opt2 = document.createElement("option");
                                        opt2.value = renItem.url || "";
                                        opt2.text = "[" + thisMediaType + (renItem.bandwidth != null ? " - " + MyUtils.formatBandwidth(renItem.bandwidth) : "") + " - " + renItem.name + "]";
                                        opt2.dataset["direct"] = renItem.isDirect ? String(renItem.isDirect) : "";
                                        opt2.dataset["kind"] = renItem.kind || "";
                                        opt2.dataset["mediaType"] = thisMediaType;
                                        spl.appendChild(opt2);
                                    }
                                }
                            }
                        }
                        spl.dataset["destroy"] = "";
                        dom5.appendChild(spl);
                        dom.appendChild(dom5);
                    }
					
					dom.appendChild(dom2);
					dom.appendChild(dom3);
					dom.appendChild(dom4);
                    
                    return dom;
				}
                
                const contentDom = document.getElementById("monitor-content");
                
                if(_myDiffRendering.length() == 0){
                    contentDom.innerHTML = "";
                }
                
                _myDiffRendering.renderingAll({
                    container: contentDom,
                    renderingOne: renderingOne
                }, filteredData);
                
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
                _myDiffRendering.deleteByKey(identifier, (obj) => obj.identifier);
				loadMonitoredMedia();
			});
		}
		
		
		function downloadMonitoredMedia(e){
			e.stopPropagation();
            var identifier = this.dataset["identifier"];
			
            let urlMaster = null, destroy = true, isDirect = false, kind = null, mediaType = null;
            if(this.dataset["playlistId"]){
                let spl = document.getElementById(this.dataset["playlistId"]);
                urlMaster = spl[spl.selectedIndex].value;
                destroy = spl.dataset["destroy"] ? true : false;
                isDirect = spl[spl.selectedIndex].dataset["direct"] ? true : false;
                kind = spl[spl.selectedIndex].dataset["kind"];
                mediaType = spl[spl.selectedIndex].dataset["mediaType"];
            }
            
            var mediaName = document.getElementById(this.dataset["nameId"]).value.trim();
			
            
			chrome.runtime.sendMessage({
				action: "downloadmonitoredmedia",
				data: {
                    identifier: identifier,
                    destroy: destroy,
                    urlMaster: urlMaster,
                    isDirect: isDirect,
					mediaName: mediaName,
                    kind: kind,
                    mediaType: mediaType
				}
			}, function(response){
                if(!response.success){
                    __logError(response.message);
                }else{
                    if(destroy){
                        _myDiffRendering.deleteByKey(identifier, (obj) => obj.identifier);
                        loadMonitoredMedia();
                    }
                }
			});
		}
		
	})();
	
	
	//manual
	(function(){
		document.getElementById("manual-download").onclick = function(e){
			e.stopPropagation();
			var url = document.getElementById("manual-url").value.trim();
            if(! url){
                __logError(chrome.i18n.getMessage("errorCode0002"));
				document.getElementById("manual-url").focus();
				return ;
			}
			try{
				new URL(url);
			}catch(err){
                __logError(chrome.i18n.getMessage("errorCode0002"));
				document.getElementById("manual-url").focus();
				return ;
			}
            
			var mediaName = document.getElementById("manual-name").value.trim();
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
					mediaName: mediaName,
					mediaType: mediaType
				}
			}, function(response){
                if(!response.success){
                    __logError(response.message);
                }
			});
		}
		
		
		document.getElementById("manual-clean").onclick = function(e){
			e.stopPropagation();
			document.getElementById("manual-url").value = "";
            document.getElementById("manual-headers").value = "";
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
		
        let _autoReloadIntervalId = null;
        
        document.getElementById("download-reload").onclick = function(e){
			e.stopPropagation();
			metricDownload();
		}
        document.getElementById("download-reload").addEventListener("autoReload", (e) => {
            if(_autoReloadIntervalId != null){
                clearInterval(_autoReloadIntervalId);
                _autoReloadIntervalId = null;
            }
            const delay = e.data.delay;
            if(delay > 0){
                _autoReloadIntervalId = setInterval(function(){
                    metricDownload();
                }, delay);
            }
        });
		
		
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
			if(data.length == 0){
                return;
            }
            const fragment = document.createDocumentFragment();
            const originalContentDom = contentDom;
            contentDom = fragment;
            
			for(var x in data){
				var obj = data[x];
				
				var dom = document.createElement("div");
				var html = (
					'<hr/><div>' +
					'<span class="badge badge-name" data-title="downloadDatchName">' + obj.showName + '</span>' +
					'<span class="badge" data-title="downloadTaskWaitCnt">' + obj.waitCnt + '</span>' +
					'<span class="badge" data-title="downloadTaskCompletedCnt">' + obj.completedCnt + '</span>' +
					'<span class="badge" data-title="downloadTaskTriggeredCnt">' + obj.triggeredCnt + '</span>' +
					'<span class="badge" data-title="downloadTaskSum">' + obj.sum + '</span></div>'
				);
				dom.innerHTML = html;
				contentDom.appendChild(dom);
                
                if(obj.attributes && obj.attributes.isLive){
                    var dom2 = document.createElement("span");
                    dom2.innerHTML = '<span class="badge badge-b" data-msg="stopLive">stopLive</span>';
                    dom2.dataset["contextId"] = obj.attributes.contextId;
                    dom2.addEventListener("click", stopM3u8LiveDownload, { once: true });
                    dom.appendChild(dom2);
                }
			}
            
            originalContentDom.appendChild(fragment);
		}
        
		function stopM3u8LiveDownload(e){
			e.stopPropagation();
			var contextId = this.dataset["contextId"];
			chrome.runtime.sendMessage({
				action: "stopm3u8livedownload",
				data: {
					id: contextId
				}
			}, function(response){
			});
		}
		
		function metricDownloadDownloading(data, custom){
			var contentDom = document.getElementById("download-downloading-content");
			contentDom.innerHTML = data.length == 0 ? chrome.i18n.getMessage("nothing") : "";
			document.getElementById("download-downloading-count").innerHTML = data.length;
            if(data.length == 0){
                return;
            }
			const fragment = document.createDocumentFragment();
            
			for(var x in data){
				var obj = data[x];
				
                if(MyUtils.isChromeTarget(obj.id)){
                    metricDownloadDownloadingChrome(fragment, obj);
                }else{
                    metricDownloadDownloadingCustom(fragment, obj, custom);
                }
                
			}
            
            contentDom.appendChild(fragment);
		}
        
        function metricDownloadDownloadingChrome(contentDom, obj){
            var dom = document.createElement("div");
            var html = '<hr/><div><span class="badge badge-name" data-title="downloadDatchName">'+obj.batchShowName+'</span><span class="badge badge-name" data-title="fileName">' + obj.fileName + '</span></div>';
            dom.innerHTML = html;
            
            var dom2 = document.createElement("span");
            dom2.innerHTML = '<span class="badge badge-b" data-msg="cancel">cancel</span>';
            dom2.dataset["downloadId"] = obj.id;
            dom2.addEventListener("click", cancelDownload, { once: true });
            
            contentDom.appendChild(dom);
            dom.appendChild(dom2);
            
            if(obj.canResume){
                var dom3 = document.createElement("span");
                dom3.innerHTML = '<span class="badge badge-b" data-msg="resume">resume</span>';
                dom3.dataset["downloadId"] = obj.id;
                dom3.addEventListener("click", resumeDownload, { once: true });
                
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
            };
            dom.addEventListener("click", onceClickHandler, { once: true });
            return dom;
        }
    
        function metricDownloadDownloadingCustom(contentDom, obj, custom){
            const data = custom[obj.id];
            if(data == null){
                return;
            }
            const itemDom = document.createElement("div");
            itemDom.innerHTML = '<hr/><div><span class="badge badge-name" data-title="downloadDatchName">'+obj.batchShowName+'</span></div><div class="line-wrapping download-url" data-title="url">' + data.url + '</div>';
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
                    progressDom1.title = data.percent + "%";
                }else{
                    progressDom1.style.display = "none";
                }
                cancelDom.style.display = "inline-block";
                resumeDom.style.display = "none";
                if(data.restart){
                    pauseDom.style.display = "none";
                    restartDom.style.display = "inline-block";
                }else{
                    pauseDom.style.display = data.resumable ? "inline-block" : "none";
                    restartDom.style.display = "none";
                }
            }else if(data.state == "interrupted"){
                statusDom.innerText = data.loaded + ' B' + ( data.lengthComputable ? ' , '+chrome.i18n.getMessage("downloadTotal")+' ' + data.total + ' B' : '' ) + ' , '+chrome.i18n.getMessage("downloadError");
                statusDom.style.display = "block";
                progressDom1.style.display = "none";
                pauseDom.style.display = "none";
                cancelDom.style.display = "inline-block";
                if(data.restart){
                    resumeDom.style.display = "none";
                    restartDom.style.display = "inline-block";
                }else{
                    resumeDom.style.display = data.resumable ? "inline-block" : "none";
                    restartDom.style.display = !data.resumable ? "inline-block" : "none";
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
				repaintByConfig(data);
				var senv = document.getElementById("settings-environment");
				for(var s=0; s<senv.length; s++){
					if(senv[s].value == data.environment){
						senv.selectedIndex = s;
						break;
					}
				}
				document.getElementById("settings-mntmax").value = data.monitoredQueueMax;
				document.getElementById("settings-dlingmax").value = data.downloadingMax;
				document.getElementById("settings-dlbtmax").value = data.downloadBatchMax;
                document.getElementById("settings-batchc").checked = data.batchConcurrent == "1";
				document.getElementById("settings-popwidth").value = data.popupWidth;
				document.getElementById("settings-popheight").value = data.popupHeight;
				document.getElementById("settings-pwe").checked = data.promptWhenExist == "1";
				document.getElementById("settings-nfar").checked = data.newFolderAtRoot == "1";
				document.getElementById("settings-pswc").checked = data.playSoundWhenComplete == "1";
                document.getElementById("settings-sd").checked = data.splitDiscontinuity == "1";
                document.getElementById("settings-prothr").value = data.processorThreshold;
                document.getElementById("settings-dps").value = data.downloaderPageSize;
                document.getElementById("settings-cs").checked = data.convertSubtitles == "1";
                document.getElementById("settings-bseq").checked = data.stopBrokenSequence == "1";
                document.getElementById("settings-ar").value = data.autoReload;
                document.getElementById("settings-paenable").checked = data.proxyAddressEnable == "1";
                document.getElementById("settings-pa").value = data.proxyAddress;
                document.getElementById("settings-mrenable").checked = data.matchingRuleEnable == "1";
                document.getElementById("settings-mr").value = data.matchingRule;
			});
        }
		
		init();
		
		function windowResize(width, height){
            const ncw1 = MyUtils.notContentWidth( document.body );
			document.body.style.width = (width - ncw1) + "px";
            
            const oh1 = MyUtils.outerHeight( document.getElementById("page-nav") );
            const nch1 = MyUtils.notContentHeight( document.getElementById("page-wrapper") );
            const nch2 = MyUtils.notContentHeight( document.body );
			document.getElementById("page-wrapper").style.maxHeight = (height - oh1 - nch1 - nch2) + "px";
		}
        
        function doAutoReload(ar){
            const reloads = ["monitor-reload", "download-reload", "running-reload"];
            for(let x in reloads){
                const ev = new Event("autoReload");
                ev.data = { delay: ar * 1000 };
                document.getElementById(reloads[x]).dispatchEvent(ev);
            }
        }
        
        function repaintByConfig(data){
            windowResize(data.popupWidth, data.popupHeight);
            doAutoReload(data.autoReload);
        }
		
		document.querySelectorAll('input[type="number"]').forEach(function(dom){
            if(dom.id == "settings-dps"){
                return ;
            }
			dom.onkeydown = function(){
				return false;
			};
		});
		
		document.getElementById("settings-submit").onclick = function(e){
			e.stopPropagation();
			var data = {};
			var senv = document.getElementById("settings-environment");
			data.environment = senv[senv.selectedIndex].value;
			data.monitoredQueueMax = parseInt(document.getElementById("settings-mntmax").value, 10);
			data.downloadingMax = parseInt(document.getElementById("settings-dlingmax").value, 10);
			data.downloadBatchMax = parseInt(document.getElementById("settings-dlbtmax").value, 10);
            data.batchConcurrent = document.getElementById("settings-batchc").checked ? "1" : "0";
			data.popupWidth = parseInt(document.getElementById("settings-popwidth").value, 10);
			data.popupHeight = parseInt(document.getElementById("settings-popheight").value, 10);
			data.promptWhenExist = document.getElementById("settings-pwe").checked ? "1" : "0";
			data.newFolderAtRoot = document.getElementById("settings-nfar").checked ? "1" : "0";
			data.playSoundWhenComplete = document.getElementById("settings-pswc").checked ? "1" : "0";
            data.splitDiscontinuity = document.getElementById("settings-sd").checked ? "1" : "0";
            data.processorThreshold = parseInt(document.getElementById("settings-prothr").value, 10);
            data.downloaderPageSize = Math.min( Math.max( parseInt(document.getElementById("settings-dps").value, 10), 1024 ), 1024 * 1024 * 1024 );
            data.convertSubtitles = document.getElementById("settings-cs").checked ? "1" : "0";
            data.stopBrokenSequence = document.getElementById("settings-bseq").checked ? "1" : "0";
            data.autoReload = parseInt(document.getElementById("settings-ar").value, 10);
            data.proxyAddressEnable = document.getElementById("settings-paenable").checked ? "1" : "0";
            data.proxyAddress = document.getElementById("settings-pa").value.trim();
            data.matchingRuleEnable = document.getElementById("settings-mrenable").checked ? "1" : "0";
            data.matchingRule = document.getElementById("settings-mr").value.trim();
			
			chrome.runtime.sendMessage({
					action: "updateconfig",
					data: data
				}, function(response){
				repaintByConfig(data);
			});
		};
        
        document.getElementById("settings-mr").addEventListener("click", function(e){
            e.stopPropagation();
            if(! this.classList.contains("textarea-mr-max")){
                this.classList.remove("textarea-mr");
                this.classList.add("textarea-mr-max");
            }
        }, { once: true });
        
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
        let _autoReloadIntervalId = null;
        
        document.getElementById("running-reload").onclick = function(e){
			e.stopPropagation();
			loadRunningInfo();
		};
        document.getElementById("running-reload").addEventListener("autoReload", (e) => {
            if(_autoReloadIntervalId != null){
                clearInterval(_autoReloadIntervalId);
                _autoReloadIntervalId = null;
            }
            const delay = e.data.delay;
            if(delay > 0){
                _autoReloadIntervalId = setInterval(function(){
                    loadRunningInfo();
                }, delay);
            }
        });
        
		function loadRunningInfo(){
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
				var contentDom = document.getElementById("running-content");
				contentDom.innerHTML = html;
			});
		}
		
	})();
    
    
    //logger
	(function(){
        
        const _logBus = new Array();
        let _currentId = null;
        const _modalContainer = document.getElementById("modal-container");
        const _modalPrimary = document.getElementById("modal-primary");
        const _modalInner = document.getElementById("modal-inner");
        
        
        function onLogError(item){
            _logBus.push(item);
            logNext(false);
        }
        
        document.getElementById("modal-min").onclick = function(e){
			e.stopPropagation();
            
            _modalInner.classList.remove("show");
            _modalInner.classList.add("hide");
			_modalContainer.classList.remove("popup");
            _modalContainer.classList.add("min");
            
            _modalContainer.addEventListener('transitionend', function(e2) {
                e2.stopPropagation();
                
                _modalContainer.addEventListener('click', function(e3) {
                    e3.stopPropagation();
                    
                    _modalInner.classList.remove("hide");
                    _modalInner.classList.add("show");
                    _modalContainer.classList.remove("min");
                    _modalContainer.classList.add("popup");
                }, { once: true });
            }, { once: true });
            
		};
        
        document.getElementById("modal-close").onclick = function(e){
			e.stopPropagation();
			logNext(true);
		};
        
        document.getElementById("modal-close").addEventListener('contextmenu', function(e) {
            e.stopPropagation();
            e.preventDefault();
            clearLog(true);
        });
        
        
        _modalContainer.addEventListener("logError", (e) => {
            onLogError(e.data.message);
        });
        
        function logNext(force){
            if(!force && ( _modalContainer.classList.contains("popup") || _modalContainer.classList.contains("min") )){
                return ;
            }
            if(_currentId != null){
                removeRemoteLog( [ _currentId ] );
            }
            
            const item = _logBus.shift();
            if(item != null){
                const message = MyUtils.isString(item) ? item : item.message;
                _currentId = MyUtils.isString(item) ? null : item.id;
                _modalPrimary.innerText = message;
                if(! _modalContainer.classList.contains("popup")){
                    _modalContainer.classList.add("popup");
                }
            }else{
                clearLog(false);
            }
        }
        
        function clearLog(force){
            if(force){
                removeRemoteLog("");
            }
            _modalContainer.classList.remove("popup");
            _modalPrimary.innerText = "";
            _logBus.splice(0);
            _currentId = null;
        }
        
        function removeRemoteLog(ids){
            chrome.runtime.sendMessage({
                action: "log.remove",
                data: ids
            }, function(response){
            });
        }
        
        function loadRemoteLog(){
            chrome.runtime.sendMessage({
                action: "log.snapshot"
            }, function(response){
                const data = response;
                for(const item of data){
                    onLogError(item);
                }
            });
        }
        
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if(request.action == "log.error"){
                onLogError(request.data);
				sendResponse({success: true});
			}
        });

        loadRemoteLog();
        
    })();
	
    function __logError(message){
        const ev = new Event("logError");
        ev.data = { message: message };
        document.getElementById("modal-container").dispatchEvent(ev);
    }
    
});
