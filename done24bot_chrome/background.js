var TEN_HOURS = 10 * 60 * 60 * 1000;
var ONE_HOUR = 60 * 60 * 1000;
var SERVER = "https://www.likeitall.com/";
var TIME_TO_CHECK_FOR_TAB_ERROR = 1000;

var loggedIntoInstagram = false;
var loggedIntoFacebook  = false;
var loggedIntoTelegram  = false;
var loggedIntoReddit    = false;
var loggedIntoGoogle    = false;
// TODO: consolidate into single object

var fitness = false;
var fitnessTTL = Date.now() - ONE_HOUR;

var currentErrorMessage;
var currentErrorCode;

var currentState = 'off';
var currentMode = 'auto';

var allTabIds = {'facebook':[],'telegram':[],'reddit':[],'google':[]};
var instagramTabIds = [];

var badgeCount = 0;
var internalTotal = 0;

var automaticTabTimer = 0;
var codesQueue = [];
var codesInTabs = [];
var autoTabId;

var reportEmail;
var opening_auto_tab = false;


function removeTab(tabId){
  if (tabId == autoTabId){
    autoTabId = null;
  }

  instagramTabIds = _.without(instagramTabIds, tabId);
  $.each(allTabIds, function(key,vals){ allTabIds[key] = _.without(vals, tabId) });
}

function addCodeToErrors(new_code){
  // remove from tab and queue
  codesInTabs = _.without(codesInTabs, new_code);
  codesQueue  = _.without(codesQueue, new_code);
  log_codes   = _.without(log_codes, new_code);
  updateLinksLeftForPopup();

  if (!error_codes.includes(new_code)) {
    error_codes.push(new_code);
    UpdateLinksInTabs('add');
  }
}
function addCodeToCompleted(new_code){
  // remove from tab and queue
  codesInTabs = _.without(codesInTabs, new_code);
  codesQueue  = _.without(codesQueue, new_code);
  error_codes = _.without(error_codes, new_code);
  updateLinksLeftForPopup();

  if (!log_codes.includes(new_code)) {
    log_codes.push(new_code);
    addToCount();
    UpdateLinksInTabs('add');
  }
}
function removeCodeFromCompleted(old_code){
  if (log_codes.includes(old_code)) {
    log_codes = _.without(log_codes, old_code);

    subToCount();
    UpdateLinksInTabs('remove');
  }
}

// return list of codes completed
function anyCodesCompleted(codes){
  return _.intersection(log_codes,codes);
}
function anyCodesInError(codes){
  return _.intersection(error_codes,codes);
}
function anyCodesInQueue(codes){
  return _.intersection(codesQueue,codes);
}

