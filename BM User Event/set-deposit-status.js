/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Aug 2017     carter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function setDepStatus(type) {
	
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_wflw_check_deposits', null, null);
	
	if (searchResults && searchResults != '') {
		
		for (var i=0; i<searchResults.length; i++) {
			
			var recId = searchResults[i].getId();
			var rec = nlapiLoadRecord('salesorder', recId);
			var recTotal = rec.getFieldValue('total');
			
			
			var filters = [
			    new nlobjSearchFilter('salesorder', null, 'anyof',recId)           
			];
			
			var depSearchResults = nlapiSearchRecord('transaction', 'customsearch_get_deposit_totals', filters);
			if (depSearchResults && depSearchResults != '') {
				
				var depTotal = depSearchResults[0].getValue('fxamount', null, 'sum');
				if (parseFloat(depTotal) == parseFloat(recTotal)) {
					rec.setFieldValue('custbody_deposit_status', 3);
					
				}
				rec.setFieldValue('custbody_deposit_amount', depTotal);
				nlapiSubmitRecord(rec);
			}
			
			
		}
		
	}
	
}

function setDepositStatusUE(type) {
	
	var soId = nlapiGetFieldValue('salesorder');
	
	if (soId && soId != '') {
		
		var filters = [
					    new nlobjSearchFilter('salesorder', null, 'anyof',soId)           
					];
					
		var depSearchResults = nlapiSearchRecord('transaction', 'customsearch_get_deposit_totals', filters);
		if (depSearchResults && depSearchResults != '') {
			
			var rec = nlapiLoadRecord('salesorder', soId);
			var origHoldStatus = rec.getFieldValue('custbody_hold_status');
			var origDepStatus = rec.getFieldValue('custbody_deposit_status');
			
			
			//set Deposit Status logic
			var recTotal = rec.getFieldValue('total');
			
			var depTotal = depSearchResults[0].getValue('fxamount', null, 'sum');
			var newDepStatus = '';
			if (parseFloat(depTotal) == parseFloat(recTotal)) {
				newDepStatus = 3;
			} else if (parseFloat(depTotal) > parseFloat(recTotal)) {
				newDepStatus = 4;
			} else {
				newDepStatus = 2;
			}
			rec.setFieldValue('custbody_deposit_status', newDepStatus);
			rec.setFieldValue('custbody_hold_policy_validated', 'F');
			//set Hold Status logic
			if (origHoldStatus && origHoldStatus == '2' && origDepStatus && origDepStatus == '1' && Util.inarray(newDepStatus, [2,3,4]) ) {
				rec.setFieldValue('custbody_hold_status',1);
				
				var lineCount = rec.getLineItemCount('item');
				for (var i=1; i<=lineCount; i++) {
					rec.setLineItemValue('item', 'isclosed',i, 'F');
				}
				
			}
			
			//Set deposit date, if new deposit
			if (type == 'create') {
				var newDate = new Date();
				newDate = nlapiDateToString(newDate, 'datetimetz');
				rec.setFieldValue('custbody_deposit_date', newDate);
			}
			
			var lineCount = rec.getLineItemCount('item');
			
			var finalCustomAmount = 0;
			for (var i=1; i<=lineCount; i++) {
				var customAmount = 0;
				var itemId = rec.getLineItemValue('item', 'item', i);
				if (itemId && itemId != '' && Util.inarray(itemId, itemObj) ){
					customAmount += fpf(rec.getLineItemValue('item', 'amount', i));
					
					
					for (var j=i+1; j<=lineCount; j++) {
						
						var itemType = rec.getLineItemValue('item', 'itemtype', j);
						
						if (itemType == 'Discount') {
							var rate = fpf(rec.getLineItemValue('item', 'rate',j))/100;
							customAmount = customAmount + (customAmount * rate);
							
							//var found = 'T';
							
							//customAmount += fpf(nlapiGetLineItemValue('item', 'amount', j));
							break;
						} else if (itemType == 'Subtotal') {
							continue;
						}
						
					}
					
					//get next line item amount
					/*if (i<lineCount) {
						var itemType = rec.getLineItemValue('item', 'itemtype', i+1);
						if (itemType == 'Discount') {
							customAmount += fpf(rec.getLineItemValue('item', 'amount', i+1));
						}
					}*/
					finalCustomAmount += customAmount;
				}
				
				
				
			}
			
			if (!finalCustomAmount || finalCustomAmount == 0) {
				var depCustomPerc = 0;
			} else {
				var depCustomPerc = (depTotal/finalCustomAmount) * 100;
			}
			
			if (depCustomPerc > 100) {
				depCustomPerc = 100;
			}
			
			rec.setFieldValue('custbody_deposit_percent_custom', depCustomPerc);
			rec.setFieldValue('custbody_custom_amount', finalCustomAmount);
			
			//Set deposit total.  This will trigger the deposit percentage
			rec.setFieldValue('custbody_deposit_amount', depTotal);
			nlapiSubmitRecord(rec);
		}
		
	}
	
}

function fpf(stValue) {
	var flValue = parseFloat(stValue);
	if (isNaN(flValue) || (Infinity == stValue)) {
		return 0.00;
	}
	return flValue;
}
