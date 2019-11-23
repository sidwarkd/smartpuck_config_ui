
// Globals ---------------------------------------------------------------------

var base_url = 'http://192.168.0.1/';
var network_list;
var public_key;
var rsa = new RSAKey(); // requires rsa-utils/

var steps = [];

function documentReady(){
  steps = document.getElementById('page-top').getElementsByClassName('wizard-step');
  firstStep = document.getElementById('page-top').getElementsByClassName('first-step')[0];
  hideAllSteps();
  firstStep.style.display = 'block';

  for (var i = 0; i < steps.length; i++) {
    var clickables = getClickablesForStep(steps[i]);
    for (var j = 0; j < clickables.length; j++){
      clickables[j].addEventListener('click', showNextStep);
    }
  }
}

function getClickablesForStep(stepElement){
  return stepElement.getElementsByClassName('clickable');
}

function hideAllSteps(){
  for (var i = 0; i < steps.length; i++) {
    steps[i].style.display = 'none';
  }
}

function showStepByName(name){
  hideAllSteps();
  window.scrollTo(0,0);
  document.getElementById(name).style.display = 'block';
}

function showNextStep(){
  showStepByName(this.getAttribute('attr-goto'));
  var nextStep = document.getElementById(this.getAttribute('attr-goto'));
  var onLoadlFunction = nextStep.getAttribute('attr-onload');
  if (onLoadlFunction !== null){
    eval(onLoadlFunction);
  }
}

