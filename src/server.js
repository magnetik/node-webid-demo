var https = require('https'); 
var util = require('util'); 
var fs = require('fs'); 

var _ = require('underscore')._;

var webid = require('webid');

var jade = require('jade');

function renderJadeFile(template,options) {
	var fn = jade.compile(template, options);
	return fn(options.locals);
}

// Getting configuration
var configuration = require("./configuration");
if (configuration.earl) {
	var earl = require('./earlWebID');
}

var options = {   key: fs.readFileSync('./ssl/privatekey.pem'),   
                  cert: fs.readFileSync('./ssl/certificate.pem'),   
                  requestCert: true }; 

var profilePage = function(profile) {
    var html = "<html><head><title>Success: "+profile.toArray()[0].subject.valueOf()+"</title></head><body>"

    var depiction = profile.filter(function(t){ return t.predicate.equals("http://xmlns.com/foaf/0.1/depiction") }).toArray();
    if(depiction.length === 1) {
        depiction = depiction[0].object.valueOf();
    } else {
        depiction = "#";
    }
    var familyName = profile.filter(function(t){ return t.predicate.equals("http://xmlns.com/foaf/0.1/family_name") }).toArray();
    if(familyName.length === 1) {
        familyName = familyName[0].object.valueOf();
    } else {
        familyName = "";
    }

    var givenName = profile.filter(function(t){ return t.predicate.equals("http://xmlns.com/foaf/0.1/givenname") }).toArray();
    if(givenName.length === 1) {
        givenName = givenName[0].object.valueOf();
    } else {
        givenName = "";
    }

    var nick = profile.filter(function(t){ return t.predicate.equals("http://xmlns.com/foaf/0.1/nick") }).toArray();
    if(nick.length === 1) {
        nick = nick[0].object.valueOf();
    } else {
        nick = "";
    }

    var homepage = profile.filter(function(t){ return t.predicate.equals("http://xmlns.com/foaf/0.1/homepage") }).toArray();
    if(homepage.length === 1) {
        homepage = homepage[0].object.valueOf();
    } else {
        homepage = "";
    }

    html = html + "<p><img src='"+depiction+"'></img>";
    html = html + "<a href='"+homepage+"'>"+givenName+" "+familyName+" ("+nick+")</a></p>";

    html = html + "</body></html>";
    return html

};
// Init earl File
if (configuration.earl) {
    var earlWebID = new earl.earlWebid();
}

console.log("trying to create server at "+configuration.port);

https.createServer(options,function (req, res) { 
    if(req.url == "/login") {
        try {
            var certificate = req.connection.getPeerCertificate();
            if(!_.isEmpty(certificate)) {
                if (configuration.earl) { earlWebID.certificateProvided(true); }
                var verifAgent = new webid.VerificationAgent(certificate);
                verifAgent.verify(function(profileGraph){
                    res.writeHead(200,{"Content-Type":"text/html"});
                    res.write(profilePage(profileGraph));
                    res.end();
				});
            } else {
				if (configuration.earl) { earlWebID.certificateProvided(false); }
                throw new Error("Certificate not provided");
            }
        } catch(e) {
			var path = 'src/template/error.jade';
			var options = {
				filename: path
			};
			var locals = {
				title : 'Error',
                error : e.message
			};
			res.writeHead(500,{"Content-Type":"text/html"});
			var fn = jade.compile(fs.readFileSync('src/template/error.jade'), options);
			
			res.write(fn(locals));
			res.end();
        }
    } else {
        res.writeHead(200,{"Content-Type":"text/html"});
        var html = "<html><head><title>WebID node.js Demo</title></head><body>"
        html = html+ "<p>This is a demo implementation of <a href='http://www.w3.org/2005/Incubator/webid/spec/'>WebID</a> running on <a href='http://nodejs.org/'>node.js</a>.</p><p>Click <a href='/login'><b>here</b></a> to log in using WebID.</p>"
        html = html + "<p>You can get your WebID in a provider like <a href='http://foaf.me/index.php'>this one</a> or create your own.<br/>"
        html = html + "<a href='http://www.w3.org/wiki/WebID'>This W3C wiki page</a> is a good place to learn more about WebID and why you should care about it</p></body></html>";

        res.write(html);
		res.end();
    }
}).listen(configuration.port);

console.log("server running at "+configuration.port);
