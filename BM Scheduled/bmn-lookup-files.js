/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Dec 2016     carter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function lookups(type) {

	var success = customLineLookup();
	if (!checkSuccess(success)) return false;
	
	//success = healthCheckLookup();
	//if(!checkSuccess(success)) return false;
	
}


//Lookup to identify custom lines
/*function customLineLookup() {
	
	var itemObj = [];
	
	var searchResults = nlapiSearchRecord('item', 'customsearch_lookup_custom_item');
	
	if (searchResults && searchResults != '') {
		Util.console.log(searchResults.length, 'result length');
		for (var i=0; i<searchResults.length; i++) {
			
			itemObj.push(searchResults[i].getId());
			
		}
		
		createLookupFile('itemObj', itemObj, 'custom-item-lookup.js');
		
	}
	
}*/

function customLineLookup() {
	
	var itemObj = [];
	var searchLoad = nlapiLoadSearch('item', 'customsearch_lookup_custom_item');
	
	var searchResults = searchLoad.runSearch();
	
	var resultIndex = 0;
	var resultStep = 1000;
	var resultSet;
	
	do {
		resultSet = searchResults.getResults(resultIndex, resultIndex + resultStep);
	    Util.console.log(resultSet, 'resultSet');
	    
	    for (var i=0; i<resultSet.length; i++) {
	    		itemObj.push(resultSet[i].getId());
	    }
	    
	    resultIndex = resultIndex + resultStep;
	    
	} while (resultSet.length >0);
	
	
	createLookupFile('itemObj', itemObj, 'custom-item-lookup.js');
}


/*function healthCheckLookup() {
	
	var healthObj = {};
	
	var searchResults = nlapiSearchRecord('customrecord_amb_healthcheck', 'customsearch_health_check_script_mapping');
	
	if (searchResults && searchResults != '') {
		
		for (var i=0; i<searchResults.length; i++) {
			var deployDetail = searchResults[i].getValue('custrecord_healthcheck_deployment_detail');
			if (deployDetail && deployDetail != '') {
				healthObj[searchResults[i].getValue('scriptid', 'custrecord_healthcheck_script').toLowerCase() + '-' + searchResults[i].getValue('custrecord_healthcheck_deployment') + '-' + deployDetail] = searchResults[i].getId();
				
			} else {
				healthObj[searchResults[i].getValue('scriptid', 'custrecord_healthcheck_script').toLowerCase() + '-' + searchResults[i].getValue('custrecord_healthcheck_deployment')] = searchResults[i].getId();
				
			}
		
		}
		
		createLookupFile('healthObj', healthObj, 'healthcheck-lookup.js');
		
	}
	
}*/

/*function itemLookup() {
	
	var itemObj = {};
	
	var searchResults = nlapiSearchRecord('item', 'customsearch_scrpt_sfrest_lookups_item', null, null);
	
	if (searchResults && searchResults != '') {
		
		for (var i=0; i<searchResults.length;i++) {
			itemObj[searchResults[i].getValue('externalid')] = searchResults[i].getValue('internalid');
		}
		
		createLookupFile('itemObj', itemObj, 'sfrest-item-lookup.js');
	}
	return true;
	
}*/

function createLookupFile(varName, obj, fileName) {
	
	var contents = 'var ' + varName + '=' + JSON.stringify(obj);
	
	var file = nlapiCreateFile(fileName, 'JAVASCRIPT', contents)
	file.setFolder('4466598'); 
	
	nlapiSubmitFile(file);
}

function checkSuccess(succ) {
	
	var ret = (succ == true) ? true: false;
	return ret;
	
}