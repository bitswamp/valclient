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

var config = null;
if (fs.existsSync('./config.json')) {
	config = require('./config.json');

	$server.val(config.server || '');
	$port.val(config.port || '');
	$username.val(config.username || '');
	if (config.password)
		$password.val(sjcl.decrypt("test", config.password));
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

var mud, counter;
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
	display("*** Disconnected ***");
	$('#connect-panel').slideDown();
}

function display(data) {
	counter++;
	var msg = document.createElement('pre');
	var date = new Date();
	var time = '' + pad(date.getHours(), 2, 0) + ':' + pad(date.getMinutes(), 2, 0);
	msg.id = counter;
	if (counter % 2)
		msg.className = 'odd';
	data = data.toString().split('\n');
	data.pop();
	var lines = data.length;
	data = data.join('\n').trim();
	if (!data.length) return;
	$(msg).attr('data-time', time)
		.attr('data-lines', lines)
		.html(data).appendTo($output);
	if (scroll) {
		console.log('scroll');
		$('html, body').animate({ scrollTop: $("#" + counter).offset().top }, 200);
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

	counter = 0;
	mud.on('data', display);
	mud.on('data', login(username, password));

	mud.on('end', disconnected);
	mud.on('close', disconnected);
	mud.on('timeout', function() {
		mud.end();
		disconnected();
	});
});

$('#prompt-form').on('submit', function(e) {
	e.preventDefault();
	mud.write($prompt.val() + '\n');
	$prompt.val('');
})

$(window).scroll(function() {
  if($(window).scrollTop() + $(window).height() > $(document).height() - 20) {
  	console.log('bottom');
  	scroll = true;
  }
});