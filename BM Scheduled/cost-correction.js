/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jun 2016     carter		   Cost correction script for B&M
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function costSC(type) {

	//get script context information test
	var context = nlapiGetContext();
	
	//get script parameter used when requeing script
	var currBillId = context.getSetting('SCRIPT', 'custscript_cc_bill_id');
	
	
	//set master data array
	var data = {};
	
	//get list of bills to perform update
	if (currBillId && currBillId != '') {
		var filters = [
		       new nlobjSearchFilter('internalidnumber', null, 'greaterthan', currBillId)
		];
		
		var searchResults = nlapiSearchRecord('transaction', 'customsearch_costcorr_billinfo', filters, null);
	} else {
		var searchResults = nlapiSearchRecord('transaction', 'customsearch_costcorr_billinfo', null, null);
	}
	
	
	if (searchResults && searchResults != '') {
		
		//loop through each result in the search
		for (var i=0; i<searchResults.length; i++) {
			
			var billId = searchResults[i].getValue('internalid', null, 'group');
			
			//get bill info and put into data array
			var billInfo = getBillInfo(billId);
			data['billinfo'] = billInfo;
			
			Util.console.log(billInfo, 'billInfo');
		
			
			//update PO info
			updatePO(billId, data);
			
			nlapiSubmitField('vendorbill', billId, 'custbody_cc_script_run', 'T');
			
			//requeue script to account for script governance
			var usage = context.getRemainingUsage();
			
			if (usage && usage < 3000) {
				
				var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(),{custscript_cc_bill_id: billId});
				if (status && status == 'QUEUED') {
					break;
				}
				
			}
			
		}
		
	}

}

var itemExcl = ['9271', '9270', '9457', '9286', '9287'];
var pTypeExcl = ['8', '16', '18', '19'];


function updatePO(billId, data) {
	
	//get all PO's for the related vendor bill

	var filters = [
	     new nlobjSearchFilter('billingtransaction', null, 'anyof', billId)
	];
	
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_costcorr_poinfo', filters, null);
	
	if (searchResults && searchResults != '') {
		for (var i=0; i<searchResults.length; i++) {
			
			var poId = searchResults[i].getValue('internalid', null, 'group');
				
			if (poId && poId != '') {
				
				var poRec = nlapiLoadRecord('purchaseorder', poId);
				var lineCount = poRec.getLineItemCount('item');
				Util.console.log(lineCount + ' ' + data['billinfo'].length, 'Array Lengths');
				for (var j=1;j<=lineCount; j++) {
					var poItemType = poRec.getLineItemValue('item', 'itemtype', j);
									
					if (poItemType == 'Discount') {
						continue;
					}
					//var poLine = poRec.getLineItemValue('item', 'line', j);
					var poItem = poRec.getLineItemValue('item', 'item', j);
					
					if (inArray(poItem, itemExcl) == 'Y') {
						Util.console.log('In Item Exclusion');
						continue;
					}
					Util.console.log('past the item exclusion')
					
					var poRate = poRec.getLineItemValue('item', 'rate', j);
					var poAmount = poRec.getLineItemValue('item', 'amount', j);
					var poOrigRate = poRec.getLineItemValue('item', 'custcol_cc_original_rate', j);
					var poOrigAmt = poRec.getLineItemValue('item', 'custcol_cc_original_amount', j);
					var poDesc = poRec.getLineItemValue('item', 'description', j);
					var poProductType = poRec.getLineItemValue('item', 'custcol_product_type', j);
					
					if (inArray(poProductType, pTypeExcl) == 'Y') {
						Util.console.log('In pType Exclusion');
						continue;
					}
					Util.console.log('past the pType exclusion');
					
					//Util.console.log(poLine, 'poLine');
					for (var k=0; k<data['billinfo'].length; k++) {
						
						//var billLine = data['billinfo'][k]['line'];
						var billItem = data['billinfo'][k]['item'];
						var billDesc = data['billinfo'][k]['desc'];
			
						if (poItem == billItem && billDesc == poDesc) {
							//Util.console.log(poLine + ' ' + billLine, 'Item Match Numbers');					
							
							if (poProductType && poProductType == '8') {
								poRec.setLineItemValue('item', 'custcol_cc_item_rate', j, poRate);
							} else {
								poRec.setLineItemValue('item', 'custcol_cc_item_rate', j, data['billinfo'][k]['rate']);
							}
							
							
							
							if (!poOrigRate || poOrigRate == '') {
								poRec.setLineItemValue('item', 'custcol_cc_original_rate', j, poRate);
							}
							
							if (!poOrigAmt || poOrigAmt == '') {
								poRec.setLineItemValue('item', 'custcol_cc_original_amount', j, poAmount);
							}
							
							if (poProductType && poProductType == '8') {
								poRec.setLineItemValue('item', 'custcol_cc_amount', j, poOrigAmt);
							} else {
								poRec.setLineItemValue('item', 'custcol_cc_amount', j, data['billinfo'][k]['amount']);
							}
							
							
							poRec.setLineItemValue('item', 'rate', j, data['billinfo'][k]['rate']);
							poRec.setLineItemValue('item', 'amount', j, data['billinfo'][k]['amount']);
							
							
						}
						
					}
					
				}
				
				poRec.setFieldValue('custbody_cc_script_run', 'T');
				
				var updPOId = nlapiSubmitRecord(poRec);

				if (updPOId && updPOId != '') {
					Util.console.log(updPOId, 'updPOId');
					updateReceipts(updPOId, data);
					
				}
					
			}
			
		}
	}
	
}


