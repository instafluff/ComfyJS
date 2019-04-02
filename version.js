const fs = require( "fs" );
const pkg = require('./package.json');

const path = __dirname + "/dist/comfy.js";
let contents = fs.readFileSync( path, "utf8" );
contents = contents.replace( /@VERSION/g, pkg.version );
fs.writeFileSync( path, contents, "utf8" );
