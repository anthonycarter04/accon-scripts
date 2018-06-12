/*


	Created By: Craig Killian
	Created on: 4/22/2014

	This script will prepare bundle sales orders to be processes by item subsitution


*/

var TYPE_SOFTWARE = '2';
var LOCATION_SOFTWARE = '81';
var END_OF_GROUP = '0';
var TYPE_HARDWARE = '1';
var TYPE_PHANTOM = '3';

/*var env = nlapiGetContext().getEnvironment();
var account = nlapiGetContext().getCompany();

switch(env){
 case 'PRODUCTION':
		TYPE_SOFTWARE = '2';
		LOCATION_SOFTWARE = '81';

    break;//
  default:
    if(account.match(/_SB2/)){//uat sandbox 2

      TYPE_SOFTWARE = '2';
      LOCATION_SOFTWARE = '5';
    }
    else{
      TYPE_SOFTWARE = '2';
      LOCATION_SOFTWARE = '39';
    }
    break;
}
*/


function beforeSubmitBundleCorrection(type){

	if(type == 'delete'){ return; }

	var decimalCounter = 1;
	var isGroupItem = 'F';
	var i;
	var lineItem, lineId, lineProdType, lineItemType, lineInGroup, groupItem, groupQuantity, itemTypeNative, groupBase, lineRefNum;
	
	
	
	nlapiLogExecution('DEBUG', 'Function Start', type);
	var needsRefNum = 'F';
	for(i = 1; i <= nlapiGetLineItemCount('item'); i++){

		lineItem = nlapiGetLineItemValue('item', 'item', i);
		lineId = nlapiGetLineItemValue('item', 'custcol_line_id', i);
		lineProdType = nlapiGetLineItemValue('item', 'custcol_product_type', i);
		lineItemType = nlapiGetLineItemValue('item', 'custcol_item_type', i);
		lineInGroup = nlapiGetLineItemValue('item', 'ingroup', i);
		lineQuantity = nlapiGetLineItemValue('item', 'quantity', i);
		itemTypeNative = nlapiGetLineItemValue('item', 'itemtype', i);
		lineRefNum = nlapiGetLineItemValue('item', 'custcol_service_ref_line_number', i);
		
		if(lineItem == END_OF_GROUP){

			continue;
		}
		
		if(lineItemType != TYPE_HARDWARE && lineItemType != TYPE_PHANTOM){

			nlapiSetLineItemValue('item', 'location', i, LOCATION_SOFTWARE);
		}

		if(itemTypeNative == 'Group'){

			isGroupItem = 'T';
			groupBase = nlapiGetLineItemValue('item', 'custcol_line_id', i + 1);
			if(groupBase.toString().indexOf('.') == -1){
			
				nlapiSetLineItemValue('item', 'custcol_line_id', i, groupBase);
			}	
				
		}
		else{

			isGroupItem = 'F';
		}

		if(isGroupItem == 'T'){

			nlapiLogExecution('DEBUG', 'Group Item Found', lineItem);
			groupItem = lineItem;
			groupQuantity = lineQuantity;
		}

		else if(groupItem && lineInGroup == 'T'){

			//nlapiLogExecution('DEBUG', 'Counter', decimalCounter);
			nlapiLogExecution('DEBUG', 'lineId', lineId);
			if(lineId.toString().indexOf('.') != -1){

				nlapiLogExecution('DEBUG', 'Decimal Found');
				continue;
			}	
			lineId = lineId.toString() + '.' + decimalCounter.toString();
		
			if (lineItemType == 7 && (lineRefNum == '' || !lineRefNum)) {
				
				needsRefNum = 'T';
				
			}
			

			//nlapiLogExecution('DEBUG', 'lineId', lineId);
 
			nlapiSetLineItemValue('item', 'custcol_line_id', i, lineId);
			nlapiSetLineItemValue('item', 'custcol_group_parent', i, groupItem);
			nlapiSetLineItemValue('item', 'custcol_group_quantity', i, groupQuantity);

			decimalCounter++;
		}
		else{

			nlapiLogExecution('DEBUG', 'Exiting Group');
			groupItem = '';
		}
		nlapiLogExecution('DEBUG', 'Item Type', lineItemType);
		
	}
	
	
	if (needsRefNum == 'T') {
		
		
		var bundCount = {};
		var lineCount = nlapiGetLineItemCount('item');
		for (var l=1; l<=lineCount; l++) {
			itemTypeNative = nlapiGetLineItemValue('item', 'itemtype', l);
			lineId = nlapiGetLineItemValue('item', 'custcol_line_id', l);
			lineInGroup = nlapiGetLineItemValue('item', 'ingroup', l);
			lineItemType = nlapiGetLineItemValue('item', 'custcol_item_type', l);
			if(itemTypeNative == 'Group'){
				var bundInt = Math.floor(lineId);
				bundCount[bundInt] = {'hardware': 0, 'ams': 0};
			} else if (lineInGroup == 'T') {
				if (lineItemType == 1) {
					bundCount[bundInt]['hardware'] +=1; 
				} else if (lineItemType == 7) {
					bundCount[bundInt]['ams'] +=1;
				}
				
			}
			
			
		}
		for (key in bundCount) {
			if (bundCount[key]['hardware'] == 1 && bundCount[key]['ams'] == 1) {
				
			}  else {
				delete bundCount[key];
			}
		}
		
		//Util.console.log(bundCount, 'Bundle Object Item Count');
		
		var lineCount = nlapiGetLineItemCount('item');
		for (var i=1; i<=lineCount; i++) {
			lineItem = nlapiGetLineItemValue('item', 'item', i);
			lineId = nlapiGetLineItemValue('item', 'custcol_line_id', i);
			lineProdType = nlapiGetLineItemValue('item', 'custcol_product_type', i);
			lineItemType = nlapiGetLineItemValue('item', 'custcol_item_type', i);
			lineInGroup = nlapiGetLineItemValue('item', 'ingroup', i);
			lineQuantity = nlapiGetLineItemValue('item', 'quantity', i);
			itemTypeNative = nlapiGetLineItemValue('item', 'itemtype', i);
			lineRefNum = nlapiGetLineItemValue('item', 'custcol_service_ref_line_number', i);
			
			if(lineItem == END_OF_GROUP){

				continue;
			}
			
			if(itemTypeNative == 'Group'){

				isGroupItem = 'T';					
			}
			else{

				isGroupItem = 'F';
			}
			
			if(isGroupItem == 'T'){

				nlapiLogExecution('DEBUG', 'Group Item Found', lineItem);
				groupItem = lineItem;
				groupQuantity = lineQuantity;
			} else if(groupItem && lineInGroup == 'T'){
				var lineInteger = Math.floor(lineId);
				
				if (!bundCount[lineInteger]) {
					
					continue;
					
				} 
				//nlapiLogExecution('DEBUG', 'Counter', decimalCounter);
				nlapiLogExecution('DEBUG', 'lineId', lineId);
				
				if (lineItemType == 7 && (lineRefNum == '' || !lineRefNum)) {
					var subLineCount = nlapiGetLineItemCount('item');
					if (lineId && lineId != '') {
						
						
						
						var foundHardware = 'F';
						for (var j=1; j<=subLineCount; j++) {
							
							var subLineInGroup = nlapiGetLineItemValue('item', 'ingroup', j);
							if (subLineInGroup == 'T') {
								var subLineId = nlapiGetLineItemValue('item', 'custcol_line_id', j);
								subLineIdInteger = Math.floor(subLineId);
								var subLineType = nlapiGetLineItemValue('item', 'custcol_item_type', j);
								
								
								
								if (subLineIdInteger == lineInteger && subLineType == 1 ) {
									
									foundHardware = 'T';
									break;
								}
							}
							
						}
						
						if (foundHardware = 'T') {
							nlapiSetLineItemValue('item', 'custcol_service_ref_type', i, 1); //AMS - Current Order
							nlapiSetLineItemValue('item', 'custcol_service_ref_line_number', i, subLineId);
							
							var term = nlapiGetLineItemValue('item', 'custcol_term', i);
							var requestDate = nlapiGetLineItemValue('item', 'custcol_request_date', i);
							if (term && term != '' && requestDate && requestDate != '') {
								
								  var startDate = new Date(requestDate);
								  term = term*12;
							      var endDate = nlapiAddMonths(startDate, term);
							      var endDate = nlapiAddDays(endDate, -1);

							      startDate = nlapiDateToString(startDate);
							      endDate = nlapiDateToString(endDate);
							      
							      nlapiSetLineItemValue('item', 'custcol_service_start_date', i, startDate);
							      nlapiSetLineItemValue('item', 'custcol_service_end_date', i, endDate);
							      
								
							}
							
							
						}
					}
					
					
				}

			}
			else{

				nlapiLogExecution('DEBUG', 'Exiting Group');
				groupItem = '';
			}
			nlapiLogExecution('DEBUG', 'Item Type', lineItemType);
			
			
			
		}
	}
	
	
	
	
}