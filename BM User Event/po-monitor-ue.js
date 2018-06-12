/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Oct 2017     carter
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function poBL(type, form, request){
	Util.console.log('Before Load');
}

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
function poBS(type){
 
	try {
		//Util.console.log('Before submit')
		
		var lineCount = nlapiGetLineItemCount('item');
		//Util.console.log(lineCount, 'lineCount');
		var expRecDate;
		var expRecDatetoDate = '';
		var expRecDateFinal = '';
		var expRecDateFinaltoDate = '';
		
		for (var i=1; i<= lineCount; i++) {
			
			expRecDate = nlapiGetLineItemValue('item', 'expectedreceiptdate', i);
			Util.console.log(expRecDate, 'exprecdate from line');
			if (expRecDate != '') {
				expRecDatetoDate = new Date(expRecDate);
				if (expRecDateFinal != '') {
					
					expRecDateFinaltoDate = new Date(expRecDateFinal);
					if (expRecDatetoDate > expRecDateFinaltoDate) {
						expRecDateFinal = expRecDate;
					}
					
				} else {
					expRecDateFinal = expRecDate;
				}
			}
				
			
		}
		
		nlapiSetFieldValue('custbody_expected_receipt_date', expRecDateFinal);
	} catch (e) {
		Util.console.log(e.message, 'Error');
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
function poAS(type){
	Util.console.log('After submit');
	
	
	//legacy logic
	/*var rec = nlapiGetNewRecord();
	var lineCount = rec.getLineItemCount('item');
	Util.console.log(lineCount, 'lineCount');
	for (var i=1;i<=lineCount; i++) {
		var firstReq = rec.getLineItemValue('item', 'linkedorder', i);
		var firstItem = rec.getLineItemValue('item', 'item', i);
		Util.console.log(firstItem, 'firstItem');
		Util.console.log(firstReq, 'firstReq');
		if (firstReq && firstReq != '') {
			var requestor = nlapiLookupField('requisition', firstReq, 'entity');
			Util.console.log(requestor, 'requestor');
			if (requestor && requestor != '') {
				rec.setFieldValue('custbody_requestor', requestor);
			}
		}
	}*/
	
	//If the type is Create
	if (type && type == 'create') {
		
		//Get record ID and load record
		var recId = nlapiGetRecordId();
		var rec = nlapiLoadRecord(nlapiGetRecordType(), recId);
		
		//get the value of the first purchase req
		var purchaseReq = rec.getLineItemValue('item', 'linkedorder', 1)
		
		//If the purchase req exists
		if (purchaseReq && purchaseReq != '') {
			
			//get the requestor
			var requestor = nlapiLookupField('purchaserequisition', purchaseReq, 'entity');
			//Util.console.log(requestor, 'requestor');
			
			//if the requestor exists
			if (requestor && requestor != '') {
				
				//submit field to set the requestor
				//Using this method as Loading and Saving the record causes validation issues if missing dept/class/etc
				nlapiSubmitField('purchaseorder',recId, 'custbody_requestor', requestor);
				
			}
		}
	}
	

	
	
	
	
}
