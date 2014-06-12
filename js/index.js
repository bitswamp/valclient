var net = require('net'),
	fs = require('fs'),
	sjcl = require('sjcl');

var $prompt = $('#prompt');
var $output = $('#output');

var $server = $('#server');
var $port = $('#port');
var $username = $('#username');
var $password = $('#pw');
var $connect = $("#connect-button");

var discod = false;

var config = null;
if (fs.existsSync('./config.json')) {
	config = require('./config.json');

	$server.val(config.server || '');
	$port.val(config.port || '');
	$username.val(config.username || '');
	if (config.password) {
		$password.val(sjcl.decrypt("test", config.password));
		$("#remember").prop("checked", true);
		allowConnect();
	}
}

function allowConnect() {
	if ($username.val().length && $password.val().length)
		$connect.prop("disabled", false);
	else
		$connect.prop("disabled", true);
}

var inputEvents = ["change", "keyup", "paste"];
for (var i in inputEvents) {
	$username.on(inputEvents[i], allowConnect);
	$password.on(inputEvents[i], allowConnect);
}

var mud;
var counter = 0;
var sessionCounter = 0;
var scroll = false;

function pad (str, max, chr) {
  if (typeof chr === "undefined")
  	chr = " ";
  str = str.toString();
  return str.length < max ? pad("" + chr + str, max) : str;
}

function login(username, password) {
	return function(data) {
		if (counter === 2) {
			console.log('Login: ');
			mud.write(username + '\n');
			console.log(username);
		}
		if (counter === 3)
			mud.write(password + '\n');
		if (counter === 4 && data.toString().indexOf('[Press ENTER to continue]') > -1)
			mud.write('\n');
		if (counter > 4) {
			mud.removeListener('data', login);
			console.log('Login done');
		}
	}
}

function disconnected() {
	if (!discod) {
		console.log('Disconnected');
		display('*** Disconnected ***');
		$('#connect-panel').slideDown();
		discod = true;
	}
}

function display(data) {
	// format message and suppress if empty
	data = data.toString().split('\n');
	// strip prompt
	if (data[data.length-1].indexOf('>') > -1) data.pop();
	var lines = data.length;
	data = data.join('\n').trim();
	if (!data.length) return;

	// timestamp
	var date = new Date();
	var time = '' + pad(date.getHours(), 2, 0) + ':' + pad(date.getMinutes(), 2, 0);

	counter++;
	var msg = document.createElement('pre');
	msg.id = '' + sessionCounter + '-' + counter;
	if (counter % 2) msg.className = 'odd';

	$(msg).attr('data-time', time)
		.attr('data-lines', lines)
		.html(data).appendTo($output);
	if (scroll) {
		console.log('scroll');
		$('html, body').animate({ scrollTop: $("#" + msg.id).offset().top }, 200);
	}
}

$('#connect-form').on("submit", function(e) {
	e.preventDefault();
	
	var server = $server.val();
	var port = $port.val();
	var username = $username.val();
	var password = $password.val();

	mud = net.connect({
		host: server,
		port: port
	}, function() {
		$('#connect-panel').slideUp();
		$prompt.focus();
	})

	config = {};
	config.server = server;
	config.port = port;
	if ($("#remember").prop("checked")) {
		config.username = username;
		config.password = sjcl.encrypt("test", password);
	} else {
		setTimeout(function() {
			$username.val('');
			$password.val('');
		}, 30 * 1000) // delete after 30s in case of timeouts
	}

	fs.writeFile('./config.json', JSON.stringify(config), function(err) {
		if (err) console.log(err);
		else console.log("Saved");
	})

	discod = false;

	counter = 0;
	sessionCounter++;

	mud.on('data', display);
	mud.on('data', login(username, password));

	mud.on('end', disconnected);
	mud.on('close', disconnected);
	mud.on('timeout', function() {
		mud.end();
		disconnected();
	});

	$prompt.focus();
});

var cursor = 0;
var history = [];

$('#prompt-form').on('click', function(e) {
	$prompt.focus();
});

$('#prompt-form').on('submit', function(e) {
	e.preventDefault();

	var cmd = $prompt.val();
	mud.write(cmd + '\n');
	history.unshift(cmd);
	if (history.length > 100)
		history.pop();

	$prompt.val('');
	cursor = 0;
});

$prompt.jkey('up, down', function(key) {
	//console.log(key);
	var direction = key === 'up' ? 1 : -1;
	cursor = Math.max(cursor + direction, 1);
	cursor = Math.min(cursor, history.length);
	//console.log(cursor);
	$prompt.val(history[cursor-1]);
});

$prompt.jkey('esc', function() {
	$prompt.val('');
	cursor = 0;
});

$(window).scroll(function() {
  if($(window).scrollTop() + $(window).height() > $(document).height() - 20) {
  	console.log('bottom');
  	scroll = true;
  }
});