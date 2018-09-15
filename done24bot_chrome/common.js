const VERSION = '1.34.6';
const PRERELEASE = false;
const VALID_SMODES = ['off', 'semi', 'auto'];

var logs = []; // log of events
var error_codes = []; // log of codes in error
var log_codes = []; // log of codes liked
var master_log_codes = {}; // log of codes liked
var MAX_LOG_SIZE = 1000;
var MAX_CODES_SIZE = 5000;

var current_instagram_id = '0';
var current_instagram_username = 'unknown';

var codes_in_queue = [];

var configSlowMode = false;
var configWatch = false;
var configTG2 = false;


// DEBUG SETTINGS ---
var output_logs = false;
var do_not_open_IG_auto_tab = false;
var keep_IG_auto_tab_open = false;



function setNewMode(new_mode){
  if (VALID_SMODES.includes(new_mode)){
    mode = new_mode;
    cached_instagram_links_count = 0;
    log("MODE:"+mode);
  }
}

function colorInstagramLinks(){
  var codes = get_all_codes();
  if (codes.length > 0) {
    chrome.runtime.sendMessage({any: codes}, function(response) {
      addHighlightsToLinks(anchors, response);
      // removed returned codes from queue;
      codes_in_queue = _.without(codes_in_queue, response.good);
      codes_in_queue = _.without(codes_in_queue, response.bad);
    });
  }
}

function recursiveColorInstagramLinks(){
  // log('should be coloring...'+main_timer);
  var codes = get_all_codes();

  if (codes.length > 0) {
    chrome.runtime.sendMessage({any: codes}, function(response) {
      addHighlightsToLinks(anchors, response);
      // removed returned codes from queue;
      codes_in_queue = _.without(codes_in_queue, response.good);
      codes_in_queue = _.without(codes_in_queue, response.bad);
      setTimeout(recursiveColorInstagramLinks, main_timer);
    });
  } else {
    setTimeout(recursiveColorInstagramLinks, main_timer);
  }
}

function get_all_codes(){
  var tempcode = "";
  var codes = [];

  $.each(anchors, function(index, element) {
    tempcode = getCodeFromUrl(element.text);
    if (tempcode){
      codes.push(tempcode);
    }
  });

  return codes;
}

// ONLY WORK ON URLS that match instagram.com
function getCodeFromUrl(url) {
  var tempcode = "";
  tempcode = /(https?\:\/\/)?(www\.)?instagram\.com\/p\/([a-zA-Z0-9\-_]*).*/.exec(url);
  if (tempcode && tempcode.constructor === Array && tempcode.length > 1 ){
    tempcode = tempcode.pop();
    return tempcode;
  }
  return null;
}


function log(msg){
  if (typeof(msg)=="object"){
    if (output_logs) {
      // console.log(_.allKeys(msg).join());
      console.log(msg);
    }
  } else {
    if (output_logs) {
      console.log(msg);
    }
    logs.push(msg);

    // truncate logs, take off front of array, aka the oldest
    while (logs.length > MAX_LOG_SIZE) { logs.shift(); }
    // truncate codes, take off front of array, aka the oldest
    while (log_codes.length > MAX_CODES_SIZE) { log_codes.shift(); }
    // truncate error_codes, take off front of array, aka the oldest
    while (error_codes.length > MAX_LOG_SIZE) { error_codes.shift(); }
  }
}

function addUniqueToArray(array, element){
  if (array) {
    if (!array.includes(element)) {
      array.push(element);
    }
    return array;
  } else {
    return [element];
  }
}


// test links are being detected when in auto-mode in Facebook and Telegram
function testColorLinkDetection(aselector){
  log("testColorLinkDetection");
  var anchors = $(aselector);

  $.each(anchors, function(index, element) {
    $(element).addClass("testLinkDetection");
  });
}

// used by facebook and telegram
function clearColoredLinks(){
  log_codes = []; // empty local cache of codes
  error_codes = [];
  codes_in_queue = [];
  $(anchors_selector).removeClass('instagramLinkDetected likedOnInstagram instagramLinkError');
}

function addHighlightsToLinks(anchors, response){
  var temp_code = '';
  $.each(anchors, function(index, element) {
    new_code = getCodeFromUrl(element.text);

    // if background returns code in error... color it red and add to error_codes
    if (new_code && response.bad.includes(new_code)) {
      $(element).addClass("instagramLinkError");
      error_codes = addUniqueToArray(error_codes, new_code);

    // if background returns code liked... color it green and add to log_codes
    } else if (new_code && response.good.includes(new_code)) {
      $(element).removeClass('instagramLinkError').addClass("likedOnInstagram");
      log_codes = addUniqueToArray(log_codes, new_code);

    // if background returns code is missing... remove green color and from log_codes
    } else if (new_code && response.queue.includes(new_code)) {
      $(element).addClass("instagramLinkDetected");
      log_codes = _.without(log_codes, new_code);
    }
  });
}