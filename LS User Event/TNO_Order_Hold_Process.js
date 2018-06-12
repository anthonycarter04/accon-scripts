/*
*
*	This script will control the LifeSize order hold process
*
*	Created By: The New Office, Inc.
*				Craig Killian, Technical Analyst
*
*
*/

// Form constants
var STANDARD_SO_FORM = '101';

//Order status constants
var APPROVED_STATUS = 'B';

//Hold Record Fields
var ON_HOLD = '1';
var HOLD_RELEASED = '2';

//hold types
var CREDIT_HOLD = '101';
var LINE_INVOICE_HOLD = '103';
var LINE_LICENSE_HOLD = '2';
var LINE_AMS_DATE_HOLD = '125';

//Hold status

var APPEOVED_HOLD_STATUS = '1';

//Prevent Typess
var PREVENT_APPROVAL = '1';
var PREVENT_FULFILLMENT = '2';

//Order Types
var ORDER_TYPE_INTERNAL = '1';
var ORDER_TYPE_INTERNAL_RMA = '6';

//Line holds
var APPLY_DATE_HOLD = '1';
var DATE_HOLD_APPLIED = '2';

//This is the order hold driver function. This function will stop orders with holds and initiate hold creation if needed.
function afterSubmitHoldCreationProcess(type){

	if(type == 'delete'){

		nlapiLogExecution('AUDIT', 'TYPE DELETE');
		return;
	}

	//Order level hold variables
	var custFields = [];
	var balWithOrder;
	var creditHold;
	var holdSearchResults = [];

	//Line level hold variables
	var itemFields = [];
	var lineHoldObject = {};
	var lineHoldSearchResults = [];
	var itemId;
	var lineId;
	var serialNumber;
	var parentLineNumber;
	var numLines;
	var lineHoldId;
	var dateHoldValue;
	var saveOrder;
	var i;
	var custARBalance = 0;

	//Geneic variables

	var orderId = nlapiGetRecordId();
	var orderRec =  nlapiLoadRecord('salesorder', orderId);
	var form = orderRec.getFieldValue('customform');
	var orderStatus = orderRec.getFieldValue('orderstatus');
	var customer = orderRec.getFieldValue('entity');
	var orderAmount = orderRec.getFieldValue('total');
	var orderType = orderRec.getFieldValue('custbody_tno_order_type');

	nlapiLogExecution('AUDIT', 'START HOLD FUNCTION');
	nlapiLogExecution('DEBUG', 'ORDER STATUS: ', orderStatus);
	nlapiLogExecution('DEBUG', 'CUSTOMER: ', customer);
	if(orderStatus != APPROVED_STATUS){

		nlapiLogExecution('AUDIT', 'ORDER UNAPPROVED');
		return;
	}

	if(form != STANDARD_SO_FORM){

		nlapiLogExecution('AUDIT', 'NOT A VALID FORM');
		return;
	}

	if(customer){

		custFields = nlapiLookupField('customer', customer, ['balance', 'creditlimit']);
		custARBalance = getCustARBalance(customer);
		Util.console.log(custARBalance, 'custARBalance');
		
		
	}

	if(custFields.creditlimit == null || custFields.creditlimit == ''){

		custFields.creditlimit = 0;
	}
	//This calculates if the customer have enough available credit to cover the current order
	
	nlapiLogExecution('DEBUG', 'CUSTOMER FIELDS', 'CUSTOMER BALANCE: ' + custARBalance.bal + ' CREDIT LIMIT: ' + custFields.creditlimit);
	
	
	//balWithOrder = parseFloat(custFields.balance) + parseFloat(orderAmount);
	balWithOrder = parseFloat(custARBalance.bal) + parseFloat(custARBalance.openord);
	nlapiLogExecution('DEBUG', 'ORDER + BALANCE: ', balWithOrder);

	if(balWithOrder > parseFloat(custFields.creditlimit) && orderType != ORDER_TYPE_INTERNAL && orderType != ORDER_TYPE_INTERNAL_RMA){

		//Search For current holds
		holdSearchResults = checkForExistingHold(CREDIT_HOLD, orderId, false);
		nlapiLogExecution('DEBUG', 'SEARCH RESULTS', JSON.stringify(holdSearchResults));

		if(holdSearchResults){

			nlapiLogExecution('DEBUG', 'CREDIT HOLD EXISTS');
		}
		else{

			createHold(CREDIT_HOLD, orderId, null);

			nlapiLogExecution('AUDIT', 'CREDIT HOLD CREATED', 'ORDER NUMBER: ' + orderId);
		}
	}


	//This is the start of the line level hold process

	numLines = orderRec.getLineItemCount('item');

	lineHoldSearchResults = checkForExistingHold(null, orderId, true);
	nlapiLogExecution('DEBUG', 'LINE HOLD SEARCH RESULTS', JSON.stringify(lineHoldSearchResults));

	if(lineHoldSearchResults){

		lineHoldObject = createLineHoldObject(lineHoldSearchResults);

		nlapiLogExecution('DEBUG', 'LINE HOLD OBJECT', JSON.stringify(lineHoldObject));

	}

	for(i = 1; i <= numLines; i++){

		itemId = orderRec.getLineItemValue('item', 'item', i).toString();
		lineId = orderRec.getLineItemValue('item', 'line', i).toString();
		serialNumber = orderRec.getLineItemValue('item', 'custcol_serial', i);
		parentLineNumber = orderRec.getLineItemValue('item', 'custcol_service_ref_line_number', i);
		dateHoldValue = orderRec.getLineItemValue('item', 'custcol_line_hold', i);


		nlapiLogExecution('DEBUG', 'lineid', lineId);
		//nlapiLogExecution('DEBUG', 'line hold obj', JSON.stringify(lineHoldObject[lineId.toString()]));
		//nlapiLogExecution('DEBUG', 'line hold obj invoice hold', JSON.stringify(lineHoldObject[lineId.toString()][LINE_INVOICE_HOLD]));
		if(itemId && lineId){

			itemFields = nlapiLookupField('item', itemId, ['custitem_stop_ship', 'custitem_eligible_for_invoice_hold', 'custitem_additional_software_capacity', 'custitem_ams']);
			if(!itemFields){ continue; }
			//Invoice hold check and creation start.
			if(itemFields.custitem_eligible_for_invoice_hold == 'T' && lineHoldObject[lineId]){

				if(lineHoldObject[lineId][LINE_INVOICE_HOLD]){

					nlapiLogExecution('DEBUG', 'LINE INVOICE HOLD EXISTS', lineHoldObject[lineId][LINE_INVOICE_HOLD].holdStatus);
				}
				else{

					lineHoldId = createHold(LINE_INVOICE_HOLD, orderId, lineId);
				}
			}
			else if(itemFields.custitem_eligible_for_invoice_hold == 'T' && !lineHoldObject[lineId]){

				lineHoldId = createHold(LINE_INVOICE_HOLD, orderId, lineId);
			}


			//License hold start

			nlapiLogExecution('DEBUG', 'Serial # / Parent Line: ', serialNumber + ' ' + parentLineNumber);

			if((itemFields.custitem_additional_software_capacity == 'T') && (lineHoldObject[lineId]) && (!serialNumber && !parentLineNumber)){

				if(lineHoldObject[lineId][LINE_LICENSE_HOLD]){

					nlapiLogExecution('DEBUG', 'LINE INVOICE HOLD EXISTS', lineHoldObject[lineId][LINE_LICENSE_HOLD].holdStatus);
				}
				else{

					lineHoldId = createHold(LINE_LICENSE_HOLD, orderId, lineId);
				}
			}

			else if(itemFields.custitem_additional_software_capacity == 'T' && !lineHoldObject[lineId] && !serialNumber && !parentLineNumber){

				lineHoldId = createHold(LINE_LICENSE_HOLD, orderId, lineId);
			}

			else if(itemFields.custitem_additional_software_capacity == 'T' && lineHoldObject[lineId]){

				if(lineHoldObject[lineId][LINE_LICENSE_HOLD] && (serialNumber || parentLineNumber)){

					nlapiLogExecution('DEBUG', 'LICENSE HOLD ID', lineHoldObject[lineId][LINE_LICENSE_HOLD].holdPreventAction);

					nlapiSubmitField('customrecord_hold_instance', lineHoldObject[lineId][LINE_LICENSE_HOLD].holdId, 'custrecord_hold_instance_hold_status', HOLD_RELEASED);
				}
			}


			//Date Hold

			if(dateHoldValue == APPLY_DATE_HOLD && lineHoldObject[lineId]){

				if(lineHoldObject[lineId][LINE_AMS_DATE_HOLD] && lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdStatus == HOLD_RELEASED){

					nlapiLogExecution('DEBUG', 'SETTING BACK TO HOLD', lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdStatus);

					nlapiSubmitField('customrecord_hold_instance', lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdId, 'custrecord_hold_instance_hold_status', ON_HOLD);
				}

				else if(lineHoldObject[lineId][LINE_AMS_DATE_HOLD] && lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdStatus == ON_HOLD){

					nlapiLogExecution('DEBUG', 'LINE AMS DATE HOLD EXISTS', lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdStatus);
				}

				else{

					lineHoldId = createHold(LINE_AMS_DATE_HOLD, orderId, lineId);
				}

				orderRec.setLineItemValue('item', 'custcol_line_hold', i,DATE_HOLD_APPLIED);
				saveOrder = true;
			}

			else if(!dateHoldValue && lineHoldObject[lineId]){

				if(lineHoldObject[lineId][LINE_AMS_DATE_HOLD] && lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdStatus == ON_HOLD){

					nlapiLogExecution('DEBUG', 'LICENSE HOLD ID', lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdPreventAction);

					nlapiSubmitField('customrecord_hold_instance', lineHoldObject[lineId][LINE_AMS_DATE_HOLD].holdId, 'custrecord_hold_instance_hold_status', HOLD_RELEASED);
				}
			}
			else if(dateHoldValue == APPLY_DATE_HOLD){

				lineHoldId = createHold(LINE_AMS_DATE_HOLD, orderId, lineId);
				orderRec.setLineItemValue('item', 'custcol_line_hold', i, DATE_HOLD_APPLIED);
				saveOrder = true;
			}
		}
	}

	if(saveOrder){

		nlapiSubmitRecord(orderRec);
	}
}

