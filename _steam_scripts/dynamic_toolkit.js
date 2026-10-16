/**
  General HTML5 type tools. Functionality provided here should be provided by other means
*/

/*<script>*/

window.ValveHTML5ToolKit = {};

/**
 * For supported browsers, hooks in progress monitoring
 */
( function AddXhrProgressEvent( $ ) {
	var originalXhr = $.ajaxSettings.xhr;
	$.ajaxSetup(
		{
			download_progress: function() {  },
			upload_progress: function() {  },
			xhr: function() {
				var req = originalXhr(), that = this;
				if ( req ) {
					if (typeof req.addEventListener == "function") {
						req.addEventListener( "progress", function( e ) {
							that.download_progress( e );
						}, false );
					}

					if ( typeof req.upload === 'object' && typeof req.upload.addEventListener === 'function' )
					{
						req.upload.addEventListener( "progress", function( e )
						{
							that.upload_progress( e );
						}, false );
					}
				}
				return req;
			}
		} );
} )( jQuery );

// Loads a list of languages we understand
var validLanguages = ["english","german","french","italian","koreana","spanish","schinese","tchinese","russian","thai","japanese","portuguese","polish","danish","dutch","finnish","norwegian","swedish","hungarian","czech","romanian","turkish","arabic","brazilian","bulgarian","greek","ukrainian","vietnamese","latam","sc_schinese","indonesian","malay"];

// Support other non-ambiguous language tags
var fnLangMap =
{
	"en": "english",
	"portuguesebr": "brazilian",
	"korean": "koreana",
	"portuguese-br": "brazilian"
};

for ( var i = 0; i < validLanguages.length; i++ )
{
	fnLangMap[validLanguages[i]] = validLanguages[i];
}

function InferHtmlTags( text )
{
	var startingBulletCharacterCodes = [ "*".charCodeAt(0), "-".charCodeAt(0), "+".charCodeAt(0), 9642 /* Square bullet */, 8226 ];
	var bulletMap = {};

	for ( var i = 0; i < startingBulletCharacterCodes.length; i++ )
	{
		bulletMap[startingBulletCharacterCodes[i]] = true;
	}

	var arrayOfLines = text.split("\n");

	var outputHtmlArray = [];



	var inParagraph = false;

	for ( var i  = 0; i < arrayOfLines.length; i++ )
	{
		if ( bulletMap[arrayOfLines[i].charCodeAt( 0 )] )
		{
			if (inParagraph)
				outputHtmlArray.push( "</p>\n" );

			inParagraph = false;

			outputHtmlArray.push( "<ul>\n" );
			while ( i < arrayOfLines.length && bulletMap[arrayOfLines[i].charCodeAt( 0 )] )
			{
				outputHtmlArray.push( "<li>" );
				outputHtmlArray.push( arrayOfLines[i].substring(1) );
				outputHtmlArray.push( "\n" );

				i++;
			}
			i--;
			outputHtmlArray.push( "</ul>\n" );
		}
		else if ( /^\s*$/.test(arrayOfLines[i]) )
		{
			if (inParagraph)
				outputHtmlArray.push( "</p>\n" );

			inParagraph = false;
			outputHtmlArray.push( "\n" );
		}
		else
		{
			if ( !inParagraph )
			{
				// Simple heuristic to detect a header element
				if ( arrayOfLines[i].length < 30 ||
					( !arrayOfLines[i].match(/[a-z]/) && arrayOfLines[i].length < 50 ) ||
					( !arrayOfLines[i].match(/:\s*$/) && arrayOfLines[i].length < 50 ) )
				{
					var outputHeader = arrayOfLines[i].replace(/:\s*$/,'');

					var newHeader = [];

					var words = outputHeader.split(" ");

					newHeader.push( words[0].charAt(0).toUpperCase() );
					newHeader.push( words[0].substring(1).toLowerCase() );

					for ( var j = 1; j < words.length; j++ )
					{
						var word = words[j].toLowerCase();
						newHeader.push(" ");

						if ( /to|the|and/.test( word ) )
						{
							newHeader.push( word );
						} else {
							newHeader.push( word.charAt(0).toUpperCase() );
							newHeader.push( word.substring(1) );
						}
					}

					outputHtmlArray.push("<h2>");
					outputHtmlArray.push(newHeader.join(''));
					outputHtmlArray.push("</h2>\n");

					continue;
				}
				else
				{
					outputHtmlArray.push( "<p>" );
				}
			}


			inParagraph = true;

			outputHtmlArray.push( arrayOfLines[i] );
			outputHtmlArray.push( "\n" );
		}
	}

	return outputHtmlArray.join('');
}

