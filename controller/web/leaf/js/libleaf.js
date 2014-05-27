
// polyfill convenience methods
if ( Math.randomInt === undefined ) {
  Math.randomInt = function( inclusiveUpperbound ) {
    return Math.round( Math.random() * inclusiveUpperbound );
  };
}
if ( Math.sign === undefined ) {
  Math.sign = function( float ) {
    return float > 0 ? 1 : float == 0 ? 0 : -1;
  };
}

// if a hexadecimal mac address string is short (IE: < 12 characters), prepend zeroes
String.prototype.padMacAddressString = function() {
    if ( this.length < 12 ) {
        var pad = "";
        for ( var i = 0; i < 12 - this.length; i++ ) {
            pad += "0";
        }
        return pad + this;
    }
    return this;
}

// given a mac address formatted as an integer, return a readable (NN:NN:NN:NN:NN:NN) address
prettyPrintMac = function( mac ) {
    return mac.toString( 16 ).padMacAddressString().split( "" ).map( function( char, index, arr ) {
        if ( index % 2 != 0 )
            return char + ":";
        else if ( index == arr.length && index == 10 )
            return char + "0"; //compensate for trailing 0
        else return char;
    } ).join( "" ).slice( 0, -1 );
}

var parseMACHex = function(s) {
    return parseInt(s.split(":").join(""),16);
};

var ipToOctets = function(x) {
    return [ (x>>>24) % 256, (x>>>16) % 256, (x>>>8) % 256, x % 256];
};