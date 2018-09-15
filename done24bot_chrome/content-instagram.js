var mode = 'off'; // semi, auto
var loaded = false; // ensures content-script loaded as expected
var localCode;
var auto_mode_tab = false;

var waiting_retries = 5; // times to retry liking before giving up;
const ERROR_PAGE_CLASS = 'p-error'; //body has this class if page is an error
const ERROR_WAIT_CLASS = 'wait-60-sec'; //signal that rate limit has been hit, we must wait

var video_selector = 'article a[role=button]';
var video_watch_length = 15000; // 15 seconds


var timer_element;
var ig_wait_duration = 1000 * 60 * 3;
const ACTUAL_CODE = " \
var valid_url_prefix = 'https://www.instagram.com/web/likes/'; \
var valid_url_postfix = '/like/'; \
var send = window.XMLHttpRequest.prototype.send; \
var onReadyStateChange; \
function sendReplacement(data) { \
  if(this.onreadystatechange) { this._onreadystatechange = this.onreadystatechange; } \
  this.onreadystatechange = onReadyStateChangeReplacement; \
  return send.apply(this, arguments); \
} \
function onReadyStateChangeReplacement() { \
  var temp_url = arguments['0'].target.responseURL; \
  if (this.readyState === 4 && temp_url.substr(0,36) == valid_url_prefix && temp_url.substr(-6) == valid_url_postfix){ \
    if (arguments['0'].target.status != 200) { \
      document.getElementsByTagName('body')[0].className += ' p-error wait-60-sec'; \
    } \
  } \
  if(this._onreadystatechange) { return this._onreadystatechange.apply(this, arguments); } \
} \
window.XMLHttpRequest.prototype.send = sendReplacement; \
";



// RECEIVED new mode
function setListeners(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.config_slow_mode) { configSlowMode = request.config_slow_mode; }
      if (request.config_watch) { configWatch = request.config_watch; }
      if (request.config_tg2) { configTG2 = request.config_tg2; }

      if (request.setNewMode) {
        mode = request.setNewMode;
        log("MODE:"+mode);
        main();
      } else if (request.setAutoModeTab) {
        log("auto-mode-tab: TRUE;");
        auto_mode_tab = request.setAutoModeTab;
      } else if (request.redirect_to) {
        redirectTo(request.redirect_to);

      } else if (request.sendReport) {
        sendResponse({html: $("body").html()});
      }
      log("configSlowMode:"+configSlowMode);
    }
  );

  function injectCodeToCatchRateLimitedErrors(){
    var s = document.createElement('script');
    s.innerText = ACTUAL_CODE;
    (document.body).appendChild(s);
  }
  injectCodeToCatchRateLimitedErrors();

}
function checkForError(){
  if ($('body').hasClass(ERROR_PAGE_CLASS)){
    addError();
    return true;
  } else if ($(".coreSpriteHeartFull, .coreSpriteLikeHeartFull, .coreSpriteHeartOpen, .coreSpriteLikeHeartOpen, .ptsdu, .plqBR").length == 0) {
    // IG post does not allow liking... "Follow username to like or comment."
    addError();
    return true;
  }
  return false;
}
function isPostLiked(){
  if (checkForError()){
    return false;
  }

  return $(".coreSpriteHeartFull, .coreSpriteLikeHeartFull, .plqBR").length > 0;
}

function likePostNow(){
  log("likePostNow");
  $(".coreSpriteHeartOpen, .coreSpriteLikeHeartOpen, .ptsdu").click();
}

function playVideoNow(){
  log("playVideoNow");
  if (configWatch && is_video() && $(video_selector).length > 0) {
    $(video_selector)[0].click();
  }
}

function likePostAndClose() {
  likePostNow();
  setTimeout(checkPostIsLikedAndClose, watching_video_timeout(100));
}

function checkPostIsLikedAndClose(){
  if (!isPostLiked()) {
    addError();
  }
  if (!keep_IG_auto_tab_open) {
    window.close();
  }
}


