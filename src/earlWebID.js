var earl = require('earl');

var earlWebid = function(options) {
	// Inheritance 
	earl.EarlDocument.call(this,options);
		
    // Adding namespace
    this.setPrefix("wit", "http://purl.org/dc/terms/");
    
    // Initialise tests
    // TODO: could be load from a rdf file into our graph
    this.addAssertion(":assert1", ":certificate", "wit:certificateProvided");
    this.addAssertion(":assert2", ":certificate", "wit:certificateProvidedSAN");
    this.addAssertion(":assert3", ":certificate", "wit:webidAuthentication")
    

};
earlWebid.prototype.__proto__ = earl.EarlDocument.prototype;

earlWebid.prototype.certificateProvided = function(result) {
    if (result) { this.getAssertion(":assert1").passed(); }
    else { this.getAssertion(":assert1").failed(); }
}

earlWebid.prototype.certificateProvided = function(result) {
    if (result) { this.getAssertion(":assert1").passed(); }
    else { this.getAssertion(":assert1").failed(); }
}

// Expose class to the world
exports.earlWebid = earlWebid;