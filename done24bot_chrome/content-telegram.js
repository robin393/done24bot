var sitename = "telegram";
var anchors_selector = ".im_message_text a";

// only runs when page updates are detected on page
function runAutoMode(){
  var i = anchors.length;
  var tempcode = "";
  var new_codes = [];

  // target only anchors that are visible
  var visible_anchors = [];

  visible_anchors = _.filter(anchors, function(element) {
    return $(element).offset().top - 50 > 0; // top bar obsures view
  });

  $.each(visible_anchors, function(index, element) {
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

  // valid new codes
  if (new_codes.length > 0) {
    codes_in_queue = _.union(codes_in_queue, new_codes);
    // add new_codes to queue... and to log_codes, so we don't send them again
    chrome.runtime.sendMessage({runAutomatic: new_codes, src:sitename});
    log_codes = _.union(log_codes, new_codes);
    log("detectNewInstagramLinksAndAddedThemToAutoQueue("+new_codes.length+")");
  }
}