function InferBBCode( text )
{
	var startingBulletCharacterCodes = [ "*".charCodeAt(0), "-".charCodeAt(0), "+".charCodeAt(0), 9642 /* Square bullet */, 8226 ];
	var bulletMap = {};

	for ( var i = 0; i < startingBulletCharacterCodes.length; i++ )
	{
		bulletMap[startingBulletCharacterCodes[i]] = true;
	}

	var arrayOfLines = text.split("\n");

	var outputHtmlArray = [];

	var inParagraph = false;

	for ( var i  = 0; i < arrayOfLines.length; i++ )
	{
		if ( bulletMap[arrayOfLines[i].charCodeAt( 0 )] )
		{

			inParagraph = false;

			outputHtmlArray.push( "[list]\n" );
			while ( i < arrayOfLines.length && bulletMap[arrayOfLines[i].charCodeAt( 0 )] )
			{
				outputHtmlArray.push( "[*]" );
				outputHtmlArray.push( arrayOfLines[i].substring(1) );
				outputHtmlArray.push( "\n" );

				i++;
			}
			i--;
			outputHtmlArray.push( "[/list]\n" );
		}
		else if ( /^\s*$/.test(arrayOfLines[i]) )
		{

			inParagraph = false;
			outputHtmlArray.push( "\n" );
		}
		else
		{
			if ( !inParagraph )
			{
				// Simple heuristic to detect a header element
				if ( arrayOfLines[i].length < 30 ||
					( !arrayOfLines[i].match(/[a-z]/) && arrayOfLines[i].length < 50 ) ||
					( !arrayOfLines[i].match(/:\s*$/) && arrayOfLines[i].length < 50 ) )
				{
					var outputHeader = arrayOfLines[i].replace(/:\s*$/,'');

					var newHeader = [];

					var words = outputHeader.split(" ");

					newHeader.push( words[0].charAt(0).toUpperCase() );
					newHeader.push( words[0].substring(1).toLowerCase() );

					for ( var j = 1; j < words.length; j++ )
					{
						var word = words[j].toLowerCase();
						newHeader.push(" ");

						if ( /to|the|and/.test( word ) )
						{
							newHeader.push( word );
						} else {
							newHeader.push( word.charAt(0).toUpperCase() );
							newHeader.push( word.substring(1) );
						}
					}

					outputHtmlArray.push("[h2]");
					outputHtmlArray.push(newHeader.join(''));
					outputHtmlArray.push("[/h2]\n");

					continue;
				}
			}


			inParagraph = true;

			outputHtmlArray.push( arrayOfLines[i] );
			outputHtmlArray.push( "\n" );
		}
	}

	return outputHtmlArray.join('');
}

function AddDropZone( target, dropCallBack )
{

	// Use the precense of FileReader as an indication that drag and drop of files will be supported
	if ( typeof( window.FileReader ) === 'undefined' )
	{
		return false;
	}

	var $ = jQuery;
	var t = $( target );

	t.prepend( "<div class='toolkit_html5_dropzone_indicator'>Drop files for upload</div>" );
	t.prepend( "<div class='toolkit_html5_dropzone_status'></div>" );
	t.prepend( "<div class='toolkit_html5_dropzone_errors'></div>" );
	t.prepend( "<div class='toolkit_html5_dropzone_progress'></div>" );

	t.bind( 'dragenter',
		function( e )
		{
			if ( !t.children( ".toolkit_html5_dropzone_indicator" ).is(':visible') )
			{
				e.stopPropagation();
				e.preventDefault();
				t.children( ".toolkit_html5_dropzone_indicator" ).show( "blind", {}, 500 );
			}
		} );

	t.bind( 'dragover',
		function( e )
		{
			e.stopPropagation();
			e.preventDefault();
		} );

	t.bind( 'dragleave',
		function( e )
		{
			e.stopPropagation();
			e.preventDefault();
			t.children( ".toolkit_html5_dropzone_indicator" ).hide( "blind", {}, 500 );
		} );


	t.bind( 'drop',
		function( e )
		{
			e.stopPropagation();
			e.preventDefault();
			t.children( ".toolkit_html5_dropzone_indicator" ).hide( "blind", {}, 500 );
			dropCallBack.call( this, e.originalEvent.dataTransfer.files );
		} );
}

