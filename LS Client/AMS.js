/*
	Created by: The New Office, Inc.
				Brendan Flaherty
				
				NP 11/14/17 - commented out 60 days and 7 year warning and holds, added check to see if override checkbox was checked and if it is do not override start and end dates 
				BA-52 - AMS date autocal changes
				1-23-18 HELP-907 - changes to allow override of one date only or both dates 

*/

var AMS_TYPE = '7';
var STATUS_SOLD_OUT = '2';
var APPLY_DATE_HOLD = '1';

//Reference Types
var AMS_CURRENT_ORDER = '1';
var AMS_PREVIOUS_ORDER = '2';
var AMS_SERIAL_NUMBER = '3';

var AMS_BASIC = '14';

var CUSTOM_DISCOUNT = '-1';

var OVERRIDE_START_DATE_ONLY = '1';
var OVERRIDE_END_DATE_ONLY = '2';
var OVERRIDE_START_AND_END = '3';

var TYPE_MAP = {
	'Assembly':		'assemblyitem',
	'Group':		'itemgroup',
	'InvtPart':		'inventoryitem',
	'NonInvtPart':	'noninventoryitem',
	'Service':		'serviceitem'
};

function amsCurrentOrder() {
	
	/*
	a) AMS is ordered with new hardware/Install Base (IB)
	- default the start of the coverage to the order date

	b) AMS is ordered for the FIRST TIME on an existing IB
	- default the start of the coverage default to the EARLIER of Sales Out date (if it exists) or order date

	c) AMS is being ordered for an IB that has a current service contract in place
	- default the start of the coverage default to the lastest existing coverage end date + 1 day

	d) AMS is being ordered for an IB that has a lapsed service contract
	- default the start of the coverage to the order date
	*/


	var amount, columns, today, data, diffDays, endDate, endDateString, filters, installBase,
	installBaseEndDate, installBaseId, installBaseItemId, installBaseParent,
	installBaseSerialNumber, item, lineItemCount, lineNum, productType, months, oneDay, contractCost,
	contractLength, previousOrder, productFamilyAMS, productFamilyReferenceItem, productQuantity,
	prorateAmount, quantity, rate, referenceItemId, referenceItem, referenceItemType, referenceLineNum,
	referenceOrderNum, referenceType, results, revRecEndDate, serialNumber, serviceEndDate, daysPast,
	serviceStartDate, startDate, startDateString, tempEndDate, term, discount, ibCreatedDate, serviceDateOverride, installBaseAMSStart;

	var context = nlapiGetContext();
	var amsDayRenewalMax = context.getSetting('SCRIPT', 'custscript_ams_day_limit');
	var amsMonthRenewalMax = context.getSetting('SCRIPT', 'custscript_ams_month_limit');
	var addHold = false;
	var pastDayMax = false;
	var orderDate = nlapiGetFieldValue("trandate");
	//track if this is first service contract against an install base
	var firstServiceContract = false;
	var fulfillmentShipDate = null;
	var overrideType = nlapiGetCurrentLineItemValue('item', 'custcol_bpc_service_date_override_typ');
	//nlapiLogExecution('DEBUG', 'AMS Renewal Day/Month Max', amsDayRenewalMax + ' / ' + amsMonthRenewalMax);

	item = nlapiGetCurrentLineItemValue('item', 'item');
	if(!item) {
		return true;
	}

	data = nlapiLookupField('item', item, ['custitem_product_family', 'custitem_item_type', 'custitem_term', 'custitem_warranty_type']);

	productType = data.custitem_item_type;
	referenceType = nlapiGetCurrentLineItemValue('item', 'custcol_service_ref_type');
	term = data.custitem_term;
	productQuantity = nlapiGetCurrentLineItemValue('item', 'quantity');
	serviceDateOverride = nlapiGetCurrentLineItemValue('item', 'custcol_manual_override');
	rate = nlapiGetCurrentLineItemValue('item','rate');
	discount = nlapiGetCurrentLineItemValue('item','price');
	serviceStartDate = nlapiGetCurrentLineItemValue('item','custcol_service_start_date');
	serviceEndDate = nlapiGetCurrentLineItemValue('item','custcol_service_end_date');
	referenceLineNum = nlapiGetCurrentLineItemValue('item', 'custcol_service_ref_line_number');
	productFamilyAMS = data.custitem_product_family;
	warrantyType = data.custitem_warranty_type;

	 //alert(warrantyType);
	//nlapiLogExecution('DEBUG', 'Discount Id', discount);
	//exit if item is not AMS
	if(productType !== AMS_TYPE) {
		return true;
	}

	if(!term) {
		alert('Term is required for all AMS items');
		return false;
	}
	term = parseInt(term, 10);

	//make sure it has a Reference Type selected
	if(!referenceType) {
		alert('Reference Type is required for all AMS items');
		return false;
	}
	if(serviceDateOverride == "T" && !overrideType){
		alert("Override checkbox checked but no override selected. Dates will be automatically calculated and override checkbox will be cleared. To override, please select a Service Override Type.");
	}
	// alert(nlapiStringToDate(serviceStartDate) + '  ' + nlapiStringToDate(serviceEndDate));
	//
	// if(serviceEndDate && serviceStartDate && nlapiStringToDate(serviceEndDate).getTime() >= nlapiStringToDate(serviceStartDate).getTime()){
	//
	// 	alert('Service end date is greater than or equal to service start date.');
	// 	return false;
	// }

	today = new Date();
	today.setHours(0, 0, 0, 0);

	//Reference Type is for the Current Order
	if(referenceType === AMS_CURRENT_ORDER) {

		nlapiLogExecution('DEBUG', 'AMS Current Order');

		if(!referenceLineNum) {
			alert('A reference line number must be set for a current order reference type');
			return false;
		}
		
		lineNum = findMatchingCustomLineIndex(referenceLineNum, null);
		
		if(!lineNum) {
			alert('Could not find the reference line number');
			return false;
		}

		quantity = nlapiGetLineItemValue('item', 'quantity', lineNum);

		if(quantity !== productQuantity) {
			alert('The AMS and Item quantities do not match. Quantities must match when the reference type is, "AMS - Current Order".');
			return false;
		}

		referenceItemId = nlapiGetLineItemValue('item', 'item', lineNum);
		productFamilyReferenceItem = nlapiLookupField('item', referenceItemId, 'custitem_product_family');
		
		//if(serviceStartDate){

			//startDate = nlapiStringToDate(serviceStartDate);
		//}
		//else{
		//ams order with new hardware / ib, default to order date BA-52
		startDate = new  Date(orderDate);
		//ams current order - always first service contract - BA-52
		firstServiceContract = true;
		//}

	}
	else if(referenceType === AMS_PREVIOUS_ORDER) {

		if(!referenceLineNum) {
			alert('A reference line number must be set for a a previous order reference type');
			return false;
		}

		referenceOrderNum = nlapiGetCurrentLineItemValue('item', 'custcol_service_ref_order_num');
		if(!referenceOrderNum) {
			alert('If Reference Type is Previous Order then Reference Order# field cannot be blank');
			return false;
		}

		previousOrder = nlapiLoadRecord('salesorder', referenceOrderNum);
		lineItemCount = previousOrder.getLineItemCount('item');
		lineNum = findMatchingCustomLineIndex(referenceLineNum, previousOrder);
		if(!lineNum) {
			alert('Could not find the reference line number');
			return false;
		}

		referenceItemId = previousOrder.getLineItemValue('item', 'item', lineNum);

		//nlapiSubmitField('customrecord_installed_base', ibRec, custrecord_ib_parent_lastmodified, new Date());
		productFamilyReferenceItem = nlapiLookupField('item', referenceItemId, 'custitem_product_family');

		quantity = previousOrder.getLineItemValue('item', 'quantity', lineNum);

		if(quantity !== productQuantity) {
			alert('The AMS and Item quantities do not match. Quantities must match when the reference type is, "AMS - Previous Order".');
			return false;
		}

		filters = [
			new nlobjSearchFilter('custrecord_ib_original_so_line',null,'is', referenceLineNum),
			new nlobjSearchFilter('custrecord_ib_original_so',null,'is',referenceOrderNum),
			new nlobjSearchFilter('custrecord_parent_installed_base',null,'anyof', '@NONE@')
		];
		columns = [
			new nlobjSearchColumn('custrecord_ib_status'),
			new nlobjSearchColumn('custrecord_ib_ams_start_date'),
			new nlobjSearchColumn('custrecord_ib_ams_end_date') ,
			new nlobjSearchColumn('custrecord_ib_date_created'),
			new nlobjSearchColumn('custrecord_parent_installed_base'),
			new nlobjSearchColumn('custrecord_ib_fulfillment'),
			new nlobjSearchColumn('name'),
			new nlobjSearchColumn('custrecord_ib_date_created')
		];

		results = nlapiSearchRecord('customrecord_installed_base', null, filters, columns);
		//nlapiLogExecution('DEBUG', 'Res', results.length);

		if(results){

			var resLength = results.length;
			for(var i = 0; i < resLength; i++){

				//alert(results[i].getValue('custrecord_ib_fulfillment'));

				var ibDateStart = results[i].getValue('custrecord_ib_ams_start_date');
				var ibStatus = results[i].getValue('custrecord_ib_status');
				var ibFulfillment = results[i].getValue('custrecord_ib_fulfillment');
				var installBaseSerialNumber = results[i].getValue('name');
				ibCreatedDate = results[i].getValue('custrecord_ib_date_created');
				installBaseAMSStart = results[i].getValue('custrecord_ib_ams_start_date');
				if(ibStatus === STATUS_SOLD_OUT){

					alert('Sales out has already be reported for the referenced line. Please use reference serial numbers for service contract extensions.');
					return false;
				}
				if(ibDateStart){

					alert('Initial AMS has already been purchased for referenced sales order line. Please use reference serial numbers for service contract extensions.');
					return false;
				}
			}

			filters = [new nlobjSearchFilter('custrecord_sales_out_serial_number', null, 'is', installBaseSerialNumber)];
			columns = [new nlobjSearchColumn('custrecord_sales_out_date')];
			results = nlapiSearchRecord('customrecord_sales_out',null,filters,columns);


			if(results){

				fulfillmentShipDate = results[0].getValue('custrecord_sales_out_date');
			}
			/*
			else{
				//alert(ibFulfillment);
				fulfillmentShipDate = nlapiDateToString(today);
			}
			*/
		}
	}
	else if(referenceType === AMS_SERIAL_NUMBER) {

		nlapiLogExecution('DEBUG', 'Serial Refrence');

		installBaseId = nlapiGetCurrentLineItemValue('item','custcol_serial');

		if(!installBaseId) {

			installBaseId = nlapiGetCurrentLineItemValue('item', 'custcol_install_base');

			if(!installBaseId){

				alert('If the Reference Type is "AMS - Serial Number", then the Install Base or Serial Number must be populated');
				return false;
			}
		}
		else{

			blackListed  = nlapiLookupField('customrecord_installed_base', installBaseId, 'custrecord_not_ams_eligable');
			if(blackListed == 'T'){

				alert('This installed base has been black listed.');
				return false;
			}
		}

		installBaseFields = nlapiLookupField('customrecord_installed_base', installBaseId, ['custrecord_parent_installed_base', 'custrecord_ib_item', 'custrecord_ib_serial_number', 'custrecord_ib_ams_end_date', 'custrecord_ib_fulfillment', 'custrecord_ib_date_created', 'custrecord_ib_install_date', 'custrecord_ib_ams_start_date']);
		installBaseParent = installBaseFields.custrecord_parent_installed_base;

		if(installBaseParent) {

			installBaseFields = nlapiLookupField('customrecord_installed_base', installBaseParent, ['custrecord_parent_installed_base', 'custrecord_ib_item', 'custrecord_ib_serial_number', 'custrecord_ib_ams_end_date', 'custrecord_ib_fulfillment', 'custrecord_ib_date_created', 'custrecord_ib_install_date', 'custrecord_ib_ams_start_date']);
		}

		var ibFulfillment = installBaseFields.custrecord_ib_fulfillment;
		installBaseItemId = installBaseFields.custrecord_ib_item;
		installBaseSerialNumber = installBaseFields.custrecord_ib_serial_number;
		installBaseEndDate = installBaseFields.custrecord_ib_ams_end_date;
		installBaseAMSStart = installBaseFields.custrecord_ib_ams_start_date;
		productFamilyReferenceItem = nlapiLookupField('item', installBaseItemId, 'custitem_product_family');
		quantity = nlapiGetCurrentLineItemValue('item', 'quantity');

		filters = [new nlobjSearchFilter('custrecord_sales_out_serial_number', null, 'is', installBaseSerialNumber)];
		columns = [new nlobjSearchColumn('custrecord_sales_out_date')];
		results = nlapiSearchRecord('customrecord_sales_out',null,filters,columns);


		if(results){

			fulfillmentShipDate = results[0].getValue('custrecord_sales_out_date');
		}
		/*
		else{

			fulfillmentShipDate = nlapiDateToString(today);
		}
		*/
		ibCreatedDate = installBaseFields.custrecord_ib_date_created;
		ibInstalledDate = installBaseFields.custrecord_ib_install_date;

		if(ibCreatedDate && ibInstalledDate && nlapiStringToDate(ibCreatedDate) > nlapiStringToDate(ibInstalledDate)){

				ibCreatedDate = ibInstalledDate;
		}
		//alert(ibCreatedDate);
		//nlapiLogExecution('DEBUG', 'Ship Date', fulfillmentShipDate);

		if(!installBaseSerialNumber) {
			alert('If the reference type is, "AMS - Serial Number", then the "Reference Serial Number" field must be populated');
			return false;
		}

		if(quantity !== '1') {

			//nlapiLogExecution('DEBUG', 'Quantity', quantity);
			alert('Only quantity values of "1" are allowed when linking AMS to an individual installed base.');
			return false;
		}
	}
	else {
		alert('AMS items must have a reference type of Current Order, Previous Order, or Serial Number');
		return false;
	}

	nlapiLogExecution('DEBUG', 'Start Date', startDate);

	if(productFamilyAMS !== productFamilyReferenceItem) {
		alert('The AMS Product Family "' + productFamilyAMS + '" does not match the "Product Family" for the Item you are referencing "' + productFamilyReferenceItem + '"');
		return false;
	}

	if((referenceType === AMS_SERIAL_NUMBER || referenceType == AMS_PREVIOUS_ORDER) /*&& warrantyType != AMS_BASIC*/){
		/*
			BA-52
			NP - remove all logic for AMS serial number and previous order
		if(installBaseEndDate && today > nlapiAddDays(nlapiStringToDate(installBaseEndDate), amsDayRenewalMax)){
			//NP - 11-14-17 commenting out 60 days warning and hold
			//daysPast = daysBetween(nlapiAddDays(nlapiStringToDate(installBaseEndDate), amsDayRenewalMax), today);
			//alert('The referenced installed base has been expired for ' + daysPast + ' days more than the ' + amsDayRenewalMax + ' day renewal limit. The line start date will be adjusted to expiration date of the previous AMS contract, and put on hold.');
			//addHold = true;
			//pastDayMax = true;
			//startDate = nlapiStringToDate(installBaseEndDate);
			//startDate = nlapiAddDays(startDate, 1);
			//alert(installBaseEndDate);
		}
		if(installBaseEndDate && today > nlapiAddMonths(nlapiStringToDate(ibCreatedDate), amsMonthRenewalMax)){
			//NP - 11-14-17 commenting out 7 year warning and hold
			//daysPast = daysBetween(nlapiAddMonths(nlapiStringToDate(ibCreatedDate), amsMonthRenewalMax), today);
			//alert('Service start date is ' + daysPast + ' days more than the allowed ' + amsMonthRenewalMax / 12 + ' year renewal limit. The line start date will be set to the expiration date of the previous AMS contract, and put on hold.');
			//addHold = true;
			//startDate = nlapiStringToDate(installBaseEndDate);
			//startDate = nlapiAddDays(startDate, 1);
		}
		else if(installBaseEndDate && !serviceStartDate) {
			
			startDate = nlapiStringToDate(installBaseEndDate);
			startDate = nlapiAddDays(startDate, 1);
		}
		else if(serviceStartDate){

			if(installBaseEndDate){

				installBaseEndDate = nlapiAddDays(nlapiStringToDate(installBaseEndDate), 1);

			 	if(serviceStartDate != nlapiDateToString(installBaseEndDate)){
					//NP - surpressing alerts related to ib expiration dates if dates are being overriden
					if(serviceDateOverride != "T"){
						alert('Service start date is not equal to expiration date of the previous AMS contract. The line start date will be adjusted to the previous AMS contract end date.');
					}
					startDate = installBaseEndDate;
				}
				else{

					startDate = nlapiStringToDate(serviceStartDate);
				}
			}
			else if(!installBaseEndDate && serviceStartDate != fulfillmentShipDate){
					//NP - surpressing alerts related to ib expiration dates if dates are being overriden
				if(serviceDateOverride != "T"){
					alert(('Service start date is not equal to ship date of the referenced installed base. The line start date will be adjusted to ship date of the installed base.'));
				}
				nlapiLogExecution('DEBUG', 'Start Date / Full Date', serviceStartDate + ' / ' + fulfillmentShipDate);
				startDate = nlapiStringToDate(fulfillmentShipDate);
			}
			else{

				startDate = nlapiStringToDate(serviceStartDate);
			}
		}
		else{
	
			startDate = nlapiStringToDate(fulfillmentShipDate);
		}
		*/
		//NP 11-17-17 new start date logic - BA-52
		//if first service contract against this install base, use sales out date or orderdate
		nlapiLogExecution("DEBUG", "installBaseAMSStart", installBaseAMSStart);
		if(!installBaseAMSStart){
			//no ams on this install base, first service contract
			firstServiceContract = true;
		}
		else{
			//BA-52 ib has ams, see if it is expired or not
			//if it's expired, then use today as the date - this may change back in future, if so, it would just be installBaseEndDate + 1
			if(installBaseEndDate){
				nlapiLogExecution("DEBUG", "installBaseEndDate", installBaseEndDate);
				nlapiLogExecution("DEBUG", "today", today);
				if(today.getTime() > new Date(installBaseEndDate).getTime()){
					//expired
					startDate = new Date(orderDate);
				}
				else{
					//not expired
					startDate = nlapiAddDays(new Date(installBaseEndDate), 1);
				}
			}
			else{
				//fall through here, no install base end date,
				alert("No AMS end date on parent install base. Using Order Date as Start Date.");
				startDate = new Date(orderDate);
			}
		}

	}
	/*
	//NP - treating all AMS the same now
	else if(warrantyType == AMS_BASIC){

		if(serviceStartDate){

			startDate = nlapiStringToDate(serviceStartDate);
		}
		else{
			startDate = today;
		}
	}
	*/
	//NP - 11-17-17 - first contract on IB (ams current order or ams start date on ib is empty) - lesser of sales out (if it exists) or order date
	//if sales out date on install base, compare against order date to see which is the most recent, otherwise it's just order date
	//BA-52
	nlapiLogExecution("DEBUG", "sales out date", fulfillmentShipDate);
	if(firstServiceContract == true){
		if(fulfillmentShipDate){
			fulfillmentShipDate = new Date(fulfillmentShipDate);
			if(fulfillmentShipDate.getTime() < new Date(orderDate).getTime()){
				startDate = fulfillmentShipDate;
			}
			else{
				startDate = new Date(orderDate);
			}
		}
		else{
			startDate = new Date(orderDate);
		}
	}
	//BA-52 - removing past days max and !service end date - user must override to allow this to work
	//if start date was overridden, use it
	if(serviceStartDate && (overrideType == OVERRIDE_START_DATE_ONLY || overrideType == OVERRIDE_START_AND_END)){
		startDate = new Date(serviceStartDate);
	}
	//if(!serviceEndDate) {

		//if(pastDayMax){

			//endDate = nlapiAddDays(nlapiAddMonths(today, (term * 12)), -1);
		//}
		//else{
		if(serviceEndDate && (overrideType == OVERRIDE_END_DATE_ONLY || overrideType == OVERRIDE_START_AND_END)){
			endDate = new Date(serviceEndDate);
		}
		else{
			endDate = nlapiAddDays(nlapiAddMonths(startDate, (term * 12)), -1);
		}
		//}
	//}
	//else{

		//endDate = nlapiStringToDate(serviceEndDate);
	//}

	nlapiLogExecution('DEBUG', 'Start Date / End Date - ', startDate + ' / ' + endDate);

	//if service date override = true and entered start date is more than 90 days away, alert user - BA-52
	if(overrideType == OVERRIDE_START_DATE_ONLY || overrideType == OVERRIDE_START_AND_END){
		//if first service  contract, user cannot override start date
		if(firstServiceContract){
			alert("This is the first contract for this install base. You should not override the start date");
			//nlapiSetCurrentLineItemValue('item', 'custcol_service_start_date', nlapiDateToString(startDate));
		}
		var currentStartDate = nlapiGetCurrentLineItemValue('item','custcol_service_start_date');
		if(currentStartDate){
			var todayPlus90 = nlapiAddDays(new Date(), 90);
			currentStartDate = new Date(currentStartDate);
			if(todayPlus90.getTime() < currentStartDate.getTime()){
				alert("Warning: You have entered a services start date that is more than 90 days from the current date.");
			}
			
		}

	}
	
	//NP added - if service date override is checked, do not override dates - BA-52, and additional validations and usage in proration

	nlapiSetCurrentLineItemValue('item', 'custcol_service_start_date', nlapiDateToString(startDate), false);
	nlapiSetCurrentLineItemValue('item', 'custcol_service_end_date', nlapiDateToString(endDate), false);

	if(overrideType == OVERRIDE_START_AND_END || overrideType == OVERRIDE_START_DATE_ONLY || overrideType == OVERRIDE_END_DATE_ONLY){
		//if start date is overridden, then use start and end date entered for proration
		startDate = new Date(nlapiGetCurrentLineItemValue('item','custcol_service_start_date'));
		//if end date is overriden use it, otherwise use calculated end date and set that as end date
		if(nlapiGetCurrentLineItemValue('item','custcol_service_end_date')){
			endDate = new Date(nlapiGetCurrentLineItemValue('item','custcol_service_end_date'));
			//validate that end date is not before start date
			if(endDate.getTime() < startDate.getTime()){
				alert("You have entered an end date that is earlier than the start date");
			}
			//validate that end date is not in the past
			if(endDate.getTime() <= today.getTime()){
				alert("The end date is in the past");
			}
		}
	}
	if(overrideType){
		nlapiSetCurrentLineItemValue('item', 'custcol_manual_override', "T", false);
	}
	else{
		nlapiSetCurrentLineItemValue('item', 'custcol_manual_override', "F", false);
	}

	//months = monthDiff(startDate, endDate);

	//revRecEndDate = getRevRecEndDate(serviceStartDate,months);
	//if(revRecEndDate) {
		//nlapiSetCurrentLineItemValue('item','revrecenddate', revRecEndDate);
	//}

	//Contract length different than term, need to pro-rate the price

	oneDay = 24*60*60*1000;
	tempEndDate = startDate;
	tempEndDate = nlapiAddDays(nlapiAddMonths(tempEndDate, (term * 12)), -1);
	diffDays = Math.round((tempEndDate - endDate)/oneDay);
	contractLength = Math.round((tempEndDate - startDate)/oneDay);
	//alert(rate + ' * ' + productQuantity);
	contractCost = rate * productQuantity;
	//alert(contractCost);
	//Pro-rate price, crediting the remainder of the current subscription rate
	//and charging the new upgraded rate for the same remaining time period of the subscription
	nlapiLogExecution('DEBUG', 'Diff Days', diffDays);
	//if(serviceDateOverride != "T"){
		if(diffDays) {
			if(discount == CUSTOM_DISCOUNT){
				//Keep entered value
				nlapiLogExecution('DEBUG', 'Custom Discount Entered')
			}
			else if(contractCost && contractCost !== 0) {
				//Update the rate
				prorateAmount = (contractCost / contractLength) * diffDays;
				amount = contractCost - prorateAmount;
				nlapiSetCurrentLineItemValue('item', 'amount', amount);
			}
			else {
				alert('AMS price pro-rating requires a price to be set');
				return false;
			}
		}
		else{

			nlapiSetCurrentLineItemValue('item', 'amount', contractCost);
		}
	//}

	nlapiLogExecution('DEBUG', 'Add Hold', addHold);

	if(addHold == true){

		nlapiSetCurrentLineItemValue('item','custcol_line_hold', APPLY_DATE_HOLD);
	}
	else{

		nlapiSetCurrentLineItemValue('item','custcol_line_hold', '');
	}

	return true;
}


