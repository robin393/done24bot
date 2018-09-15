var currentState = 'off';
var currentMode = 'semi';
var currentLinksLeft = 0;
var currentErrorMessage;
var currentErrorCode;
var progress_bar;
var modeInfoElement;

function setListeners(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.linksLeft) {
        currentLinksLeft = window.localStorage.getItem('linksLeft');
        log("    LINKS-LEFT: "+currentLinksLeft);
        updateProgressBar();
      }
    }
  );
}


// initial setup of variables
function getStates(){
  chrome.runtime.sendMessage({getStateMode: 'popup'}, function(response) {
    log("GET STATES:");
    log(response);
    if (response.setState == 'on') {
      toggleStateOn();
    }
    currentMode  = response.setMode;
    currentState = response.setState == 'on' ? 'on' : 'off';
    // currentLinksLeft = response.linkCount;
    currentLinksLeft = window.localStorage.getItem('linksLeft');

    if (currentMode == 'semi') {
      setModeSemi();
    } else if (currentMode == 'auto') {
      setModeAuto();
    }
    updateProgressBar();
    console.log(currentMode);
    console.log(currentState);
  });
}

function toggleStateOn(){
  var element = $('#m1_toggle_on_off');
  element.data('state', 'on');
  element.find('span.state').text('On');
  element.find('i').removeClass('fa-toggle-off').addClass('fa-toggle-on');
  currentState = 'on';
}

function toggleState(){
  var element = $('#m1_toggle_on_off');
  var state = element.data('state');
  // log("clicked ["+state+"]");
  if (state == 'off') {
    // log("turning on");
    toggleStateOn();
    chrome.runtime.sendMessage({setState:'on', mode:currentMode});
  } else {
    // log("turning off");
    element.data('state', 'off');
    chrome.runtime.sendMessage({setState:'off', mode:currentMode});
    element.find('span.state').text('Off');
    element.find('i').removeClass('fa-toggle-on').addClass('fa-toggle-off');
    currentState = 'off';
  }

  updateProgressBar();
}


function sendConfigDetails(){
  chrome.runtime.sendMessage({setSettings:'popup',
    config_slow_mode: configSlowMode,
    config_watch: configWatch,
    config_tg2:   configTG2
  });
}

function setSwitchState(element, new_state){
  if (new_state == 'off' || new_state == false) {
    element.data('state', 'off');
    element.find('i').removeClass('fa-toggle-on').addClass('fa-toggle-off');
  } else if (new_state == 'on' || new_state == true) {
    element.data('state', 'on');
    element.find('i').removeClass('fa-toggle-off').addClass('fa-toggle-on');
  }
}

function toggleSlowMode(){
  var element = $('#m2_double');
  var state = element.data('state');
  if (state == 'off') {
    configSlowMode = true;
  } else {
    configSlowMode = false;
  }
  setSwitchState(element, configSlowMode);
  sendConfigDetails();
}
function toggleWatchVideo(){
  var element = $('#m2_wv');
  var state = element.data('state');
  if (state == 'off') {
    configWatch = true;
  } else {
    configWatch = false;
  }
  setSwitchState(element, configWatch);
  sendConfigDetails();
}
function toggleTelegram2(){
  var element = $('#m2_tg2');
  var state = element.data('state');
  if (state == 'off') {
    configTG2 = true;
  } else {
    configTG2 = false;
  }
  setSwitchState(element, configTG2);
  sendConfigDetails();
}



// function toggleAutomatic(){
//   var element = $('#m1_toggle_automatic');
//   var state = element.data('state');
//   // log("clicked ["+state+"]");
//   if (state == 'off') {
//     // log("turning on");
//     element.data('state', 'on').addClass('stronger');
//     chrome.runtime.sendMessage({setAutomatic:'on'});
//     element.find('span.state').text('On');
//     element.find('i').removeClass('fa-toggle-off').addClass('fa-toggle-on');
//     $('#progress_bar').addClass('active');
//   } else {
//     // log("turning off");
//     element.data('state', 'off').removeClass('stronger');
//     chrome.runtime.sendMessage({setAutomatic:'off'});
//     element.find('span.state').text('Off');
//     element.find('i').removeClass('fa-toggle-on').addClass('fa-toggle-off');
//     $('#progress_bar').removeClass('active');
//   }
// }