function getCustARBalance(cust) {
	
	var filters = [];
	var retObj = {};
	retObj['bal'] = 0;
	retObj['openord'] = 0;
	
	filters.push(new nlobjSearchFilter('internalid', 'customer', 'anyof', cust));
	
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_hold_process_cus_balance', filters);
	if (searchResults && searchResults != '') {
		retObj['bal'] = searchResults[0].getValue('amount', null, 'sum');
	} 
	
	var custOpenOrder = nlapiSearchRecord('transaction', 'customsearch_hold_process_open_ord', filters);
	if (custOpenOrder && custOpenOrder != '') {
		retObj['openord'] = custOpenOrder[0].getValue('amountunbilled', null, 'sum');
	}
	return retObj;
	
}



//This function takes the current line holds associated with an order and transfers them into an object that can easily be compared to the line items
function createLineHoldObject(holdSearchResults){

	var lineHoldObject = {};
	var holdTypeObject = {};
	var numResults = holdSearchResults.length;
	var holdLineNum;
	var holdType;
	var holdStatus;
	var holdPreventAction;
	var i;


	for(i = 0; i < numResults; i++){

		holdTypeObject = {};

		holdLineNum = holdSearchResults[i].getValue('custrecord_hold_instance_so_line').toString();
		holdType = holdSearchResults[i].getValue('custrecord_hold_instance_hold_type').toString();


		holdTypeObject[holdType] = {

			holdStatus: holdSearchResults[i].getValue('custrecord_hold_instance_hold_status'),
			holdPreventAction: holdSearchResults[i].getValue('custrecord_hold_instance_prevent_action'),
			holdId: holdSearchResults[i].getValue('internalid')
		}

		if(!lineHoldObject[holdLineNum]){

			lineHoldObject[holdLineNum] = holdTypeObject
		}
		else{

			lineHoldObject[holdLineNum][holdType] = holdTypeObject[holdType];
		}

		//nlapiLogExecution('DEBUG', 'LINE HOLD OBJECT', JSON.stringify(lineHoldObject));
	}

	return lineHoldObject;
}



