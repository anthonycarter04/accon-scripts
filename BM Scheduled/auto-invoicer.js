/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Oct 2016     carter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function autoInv(type) {

	
	try {
		var searchResults = nlapiSearchRecord('transaction', 'customsearch_auto_invoicing', null, null);
		
		if (searchResults && searchResults != '') {
			Util.console.log(searchResults, 'searchResults');
			for (var z=0;z< searchResults.length;z++) {
				var hasLine = 'F';
				var soId = searchResults[z].getId();
				if (soId && soId != '') {
					
					try {
						
						
						//convert SO to Invoice
						var invRec = nlapiTransformRecord('salesorder', soId, 'invoice');
						
						//get status
						//different logic for pending billing vs Partially Fulfilled
						var status = searchResults[z].getValue('status');
						Util.console.log(status, 'status');
						if (status == 'pendingBillingPartFulfilled') {
							
							//get line item count
							var lineCount = invRec.getLineItemCount('item');
							
							//loop through lines and only add lines that have been invoiced
							/*for (var i=lineCount; i>=1; i--) {
								var item = invRec.getLineItemValue('item', 'item', i);
								var itemText = invRec.getLineItemText('item', 'item', i);
								var unbilled = invRec.getLineItemValue('item', 'quantityremaining', i);
								var quantity = invRec.getLineItemValue('item', 'quantity', i);
								var quanAfterInvoice = unbilled - quantity;
								
								
								
								if (quantity == 0 || itemText.search('Freight') != -1) {
									invRec.removeLineItem('item', i);
								}
								
								Util.console.log('item: ' + itemText +  ' - line:' + i + ' - invoicequan:' + quantity + ' - unbilleduqantity:' + unbilled + ' - quanafterinvoice:' + quanAfterInvoice, 'quantities');
							}*/
							var keepLineArr = [];
							var continueTypes = ['Discount'];
							//will only add freight if total cartons > 2
							var totalCartons = 0;
							//will only add one freight line
							var freightCount = 0;	
							for (var i=1; i<=lineCount; i++) {
								
								var item = invRec.getLineItemValue('item', 'item', i);
								var itemText = invRec.getLineItemText('item', 'item', i);
								var itemType = invRec.getLineItemValue('item', 'itemtype', i);
								var unbilled = invRec.getLineItemValue('item', 'quantityremaining', i);
								var quantity = invRec.getLineItemValue('item', 'quantity', i);
								var quanAfterInvoice = unbilled - quantity;
								Util.console.log('itemtype:' + itemType + ' - item: ' + itemText +  ' - line:' + i + ' - invoicequan:' + quantity + ' - unbilleduqantity:' + unbilled + ' - quanafterinvoice:' + quanAfterInvoice, 'quantities');
								
								if (itemText.search('Freight') != -1) {

									if (keepLineArr.length >0) {
			
										
										var avgCartons = totalCartons/keepLineArr.length;
										
										//if (totalCartons > 2 && freightCount == 0) {
										if (avgCartons > 2 && freightCount == 0) {
											keepLineArr.push(i);
											freightCount += 1;
										}
									}
									
								} else {
									if (quantity > 0) {
										var lineCartons = invRec.getLineItemValue('item', 'custcol_qtyofboxs', i);
										if (!lineCartons || lineCartons == '') {
											lineCartons = 0;
										} else {
											lineCartons = parseFloat(lineCartons);
										}
										totalCartons += lineCartons;
										hasLine = 'T';
										keepLineArr.push(i);
										for (var j=i+1; j<=lineCount; j++) {
											
											var nextItemType = invRec.getLineItemValue('item', 'itemtype', j);
											Util.console.log(nextItemType, 'nextItemType');
											if (Util.inarray(nextItemType, continueTypes)) {
												keepLineArr.push(j);
												break;
											} else if (nextItemType == 'Subtotal') {
												Util.console.log('in subtotal if');
												keepLineArr.push(j);
												
											}
										}
										
									}
								}
								
								
								
								
							}
							
							
							
							Util.console.log(keepLineArr, 'keep line array');
							
							for (var n=lineCount; n>=1; n--) {
								
								if (!Util.inarray(n,keepLineArr)) {
									invRec.removeLineItem('item', n);
								}
								
							}
							
							//set Auto-Invoice type to "Partial"
							invRec.setFieldValue('custbody_auto_invoice_type', 2);
							//Submit Invoice
							if (hasLine == 'T') {
								nlapiSubmitRecord(invRec);
								nlapiSubmitField('salesorder', soId, 'custbody_auto_invoice_error', '');
							}
							
							
						} else {
							//set Auto-Invoice type to "Complete"
							invRec.setFieldValue('custbody_auto_invoice_type', 1);
							nlapiSubmitRecord(invRec);
							nlapiSubmitField('salesorder', soId, 'custbody_auto_invoice_error', '');
						}
						//invRec.setFieldValue('trandate', '11/8/2016');
					
					} catch (e) {
						var soRec = nlapiLoadRecord('salesorder', soId);
						soRec.setFieldValue('custbody_auto_invoice_error', e.message);
						nlapiSubmitRecord(soRec);
						Util.ssError(e);
					}
					
					
					
				}
				
			}
			
		}

	} catch(err) {
		Util.ssError(err);
	}
	
		
}
