/**
 * ESET Helper utility functions
 *
 * Used as a Netsuite Library
 *
 * @package     Util
 * @author      Business Systems
 * @version     1.0
 */

var Util = {

	/**
	 * Determine whether a variable is empty
	 *
	 * @param   string    str           Variable to check
	 * @return  boolean                 If the variable is empty
	 */
	empty: function( str ) {
		return str == '' || str == null || str.length == 0;
	},
	
	fpf: function(stValue) {
		return (isNaN(parseFloat(stValue)) ? 0 : parseFloat(stValue));
	},
	
	errorlog: function(params) {
		
		try {
			this.console.log(params, 'The Params');
			if (params && params != '') {
				this.console.log('Running Error Creation');
				
				errRec = nlapiCreateRecord('customrecord_script_error_logging');
				
				if (params.script && params.script != '') {
					eval(nlapiLoadFile('1415261').getValue());
					
					this.console.log(scriptLookup, 'scriptfile');
					var scriptId = scriptLookup[params.script];
					
					if (!scriptId) {
						scriptId = '';
					}
					this.console.log(scriptId, 'scriptId');
				}
				
				errRec.setFieldValue('custrecord_errlog_script', scripasdftId);
				errRec.setFieldValue('custrecord_errlog_deployment', params.deploy);
				errRec.setFieldValue('custrecord_errlog_user', params.user);
				errRec.setFieldValue('custrecord_errlog_errorname', params.errname);
				errRec.setFieldValue('custrecord_errlog_errormessage', params.errmsg);
				nlapiSubmitRecord(errRec);
				
				
			}
		} catch (e) {
			this.console.log('Error logging error message');
		}
		
	},
		
	round: function(number, power) {
		//Util.console.log(number, 'number');
		number = parseFloat(number);

		number = Math.round((number*(Math.pow(10,power))))/(Math.pow(10,power));

		return number;
		
	},

	/**
	 * Determine whether a variable is contained in an array
	 *
	 * @param   mixed     needle        Variable to find
	 * @param   array     haystack      Array container
	 * @return  boolean                 If the variable is in the array
	 */
	inarray: function( needle, haystack ) {
		for(var i = 0; i < haystack.length; i++) {
			if(haystack[i] == needle) {
				return true;
			}
		}
		return false;
	},
	
	arrayinarray: function( needle, haystack ) {
		for (var i=0; i<needle.length; i++) {
			if (!this.inarray(needle[i], haystack)) {
				return false;
			}
		}
			
		return true;
	},
	
	logUsage: function(type) {
		var usage = nlapiGetContext().getRemainingUsage();
		this.console.log(usage, type);
	},
	
	healthCheck: function(scriptId, deployId, deployDetail,time) {
		this.console.log('running');
		
		if (deployDetail && deployDetail != '') {
			var recId = healthObj[scriptId + '-' + deployId + '-' + deployDetail];
		} else {
			var recId = healthObj[scriptId + '-' + deployId];
		}
		
		this.console.log(recId);
		
		var user = nlapiGetUser();
		
		//var theDate = getDateTimeStandard();
		var theDate = nlapiDateToString(new Date(), 'datetimetz');
		if (recId && recId != '') {
			nlapiSubmitField('customrecord_amb_healthcheck', recId, ['custrecord_healthcheck_last_run_date'], [theDate]);
		}
		
		
		
		
		
	},

	/**
	 * Merge the passed in objects
	 *
	 * @param   object    obj1          First Object
	 * @param   object    obj2          Second Object (overwrites first object)
	 * @return  object                  The merged object
	 */
	object_merge: function( obj1, obj2 ) {
		for( var key in obj2 ) {
		  obj1[key] = obj2[key];
		}

		return obj1;
	},
	
	/**
	 * Converts a string to a date object
	 *
	 * @param   string    str           The date string
	 * @param   string    format        Return format of date
	 * @return  date                    The date object
	 */
	strtodate: function( str, milliseconds ) {
		if( !milliseconds ) {
			return new Date( Date.parse( str ) );
		} else {
			return Date.parse( str );
		}
	},

	/**
	 * Verifies that an email is valid
	 *
	 * @param   string    str           Email address to verify
	 * @return  boolean                 If the string is a valid email address
	 */
	is_email: function( str ) {
		return str.search(/^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@(([0-9a-zA-Z])+([-\w]*[0-9a-zA-Z])*\.)+[a-zA-Z]{2,9})$/i) != -1;
	},

	/**
	 * Verifies that a number is an integer
	 *
	 * @param   string    value         Value to verify
	 * @return  boolean                 If the value is a valid integer
	 */
	is_int: function( str, include_zeronegative ) {
		if( include_zeronegative ) {
			return ((parseFloat(str) == parseInt(str)) && !isNaN(str)) || str == 0;
		} else {
			return ((parseFloat(str) == parseInt(str)) && !isNaN(str)) && str > 0;
		}
	},

	/**
	 * Escapes any HTML special characters
	 *
	 * @param   string    str           String to escape
	 * @return  string                  Sanitized string
	 */
	cleanHTML: function( str ) {
		if( Util.getType(str) == 'string' ) {
			return str
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		} else {
			return str;
		}
	},

	/**
	 * Gets the variable type, ie. string, object, null
	 *
	 * @param   mixed     thing         Variable being evaluated
	 * @return  string                  Variable type
	 */
	getType: function( thing ) {
		var type = '';
		if( thing === null ) {
			type = "[object Null]"; // special case
		} else {
			type = Object.prototype.toString.call(thing);
		}
		return type.replace(/\[object /, '').replace(/\]/, '').toLowerCase();
	},

	/**
	 * Netsuite console utility functions
	 */
	console: {
		type: 'system',

		/**
		 * Logs message in the Netsuite Execution Log
		 *
		 * @param   mixed   details       Message/Object to display in execution log
		 * @param   string  detail_desc   Description of the message (optional)
		 */
		log: function( details, detail_desc, type ) {
			var title = 'TEST_DEBUG';
			if( !details ) {
				details = 'n/a';
			}
			if( !detail_desc ) {
				detail_desc = '';
			} else {
				detail_desc = detail_desc + ': ';
			}
			if( !type ) {
				type = this.type;
			}

			if( Util.getType( details ) == 'null' ) {
				detail_desc = detail_desc + 'null';
			} else if( Util.getType( details ) == 'string' ) {
				detail_desc = detail_desc + Util.cleanHTML( details );
			} else {
				detail_desc = detail_desc + Util.cleanHTML( JSON.stringify( details ) );
			}

			nlapiLogExecution(type, title, detail_desc );

		},
			
		verbLog: function (details,  detail_desc,log, type) {
			var vLog = 'N';
			if (vLog == 'Y') {
				var title = 'TEST_DEBUG';
				if( !details ) {
					details = 'n/a';
				}
				if( !detail_desc ) {
					detail_desc = '';
				} else {
					detail_desc = detail_desc + ': ';
				}
				if( !type ) {
					type = this.type;
				}

				if( Util.getType( details ) == 'null' ) {
					detail_desc = detail_desc + 'null';
				} else if( Util.getType( details ) == 'string' ) {
					detail_desc = detail_desc + Util.cleanHTML( details );
				} else {
					detail_desc = detail_desc + Util.cleanHTML( JSON.stringify( details ) );
				}

				nlapiLogExecution(type, title, detail_desc );
			}
				
			}
			
		
		
		
	},
	
	/**
	 * Beautifies an xml string to make it human readable
	 *
	 * @param   string    xml           XML string to beautify
	 * @return  string                  Human readable XML
	 */
	formatXML: function( xml ) {
		var reg = /(>)(<)(\/*)/g;
		var wsexp = / *(.*) +\n/g;
		var contexp = /(<.+>)(.+\n)/g;
		xml = xml.replace(reg, '$1\n$2$3').replace(wsexp, '$1\n').replace(contexp, '$1\n$2');
		var pad = 0;
		var formatted = '';
		var lines = xml.split('\n');
		var indent = 0;
		var lastType = 'other';
		// 4 types of tags - single, closing, opening, other (text, doctype, comment) - 4*4 = 16 transitions
		var transitions = {
			'single->single': 0,
			'single->closing': -1,
			'single->opening': 0,
			'single->other': 0,
			'closing->single': 0,
			'closing->closing': -1,
			'closing->opening': 0,
			'closing->other': 0,
			'opening->single': 1,
			'opening->closing': 0,
			'opening->opening': 1,
			'opening->other': 1,
			'other->single': 0,
			'other->closing': -1,
			'other->opening': 0,
			'other->other': 0
		};

		for (var i = 0; i < lines.length; i++) {
			var ln = lines[i];
			var single = Boolean(ln.match(/<.+\/>/)); // is this line a single tag? ex. <br />
			var closing = Boolean(ln.match(/<\/.+>/)); // is this a closing tag? ex. </a>
			var opening = Boolean(ln.match(/<[^!].*>/)); // is this even a tag (that's not <!something>)
			var type = single ? 'single' : closing ? 'closing' : opening ? 'opening' : 'other';
			var fromTo = lastType + '->' + type;
			lastType = type;
			var padding = '';

			indent += transitions[fromTo];
			for (var j = 0; j < indent; j++) {
				padding += '\t';
			}
			if (fromTo == 'opening->closing') {
				formatted = formatted.substr(0, formatted.length - 1) + ln + '\n'; // substr removes line break (\n) from prev loop
			} else {
				formatted += padding + ln + '\n';
			}
		}

		return formatted;
	}
};