function DataURItoBlob( dataURI )
{
	var splitpoint = dataURI.indexOf( ',' );
	var binary = atob( dataURI.slice( splitpoint + 1 ) );
	var mimetype = dataURI.slice( 5, splitpoint ).split( ';' )[ 0 ];
	var array = [];
	for(var i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	return new Blob([new Uint8Array(array)], {type: mimetype});
}

function AppendImageToFormData( fd, key, filename, img )
{
	var data = img.src;
	if ( data.slice( 0, 10 ) !== 'data:image' )
	{
		var can = jQuery("<canvas/>")[0];
		var ctx = can.getContext('2d');
		ctx.canvas.width = img.width;
		ctx.canvas.height = img.height;
		ctx.drawImage(img, 0, 0);
		data = can.toDataURL( "image/png" );
	}
	var blob = DataURItoBlob( data );
	fd.append( key, blob, filename );
}

function EnableFileDrop( target, langToId, postDestination, completeDestination, strDefaultLang )
{
	if ( !strDefaultLang )
		strDefaultLang = "english";

	// for back compat with marketing messages
	var $J = jQuery;
	$Form = $J( '<form/>', {action: postDestination, method: 'POST', enctype: 'multipart/form-data'} );
	$Form.append( $J('<input/>', {type: 'hidden', name: 'action', value: 'update' } ) );
	$Form.append( $J('<input/>', {type: 'hidden', name: 'sessionid', value: g_sessionID } ) );
	$Form.append( $J('<input/>', {type: 'hidden', name: 'is_file_drop', value: '1' } ) );
	EnableFileDropForm( target, langToId, $Form, completeDestination, strDefaultLang );
}

// this will append the files to the form passed in and then submit the form via AJAX.
//	if you don't have a form on the page you want to submit, see EnableFileDrop() above
function EnableFileDropForm( target, langToId, $Form, completeDestination, strDefaultLang = "english" )
{
	target = target.replace("|","\\|");

	// Use the precense of FileReader as an indication that drag and drop of files will be supported
	if ( typeof( window.FileReader ) === 'undefined' )
	{
		return false;
	}

	var $ = jQuery;
	var t = $( target );

	AddDropZone( target, (function( files )	{

			var fd = new FormData( $Form[0] );
			var postDestination = $Form.attr( 'action' );

			for ( var i = 0; i < files.length; i++ )
			{
				var file = files[i];
				var path = file.name;
				var parts = path.split("_");
				var lang = parts[parts.length - 1];
				lang = lang.split(".")[0];
				lang = lang.toLowerCase();

				lang = fnLangMap[lang];

				if ( lang === undefined && files.length > 1 )
				{
					t.children( '.toolkit_html5_dropzone_errors' ).show().append( "Couldn't understand language tag in " + file.name + "<br>" );
				}
				else
				{
					if ( lang === undefined )
						lang = strDefaultLang;

					t.children( '.toolkit_html5_dropzone_status' ).show().append( "Uploading " + file.name + "<br>" );
					fd.append( langToId( lang ), file );
				}
			}

			t.children( ".toolkit_html5_dropzone_progress" ).html("<img src='https://partner.steamgames.com/public/images/waiting_333.gif'>").show();

			$.ajax( {
				url: postDestination,
				cache: false,
				data: fd,
				contentType: false,
				processData: false,
				type: 'POST',
				complete: function( data ) {
					if ( typeof completeDestination === 'string' )
						document.location = completeDestination
					else
						completeDestination();
				},
				upload_progress: function(evt)
				{
					//TODO: Do something interesting for large file uploads
				}
			});

			return false;
		})
	);
}



/*</script>*/
