/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Jul 2017     carter
 *
 */

/**
 * Legacy function - No longer in user
 * @returns {Void} Any or no return value
 */
function closeLinesOld() {
	
	//get line item count
	var lineCount = nlapiGetLineItemCount('item');
	Util.console.log(lineCount, 'lineCount');
	//loop through lines and close them
	for (var i=1; i<=lineCount; i++) {
		nlapiSelectLineItem('item', i);
		nlapiEditCurrentLineItemSubrecord('item', 'inventorydetail');
		nlapiRemoveCurrentLineItemSubrecord('item','inventorydetail');
		Util.console.log('after remove subrecord');
		//nlapiSetLineItemValue('item', 'isclosed',i, 'T');
		var allocRec = nlapiGetCurrentLineItemValue('item', 'custcol_allocation_record');
	
		if (allocRec && allocRec != '') {
			
			//Delete allocation record
			try {
				nlapiSelectLineItem('item', i);
				
				nlapiSetCurrentLineItemValue('item', 'custcol_container', '');
				nlapiSetCurrentLineItemValue('item', 'custcol_allocation_record', '');
				nlapiSubmitField('customrecord_allocation_record', allocRec, 'custrecord_ar_delete', 'T');
				
				
				//nlapiDeleteRecord('customrecord_allocation_record', allocRec);
			} catch(e) {
				Util.console.log(e.message, 'Error Message');
			}
		}
	}
	return true;
	
}

/*
 * Legacy Function - No Longer Used
 */
function deleteAlloc(i) {
	//select line item and get allocation record
	nlapiSelectLineItem('item', i);
	var allocRec = nlapiGetCurrentLineItemValue('item', 'custcol_allocation_record');

	//if allocation record exists
	if (allocRec && allocRec != '') {
		
		//Delete allocation record
		try {
			nlapiSubmitField('customrecord_allocation_record', allocRec, 'custrecord_ar_delete', 'T');
			nlapiSetCurrentLineItemValue('item', 'custcol_container', '');
			nlapiSetCurrentLineItemValue('item', 'custcol_allocation_record', '');
			//nlapiDeleteRecord('customrecord_allocation_record', allocRec);
		} catch(e) {
			Util.console.log(e.message, 'Error Message');
		}
		
		
		
	}
	
}

/*
 * Legacy function - No longer Users
 */
function removeInvDetail(i) {
	//select line item and remove the inventory detail record
	nlapiSelectLineItem('item', i);
	nlapiRemoveCurrentLineItemSubrecord('item','inventorydetail');
}

/*
 * Suitelet
 * Function designed to perform server-side logic to do the following:
 * 1. Unlink allocation record(s) from SO line
 * 2. Unlink container record(s) from SO line
 * 3. Close sales order line(s)
 * 4. Set Delete flag field on allocation record(s) 
 * 5. Schedule script that will delete allocation record
 * 6. At the end, redirect user back to original sales order that "Close Order" was clicked from
 */