function createHold(holdType, orderId, lineNumber){

	var holdId;
	var holdRec = nlapiCreateRecord('customrecord_hold_instance');

	if(lineNumber){

		holdRec.setFieldValue('custrecord_hold_instance_so_line', lineNumber);
	}
	if(holdType && orderId){

		holdRec.setFieldValue('custrecord_hold_instance_hold_type', holdType);
		holdRec.setFieldValue('custrecord_hold_instance_sales_order', orderId);
		holdRec.setFieldValue('custrecord_hold_instance_hold_status', ON_HOLD);
	}

	holdId = nlapiSubmitRecord(holdRec);

	nlapiLogExecution('DEBUG', 'HOLD CREATED', 'Hold Id: ' + holdId);

	return holdId;
}


//This function searches for existing holds on an order
//If true is passed in the searchLoneHols argument, then the function will return all line holds for an order
//If false is passed in the searchLineHolds argument, then the function will return order level holds for the type specified.
function checkForExistingHold(holdType, orderId, searchLineHolds){

	var filters = [];
	var columns = [];
	var holdSearchResult;

	//nlapiLogExecution('DEBUG', 'HOLD SEARCH FIELDS: ', ' TYPE: ' + holdType + ' ORDER ID: ' + orderId + ' LINE NUMBER HOLD SEARCH?: ' + searchLineHolds);
	//console.log('TYPE: ' + holdType + 'ORDERID: ' + orderId + 'LINE NUMBER: ' + lineNumber);
	if(orderId){

		if(searchLineHolds == true){

			filters.push(new nlobjSearchFilter('custrecord_hold_instance_so_line', null, 'isnotempty'));
		}
		else if(searchLineHolds == false){

			filters.push(new nlobjSearchFilter('custrecord_hold_instance_hold_type', null, 'anyof', holdType));
		}
		else{

			//Return all holds
		}

		filters.push(new nlobjSearchFilter('custrecord_hold_instance_sales_order', null, 'anyof', orderId));
		columns.push(new nlobjSearchColumn('custrecord_hold_instance_hold_status'));
		columns.push(new nlobjSearchColumn('custrecord_hold_instance_prevent_action'));
		columns.push(new nlobjSearchColumn('custrecord_hold_instance_so_line'));
		columns.push(new nlobjSearchColumn('custrecord_hold_instance_hold_type'));
		columns.push(new nlobjSearchColumn('internalid'));
	}

	holdSearchResult = nlapiSearchRecord('customrecord_hold_instance', null, filters, columns);

	return holdSearchResult;
}



