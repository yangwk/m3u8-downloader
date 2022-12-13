/*
@See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
*/
var MyHttpHeadersHandler = (function () {
    const _excludeHeaders = new Set();
    
    [
        // Authentication
        // Caching
        "Age",
        "Cache-Control",
        "Clear-Site-Data",
        "Expires",
        "Pragma",
        "Warning",
        // Client hints
        // Conditionals
        "If-Match",
        "If-None-Match",
        "If-Modified-Since",
        "If-Unmodified-Since",
        "Vary",
        // Connection management
        "Connection",
        "Keep-Alive",
        // Content negotiation
        // Controls
        // Cookies
        // CORS
        // Downloads
        // Message body information
        // Proxies
        // Redirects
        // Request context
        // Response context
        // Range requests
        "Range",
        "If-Range",
        // Security
        // Server-sent events
        // Transfer coding
        // WebSockets
        // Other
    ]
    .map(name => name.toLowerCase()).forEach(name => _excludeHeaders.add(name));
    
    
    const _excludeForbiddenHeaders = new Set();
    // @See https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name
    // @See https://fetch.spec.whatwg.org/#forbidden-header-name
    [
        "Accept-Charset",
        "Accept-Encoding",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
        "Connection",
        "Content-Length",
        "Cookie",
        "Cookie2",
        "Date",
        "DNT",
        "Expect",
        "Feature-Policy",
        "Host",
        "Keep-Alive",
        "Origin",
        //"Proxy-",
        //"Sec-",
        "Referer",
        "Set-Cookie",
        "TE",
        "Trailer",
        "Transfer-Encoding",
        "Upgrade",
        "Via",
        "X-HTTP-Method",
        "X-HTTP-Method-Override",
        "X-Method-Override",
        "User-Agent"
    ]
    .map(name => name.toLowerCase()).forEach(name => _excludeForbiddenHeaders.add(name));
    
    
    function _filter(headers){
        for(let r=0; headers != null && r < headers.length; r++){
            if(_excludeHeaders.has( headers[r].name.toLowerCase() )){
                headers.splice(r, 1);
                r --;
            }
        }
        return headers;
    }
    
    
    function _filterForbidden(headers){
        for(let r=0; headers != null && r < headers.length; r++){
            const name = headers[r].name.toLowerCase();
            if(_excludeForbiddenHeaders.has(name)
                    || name.startsWith("proxy-") || name.startsWith("sec-") ){
                headers.splice(r, 1);
                r --;
            }
        }
        return headers;
    }
    
    return {
        filter: _filter,
        filterForbidden: _filterForbidden
    }
    
})();