// Get important device information
var getDeviceInfo = function() {
  getRequest(base_url+'public-key', public_key_callback);
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

var public_key_callback = {
  success: function(resp){
    console.log('Public key: ' + resp['b']);
    public_key = resp['b'];
    // Pull N and E out of device key and use to set public key
    rsa.setPublic(public_key.substring(58,58+256), public_key.substring(318,318+6));
    getRequest(base_url+'device-id', device_id_callback);
  },
  error: function(error, resp){
    console.log(error);
    showStepByName('puck-comm-error-step');
  }
};

var device_id_callback = {
  success: function(resp){
    var id = resp['id'];
    scan();
    showStepByName('puck-found-step');
  },
  error: function(error, resp){
    console.log(error);
    showStepByName('puck-comm-error-step');
  }
};

var scan = function(){
  console.log('Scanning...!');
  getRequest(base_url+'scan-ap', scan_callback, 8000); // Scan needs a slightly longer timeout than the default
};

var scan_callback = {
  success: function(resp){
    network_list = resp['scans'];
    console.log('I found:');
    var wifi_list_element = document.getElementById('wifi_list');
    wifi_list_element.innerHTML = ''; //start by clearing html
    
    if(network_list.length > 0){
      for(var i=0; i < network_list.length; i++){
        // give each entry a unique id
        var uuid = uuidv4();
        network_list[i]['uuid'] = uuid;
        ssid = network_list[i]['ssid'];
        rssi = network_list[i]['rssi'];
        console.log(network_list[i]);
        add_wifi_option(wifi_list_element, ssid, rssi, uuid);
        // Show password and connect
        document.getElementById('searching-for-wifi').style.display = 'none';
        document.getElementById('wifi_list').style.display = 'block';
      }
    }
    else{
      document.getElementById('networks-div').innerHTML = '<div class="alert alert-danger" role="alert">No networks found. Move the puck closer to your WiFi source and scan again.</div>';
    }
  },

  error: function(error){
    console.log('Scanning error:' + error);
    document.getElementById('networks-div').innerHTML = '<div class="alert alert-danger" role="alert">Dangit! Looks like I lost the connection to your puck. Try moving the puck closer to your WiFi source and <a href=\'javascript:document.location.reload()\'>try again</a>.</div>';
  }
};

var configure = function(){
  // get user input
  var network = get_selected_network();
  var password = document.getElementById('password').value;
  // simple validation
  if(!network){
    window.alert('Oops! You forgot to select a network from the list. Please select one, enter your password, and try again.');
    return false;
  }
  // prep payload
  var jsonData = {
    idx:0,
    ssid: network.ssid,
    sec: network.sec,
    ch: network.ch
  };
  if(network.sec != 0){
	  jsonData.pwd = rsa.encrypt(password);
  }
  // send
  document.getElementById("wifi-connect-button").innerHTML = 'Sending credentials...';
  console.log('Sending credentials: ' + JSON.stringify(jsonData));
  postRequest(base_url+'configure-ap', jsonData, configure_callback);
};

var configure_callback = {
  success: function(resp){
    console.log('Credentials received by the puck. Attempting to connect to the network...');
    //Now connect to the WiFi
    postRequest(base_url+'connect-ap', {idx:0}, connect_callback);
    showStepByName("puck-test-step");
  },
  error: function(error, resp){
    console.log('Error sending credentials to the puck: ' + error);
    window.alert('Something went wrong! Move the puck closer to your WiFi source and try again.');
    document.getElementById("wifi-connect-button").innerHTML = 'Retry';
  }
};

var connect_callback = {
  success: function(resp){
    console.log('Activation of credentials successfully.');

  },
  error: function(error, resp){
    console.log('No response received from credential activation request.');
    console.log(error);
  }

}

// Helper methods --------------------------------------------------------------

var add_wifi_option = function(parent, ssid, strength, uuid){
  var wifi_li = document.createElement('LI');
  wifi_li.onclick = function(){setActiveWiFi(wifi_li)};
  wifi_li.className = "list-group-item d-flex justify-content-between align-items-center wifi-option";
  wifi_li.innerText = ssid;
  wifi_li.id = uuid;
  var signal_strength_badge = document.createElement('SPAN');
  signal_strength_badge.innerHTML = "&nbsp;";
  signal_strength_badge.className = rssiToCssClass(strength);
  signal_strength_badge.title = 'RSSI: ' + strength;
  wifi_li.appendChild(signal_strength_badge);
  parent.appendChild(wifi_li);
};

var get_selected_network = function(){
  // network_list is global
  for(var i=0; i < network_list.length; i++){
    element_id = network_list[i]['uuid'];
    if(document.getElementById(element_id).classList.contains('active')){
      return network_list[i];
    }
  }
};

var toggleShow = function(){
  var passwordInput = document.getElementById('password');
  var passwordShowCheckbox = document.getElementById('showPassword');
  
  if(passwordShowCheckbox.checked){
    passwordInput.type = 'text';
  } else {
    passwordInput.type = 'password';
  }
};

var getRequest = function(url, callback, timeout){
  var xmlhttp = new XMLHttpRequest();
  timeout = typeof timeout !== 'undefined' ? timeout : 5000;
  xmlhttp.open('GET', url, true); //true specifies async
  xmlhttp.timeout = timeout;
  xmlhttp.send();
  xmlhttp.onreadystatechange = function(){
    if (xmlhttp.readyState==4){
      if(callback){
        if(xmlhttp.status==200){
          //Response okay
          if(callback.success){
            callback.success(JSON.parse(xmlhttp.responseText));
          }
        } else {
          //Error
          if(callback.error){
            callback.error(xmlhttp.status, xmlhttp.responseText);
          }
        }
        if (callback.regardless){
          //executed regardless
          callback.regardless();
        }
      }
    }
  };
};

var postRequest = function(url, jsonData, callback){
  var dataString = JSON.stringify(jsonData);
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open('POST', url, true); //true specifies async
  xmlhttp.timeout = 4000;
  xmlhttp.setRequestHeader('Content-Type', 'multipart/form-data');
  xmlhttp.withCredentials = false;
  //console.log('POST: ' + dataString);
  xmlhttp.send(dataString);

  // Handle response
  xmlhttp.onreadystatechange = function(){
    if (xmlhttp.readyState==4){
      if(callback){
        if(xmlhttp.status==200){
          //Response okay
          if(callback.success){
            callback.success(JSON.parse(xmlhttp.responseText));
          }
        } else {
          //Error
          if(callback.error){
            callback.error(xmlhttp.status, xmlhttp.responseText);
          }
        }
        //executed regardless
        if (callback.regardless){
          callback.regardless();
        }
      }
    }
  };
};

function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2]/* .replace(/\+/g, " ")*/); // "+" is important in CC
}

function rssiToCssClass(rssi){
  // -30dBm Amazing
  // -67dBm Very Good
  // -70dBm Okay
  // -80dBm Not Good
  // -90dBm Unusable

  classString = 'badge badge-pill ';
  if (rssi >= -67){
    classString += 'badge-success';
  }
  else if (rssi >= -80){
    classString += 'badge-warning';
  }
  else{
    classString += 'badge-danger';
  }

  return classString;
}

function clearWiFiSelection(){
  wifi_list = document.getElementById('wifi_list').getElementsByTagName('li');
  for (var i = 0; i < wifi_list.length; i++) {
    wifi_list[i].classList.remove('active');
  }
}

function setActiveWiFi(o){
  clearWiFiSelection();
  o.classList.add('active');
}