function schSL (request, response, ctx, prm) {
	
	//Get sales order record ID parameter
	
	if (ctx && ctx != '') {
		var param = prm;
	} else {
		var param = request.getParameter('custpage_recid');
	}
	Util.console.log('in sch sl');
	
	//if param exists, proceed
	if (param && param != '') {
		
		//Load record and get the status
		var recLoad = nlapiLoadRecord('salesorder', param, {recordmode: 'dynamic'});
		var status = recLoad.getFieldValue('status');
		
		//If the status is not closed
		if (status  != 'Closed') {
		
			//Get line item count
			var lineCount = recLoad.getLineItemCount('item');
			
			//Loop through line items
			
			for (var i=1;i<=lineCount; i++) {
				
				//select each line item
				recLoad.selectLineItem('item', i);
				var itemText = recLoad.getCurrentLineItemText('item', 'item');
				//view and remove the inventory detail record
				recLoad.viewCurrentLineItemSubrecord('item', 'inventorydetail');
				recLoad.removeCurrentLineItemSubrecord('item', 'inventorydetail');
				
				//get allocation record
				var allocRec = recLoad.getCurrentLineItemValue('item', 'custcol_allocation_record');
				
				//if allocation record exists
				if (allocRec && allocRec != '') {
					//Set the delete flag on the allocation record.  
					//This will cause the record to show up in the Allocation Records to Delete search that will be processed by the scheduled script 
					nlapiSubmitField('customrecord_allocation_record', allocRec, 'custrecord_ar_delete', 'T');
					//nlapiDeleteRecord('customrecord_allocation_record', allocRec);
				}
				
				//Set the line to closed, remove container and allocation record linkes
				
				var fulfilled = recLoad.getCurrentLineItemValue('item', 'quantityfulfilled');
				if (fulfilled == 0) {
					recLoad.setCurrentLineItemValue('item', 'isclosed', 'T');
				} else {
					recLoad.setCurrentLineItemValue('item', 'isclosed', 'F');
				}
				recLoad.setCurrentLineItemValue('item', 'isclosed', 'T');
				recLoad.setCurrentLineItemValue('item', 'custcol_container', '');
				recLoad.setCurrentLineItemValue('item', 'custcol_allocation_record', '');
				Util.console.log(status, 'status');
				Util.console.log(status.search('Partial'), 'status search');
				//if the status is partial, set the quantity to match the fulfilled.  If there is no quantity, close the line, else keep open.
				//the idea is to set the status to "Pending Billing" or "Billed" if there have already been fulfilled/invoiced quantity
				if (status.search('Partial')  != -1) {
					
					var fulfilled = recLoad.getCurrentLineItemValue('item', 'quantityfulfilled');
					//var quanFulfilled = nlapiGetLineItemValue('item', 'quantityfulfilled', i);
					Util.console.log(fulfilled, 'fulfilled');
					//Util.console.log(quanFulfilled, 'quanFulfilled');
					if (fulfilled && fulfilled != '') {
						if (fulfilled == 0) {
							Util.console.log('in T');
							recLoad.setCurrentLineItemValue('item', 'isclosed', 'T');
						} else {
							Util.console.log('in F');
							recLoad.setCurrentLineItemValue('item', 'isclosed', 'F');
						}
						
						recLoad.setCurrentLineItemValue('item', 'quantity', fulfilled);
					}
					
					//if the item is freight and order has been partially fulfilled/billed, do not close item
					
					Util.console.log(itemText, 'item Text');
					if (itemText.search('Freight') != -1) {
						recLoad.setCurrentLineItemValue('item', 'isclosed', 'F');
					}
					
				} 
				
				//Commit line item
				recLoad.commitLineItem('item');
				
				/********
				 * New Freight Logic 1/1/2018
				 * 1. If all lines have no Fulfilled or Invoiced quantity, that would indicate that there is no applying transaction at all (i.e Applying Transaction is none)
				 * OR
				 * 2. Close Reason Code = Color Approval Rejected (ID = 6)
				 ********/
				//if the item is freight and order has been partially fulfilled/billed, do not close item
				
				//var itemText = recLoad.getCurrentLineItemText('item', 'item');
				var closeReason = recLoad.getFieldValue('custbody_close_reason_code');
				
				var lineCount = recLoad.getLineItemCount('item');
				var fFulfilled = '';
				var fInvoiced = '';
				var hasBilled = false;
				for (var n=1; n<=lineCount; n++) {
					recLoad.selectLineItem('item', n);
					fFulfilled = recLoad.getCurrentLineItemValue('item', 'quantityfulfilled');
					fInvoiced = recLoad.getCurrentLineItemValue('item', 'quantityinvoiced');
					Util.console.log(fFulfilled + '-' + fInvoiced, 'Fulfilled and Invoiced');
					if (fFulfilled > 0 || fInvoiced > 0) {
						hasBilled = true;
					}
					
				}
				Util.console.log(itemText, 'item Text');
				if (itemText.search('Freight') != -1 && (closeReason == 6 || closeReason == 8 || !hasBilled)) {
					recLoad.selectLineItem('item', i);
					recLoad.setCurrentLineItemValue('item', 'isclosed', 'T');
					recLoad.commitLineItem('item');
				}
				
				/*******
				 * End New Freight Logic
				 *******/
				
				
				
			}
			
			var amountUnbilledDyn = recLoad.getFieldValue('custbody_amount_unbilled');
			recLoad.setFieldValue('custbody_amount_unbilled_stored', amountUnbilledDyn);
			//Submit the sales order
			var param = nlapiSubmitRecord(recLoad);
			//var recLoad = nlapiLoadRecord('salesorder', param);
			//If the sales order was successfully saved
			if (param && param != '') {
				
				//Schedule the Delete Allocation records scheduled script
				nlapiScheduleScript('customscript_close_so_delete_alloc', 'customdeploy1');
				
				//Redirect the user back to the sales order
				if (ctx && ctx != '') {
					return 'Yes';
				} else {
					nlapiSetRedirectURL('RECORD', 'salesorder', param);
				}
				
			}
		}
	}
	
	
	
	
	
}


