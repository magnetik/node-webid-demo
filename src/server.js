var https = require('https');
var util = require('util');
var fs = require('fs');
var path = require('path');

var _ = require('underscore')._;

var webid = require('webid');

var jade = require('jade');

// Getting configuration
var configuration = require("./configuration");
if (configuration.earl) {
    var earl = require('./earlWebID');
}

var options = {
    key: fs.readFileSync('./ssl/privatekey.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem'),
    requestCert: true
};



var sendPage = function (res, code, path, locals) {
        var options = {
            filename: path
        };
        res.writeHead(code, {
            "Content-Type": "text/html"
        });
        var fn = jade.compile(fs.readFileSync(path), options);

        res.write(fn(locals));
        res.end();
    };
var sendError = function (res, message) {
        var path = 'src/template/error.jade';

        var locals = {
            title: 'Error',
            error: message
        };

        sendPage(res, 500, path, locals);
    };

// Init earl File
if (configuration.earl) {
    var earlWebID = new earl.earlWebid();
}

console.log("trying to create server at " + configuration.port);

https.createServer(options, function (req, res) {
    var urlSplited = req.url.split('/');
    // Main login phase
    if (urlSplited[1] == 'login') {
        try {
            // Ask for user cretificate
            var certificate = req.connection.getPeerCertificate();
            if (!_.isEmpty(certificate)) {
                // If the user provite a certificate, verify it
                if (configuration.earl) {
                    earlWebID.certificateProvided(true);
                }
                var verifAgent = new webid.VerificationAgent(certificate);
                verifAgent.verify(function (success, result) {
                    if (success) {
                        var foaf = new webid.Foaf(result);
                        sendPage(res, 200, "src/template/profile.jade", foaf.parse());
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
                if (configuration.earl) {
                    earlWebID.certificateProvided(false);
                }
                throw new Error("Certificate not provided");
            }
        } catch (e) {
            sendError(res, e.message);
        }
    }
    // Serving static files
    else if (urlSplited[1] == 'static') {
        var filename = path.join(__dirname, 'template', req.url);
        path.exists(filename, function (exists) {
            if (!exists) {
                res.writeHead(404, {"Content-Type": "text/plain"});
                res.write("Four Oh Four! Wherefour art thou?");
                res.end();
                return;
            }
            fs.readFile(filename, "binary", function (err, file) {
                if (err) {
                    sendError(res, err);
                    return;
                }
                res.writeHead(200);
                res.write(file, "binary");
                res.end();
            });
        });
    } else {
        res.writeHead(200, {
            "Content-Type": "text/html"
        });
        var html = "<html><head><title>WebID node.js Demo</title></head><body>"
        html = html + "<p>This is a demo implementation of <a href='http://www.w3.org/2005/Incubator/webid/spec/'>WebID</a> running on <a href='http://nodejs.org/'>node.js</a>.</p><p>Click <a href='/login'><b>here</b></a> to log in using WebID.</p>"
        html = html + "<p>You can get your WebID in a provider like <a href='http://foaf.me/index.php'>this one</a> or create your own.<br/>"
        html = html + "<a href='http://www.w3.org/wiki/WebID'>This W3C wiki page</a> is a good place to learn more about WebID and why you should care about it</p></body></html>";

        res.write(html);
        res.end();
    }
}).listen(configuration.port);

console.log("server running at " + configuration.port);