function setModeState(mode){
  if (mode == 'semi') {
    setModeSemi();
  } else if (mode == 'auto') {
    setModeAuto();
  }
  currentMode = mode;
  if (currentState == 'on') {
    chrome.runtime.sendMessage({setState:'on', mode:currentMode});
  }
  updateProgressBar();
}

function openSettings(){
  $('table.m1, table.m3').hide();
  $('table.m2').show();
}
function openReportForm(){
  if ($('#email').val() === '' ) {
    progressBarWarningMessage('Please provide email address');
  } else {
    $('table.m1, table.m2').hide();
    $('table.m3').show();
  }
}
function sendReport(){
  $('#issue_submit').addClass('disabled').text('sending...');

  chrome.runtime.sendMessage({report:'popup', issue_content:$('#issue_content').val()}, function(x){
    $('#m3_toggle_on_off td').html(x.message);
  });
}

function resetCount(){
  chrome.runtime.sendMessage({count:'reset'});
  window.close();
}

function getEmail(){
  chrome.runtime.sendMessage({getEmail:'please'}, function(x){
    $('#email').val(x.email);
    $('#email_final').html(x.email);
    // $('#token').val(x.token);
    if (!currentErrorMessage){ currentErrorMessage = x.errorMessage;}
    if (x.token){
      $('#need_key').hide();$('#token_exists').show();$('#m2_logout').show();
    } else {
      $('#token_exists').hide();$('#need_key').show();$('#m2_logout').hide();
    }
    log("HERE");
    log(x);
    log(currentErrorMessage);
  });
}
// function setEmail(){
//   log("username CHANGED");
//   chrome.runtime.sendMessage({setEmail:$('#email').val()});
//   getEmail();
// }

function updateData(){
  chrome.runtime.sendMessage({updateData: 'popup'}, function(response) {
    // currentLinksLeft = response.countAutomatic;
    currentLinksLeft = window.localStorage.getItem('linksLeft');
    currentErrorMessage = response.errorMessage;
    currentErrorCode = response.errorCode;

    var element_slow_mode = $('#m2_double');
    if (response.config_slow_mode) {
      configSlowMode = response.config_slow_mode;
    }
    setSwitchState(element_slow_mode, configSlowMode);
    var element_watch = $('#m2_wv');
    if (response.config_watch) {
      configWatch = response.config_watch;
    }
    setSwitchState(element_watch, configWatch);
    var element_tg2 = $('#m2_tg2');
    if (response.config_tg2) {
      configTG2 = response.config_tg2;
    }
    setSwitchState(element_tg2, configTG2);

    updateProgressBar();
  });
}

// force update of the status-bar every 1 sec.
function updateProgressBarWithInterval(){
  updateData();
  setTimeout(updateProgressBarWithInterval, 1000);
}

function progressBarWarningMessage(msg){
  progress_bar.text(msg)
    .addClass('progress-bar-warning')
    .removeClass('progress-bar-striped progress-bar-success progress-bar-danger')
    .css("width","100%");
}

function updateProgressBar(){

  // WARNING
  if (currentErrorCode == 'L0') {
    // log(progress_bar);
    progress_bar.addClass('progress-bar-warning').removeClass('progress-bar-striped progress-bar-success progress-bar-danger').css("width","100%");
    progress_bar.text(currentErrorMessage);

  // ERROR
  } else if (currentErrorMessage != null) {
    // log(progress_bar);
    progress_bar.addClass('progress-bar-danger').removeClass('progress-bar-striped progress-bar-success progress-bar-warning').css("width","100%");
    progress_bar.text(currentErrorMessage);

  // ALL GOOD
  } else {
    progress_bar.addClass('progress-bar-striped progress-bar-success').removeClass('progress-bar-danger progress-bar-warning').css("width","100%");
    if (currentState == 'off') {
      progress_bar.removeClass('active');

      if (currentMode == 'auto' && currentLinksLeft > 0) {
        progress_bar.text('ready ('+currentLinksLeft+' in queue)');
      } else if (currentMode == 'auto') {
        progress_bar.text('ready');
      } else if (currentMode == 'semi') {
        progress_bar.text('ready');
      }

    } else if (currentState == 'on') {
      progress_bar.addClass('active');

      if (currentMode == 'semi') {
        progress_bar.text('running');

      } else if (currentMode == 'auto') {
        if (currentLinksLeft > 0){
          progress_bar.text(currentLinksLeft+" in queue").css("width",Math.max((100-currentLinksLeft),30)+"%")
        } else {
          progress_bar.text("running")
        }
      }
    }
  }
}

