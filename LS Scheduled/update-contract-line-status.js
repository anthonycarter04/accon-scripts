/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 May 2018     anthonycarter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function updateContractLineStatus(type) {

	//get results of saved search: SCRIPT - Update Contract Line Status
	var cols = [];
	var context = nlapiGetContext();
	var searchResults = nlapiSearchRecord('customrecord_service_contract_line', 'customsearch_update_cont_line_status');
	
	if (searchResults && searchResults != '') {
		
		Util.console.log(searchResults, 'searchResults');
		//loop through results and get target contract line status
		for (var i=0; i<searchResults.length; i++) {
			
			
			var usage = context.getRemainingUsage();
			if (usage && usage < 1000) {
				var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
				if (status && status == 'QUEUED') {
					break;
				}
			}
			
			var targetStatus = searchResults[i].getValue('formulatext');
			Util.console.log(targetStatus, 'target Status');
			
			var currStatus = searchResults[i].getText('custrecord_scl_contractlinestatus');
			Util.console.log(currStatus, 'current status');		
			
			if (currStatus != targetStatus) {
				
				var targetId = statusMap[targetStatus];
				if (targetId && targetId != '') {
					nlapiSubmitField('customrecord_service_contract_line', searchResults[i].getId(), 'custrecord_scl_contractlinestatus', targetId);
					
				}
				
			}
		}
		
	}
	
}

var statusMap = {
	'Terminated': 12,
	'Expired': 13,
	'Current': 14,
	'Future': 15,
};
