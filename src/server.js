var https = require('https');
var util = require('util');
var fs = require('fs');
var path = require('path');

var _ = require('underscore')._;
var express = require('express');
var jade = require('jade');

var webid = require('webid');

// Getting configuration
var configuration = require("./configuration");

var options = {
    key: fs.readFileSync('./ssl/privatekey.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem'),
    requestCert: true
};
var sendError = function (res, message) {
    res.render('error.jade', {title: 'Error', error: message});
};

console.log("trying to create server at " + configuration.port);

var listMessages = {
                    'http://webid.fcns.eu/people/Example/card#me' : [
                                                                    "Coucou",
                                                                    "Toto"
                                                                    ],
                    'http://fcns.eu/people/tintin/card#me' :    [
                                                                    "Je suis Tintin, et je laisse des messages idiots sur mon mur !",
                                                                    "Hello world !"
                                                                ]
                    };

listMessages['http://webid.fcns.eu/people/Example/card#me'];

var app = require('express').createServer(options);

// configure Express
app.configure(function() {
  app.set('views',path.join(__dirname,'/template'));
  app.set('view options', {
    layout: false
  });
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'a big secret' }));
  app.use(app.router);
  app.use(express.static(path.join(__dirname,'template','static')));
});

app.get('/login', function(req, res){
    try {
        // Ask for user cretificate
        var certificate = req.connection.getPeerCertificate();
        if (!_.isEmpty(certificate)) {
            // If the user provite a certificate, verify it
            var verifAgent = new webid.VerificationAgent(certificate);
            verifAgent.verify(function (success, result) {
                if (success) {
                    req.session.identified = true;
                    var foaf = new webid.Foaf(result);
                    var foafFile = foaf.parse();
                    req.session.foafFile = foafFile;
                    res.render('profile.jade', foafFile);
                } else {
                    switch (result) {
                    case 'certificateProvidedSAN':
                        var message = 'No valide Certificate Alternative Name in your certificate';
                        break;
                    case 'profileWellFormed':
                        var message = 'Can\'t load your foaf file (RDF may not be valid)';
                        break;
                    case 'falseWebID':
                        var message = 'Your certificate public key is not the one of the FOAF file';
                        break;
                    case 'profileAllKeysWellFormed':
                        var message = "Missformed WebID";
                        break;
                    default:
                        var message = "Unknown WebID error";
                        break;
                    }
                    sendError(res, message);
                }

            });
        } else {
            throw new Error("Certificate not provided");
        }
    } catch (e) {
        sendError(res, e.message);
    }
});

app.get('/wall', function(req, res) {
    if (req.session.identified == true) {
        var me = req.session.foafFile;
        var personalMessage = [];
        _.each(me.knows, function(person) {
            // Chercher dans la base de donnée les messages de "person"
            var messages = _.flatten(listMessages[person]);
            _.each(messages, function(mess) {
                personalMessage.push(mess);
            });

        });
        res.render('wall.jade', { title: "Wall", messages: personalMessage });
    }
    else {
        res.redirect("/login");
    }
});

app.get('/', function(req, res) {
    res.render('index.jade', { title: "Home" });
});

app.listen(configuration.port);

console.log("server running at " + configuration.port);