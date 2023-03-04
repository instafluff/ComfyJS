const fs = require( "fs" );
const pkg = require('./package.json');

function findReplaceVersion( file ) {
    let contents = fs.readFileSync( file, "utf8" );
    contents = contents.replace( /@VERSION/g, pkg.version );
    fs.writeFileSync( file, contents, "utf8" );
}

const files = fs.readdirSync( `${__dirname}/dist` );
files.forEach( file => {
    console.log( "Replacing version in", file );
    findReplaceVersion( `${__dirname}/dist/${file}` );
});