function setListeners() {
  chrome.tabs.onRemoved.addListener(removeTab);

  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      // log(request);

      if (request.code) { // add code --------------------------------------------------
        addCodeToCompleted(request.code);
        chrome.runtime.sendMessage({linksLeft: 'bg'});

      } else if (request.remove) { // remove code
        removeCodeFromCompleted(request.remove);

      } else if (request.any) { // Return codes that have been saved
        sendResponse({
          'good': anyCodesCompleted(request.any),
          'bad': anyCodesInError(request.any),
          'queue': anyCodesInQueue(request.any)
        });

      } else if (request.bad) { // add code --------------------------------------------------
        addCodeToErrors(request.bad);
        chrome.runtime.sendMessage({linksLeft: 'bg'});


      // track context tabs --------------------------------------------------------
      } else if (request.addContextTab == 'telegram') {
        loggedIntoTelegram = true;
        currentErrorCode = null;
        allTabIds['telegram'] = addUniqueToArray(allTabIds['telegram'], sender.tab.id);

      } else if (request.addContextTab == 'facebook') {
        loggedIntoFacebook = true;
        currentErrorCode = null;
        allTabIds['facebook'] = addUniqueToArray(allTabIds['facebook'], sender.tab.id);

      } else if (request.addContextTab == 'reddit') {
        loggedIntoReddit = true;
        currentErrorCode = null;
        allTabIds['reddit'] = addUniqueToArray(allTabIds['reddit'], sender.tab.id);

      } else if (request.addContextTab == 'google') {
        loggedIntoGoogle = true;
        currentErrorCode = null;
        allTabIds['google'] = addUniqueToArray(allTabIds['google'], sender.tab.id);


      } else if (request.addContextTab == 'instagram' || request.addIGid == 'instagram') {
        setCurrentIdent(request.id, request.username);
        currentErrorCode = null;
        instagramTabIds = addUniqueToArray(instagramTabIds, sender.tab.id);

      // ON/OFF button -----------------------------------------------
      } else if (request.getStateMode) { // get on/off status of liker
        getStateForRequest(); // async
        sendResponse({'setMode':currentMode, 'linkCount':codesQueue.length, 'setState':currentState});

      } else if (request.setState) { // set on/off status of liker
        //checkExpireFitness();
        //hasToken();

        setStateNow(request.setState);
        setModeNow(request.mode);

        if (request.setState == 'on') {
          // if turning ON load from sync
          loadSyncMasterLog();
        } else {
          // if turning OFF update master_log_codes & save to sync
          saveSyncMasterLog();
        }

      // MODE Toggle -------------------------------------------------
      } else if (request.setMode) {

        moveCodesInTabsToQueue();
        setModeNow(request.setMode);

        // RUN FULLY AUTOMATIC.
        if (currentState == 'on' && currentMode == 'auto') {
          UpdateLinksInTabs('find');
        }

      } else if (request.getStatusMode) {
        if (currentState == 'on') {
          sendResponse({'setMode':currentMode, 'linkCount':codesQueue.length, 'config_slow_mode':configSlowMode, 'config_watch':configWatch, 'config_tg2':configTG2, 'autoTabMode':(sender.tab.id == autoTabId)});
        } else {
          sendResponse({'setMode':'off', 'linkCount':codesQueue.length, 'config_slow_mode':configSlowMode, 'config_watch':configWatch, 'config_tg2':configTG2, 'autoTabMode':(sender.tab.id == autoTabId)});
        }



      // AUTO MODE --------------------------------------------------------------------
      // } else if (request.verifyModeReloaded) {
      //   log("VERIFY-MODE: "+request.verifyCode+" ("+request.verified+")");

      } else if (request.getIsAutoTab) {
        sendResponse(sender.tab.id == autoTabId);

      } else if (request.updateData) {
        sendResponse({
          countAutomatic: codesQueue.length,
          errorMessage: getAnyErrors(),
          errorCode: currentErrorCode,

          config_slow_mode: configSlowMode,
          config_watch: configWatch,
          config_tg2: configTG2
        });

      } else if (request.getNextAutomatic) { //
        automaticTabTimer = Date.now();
        temp_code = codesQueue.shift();
        updateLinksLeftForPopup();
        if (codesQueue.length >= 0 && temp_code) {
          codesInTabs.push(temp_code);
          log(temp_code + " (getNextAutomatic) remaining:" + codesQueue.length);
          sendResponse(temp_code);
        } else {
          log("Nothing LEFT IN QUEUE ");
          sendResponse(null);
        }




      } else if (request.runAutomatic) {
        // Run Fully Automatic (run by facebook/reddit/telegram tabs...)
        // passes array of codes to add to queue

        if (currentMode=='semi') {
          log("trying to request.runAutomatic, but i'm in semi mode");
        } else {
          log("Detected New Links in "+request.src+" TabID:"+sender.tab.id+" size:"+request.runAutomatic.length);

          addNewCodesToQueueAndRun(request.runAutomatic);
        }


      } else if (request.igRateLimitReached) {
        log("IG-Rate-Limit Reached ("+badgeCount+")");
      } else if (request.closeTab) {
        if (codesInTabs.lenth > 0) {
          chrome.tabs.sendMessage(autoTabId, {redirect_to:codesInTabs.pop()});
        } else {
          if (!keep_IG_auto_tab_open) {
            chrome.tabs.remove(autoTabId);
          }
          autoTabId = null;
          UpdateLinksInTabs('add');
        }
        updateLinksLeftForPopup();



      // POPUP --------------------------------------------------------------
      } else if (request.setEmail) {
        reportEmail = request.setEmail;
        log("SETTING setEmail - "+request.setEmail);
        chrome.storage.sync.set({email: request.setEmail});
        // hasKey();

      } else if (request.hasToken) {
//        hasToken();

      } else if (request.setSettings) {
        log(request);
        if (request.config_slow_mode != undefined && configSlowMode != request.config_slow_mode) {
          configSlowMode = request.config_slow_mode;
          log("SETTING slow-mode = "+configSlowMode);
        }
        if (request.config_watch != undefined && configWatch != request.config_watch) {
          configWatch = request.config_watch;
          log("SETTING watch-video = "+configWatch);
        }
        if (request.config_tg2 != undefined && configTG2 != request.config_tg2) {
          configTG2 = request.config_tg2;
          log("SETTING telegram-algorythm-2 = "+configTG2);
        }
        updateTabsModeState();

      } else if (request.getEmail) {
        //chrome.storage.sync.get(['email','token'], function(result){
        //  reportEmail = result.email;
        //  if (result.email == null){
        //    currentErrorMessage = 'Please Log-in';
        //  }
        //  result.errorMessage = getAnyErrors();
	// reportEmail = 'hello@done24bot.com';
        sendResponse(null);
        //});

      } else if (request.errorNotLoggedIn) {
        if (request.errorNotLoggedIn == 'instagram') {
          SetInstagramNotLoggedIn();
        }

      } else if (request.count == 'reset') {
        resetAll();
      } else if (request.count == 'add') {
        addToCount();
      } else if (request.count == 'remove') {
        subToCount();
      } else if (request.authenticateForm) {
	successFromServer;
/*        $.ajax({
          type: "POST",
          url: SERVER,
          data: request,
          success: successFromServer,
          error: failureFromServer,
          dataType: 'json'
        }); */

        if (request.email) {
          chrome.storage.sync.set({email: request.email});
        }

      } else if (request.logout) {
        reportEmail = null;
        chrome.storage.sync.remove(['email','token']);
        setNotFit();

      } else if (request.report) {
        // Only send issue report at request of user
        $.ajax({
          type: "POST",
          url: SERVER+"report",
          data: {
            email: reportEmail || 'none',
            issue_content: request.issue_content || 'none',
            loggedIntoInstagram: loggedIntoInstagram,
            loggedIntoFacebook: loggedIntoFacebook,
            loggedIntoReddit: loggedIntoReddit,
            loggedIntoGoogle: loggedIntoGoogle,
            loggedIntoTelegram: loggedIntoTelegram,
            fitness: fitness,
            fitnessTTL: fitnessTTL,
            now: Date.now(),
            errorMessage: getAnyErrors() || 'none',
            currentErrorCode: currentErrorCode,
            currentState: currentState,
            currentMode: currentMode || '!',
            configSlowMode: configSlowMode,
            configWatch: configWatch,
            configTG2: configTG2,
            current_instagram_id: current_instagram_id,
            current_instagram_username: current_instagram_username,
            instagramTabIds: JSON.stringify(instagramTabIds),
            allTabIds: JSON.stringify(allTabIds),
            badgeCount: badgeCount,
            prerelease: PRERELEASE,
            internalTotal: internalTotal,
            version: VERSION,
            autoTabId: autoTabId || 'none',
            automaticTabTimer: automaticTabTimer,
            codesQueue: JSON.stringify(codesQueue),
            codesInTabs: JSON.stringify(codesInTabs),
            error_codes: JSON.stringify(error_codes),
            log_codes: JSON.stringify(log_codes),
            logs: logs
          },
          success: function(){
            sendResponse({message: "Report Sent"});
          },
          dataType: 'json'
        });


      }

      return true;
    }
  )
}