function is_video(){
  return $('meta[name="medium"]').attr('content') == 'video';
}
function watching_video_timeout(default_timeout) {
  if (configWatch && is_video() && $(video_selector).length > 0 && !isPostLiked()) {
    return video_watch_length;
  } else if (configSlowMode){
    return default_timeout * getRandomArbitrary(9,14);
  } else {
    return default_timeout * getRandomArbitrary(3,5);
  }
}

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function likePostAndGoToNext() {
  likePostNow();
  if (waiting_retries <= 0) {
    // what should I do here ?
    // TODO: add codes we were unable to like to log_code_errors = [] ?
    // addCode();
    // setTimeout(goToNext, 600);
  } else if (checkForError()) {
    setTimeout(goToNext, 200);
  } else if (isPostLiked()) {
    addCode();
    setTimeout(goToNext, watching_video_timeout(400));
  } else {
    // waiting_retries -= 1; // removed, so now auto-mode will wait forever until post is liked
    setTimeout(likePostAndGoToNext, watching_video_timeout(100));
  }
}

function goToNext() {
  chrome.runtime.sendMessage({getNextAutomatic: 'instagram'}, function(response) {
    // Final check before going to next
    if (!isPostLiked()) {
      addError();
    }

    // Wait if there is a signal to
    if ($('body').hasClass(ERROR_WAIT_CLASS)){
      log("WAITING A LOT");
      $('body').removeClass(ERROR_WAIT_CLASS);
      show_rate_limit_reached();
      setTimeout(function(){redirectTo(response);}, ig_wait_duration);
    } else if (window.location.href == "https://www.instagram.com/p/"+response+"/") {
      // trying to prevent unessesary page reloads, meh wait a bit...
      log("WAITING A BIT");
      setTimeout(goToNext, 200);
    } else if (response) {
      log("TRYING TO GO TO NEXT - "+response);
      redirectTo(response);
    } else {
      log("Closing-Tab");
      chrome.runtime.sendMessage({closeTab: 'instagram'});
      // window.close(); // doesn't work
    }
  });
}

function redirectTo(code) {
  window.location.href = "https://www.instagram.com/p/"+code;
}


function getCode(){
  if (localCode) { return localCode; }
  var code = /\/p\/([a-zA-Z0-9\-_]*).*/.exec(window.location.pathname);
  if (code && code.constructor === Array && code.length > 1 ){
    code = code.pop();
  }
  localCode = code;
  return localCode;
}


function addError() {
  chrome.runtime.sendMessage({bad: getCode()});
}
function addCode() {
  chrome.runtime.sendMessage({code: getCode()});
}
function subCode() {
  chrome.runtime.sendMessage({remove: getCode()});
}


function toggleLikePost(element){
  if ( element.hasClass("coreSpriteHeartOpen") || element.hasClass("coreSpriteLikeHeartOpen") || element.hasClass("ptsdu") ) {
    log("toogle LIKE");
    addCode();
  } else {
    log("toogle UN-LIKED");
    subCode();
  }
}

function runSemiMode(){
  // log("semi-mode");
  // if (ac_mode) { return true; }
  // ac_mode = true;

  if (!isPostLiked()){
    setTimeout(likePostAndClose, 500); // wait 0.5 sec and then like post
  }
}

function isLoggedIntoInstagram(){
  return $("html.logged-in").length == 1 &&
    $("html.not-logged-in").length == 0;
}

function isNotLoggedIntoInstagram(){
  return $("html.logged-in").length == 0 &&
    $("html.not-logged-in").length == 1;
}


function runAutoMode(){
  if (auto_mode_tab) {
    if (configWatch && is_video() && $(video_selector).length > 0 && !isPostLiked()) {
      playVideoNow();
    }
    setTimeout(likePostAndGoToNext, watching_video_timeout(400));
  }
}





