var mode = 'off'; // semi, auto
var main_timer = 500;
var loaded = false; // ensures content-script loaded as expected
var cached_instagram_links_count = 0; // keep track of instagram links on page, and run detection when this number changes
var anchors;

// SET IN custom page
// var sitename = "google";
// var anchors_selector = "a.ot-anchor";


function setListeners(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.setNewMode) {
        setNewMode(request.setNewMode);

      } else if (request.updateColoredLinks == 'find') {
        findNewLinksNow();
      } else if (request.updateColoredLinks == 'clear') {
        clearColoredLinks();
        colorInstagramLinks();
      } else if (request.updateColoredLinks) {
        colorInstagramLinks();
      }
    }
  );
}


// only runs when page updates are detected on page
function runAutoMode(){
  var i = anchors.length;
  var tempcode = "";
  var new_codes = [];

  if (i != cached_instagram_links_count) {
    cached_instagram_links_count = i;
    $.each(anchors, function(index, element) {
      tempcode = getCodeFromUrl(element.text);
      if (tempcode){
        // colorDetectedInstagramLinks
        $(element).addClass("instagramLinkDetected");

        // remove known liked codes, and codes we previously added to queue via log_codes, and codes in error
        if (!log_codes.includes(tempcode) && !codes_in_queue.includes(tempcode) && !error_codes.includes(tempcode)){
          new_codes.push(tempcode);
        }
      }
    });

    // add new_codes to queue... and to log_codes, so we don't send them again
    chrome.runtime.sendMessage({runAutomatic: new_codes, src:sitename});
    log_codes = _.union(log_codes, new_codes);
    log("detectNewInstagramLinksAndAddedThemToAutoQueue("+i+")");
  }
}

function findNewLinksNow(){
  cached_instagram_links_count = 0;
  runAutoMode();
}

function main(){
  anchors = $(anchors_selector);
  if (mode == 'auto'){
    runAutoMode();
  }
  setTimeout(main, main_timer);
}


function onLoaded(){
  if (loaded) { return true; }
  loaded = true;
  log("LikeItAll-"+sitename+": LOADED");

  setListeners();

  chrome.runtime.sendMessage({addContextTab: sitename});
  chrome.runtime.sendMessage({getStatusMode: sitename}, function(x){
    mode = x.setMode;
    log(mode);
    main();
    recursiveColorInstagramLinks();
  });
}


// not guaranteed to be loaded... :(

$(function() {
  onLoaded();
}, true);

// fallback
setTimeout(onLoaded, 600);