function checkForErrorInAutoTab(){
  if (currentState == 'off' || currentMode == 'semi'){
    // do nothing
  } else if (autoTabId == null) {
    // do nothing
  } else if (currentState == 'on' || currentMode == 'auto') {

    // log('checkForErrorInAutoTab()');
    // log(codesInTabs);

    chrome.tabs.get(autoTabId, function(tab){
      if (tab.status != "complete"){
        // do nothing
      } else {
        if (/https?\:\/\/www\.instagram\.com\/p\/(.*)/.exec(tab.url) === null){

          if (codesInTabs.length > 0) {
            error_codes = _.uniq(error_codes.concat(codesInTabs));
            codesInTabs = [];
          }

          chrome.tabs.remove(autoTabId);
          autoTabId = null;
          UpdateLinksInTabs('add');
          updateLinksLeftForPopup();
          runFullyAutomatic();
        }
      }
    });


  } else {
    // do nothing
  }

  setTimeout(checkForErrorInAutoTab, TIME_TO_CHECK_FOR_TAB_ERROR);
}

function SetInstagramNotLoggedIn(){
  loggedIntoInstagram = false;
  setStateNow('off');
  current_instagram_id = '0';
  current_instagram_username = 'unknown';
}


function loadSyncMasterLog(){
  if (Object.keys(master_log_codes).length == 0){
    log('---loadSyncMasterLog---');
    chrome.storage.local.get('master_codes', function(result){
      master_log_codes = result.master_codes || {};

      // LOAD log_codes from master
      log_codes = master_log_codes[current_instagram_id] || [];
    });
  }
}
function saveSyncMasterLog(){
  log('---saveSyncMasterLog---');
  master_log_codes[current_instagram_id] = log_codes;
  chrome.storage.local.set({master_codes: master_log_codes});
}