function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
}

function findMatchingCustomLineIndex(salesOrderLineId, salesOrder) {
	var i;

	if(salesOrder) {
		for(i = 1; i <= salesOrder.getLineItemCount('item'); i += 1) {
			
			
			//AC - BIZ-529 fix.  should not be parsing the integer
			//if(salesOrder.getLineItemValue('item','custcol_line_id',i) == parseInt(salesOrderLineId)) {
			if(salesOrder.getLineItemValue('item','custcol_line_id',i) == salesOrderLineId) {
				return i;
			}
		}
	}
	else {
		for(i = nlapiGetLineItemCount('item'); i > 0; i -= 1) {
			//AC - BIZ-529 fix.  should not be parsing the integer
			//if(nlapiGetLineItemValue('item', 'custcol_line_id', i) == parseInt(salesOrderLineId)) {
			if(nlapiGetLineItemValue('item', 'custcol_line_id', i) == salesOrderLineId) {
				return i;
			}
		}
	}

	return null;
}

function fieldChangeAmsSerialNumber(type, name, linenum) {
	var installBase, installBaseId, installBaseParent, serialNumber;

	if(name === 'custcol_serial') {
		serialNumber = nlapiGetCurrentLineItemValue('item','custcol_serial');
		if(serialNumber) {
			installBase = nlapiLoadRecord('customrecord_installed_base', serialNumber);
			installBaseParent = installBase.getFieldValue('custrecord_parent_installed_base');
			if(installBaseParent) {
				installBase = nlapiLoadRecord('customrecord_installed_base', installBaseParent);
			}
			installBaseId = installBase.getId();
			nlapiSetCurrentLineItemValue('item', 'custcol_install_base', installBaseId, true);
		}
	}
	if(name === 'custcol_install_base'){
		var serialNumber = nlapiGetCurrentLineItemValue('item','custcol_serial');
		if(serialNumber){
			amsCurrentOrder();
		}
	}
}

function getRevRecEndDate(startDate,numMonths) {
	var filters, columns, results;
	filters = [
		['isyear','is','F'], 'and',
		['isquarter','is','F'], 'and',
		[
			['startdate','onorafter',startDate], 'or',
			['enddate','onorafter',startDate], 'and',
			['startdate','onorbefore',startDate]
		]
	];
	columns = [
		new nlobjSearchColumn('startdate').setSort(false),
		new nlobjSearchColumn('enddate')
	];

	results = nlapiSearchRecord('accountingperiod',null,filters,columns);
	if(results && results.length>=numMonths && numMonths > 0) {
		return results[numMonths-1].getValue('enddate');
	}

      if(results && results.length>=numMonths && numMonths == 0) {
		return results[1].getValue('enddate');
        }

	return null;
}

function treatAsUTC(date) {
	var result = new Date(date);
	result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
	return result;
}

function daysBetween(startDate, endDate) {
	var millisecondsPerDay = 24 * 60 * 60 * 1000;
	return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}
