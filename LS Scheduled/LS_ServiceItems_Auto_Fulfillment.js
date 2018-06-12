/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Jan 2016     Manoj
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

 var STATUS_SHIPPED = 'C';
 
function scheduled(type) {

	var search = nlapiSearchRecord('salesorder', 'customsearch_so_auto_fulfil_serviceitems');
	
	if(!search){
		return;
	}
	var soId ='';
	var uniqueSoArray = new Array();

	// form a unique array of results to transform SO into fulfillment
	for(var i=0;i<search.length;i++){
		soId = search[i].getId();
		if(uniqueSoArray.indexOf(soId) == -1){
			uniqueSoArray.push(soId);
		}
	}
	//from unique array of SO, for each so get the lines to be fulfilled
	for(var arrIndex=0;arrIndex<uniqueSoArray.length;arrIndex++){

		var usage = nlapiGetContext().getRemainingUsage();
		//exceed limit issue handled
		if(usage < 500){
			nlapiYieldScript();
		}
		
		try{
			var fulfillmentLines = new Array();
			for(var i=0;i<search.length;i++){
				//lines to be fulfilled
				if(search[i].getId() == uniqueSoArray[arrIndex]){
					fulfillmentLines.push(search[i].getValue('line'));
				}
			}

			if(fulfillmentLines.length>0){

				transformItemFulfillment(uniqueSoArray[arrIndex], fulfillmentLines);
			}
		}
		catch(e){
			nlapiLogExecution('ERROR','Error in auto fullfill of service item for sales order with internaid:'+uniqueSoArray[arrIndex],e.message);
		}
	}
}



function transformItemFulfillment(salesOrdId, linesToFulfill){
	Util.console.log('in item fulfillment');
	var i, lineCount, j, fulfillLineCount, soLine;
	var fulfillLine = false;
	var fulfillcount = 0;
	var itemFulfillmentRec = nlapiTransformRecord('salesorder', salesOrdId, 'itemfulfillment');
	
	var orderHolds = getOrderHolds(salesOrdId);
	
	//order level hold
	if (orderHolds && orderHolds != '') {
		if (orderHolds['order'] == 'T') {
			Util.console.log('in order header hold');
			return;
		}
	}
	
	
	
	nlapiLogExecution('DEBUG', 'Lines To Fulfill', JSON.stringify(linesToFulfill));
	//nlapiLogExecution('DEBUG', 'Line Count');
	for(i = 1, lineCount = itemFulfillmentRec.getLineItemCount('item'); i <= lineCount; i++){

		soLine = itemFulfillmentRec.getLineItemValue('item', 'orderline', i);
		soRefLine = itemFulfillmentRec.getLineItemValue('item', 'custcol_service_ref_line_number', i);
		Util.console.log(soRefLine, 'soRefLine');
		nlapiLogExecution('DEBUG', 'SO Line', soLine);
		for(j = 0, fulfillLineCount = linesToFulfill.length; j < fulfillLineCount; j++){

			if(soLine == linesToFulfill[j]){
				var lineHold = 'F';
				if (orderHolds && orderHolds != '' && orderHolds['line'] && orderHolds['line'] != '') {
					for (var n=0; n<orderHolds['line'].length; n++) {
						if (soLine == orderHolds['line'][n] || soRefLine == orderHolds['line'][n]) {
							Util.console.log(soLine + ': in line level hold');
							lineHold = 'T';
							break;
						}
					}
				}  
				
				if (soRefLine && soRefLine != '') {
					var fulfillLineCount = itemFulfillmentRec.getLineItemCount('item');
					for (var k=1; k<=fulfillLineCount; k++) {
						var lineNumInRef = itemFulfillmentRec.getLineItemValue('item', 'custcol_line_id', k);
						if (soRefLine == lineNumInRef) {
							
							Util.console.log('Hardware not fulfilled');
							lineHold = 'T';
							break;
						}
						
					}
					
				}
				
				if (lineHold == 'F') {
					nlapiLogExecution('DEBUG', 'Line Match');
					fulfillLine = true;
				}
				
			}
		}

		if(fulfillLine === true){

			itemFulfillmentRec.setLineItemValue('item', 'quantity', i, itemFulfillmentRec.getLineItemValue('item', 'quantityremaining', i));
			fulfillLine = false;
			fulfillcount++;
		}else{

			itemFulfillmentRec.setLineItemValue('item', 'itemreceive', i, 'F');
		}
	}
	itemFulfillmentRec.setFieldValue('shipstatus', STATUS_SHIPPED);

	nlapiLogExecution('DEBUG', 'Creating Item Fulfillment', JSON.stringify(itemFulfillmentRec));
	
	if(fulfillcount==0){
		return 0;
	}
	
	return nlapiSubmitRecord(itemFulfillmentRec, true, true);
	
}

function getOrderHolds(salesOrdId) {
	Util.console.log('in order holds');
	var filters = [];
	filters.push(new nlobjSearchFilter('custrecord_hold_instance_sales_order', null, 'anyof', salesOrdId));
	filters.push(new nlobjSearchFilter('custrecord_hold_instance_prevent_action', null, 'anyof', 2)); //fulfillment
	filters.push(new nlobjSearchFilter('custrecord_hold_instance_hold_status', null, 'anyof', 1)); //on hold
	
	var cols = [];
	//cols.push(nlobjSearchColumn('custrecord_hold_instance_sales_order'));
	cols.push(nlobjSearchColumn('custrecord_hold_instance_hold_level'));
	//cols.push(nlobjSearchColumn('custrecord_hold_instance_so_line'));
	
	
	
	var searchResults = nlapiSearchRecord('customrecord_hold_instance', 'customsearch_script_get_hold_status', filters, null);
	Util.console.log(searchResults, 'seachResults');
	if (searchResults && searchResults != '') {
		
		var holdObj = {};
		holdObj['line'] = [];
		holdObj['order'] = '';
		
		var holdLevel = '';
		var holdLine = '';
		
		for (var k=0; k<searchResults.length; k++) {
			
			holdLevel = searchResults[k].getText('custrecord_hold_instance_hold_level');
			holdLine = searchResults[k].getValue('custrecord_hold_instance_so_line');
			if (holdLevel && holdLevel == 'Order') {
				holdObj['order'] = 'T';
			} else if (holdLevel && holdLevel == 'Line') {
				if (!Util.inarray(holdLine, holdObj['line'])) {
					holdObj['line'].push(holdLine);
				}
			}
		}
		
		return holdObj;
	} else {
		return '';
	}
	
}