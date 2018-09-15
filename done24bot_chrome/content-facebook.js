var sitename = "facebook";
var anchors_selector = "span.UFICommentBody a:not(.fss)";

// Override
function onLoaded(){
  if (loaded) { return true; }
  loaded = true;
  log("LikeItAll-"+sitename+": LOADED");

  setListeners();

  if (window.location.hostname == 'm.facebook.com') {
    anchors_selector = "div[data-sigil='comment-body'] a";
  }

  chrome.runtime.sendMessage({addContextTab: sitename});
  chrome.runtime.sendMessage({getStatusMode: sitename}, function(x){
    mode = x.setMode;
    log(mode);
    main();
    recursiveColorInstagramLinks();
  });
}


