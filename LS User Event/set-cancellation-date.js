/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Apr 2018     anthonycarter
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function cancelDate(type){

	Util.console.log(type, 'type');
	
	if (type == 'cancel') {
		var msgDate = nlapiDateToString(new Date(), 'date'); 
		nlapiSetFieldValue('custbody_cancelled_date', msgDate);
	}

}

function closeDateSCH(type) {
	
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_set_cancel_date_closed');
	var context = nlapiGetContext();
	if (searchResults && searchResults != '') {
		var msgDate = nlapiDateToString(new Date(), 'date'); 
		for (var i=0; i<searchResults.length; i++) {
			
			var orderId = searchResults[i].getId();
			if(orderId && orderId != '') {
				nlapiSubmitField('salesorder', orderId, 'custbody_cancelled_date', msgDate);
			}
				
			var usage = context.getRemainingUsage();
			if (usage && usage < 500) {
				nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
			}
			
			
		}
		
	}
	
}


