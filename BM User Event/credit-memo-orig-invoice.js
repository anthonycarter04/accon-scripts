/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Feb 2017     carter
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
function cmBS(type){
 
	var ctx = nlapiGetContext();
	var execCtx = ctx.getExecutionContext();

	if (execCtx && (execCtx == 'userinterface' || execCtx == 'scheduled')) {
		
		try {
					
			//get created from value
			var createdFrom = nlapiGetFieldValue('createdfrom');
			
			//if populated, see if it is return or invoice
			if (createdFrom && createdFrom != '') {
				var createdFromText = nlapiGetFieldText('createdfrom');
				
				if (createdFromText.search('Invoice') != -1) {
					nlapiSetFieldValue('custbody_original_invoice', createdFrom);
				} else if (createdFromText.search('Return') != -1) {
					Util.console.log('is return');
					var retCreatedFrom = nlapiLookupField('returnauthorization', createdFrom, 'createdfrom');
					var retCreatedFromText = nlapiLookupField('returnauthorization', createdFrom, 'createdfrom', true);
					if (retCreatedFromText && retCreatedFromText.search('Invoice') != -1) {
						Util.console.log(retCreatedFrom, 'retCreatedFrom');
						nlapiSetFieldValue('custbody_original_invoice', retCreatedFrom);
					} else if (retCreatedFromText && retCreatedFromText.search('Sales Order') != -1) {
						Util.console.log(retCreatedFromText, 'retCreatedFromText');
						var filter = [
						   new nlobjSearchFilter('createdfrom', null, 'anyof', retCreatedFrom),
						   new nlobjSearchFilter('type', null, 'anyof', 'CustInvc'),
						   new nlobjSearchFilter('mainline', null, 'is', 'T')
						];
						
						var columns = [
						    new nlobjSearchColumn('tranid'),
						    new nlobjSearchColumn('internalid'),
						    new nlobjSearchColumn('type')
						];
						
						var searchResults  = nlapiSearchRecord('transaction', null, filter, columns);
						//Util.console.log(searchResults.length, 'number of recs');
						if (searchResults && searchResults != '' && searchResults.length && searchResults.length == 1 ) {
							nlapiSetFieldValue('custbody_original_invoice', searchResults[0].getId());
						}
						
						
					}
					
				}
			}
		} catch(e) {
			Util.console.log(e.message, 'Error Message');
		}
		
		
	}
	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function cmAS(type){
  
	try {
		var caseId = nlapiGetFieldValue('custbody_support_case');
		Util.console.log(caseId, 'caseId');
		if (caseId && caseId != '') {
			nlapiSubmitField('supportcase', caseId, 'custevent_credit_memo', nlapiGetRecordId());
		}
	} catch (e) {
		Util.console.log('Could not set case number on credit memo');
	}
	
}

function cmSCH() {
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_sch_credmemo_orig_inv', null, null);
	if (searchResults && searchResults != '') {
		for (var i=0;i< searchResults.length;i++) {
			
			var usage = nlapiGetContext().getRemainingUsage();
			if (usage && usage < 500) {
				nlapiYieldScript();
			}
			
			var recId = searchResults[i].getId();
			Util.console.log(i + "-" + recId, 'recId line');
			var recLoad = nlapiLoadRecord('creditmemo', recId);
			recLoad.setFieldValue('custbody_scrpt_update_fld', 'T');
			nlapiSubmitRecord(recLoad);
			
		}
	}
}