//This function will prevent users without permission from releasing a hold
//This is a before submit on the custom hold instance record
//When the record is submited, the script will look up to the hold type custom record to grab the roles that have permission to override
//If the user had permission the record will be submitted. If not an error message will be thrown.

function beforeSubmitVerifyHoldPermissions(type){

	nlapiLogExecution('DEBUG', 'START FUNCTION', type);

	var approvalRoles;
	var numRoles;
	var hasPermission = false;

	var holdType = nlapiGetFieldValue('custrecord_hold_instance_hold_type');
	var context = nlapiGetContext();
	var userRole = context.getRole();

	if(holdType){

		if(type == 'create'){

			approvalRoles = nlapiLookupField('customrecord_hold_type', holdType, 'custrecord_hold_type_roles_to_create').split(',');
		}
		if(type != 'create'){

			approvalRoles = nlapiLookupField('customrecord_hold_type', holdType, 'custrecord_hold_type_roles_to_release').split(',');
		}

		numRoles = approvalRoles.length;
		nlapiLogExecution('DEBUG', 'APPROVAL ROLES', approvalRoles);

		for(i = 0; i < numRoles; i++){

			if(approvalRoles[i] == userRole){

				hasPermission = true;
			}
			if(hasPermission == true){

				nlapiLogExecution('DEBUG', 'USER HAS PERMISSION');
				return;
			}
		}

		if(hasPermission == false){

      		throw(nlapiCreateError('No Permission', 'You do not have permission to change/create this hold.', true));
		}
	}
}


//This Function Enforces all order holds
function beforeSubmitEnforceOrderHolds(type){

	nlapiLogExecution('DEBUG', 'START FUNCTION');
	if(type == 'delete'){

		nlapiLogExecution('AUDIT', 'TYPE DELETE');
		return;
	}

	var existingHolds;
	var numHolds;
	var preventType;
	var holdStatus;
	var i;

	var recordType = nlapiGetRecordType();
	var orderId = nlapiGetRecordId();
	var customForm = nlapiGetFieldValue('customform');
	var createdFrom = nlapiGetFieldValue('createdfrom');

	nlapiLogExecution('DEBUG', 'FORM ID: ', customForm);

	if(recordType == 'salesorder'){

		if(customForm != STANDARD_SO_FORM){

			nlapiLogExecution('AUDIT', 'NOT A VALID FORM');
			return;
		}

		if(type == 'approve'){

			existingHolds = checkForExistingHold(null, orderId);

			if(existingHolds){

				nlapiLogExecution('DEBUG', 'EXISTING HOLDS', JSON.stringify(existingHolds));

				numHolds = existingHolds.length;

				for(i = 0; i < numHolds; i++){

					preventType = existingHolds[i].getValue('custrecord_hold_instance_prevent_action');
					holdStatus = existingHolds[i].getValue('custrecord_hold_instance_hold_status');

					if(preventType == PREVENT_APPROVAL && holdStatus == ON_HOLD){

						throw(nlapiCreateError('On Hold', 'This order has unreleased approval holds.\n\n All approval holds must be released to continue.', true));
					}
				}
			}
		}
	}
}
