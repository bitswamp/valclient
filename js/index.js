var net = require('net');
var fs = require('fs');

var $prompt = $('#prompt');
var $output = $('#output');

var $username = $('#username');
var $password = $('#pw');
var $connect = $("#connect-button");

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

function login(data) {
	console.log('login');
	if (counter === 2) {
		mud.write($('#username').val() + '\n');
		console.log($('#username').val());
	}
	if (counter === 3)
		mud.write($('#pw').val() + '\n');
	if (counter === 4 && data.toString().indexOf('[Press ENTER to continue]') > -1)
		mud.write('\n');
	if (counter > 4) {
		mud.removeListener('data', login);
		console.log('removed');
	}
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
	
	var server = $('#server').val();
	var port = $('#port').val();

	mud = net.connect({
		host: server,
		port: port
	}, function() {
		$('#connect-panel').slideUp();
		$prompt.focus();
	})

	counter = 0;
	mud.on('data', display);
	mud.on('data', login);
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