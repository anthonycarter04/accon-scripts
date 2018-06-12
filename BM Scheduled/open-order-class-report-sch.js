/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2017     carter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function openOrderSCH(type) {
	
	//establish field variables
	var classPriority = '';
	var openOrderClass = '';
	var classGroup = '';
	var orderCount = '';
	var amountUnbilled = '';
	var totalAmount = '';
	var trueOrder = '';
	var so = '';
	var rep = '';
	var repCat = '';
	var context = nlapiGetContext();
	
	//establish record variable
	var reportRec = '';
	var date = new Date();
	date = nlapiDateToString(date, 'date');
	
	//get results from Open Order Classifications search
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_open_order_class_report_v2');
	
	//if search results, proceed
	if (searchResults && searchResults != '') {
		
		//loop through results and create a custom record entry for each search result
		for (var i=0; i< searchResults.length; i++) {
			
			//get field values from search
			classPriority = searchResults[i].getValue('custrecord_class_priority', 'custbody_open_so_class', 'group' );
			openOrderClass = searchResults[i].getValue('custbody_open_so_class', null, 'group' );
			classGroup = searchResults[i].getValue('custbody_class_group', null, 'group' );
			orderCount = searchResults[i].getValue('number', null, 'count' );
			amountUnbilled = searchResults[i].getValue('amountunbilled', null, 'sum' );
			totalAmount = searchResults[i].getValue('amount', null, 'sum' );
			trueOrder = searchResults[i].getValue('custrecord_true_order', 'custbody_open_so_class', 'group');
			so = searchResults[i].getValue('internalid', null, 'group');
			terr = searchResults[i].getValue('custentity_territory', 'partner', 'group');
			repCat = searchResults[i].getValue('custbody_srp_category', null, 'group');
			
			//create open order custom record entry and set fields from search
			reportRec = nlapiCreateRecord('customrecord_open_order_class_report');
			reportRec.setFieldValue('custrecord_classrept_priority', classPriority );
			reportRec.setFieldValue('custrecord_classrept_classification', openOrderClass );
			reportRec.setFieldValue('custrecord_classrept_classgroup', classGroup );
			reportRec.setFieldValue('custrecord_classrept_ordercount', orderCount );
			reportRec.setFieldValue('custrecord_classrept_unbilled', amountUnbilled );
			reportRec.setFieldValue('custrecord_classrept_totalamount', totalAmount );
			reportRec.setFieldValue('custrecord_classrept_reportdate', date);
			reportRec.setFieldValue('custrecord_classrept_trueorder', trueOrder);
			reportRec.setFieldValue('custrecord_classrept_salesorder', so);
			reportRec.setFieldValue('custrecord_classrept_territory', terr);
			reportRec.setFieldValue('custrecord_classrept_repcat', repCat);
			nlapiSubmitRecord(reportRec);

			//Yield the script if it is getting close to governance units
			var usage = context.getRemainingUsage();
			if (usage && usage < 500) {
				nlapiYieldScript();
			}
			
		}
		
	}
	
}
