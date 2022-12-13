/*
ISO Base Media File Format Name Space
@See https://www.rfc-editor.org/rfc/rfc6381
@See http://mp4ra.org/#/codecs
*/
var MyMp4raCodecs = (function(){
    /*
    Sample Entry Codes Registered to ISO
    Sample Entry Codes Registered for QuickTime
    */
	const _video = ["a3d1","a3d2","a3d3","a3d4","av01","avc1","avc2","avc3","avc4","avcp","avst","avs3","camm","dav1","drac","dva1","dvav","dvh1","dvhe","encv","evc1","evm1","evs1","evs2","FFV1","hev1","hev2","hev3","hvc1","hvc2","hvc3","hvt1","hvt2","hvt3","icpv","j2ki","jxsm","lhe1","lht1","lhv1","mjp2","mjpg","mp4v","mvc1","mvc2","mvc3","mvc4","mvd1","mvd2","mvd3","mvd4","resv","rv60","s263","svc1","svc2","vc-1","vp08","vp09","vvcN","vvc1","vvi1","vvs1","CFHD","civd","drac","DV10","dvh5","dvh6","dvhp","DVOO","DVOR","DVTV","DVVT","flic","gif$20","h261","h263","HD10","jpeg","M105","mjpa","mjpb","png$20","PNTG","rle$20","rpza","Shr0","Shr1","Shr2","Shr3","Shr4","SVQ1","SVQ3","tga$20","tiff","WRLE"];
    const _audio = ["a3ds","ac-3","ac-4","alac","alaw","cavs","dra1","dts+","dts-","dtsc","dtse","dtsh","dtsl","dtsx","dtsy","ec-3","ec+3","enca","fLaC","g719","g726","m4ae","mha1","mha2","mhm1","mhm2","mlpa","mp4a","Opus","raw$20","samr","sawb","sawp","sevc","sevs","sqcp","ssmv","twos","ulaw","agsm","alaw","dvi$20","fl32","fl64","ima4","in24","in32","lpcm","Opus","Qclp","QDM2","QDMC","ulaw","vdva"];
	
    return {
        containsVideo: function(t){
            return t && _video.includes(t);
        },
        containsAudio: function(t){
            return t && _audio.includes(t);
        }
    }
})();