function schWorkflowSL ( ctx, prm) {
	
	//Get sales order record ID parameter
	var param = prm;
	
	Util.console.log('in running sch workflow');
	//if param exists, proceed
	if (param && param != '') {
		
		//Load record and get the status
		//var recLoad = nlapiLoadRecord('salesorder', param, {recordmode: 'dynamic'});
		var status = nlapiGetFieldValue('status');
		
		//If the status is not closed
		if (status  != 'Closed') {
			
			Util.console.log(nlapiGetFieldValue('custbody_amount_unbilled'), 'Amount Unbilled Before');
			//Get line item count
			var lineCount = nlapiGetLineItemCount('item');
			
			//Loop through line items
			
			for (var i=1;i<=lineCount; i++) {
				
				//select each line item
				nlapiSelectLineItem('item', i);
				
				//view and remove the inventory detail record
				nlapiViewCurrentLineItemSubrecord('item', 'inventorydetail');
				nlapiRemoveCurrentLineItemSubrecord('item', 'inventorydetail');
				
				//get allocation record
				var allocRec = nlapiGetCurrentLineItemValue('item', 'custcol_allocation_record');
				
				//if allocation record exists
				if (allocRec && allocRec != '') {
					//Set the delete flag on the allocation record.  
					//This will cause the record to show up in the Allocation Records to Delete search that will be processed by the scheduled script 
					nlapiSubmitField('customrecord_allocation_record', allocRec, 'custrecord_ar_delete', 'T');
					//nlapiDeleteRecord('customrecord_allocation_record', allocRec);
				}
				
				//Set the line to closed, remove container and allocation record linkes
				
				var fulfilled = nlapiGetCurrentLineItemValue('item', 'quantityfulfilled');
				Util.console.log(fulfilled, 'fulfilled');
				if (fulfilled == 0) {
					Util.console.log('in closed 0');
					nlapiSetCurrentLineItemValue('item', 'isclosed', 'T');
				} else {
					Util.console.log('in closed else');
					nlapiSetCurrentLineItemValue('item', 'isclosed', 'F');
				}
				
				nlapiSetCurrentLineItemValue('item', 'custcol_container', '');
				nlapiSetCurrentLineItemValue('item', 'custcol_allocation_record', '');
				nlapiCommitLineItem('item');
				if (status.search('Partial')  != -1) {
					
					//select each line item
					nlapiSelectLineItem('item', i);
					var fulfilled = nlapiGetCurrentLineItemValue('item', 'quantityfulfilled');
					
					if (fulfilled && fulfilled != '') {
						if (fulfilled == 0) {
							
						} else {
							nlapiSetCurrentLineItemValue('item', 'isclosed', 'F');
						}
						
						nlapiSetCurrentLineItemValue('item', 'quantity', fulfilled);
						
					}
					//Commit line item
					var itemText = nlapiGetCurrentLineItemText('item', 'item');
					nlapiCommitLineItem('item');
					//if the item is freight and order has been partially fulfilled/billed, do not close item
					
					
					
					//if (itemText.search('Freight') != -1) {
					//	nlapiSetCurrentLineItemValue('item', 'isclosed', 'F');
					//}
				
					var closeReason = nlapiGetFieldValue('custbody_close_reason_code');
					
					var lineCount = nlapiGetLineItemCount('item');
					var fFulfilled = '';
					var fInvoiced = '';
					var hasBilled = 'F';
					for (var n=1; n<=lineCount; n++) {
						nlapiSelectLineItem('item', n);
						fFulfilled = nlapiGetCurrentLineItemValue('item', 'quantityfulfilled');
						fInvoiced = nlapiGetCurrentLineItemValue('item', 'quantityinvoiced');
						//Util.console.log(fFulfilled + '-' + fInvoiced, 'Fulfilled and Invoiced');
						if (fFulfilled > 0 || fInvoiced > 0) {
							hasBilled = 'T';
						}
						
					}
					Util.console.log(hasBilled, 'hasBilled');
					Util.console.log(nlapiGetCurrentLineItemValue('item', 'isclosed'), 'is closed before')
					Util.console.log(itemText, 'itemText' + i);
					Util.console.log(itemText.search('Freight'), 'itemText search freight ' + i)
					if (itemText.search('Freight') != -1 && (closeReason == 6 || closeReason == 8 || hasBilled == 'F')) {
						Util.console.log('in if freight');
						nlapiSelectLineItem('item', i);
						nlapiSetCurrentLineItemValue('item', 'isclosed', 'T');
						nlapiSetCurrentLineItemValue('item', 'quantity', 0);
						nlapiCommitLineItem('item');
					} else if (itemText.search('Freight') != -1) {
						Util.console.log('in else if freight');
						nlapiSelectLineItem('item', i);
						nlapiSetCurrentLineItemValue('item', 'isclosed', 'F');
						nlapiCommitLineItem('item');
					}
					
					
					
				}
				
				//Commit line item
				//nlapiCommitLineItem('item');
			}
			
			//Submit the sales order
			//var param = nlapiSubmitRecord(recLoad);
			var amountUnbilledDyn = nlapiGetFieldValue('custbody_amount_unbilled');
			Util.console.log(nlapiGetFieldValue('custbody_amount_unbilled'), 'Amount Unbilled After');
			nlapiSetFieldValue('custbody_amount_unbilled_stored', amountUnbilledDyn);
			//If the sales order was successfully saved
			if (param && param != '') {
				
				//Schedule the Delete Allocation records scheduled script
				nlapiScheduleScript('customscript_close_so_delete_alloc', 'customdeploy1');
				
				//Redirect the user back to the sales order
				if (ctx && ctx != '') {
					Util.console.log('in ctx return');
					//return 'Yes';
				} else {
					Util.console.log('in else return');
					//nlapiSetRedirectURL('RECORD', 'salesorder', param);
					//return 'Yes';
				}
				
			}
		}
	}
	
	
	
	
	
}