function set_current_instagram_account(){
  log('set_current_instagram_account:');

  $.each($('body script'), function(index, element) {
    if (element.text.substring(0,6) == 'window'){
      var sharedData;
      var shared_data_text;

      try {
        // split so it evals only the first portion of the script
        // replace \n with escaped \\n so eval will accept newlines
        shared_data_text = element.text.split("};")[0]+"};"
        sharedData = eval(shared_data_text.replace(/\n/g,"\\n"));
      } catch(err) {
        // THERE WAS AN ERROR

      }

      if (typeof(sharedData) == 'object' && typeof(sharedData.config) == 'object' && typeof(sharedData.config.viewer) == 'object') {

        // log(sharedData.config);
        // log(sharedData.config.viewer);
        var xid = sharedData.config.viewer.id;
        if (xid == undefined || xid == '') { return false; }

        current_instagram_id = xid;
        current_instagram_username = sharedData.config.viewer.username;
        chrome.runtime.sendMessage({addIGid: 'instagram', id:current_instagram_id, username:current_instagram_username});
      }
    }
  })
}


// TODO: FIX THIS SO THAT it doesn't send multiple sendMessage
function main(){
  if (isPostLiked()){
    addCode();
  } else {
    subCode();
  }

  log("MAIN:"+mode);

  if (mode == 'semi'){
    runSemiMode();
  } else if (mode == 'auto'){ // only run fully automatic on 1-specific tab
    runAutoMode();
  } else if (mode == 'off') {
    //
  }

}



function onLoaded(){
  if (loaded) { return true; }
  loaded = true;
  log("LikeItAll-IG: LOADED");

  setListeners();

  if (isNotLoggedIntoInstagram()) {
    log('NOT logged in to Instagram');
    chrome.runtime.sendMessage({errorNotLoggedIn: 'instagram'});
  } else if (isLoggedIntoInstagram()) {
    chrome.runtime.sendMessage({addContextTab: 'instagram'});
    chrome.runtime.sendMessage({getStatusMode: 'instagram'}, function(x){
      mode = x.setMode;
      auto_mode_tab = x.autoTabMode;
      log("auto_mode_tab = "+auto_mode_tab);
      configSlowMode = x.config_slow_mode;
      configWatch = x.config_watch;
      main();
      set_current_instagram_account();
    });

    // handles manually like/unlike post
    $("body").on('click', ".coreSpriteHeartFull, .coreSpriteHeartOpen, .coreSpriteLikeHeartOpen, .coreSpriteLikeHeartFull, .ptsdu, .plqBR", function(){
      toggleLikePost($(this));
    });
  }


  // for testing
  // show_rate_limit_reached();
}


function update_ig_timer(){
  if (timer_element) {
    var time_left = parseInt((ig_wait_duration - (Date.now() - timer_element.data('starttime')))/1000);
    timer_element.text(
      "IG rate-limit detected. Waiting " + time_left + " sec."
    );
    if (time_left <= 0) {
     timer_element.text(
        "IG rate-limit detected. Waiting 0 sec."
      );
     timer_element = null;
    }
  }
}
function show_rate_limit_reached(){
  $('body').append('<div class="corner-text" id="ig-time-out" data-starttime="'+Date.now()+'">IG rate-limit detected. Waiting 60 sec.</div><div class="corner-icon"><img src="https://www.likeitall.com/images/icon128-white.png"/></div><div class="corner-info">Don\'t forget to go back and manually like this red link</div>');
  $(".coreSpriteHeartFull, .coreSpriteLikeHeartFull, .plqBR").removeClass("coreSpriteHeartFull coreSpriteLikeHeartFull .plqBR").addClass("ptsdu");

  timer_element = $('#ig-time-out');
  window.setInterval(update_ig_timer, 1000);
  chrome.runtime.sendMessage({igRateLimitReached: 'instagram'});
}

// not guaranteed to be loaded... :(

$(function() {
  onLoaded();
}, true);

// fallback
setTimeout(onLoaded, 600);
