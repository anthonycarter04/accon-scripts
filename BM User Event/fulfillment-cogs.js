/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Apr 2018     anthonycarter
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function fulfillCOGS(type){
 
	var lineCount = nlapiGetLineItemCount('item');
	var locationArr = [];
	var itemArr = [];
	for (var i=1; i<=lineCount; i++) {
		itemArr.push(nlapiGetLineItemValue('item', 'item', i));
		locationArr.push(nlapiGetLineItemValue('item', 'location', i));
	}
	
	var filters = [];
	filters.push(new nlobjSearchFilter('internalid', null, 'anyof', itemArr));
	filters.push(new nlobjSearchFilter('inventorylocation', null, 'anyof', locationArr));
	
	var columns = [];
	columns.push(new nlobjSearchColumn('internalid'));
	columns.push(new nlobjSearchColumn('costingmethod'));
	columns.push(new nlobjSearchColumn('inventorylocation'));
	columns.push(new nlobjSearchColumn('locationaveragecost'));
	columns.push(new nlobjSearchColumn('locationcost'));
	columns.push(new nlobjSearchColumn('transferprice'));
	
	columns.push(new nlobjSearchColumn('cost'));
	
	var searchResults = nlapiSearchRecord('item', null, filters, columns);
	Util.console.log(searchResults, 'searchresults');
	if (searchResults && searchResults != '') {
		var itemObj = formatItems(searchResults);
		Util.console.log(itemObj, 'itemObj');
		
		var item,location, quantity, key, itemCost, cogs, line;
		for (var j=1; j<=lineCount; j++) {
			
			item = nlapiGetLineItemValue('item', 'item', j);
			location = nlapiGetLineItemValue('item', 'location', j);
			quantity = nlapiGetLineItemValue('item', 'quantity', j);
			line = nlapiGetLineItemValue('item', 'line', j);
			Util.console.log(line, 'line');
			key = item + '-' + location;
			
			if (itemObj[key] && itemObj[key] != '' ) {
				itemCost = itemObj[key]['locationaveragecost'];
				cogs = parseFloat(quantity) * parseFloat(itemCost);
				cogs = round(cogs, 2);
				//nlapiSelectLineItem('item', j);
				//nlapiSetCurrentLineItemValue('item', 'custcol_cogs_amount', cogs);
				nlapiSetLineItemValue('item', 'custcol_cogs_amount', j, cogs);
			}
			
			
		}
		
	}
	
	
	
	
	
	
}


function fulfillCOGSv2(type) {
	
	var recId = nlapiGetRecordId();
	var rec = nlapiLoadRecord('itemfulfillment', recId);
	
	var filters = [];
	filters.push(new nlobjSearchFilter('internalid', null, 'anyof', recId));
	
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_fulfill_cogs_amount', filters, null);
	
	if (searchResults && searchResults != '') {
		var recObj = {};
		for (var i=0; i<searchResults.length; i++) {
			
			//if (searchResults[i].getValue('linesequencenumber') == 0) {
				
			//	recObj[1] = searchResults[i].getValue('cogsamount');
			//} else if (searchResults[i].getValue('linesequencenumber') == 1) {
			//	
		//	} else {
				recObj[searchResults[i].getValue('linesequencenumber')] = searchResults[i].getValue('cogsamount');
			//}
			
			
		}
		
		Util.console.log(recObj, 'recObj');
		
		
		var lineCount = rec.getLineItemCount('item');
		var hasCOGS = 'F';
		for (var j=1; j<=lineCount; j++) {
			
			var fulfillLine = rec.getLineItemValue('item', 'line', j);
			Util.console.log(fulfillLine, 'fulfillLine');
			
			if (recObj[fulfillLine] && recObj[fulfillLine] != '') {
				hasCOGS = 'T';
				rec.setLineItemValue('item', 'custcol_cogs_amount', j, Math.abs(recObj[fulfillLine]));
			}
		}
		
		if (hasCOGS == 'T') {
			nlapiSubmitRecord(rec);
		}
		
	}
	
	
	
	
}

function round(number, power) {
	//Util.console.log(number, 'number');
	number = parseFloat(number);

	number = Math.round((number*(Math.pow(10,power))))/(Math.pow(10,power));

	return number;
	
}

function formatItems(res) {
	var obj = {};
	for (var i=0; i<res.length; i++) {
		obj[res[i].getValue('internalid') + '-' + res[i].getValue('inventorylocation')] = {'method': res[i].getValue('costingmethod'), 'location': res[i].getValue('inventorylocation'), 'locationaveragecost': res[i].getValue('locationaveragecost'), 'cost': res[i].getValue('cost') };
	}
	
	return obj;
	
}

function saveFulfillments() {
	
	var searchResults = nlapiSearchRecord('transaction', 'customsearch_fulfill_cogs_trigger');
	
	for (var i=0; i<searchResults.length; i++) {
		try {
		var recId = searchResults[i].getId();
		var rec = nlapiLoadRecord('itemfulfillment', recId);
		rec.setFieldValue('custbody_scrpt_update_fld', 'T');
		
			nlapiSubmitRecord(rec);
		} catch(e) {
			Util.console.log(e.message, 'Error processing line');
			continue;
		}
		
	}
	
	
}