/*
 * Workflow Action script
 * Purpose is to initiate Suitelet to perform server-side logic
 */
function closeLines() {
	Util.console.log('running');
	
	//Redirect from the workflow action client script to Suitelet
	var execCtx = nlapiGetContext().getExecutionContext();
	Util.console.log(execCtx, 'execCtx');
	if (execCtx == 'workflow') {
		
	} else {
		
	}
	
	var user = nlapiGetUser();
	Util.console.log(user, 'user');
	if (user < 0) {
		schWorkflowSL( execCtx, nlapiGetRecordId());
		return 'TRUE';
	} else {
		schWorkflowSL( execCtx, nlapiGetRecordId());
		return 'TRUE';
		//nlapiSetRedirectURL('SUITELET', 'customscript_close_so_lines_sl', 'customdeploy1', null, {custpage_recid: nlapiGetRecordId()});
	}
	

	
	
	

}

/*
 * Scheduled script
 * Purpose is to delete the allocation records that were marked as "Delete" by the Suitelet
 * 
 */
function deleteAllocSch() {
	
	//Load "Allocation records to delete" search
	var searchResults = nlapiSearchRecord('customrecord_allocation_record', 'customsearch_alloc_to_delete');
	
	//if results exist
	if (searchResults && searchResults != '') {
		
		//for each record in the search
		for (var i=0; i<searchResults.length; i++) {
			
			try {
				//Delete allocation record
				nlapiDeleteRecord('customrecord_allocation_record', searchResults[i].getId());
			} catch (e) {
				Util.console.log(e.message, 'Error');
			}
			
		}
	}
	
}