function updateReceipts(poId, data) {
	
	var filters = [
	      	     new nlobjSearchFilter('appliedtotransaction', null, 'anyof', poId)
	      	];
	      	
	      	var searchResults = nlapiSearchRecord('transaction', 'customsearch_costcorr_recinfo', filters, null);
	      	
	      	if (searchResults && searchResults != '') {
	      		for (var i=0; i<searchResults.length; i++) {
	      			
	      			var recId = searchResults[i].getValue('internalid', null, 'group');
	      			Util.console.log(recId, 'recId');
	      			if (recId && recId != '') {
	      				
	      				var recRec = nlapiLoadRecord('itemreceipt', recId);
	      				var lineCount = recRec.getLineItemCount('item');
	      				Util.console.log(lineCount, 'rec Line Count');
	      				for (var j=1;j<=lineCount; j++) {
	      					//var poItemType = poRec.getLineItemValue('item', 'itemtype', j);
	      									
	      					//if (poItemType == 'Discount') {
	      					//	continue;
	      				//	}
	      					//var poLine = poRec.getLineItemValue('item', 'line', j);
	      					var recItem = recRec.getLineItemValue('item', 'item', j);
	      					
	      					if (inArray(recItem, itemExcl) == 'Y') {
	    						Util.console.log('In Item Exclusion');
	    						continue;
	    					}
	      					
	      					var recRate = recRec.getLineItemValue('item', 'rate', j);
	      					var recAmount = recRec.getLineItemValue('item', 'amount', j);
	      					var recOrigRate = recRec.getLineItemValue('item', 'custcol_cc_original_rate', j);
	      					var recOrigAmt = recRec.getLineItemValue('item', 'custcol_cc_original_amount', j);
	      					var recDesc = recRec.getLineItemValue('item', 'itemdescription', j);
	      					var recProductType = recRec.getLineItemValue('item', 'custcol_product_type', j);
	      					if (inArray(recProductType, pTypeExcl) == 'Y') {
	    						Util.console.log('In pType Exclusion');
	    						continue;
	    					}
	      					
	      					
	      					Util.console.log(recProductType, 'recProductType');
	      					//Util.console.log(poLine, 'poLine');
	      					for (var k=0; k<data['billinfo'].length; k++) {
	      						
	      						//var billLine = data['billinfo'][k]['line'];
	      						var billItem = data['billinfo'][k]['item'];
	      						var billDesc = data['billinfo'][k]['desc'];
	      						
	      						if (recItem == billItem && billDesc == recDesc) {
	      							//Util.console.log(poLine + ' ' + billLine, 'Item Match Numbers');					
	      							
	      							if (recProductType && recProductType == '8') {
	    								recRec.setLineItemValue('item', 'custcol_cc_item_rate', j, 0);
	    							} else {
	    								recRec.setLineItemValue('item', 'custcol_cc_item_rate', j, data['billinfo'][k]['rate']);
	    							}
	      							
	      							//recRec.setLineItemValue('item', 'custcol_cc_item_rate', j, data['billinfo'][k]['rate']);
	      							
	      							if (!recOrigRate || recOrigRate == '') {
	      								recRec.setLineItemValue('item', 'custcol_cc_original_rate', j, recRate);
	      							}
	      							
	      							if (!recOrigAmt || recOrigAmt == '') {
	      								recRec.setLineItemValue('item', 'custcol_cc_original_amount', j, recAmount);
	      							}
	      							
	      							
	      							recRec.setLineItemValue('item', 'custcol_cc_amount', j, data['billinfo'][k]['amount']);
	      							
	      							recRec.setLineItemValue('item', 'rate', j, data['billinfo'][k]['rate']);
	      							//poRec.setLineItemValue('item', 'amount', j, data['billinfo'][k]['amount']);
	      							
	      							
	      						}
	      						
	      					}
	      					
	      				}
	      				
	      				recRec.setFieldValue('custbody_cc_script_run', 'T');
	      				try {
	      					var updRecId = nlapiSubmitRecord(recRec);
	      				} catch (e) {
	      					
	      				}
	      				

	      				//if (updPOId && updPOId != '') {
	      					
	      					//updateReceipts(updPOId, data);
	      					
	      				//}
	      					
	      			}
	      			
	      		}
	      	}
	      	
	
	
}

function getBillInfo(billId) {
	
	//create bill array
	var billInfo = [];
	var lineInfo;
	
	//load bill rec and get line info
	var billRec = nlapiLoadRecord('vendorbill', billId);
	
	var lineCount = billRec.getLineItemCount('item');
	
	for (var i=1; i<= lineCount; i++) {
		
		lineInfo = {};
		
		lineInfo['line'] = billRec.getLineItemValue('item', 'line', i);
		lineInfo['item'] = billRec.getLineItemValue('item', 'item', i);
		lineInfo['rate'] = billRec.getLineItemValue('item', 'rate', i);
		lineInfo['amount'] = billRec.getLineItemValue('item', 'amount', i);
		lineInfo['desc'] = billRec.getLineItemValue('item', 'description', i);
		
		
		billInfo.push(lineInfo);
		
	}
	
	return billInfo;
	
	
}

function inArray(val, arr) {
    var bIsValueFound = 'N';
    for(var i = 0; i < arr.length; i++) {
        if(val == arr[i]) {
            bIsValueFound = 'Y';
            break;
        }
    }
    return bIsValueFound;
}






