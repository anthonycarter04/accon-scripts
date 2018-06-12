/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Jul 2017     carter
 *
 */

/**
 * @returns {Void} Any or no return value
 */
function addHoldFee() {
	Util.console.log(nlapiGetFieldValue('custbody_amount_unbilled'), 'Amount Unbilled Before');
	//Add subtotal item
	nlapiSelectNewLineItem('item');
	nlapiSetCurrentLineItemValue('item', 'item', -2);
	nlapiCommitLineItem('item')
	//Add hold fee
	nlapiSelectNewLineItem('item');
	nlapiSetCurrentLineItemValue('item', 'item', 18975);
	nlapiCommitLineItem('item')
	
	
	
	var amountUnbilledDyn = nlapiGetFieldValue('custbody_amount_unbilled');
	
	Util.console.log(amountUnbilledDyn, 'Amount Unbilled After');
	nlapiSetFieldValue('custbody_amount_unbilled_stored', amountUnbilledDyn);
	
	
}