function setCurrentIdent(id, username){
  if (id == undefined || id == '') { return false; }
  if (current_instagram_id != undefined && parseInt(current_instagram_id) == parseInt(id)) { return false; }

  loggedIntoInstagram = true;
  loadSyncMasterLog();

  // SAVE log_codes to master
  master_log_codes[current_instagram_id] = log_codes;

  current_instagram_id = id;
  current_instagram_username = username;
  log("Set current_instagram_id = "+id+" | "+username);
  resetAll();

  // LOAD log_codes from master
  log_codes = master_log_codes[current_instagram_id] || [];
}

// RUNS IF WHILE AUTO && ON && NEW LINKS ARE ADDED TO QUEUE
function addNewCodesToQueueAndRun(new_codes){
  // 1. remove codes already in codesQueue or automaticCodeInTab
  new_codes = _.difference(new_codes, codesQueue);
  new_codes = _.difference(new_codes, codesInTabs);

  // 2. remove codes already liked
  new_codes = _.difference(new_codes, log_codes);

  if (new_codes.length > 0) {
    codesQueue = _.uniq(codesQueue.concat(new_codes));
    log("ADDED NEW CODES TO QUEUE ("+new_codes.length+")");
    updateLinksLeftForPopup();
    chrome.runtime.sendMessage({linksLeft: 'bg'});
  }

  if (codesQueue.length > 0) {
    runFullyAutomatic();
  }
}


function UpdateLinksInTabs(msg){
  // send message to facebook & telegram & reddit tabs:
  // msg=add|remove : color links
  // msg=find : look for links to add
  $.each(allTabIds, function(key,vals){
    $.each(vals || [],function(i,id){
      chrome.tabs.sendMessage(id, {updateColoredLinks: msg});
    });
  });
  updateLinksLeftForPopup();
}
function updateLinksLeftForPopup(){
  window.localStorage.setItem('linksLeft', codesQueue.length);
}


function checkExpireFitness(){
  if (fitness && fitnessTTL < Date.now()){
    // fitness = false;
    log('setting fitness to false b/c expired')
  }
}

// PROPAGATES state & mode to child tabs
function updateTabsModeState(){
  // log('updateTabsModeState');
  $.each(instagramTabIds || [],function(i,id){
    chrome.tabs.sendMessage(id, {setNewMode: (currentState == 'on' ? currentMode : 'off'), config_slow_mode: configSlowMode, config_watch: configWatch, config_tg2: configTG2 });
  });

  $.each(allTabIds, function(key,vals){
    $.each(vals || [],function(i,id){
      chrome.tabs.sendMessage(id, {setNewMode: (currentState == 'on' ? currentMode : 'off'), config_slow_mode: configSlowMode, config_watch: configWatch, config_tg2: configTG2 });
    });
  });
}


