/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Nov 2017     carter
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
function auBL(type, form, request){
 
	var execCtx = nlapiGetContext().getExecutionContext();
	var recType = nlapiGetRecordType();
	if (execCtx == 'userinterface' && recType == 'salesorder') {
		
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
function auBS(type){
	
	
	var recType = nlapiGetRecordType();
	var role = nlapiGetRole();
	var user = nlapiGetUser();
	if (recType == 'salesorder') {
		
		/* moving to after submit 2/20/2018
		var amountUnbilledDyn = nlapiGetFieldValue('custbody_amount_unbilled');
		nlapiSetFieldValue('custbody_amount_unbilled_stored', amountUnbilledDyn);
		*/
		var finalCustomAmount = 0;
		var lineCount = nlapiGetLineItemCount('item');
		var depTotal = nlapiGetFieldValue('custbody_deposit_amount');
		
		for (var i=1; i<= lineCount; i++) {
			var customAmount = 0;
			//ASA Logic	
			var asaAmount = nlapiGetLineItemValue('item', 'altsalesamt', i);
          
    		
            var amount = nlapiGetLineItemValue('item', 'amount', i);
           
            if (amount > 0 || amount <0) {
            	 var altSalesPercent = (asaAmount/amount) * 100;
            } else {
            	var altSalesPercent = 0;
            }
           
           nlapiSetLineItemValue('item', 'custcol_alt_sales_percent', i, altSalesPercent );
           
           
           //Custom Deposit Logic
            var itemId = nlapiGetLineItemValue('item', 'item', i);
			if (itemId && itemId != '' && Util.inarray(itemId, itemObj) ){
				customAmount += fpf(nlapiGetLineItemValue('item', 'amount', i));
				
				for (var j=i+1; j<=lineCount; j++) {
					
					var itemType = nlapiGetLineItemValue('item', 'itemtype', j);
					
					if (itemType == 'Discount') {
						var rate = fpf(nlapiGetLineItemValue('item', 'rate',j))/100;
						customAmount = customAmount + (customAmount * rate);
						
						//var found = 'T';
						
						//customAmount += fpf(nlapiGetLineItemValue('item', 'amount', j));
						break;
					} else if (itemType == 'Subtotal') {
						continue;
					}
					
				}
				//if (found == 'F') {
					//
			//	}
				
				
				//Util.console.log(finalCustomAmount, 'finalCustom Amount');
				
					
				finalCustomAmount += customAmount;
				
				
			}
			
		}
	
		
		nlapiSetFieldValue('custbody_custom_amount', finalCustomAmount);
		
		if (depTotal && depTotal != '') {
			//Custom Deposit logic
			if (!finalCustomAmount || finalCustomAmount == 0) {
				var depCustomPerc = 0;
			} else {
				var depCustomPerc = (depTotal/finalCustomAmount) * 100;
			}
			
			if (depCustomPerc > 100) {
				depCustomPerc = 100;
			}
			nlapiSetFieldValue('custbody_deposit_percent_custom', depCustomPerc);
			//nlapiSetFieldValue('custbody_custom_amount', customAmount);
		}
		
		
	}
}

function auAS(type) {
	var recType = nlapiGetRecordType();
	var role = nlapiGetRole();
	Util.console.log(recType, 'recType');
	if (recType == 'invoice') {
		var createdFrom = nlapiGetFieldValue('createdfrom');
		if (createdFrom && createdFrom != '') {
			var soRec = nlapiLoadRecord('salesorder', createdFrom);
			var amountUnbilledDyn = soRec.getFieldValue('custbody_amount_unbilled');
			soRec.setFieldValue('custbody_amount_unbilled_stored', amountUnbilledDyn);
			nlapiSubmitRecord(soRec);
		}
	}
	
	if (recType == 'returnauthorization') {
		
		var createdFromText = nlapiGetFieldText('createdfrom');
		var createdFromId = nlapiGetFieldValue('createdfrom');
		var soId = '';
		if (createdFromText.search('Invoice') != -1) {
			soId = nlapiLookupField('invoice', createdFromId, 'createdfrom');
			Util.console.log(soId, 'soId in invoice');
		} else if (createdFromText.search('Sales Order') != -1) {
			soId = createdFromId;
		}
		
		if (soId != '') {
			var soRec = nlapiLoadRecord('salesorder', soId);
			var amountUnbilledDyn = soRec.getFieldValue('custbody_amount_unbilled');
			Util.console.log(amountUnbilledDyn, 'amountUnbilledDyn');
			soRec.setFieldValue('custbody_amount_unbilled_stored', amountUnbilledDyn);
			nlapiSubmitRecord(soRec);
		}
		
		
		
	}
	
	//moved to after submit 2/20/2018
	if (recType == 'salesorder') {
		//var rec = nlapiGetNewRecord();
		var recId = nlapiGetRecordId();
		var recLoad = nlapiLoadRecord('salesorder', recId);
		var amountUnbilledDyn = recLoad.getFieldValue('custbody_amount_unbilled');
		
		nlapiSubmitField('salesorder', recId, 'custbody_amount_unbilled_stored',amountUnbilledDyn );
		//nlapiSetFieldValue('custbody_amount_unbilled_stored', amountUnbilledDyn);
		
		
	}
	
	
}

function fpf(stValue) {
	var flValue = parseFloat(stValue);
	if (isNaN(flValue) || (Infinity == stValue)) {
		return 0.00;
	}
	return flValue;
}