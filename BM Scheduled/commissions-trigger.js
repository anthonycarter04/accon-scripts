/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Sep 2016     carter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function commTrig(type) {
	
	
	//Test
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_commissions_update', null, null);
	
	if (searchResults && searchResults != '') {
		
		for (var i=0; i< searchResults.length; i++) {
			
			var recId = searchResults[i].getValue('internalid', null, 'group');
			Util.console.log(recId, 'recId');
			if (recId && recId != '') {
				
				var rec = nlapiLoadRecord('salesorder', recId);
				rec.setFieldValue('custbody_commissions_update', 'T');
				try {
					nlapiSubmitRecord(rec, 'rec');
				} catch (e) {
					Util.console.log(e.message + ' - ' + recId , 'e.message');
				}
				
				
				
				
			}
			
			var usage = nlapiGetContext().getRemainingUsage();
			
			if (usage && usage < 2000) {
				var status = nlapiScheduleScript('customscript_commissions_update', 'customdeploy1');
				if (status == 'QUEUED') {
					break;
				}
			}
			
		}
		
	}
	
	
	
}