function authenticateForm(){
  log("Auth FORM");
  log($(this).attr('id'));
  // getEmail();

  var email = $('#email').val();
  chrome.runtime.sendMessage({setEmail:email});

  if(email != "" && $('#instalikeitall_key').val() != ""){
    chrome.runtime.sendMessage({authenticateForm: 'popup', email:email, password:$('#instalikeitall_key').val(), version:VERSION});
  }

  window.close();
}

function setModeSemi(){
  $('#mode-semi').addClass("btn-success").removeClass("btn-default");
  $('#mode-auto').removeClass("btn-success").addClass("btn-default");
  if (currentMode != 'semi') {
    log("SEND MESSAGE - SetMode = SEMI");
    chrome.runtime.sendMessage({setMode:'semi'});
    currentMode = 'semi';
  }
  setModeInfo();
}

function setModeAuto(){
  $('#mode-semi').removeClass("btn-success").addClass("btn-default");
  $('#mode-auto').addClass("btn-success").removeClass("btn-default");
  if (currentMode != 'auto') {
    log("SEND MESSAGE - SetMode = AUTO");
    chrome.runtime.sendMessage({setMode:'auto'});
    currentMode = 'auto';
  }
  setModeInfo();
}

function toggleModeInfo(){
  log("TOGGLE "+modeInfoElement.data('state'));
  if (modeInfoElement.data('state') == 'on') {
    modeInfoElement.data('state', 'off');
  } else {
    modeInfoElement.data('state', 'on');
  }

 setModeInfo();
}
function setModeInfo(){
  if (modeInfoElement.data('state') == 'on') {
    if (currentMode == 'auto') {
      $('#collapseAutoMode').collapse('show');
      $('#collapseSemiMode').collapse('hide');
    } else if (currentMode == 'semi') {
      $('#collapseAutoMode').collapse('hide');
      $('#collapseSemiMode').collapse('show');
    }
  } else {
    $('#collapseAutoMode').collapse('hide');
    $('#collapseSemiMode').collapse('hide');
  }
}

function logout(){
  chrome.runtime.sendMessage({logout:'reset'});
  window.close();

  $('#email').val(null);
  $('#email_final').html(null);
  $('#token').val(null);

  $('#m2_logout').hide();
  $('#token_exists').hide();
  $('#need_key').show();
}

$(function() {
  setListeners();

  progress_bar = $('#progress_bar');
  modeInfoElement = $('#modeInfo');

  // get persisted data
  getStates();
  //getEmail();

  currentErrorCode = 'L0'; //temp set

  // inital setup of data
  updateData();

  // toggle likes (enable/disable script)
  $('#m1_toggle_on_off').click(toggleState);

  // open settings,
  $('#m1_settings').click(openSettings);

  // log out
  $('#m2_logout').click(logout);
  // reset count
  $('#m2_reset_count').click(resetCount);
  // // rate us
  // $('#m2_rate_us').click(function(){$("#rate-us").click()});
  // report
  $('#m2_report').click(openReportForm);
  $('#issue_submit').click(sendReport);

  // $('#email').change(setEmail);
  $('#email, #instalikeitall_key, #login_submit').change(authenticateForm);
  $('#login_submit').on('click', authenticateForm);

  // SETTINGS > Slow | Watch | TG2
  $('#m2_double').click(toggleSlowMode);
  $('#m2_wv').click(toggleWatchVideo);
  $('#m2_tg2').click(toggleTelegram2);


  // MODE SELECT
  $('#mode-semi').click(function(){setModeState('semi')});
  $('#mode-auto').click(function(){setModeState('auto')});
  // Show Mode Info
  modeInfoElement.click(toggleModeInfo);

  // workaround to get window display properly
  // setTimeout(function(){
  //   $('body').css('width', '250px').show();
  // }, 100);

  $('#version').text("(v"+VERSION+")");
}, true);