function ce_icon(){
  if (currentState == 'on') {
    chrome.browserAction.setIcon({ path: {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png" }
    });
  } else {
    chrome.browserAction.setIcon({ path: {
      "16": "icon16.off.png",
      "48": "icon48.off.png",
      "128": "icon128.off.png" }
    });
  }
}


function getAnyErrors(){
  //checkExpireFitness();
  if (currentErrorMessage) {
    return currentErrorMessage;
  }


  currentErrorCode = 'L0';
/*  if (!fitness) {
    return "Please provide key-code";
  } else if (!loggedIntoInstagram) { // || current_instagram_id == 'nil'
    return "Login to Instagram";
  } else if (!loggedIntoFacebook && !loggedIntoTelegram && !loggedIntoReddit && !loggedIntoGoogle) {
    return "Reload engagement thread tabs";
  } */

  currentErrorCode = null;
  return null;
}


// Check Token Expiry, validate Token, send SERVER stats
function hasToken(){
  if (fitnessTTL < Date.now()) {
    log("hasToken - TOKEN EXPIRED");
  }

  if (!fitness || fitnessTTL < Date.now()){
    successFromServer;
  
/*    chrome.storage.sync.get(['token', 'email'], function(result) {
      reportEmail = result.email;

      if (result.token && result.email) {
        result.internalTotal = internalTotal;
        result.version = VERSION;
        result.username = current_instagram_username;
        $.ajax({
          type: "POST",
          url: SERVER,
          data: result,
          success: successFromServer,
          error: failureFromServer,
          dataType: 'json'
        }); 

      } else {
        setNotFit();
      }
    }); */
  } 
}

function failureFromServer(data, textStatus, jqXHR){
  if (data && data.responseJSON && data.responseJSON.errorCode) {
    log("SERVER - Authorization Failed");
    currentErrorMessage = data.responseJSON.errorMessage;
    currentErrorCode = data.responseJSON.errorCode;
    setNotFit();
  } else {
    // log(data.responseJSON);

    // if expired token found, do NOT turn fitness to false (if my server goes down it doesn't kill the extension)
    chrome.storage.sync.get('token', function(result) {
      if (result) {
        log("SERVER - COULD NOT CONTACT SERVER - Expired Token Found");
        // no change to fitness
        currentErrorMessage = "Looking for server: S4";
        currentErrorCode = "L0";
      } else {
        log("SERVER - COULD NOT CONTACT SERVER");
        currentErrorMessage = "Looking for server: S5";
        currentErrorCode = "L0";
        // setNotFit();
      }
    })
  }
}

function successFromServer(data, textStatus, jqXHR ){
    fitness = true;
    fitnessTTL = Date.now() + ONE_HOUR;
    internalTotal = 0; // reset

/*  chrome.storage.sync.set({token: data.token}, function() {
    log("RECIEVED MSG FROM SERVER");
    log(data);
    fitness = data.fitness == true;
    log("set Fitness: "+fitness);
    fitnessTTL = Date.now() + ONE_HOUR;
    internalTotal = 0; // reset
    currentErrorMessage = data.errorMessage;
    currentErrorCode = data.errorCode;
  }); */

}

// returns CodesInTabs to codesQueue
function moveCodesInTabsToQueue(){
  // log("moveCodesInTabsToQueue");
  codesQueue = _.uniq(codesQueue.concat(codesInTabs));
  codesInTabs = [];
}

function verifyAutoTabExists(){
  if (chrome.runtime.lastError) {
    log("AutoTab:" + chrome.runtime.lastError.message);
    autoTabId = null;
  } else {
    // log("AutoTab:EXISTS");
    // do nothing
  }
}

function runFullyAutomatic(){
  if (do_not_open_IG_auto_tab) { return true; }
  // log("            (runFullyAutomatic) opening_auto_tab:"+opening_auto_tab);
  if (opening_auto_tab) {
    // DO NOTHING
  } else if (autoTabId) {
    // log("Chill Out ~ " + (Date.now() - automaticTabTimer));
    // log("Tab Exists... chill out");
    // tab exists, let tab handle things, also re-start tab in auto-mode if it was stopped
    chrome.tabs.get(parseInt(autoTabId), verifyAutoTabExists);

  } else if (codesQueue.length > 0) {
    opening_auto_tab = true;
    moveCodesInTabsToQueue();

    temp_code = codesQueue.shift();
    codesInTabs.push(temp_code);
    log(temp_code + " (runFullyAutomatic) remaining:" + codesQueue.length);
    chrome.tabs.create({url:("https://www.instagram.com/p/"+temp_code), active:false}, function(tab){
      autoTabId = tab.id;
      opening_auto_tab = false;
      log("autoTabId = "+autoTabId);
      automaticTabTimer = Date.now();

      // this doesn't work, maybe it runs too soon
      // chrome.tabs.sendMessage(autoTabId, {setAutoModeTab:true});
    });
  }
}

function addToCount(){
  badgeCount += 1;
  if (fitness && currentState == 'on') {
    internalTotal += 1;
  }
  showBadge(badgeCount);
}
function subToCount(){
  badgeCount -= 1;
  if (fitness && currentState == 'on') {
    internalTotal -= 1;
  }
  showBadge(badgeCount);
}

function resetQueue(){
  codesQueue = [];
  codesInTabs = [];
  autoTabId = null;
  updateLinksLeftForPopup();
}
function resetErrorCodes(){
  error_codes = [];
}

function resetBadge(cc){
  log('RESET BADGE');
  badgeCount = cc;
  showBadge(cc);
}

// reset twice to empty out log_codes
function resetAll(){
  log('RESET ALL');

  resetBadge(0);
  resetErrorCodes();
  resetQueue();
  UpdateLinksInTabs('clear');
}

function showBadge(cc) {
  if (cc == 0 || cc == null) {
    chrome.browserAction.setBadgeText({text:""});
  } else {
    chrome.browserAction.setBadgeText({text:cc.toString()});
    chrome.browserAction.setBadgeBackgroundColor({color: "#005500"});
  }
}

function getAndShowBadge(){
  showBadge(badgeCount);
}





// -- UN-USED --------------------------------------------
function notifyComplete(){
  // Now create the notification
  chrome.notifications.create('reminder', {
    type: 'basic',
    iconUrl: 'na-icon.png',
    title: 'AutoMode Complete',
    message: 'Instalikeit has liked 99 posts'
   }, function(notificationId) {});
}




// -- FOR-DEBUGGING ----------------------------------------
function consoleAllCodes(){
  chrome.storage.local.get(null, function (result) {
    log('chrome.storage.local:');
    console.log(result);
  });
  chrome.storage.sync.get(null, function (result) {
    log('chrome.storage.sync:');
    console.log(result);
  });
}





// -- TESTED ---------------------------------------------
function setNotFit(){
  log("SET NOT FIT");
  fitness = false;
  fitnessTTL = Date.now() - ONE_HOUR;
}

function setDefaultModeAndState(){
  setModeNow('auto');
  setStateNow('off');
  configWatch = true;
}
function setModeNow(new_mode){
  if ((new_mode == 'semi' || new_mode == 'auto') && new_mode != currentMode) {
    log("Set Mode = "+new_mode);
    currentMode = new_mode;
    updateTabsModeState();
    modeStateChanged();
  }
}
function setStateNow(new_state){
  if (!fitness) {
    new_state = 'off';
  } else if (getAnyErrors()){
    new_state = 'off';
  }

  if ((new_state == 'on' || new_state == 'off') && new_state != currentState) {
    log("Set State = "+new_state);
    currentState = new_state;
    updateTabsModeState();

    modeStateChanged();
    ce_icon();
  }
}

// RUNS IF POPUP IS TOGGLED AUTO && ON
function modeStateChanged(){
  // RUN FULLY AUTOMATIC
  if (currentState == 'on' && currentMode == 'auto') {
    runFullyAutomatic();
  }
}
function getStateForRequest(){
  fitness = true;
//  hasToken();
  if (!fitness) {
    setStateNow('off');
    return 'off';
  } else {
    setStateNow(currentState);
    return currentState;
  }
}


// -- MAIN -----------------------------------------------
$(function(){
  setListeners();

  getAndShowBadge();
  setDefaultModeAndState();
  //hasToken(); //
  ce_icon(); // turn off icon

  setTimeout(checkForErrorInAutoTab, TIME_TO_CHECK_FOR_TAB_ERROR);
  log('BACKGROUND READY');
})
