/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Apr 2018     anthonycarter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function flashPopulation(type) {

	var dataObj = {};
	for (var i=0; i<searchObj.length; i++) {
		
		var type = searchObj[i]['type'];
		var searchId = searchObj[i]['id'];
		Util.console.log(searchId, 'searchId');
		
		var results = getFullResultsv3(type, searchId);
		//var AMER = _.pluck(results['vals'][0], 'AMER');
		
		//Util.console.log(AMER, 'AMER');
		dataObj[searchObj[i]['id']] = {};
		Util.console.log(searchObj[i]['values'], 'values');
		var sumAmount = 0;
		for (var j=0; j<searchObj[i]['values'].length; j++) {
			
		//	Util.console.log(searchObj[i]['values'][j], 'Result Value');
			var prelimRes = _.pluck(results['vals'][0], searchObj[i]['values'][j]);
			//Util.console.log(prelimRes, 'prelimRes');
			for (var k=0; k<prelimRes.length; k++) {
				
				if (prelimRes[k] && prelimRes[k] != '') {
					
					dataObj[searchObj[i]['id']][searchObj[i]['values'][j]] = parseFloat(prelimRes[k]);
					
					
				}
				
			}
			
			
			
		}
		
		
		Util.console.log(dataObj, 'dataObj');
		/*
		Util.console.log(results, 'results: ' + searchId);
		Util.console.log(AMER, 'AMER');
		
		var total = 0;
		var AMER = 0;
		var EMEA = 0;
		var APAC = 0;
		var OTHER = 0;
		
		for (var j=0; j<results['vals'][0].length; j++) {
				for (key in results['vals'][0][j]) {
					Util.console.log(key, 'key');
					Util.console.log(searchObj[i]['sum'], 'sum value');
					if (key == searchObj[i]['sum']) {
						Util.console.log(results['vals'][0][j][key], 'results key');
						if (results['vals'][0][j][key] && results['vals'][0][j][key] != '') {
							total += parseFloat(results['vals'][0][j][key]);
						}
						
					}
				}
		}
		
		dataObj[searchObj[i]['id']] = total;
		Util.console.log(dataObj, 'dataObj');
	*/
		
		
	}
	
	
	createFlashRecords(dataObj);
	
}

/*
function flashPopulationOld(type) {

	var dataObj = {};
	for (var i=0; i<searchObj.length; i++) {
		
		var type = searchObj[i]['type'];
		var searchId = searchObj[i]['id'];
		
		var results = getFullResultsv3(type, searchId);
		var AMER = _.pluck(results['vals'][0], 'EMEA');
		
		
		for (var j=0; j<searchObj[i]['values']; j++) {
			Util.console.log(searchObj[i]['values'][j], 'Result Value');
		}
		
		/*
		Util.console.log(results, 'results: ' + searchId);
		Util.console.log(AMER, 'AMER');
		if (searchObj[i]['group'] == 'total') {
			var total = 0;
			for (var j=0; j<results['vals'].length; j++) {
				for (var k=0; k<results['vals'][j].length; k++) {
					
					for (key in results['vals'][j][k]) {
						Util.console.log(key, 'key');
						Util.console.log(searchObj[i]['sum'], 'sum value');
						if (key == searchObj[i]['sum']) {
							Util.console.log(results['vals'][j][k][key], 'results key');
							if (results['vals'][j][k][key] && results['vals'][j][k][key] != '') {
								total += parseFloat(results['vals'][j][k][key]);
							}
							
						}
					}
				}
			}
			dataObj[searchObj[i]['id']] = total;
			Util.console.log(dataObj, 'dataObj');
		}
		
		
	}
	return;
	
	createFlashRecords(dataObj);
	
}
*/


var regionArr = ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL'];


function createFlashRecords(dataObj) {
	
	if (dataObj && dataObj != '') {
		
		var prepObj = {};
		
		for (var i=0; i<regionArr.length; i++) {
			
			var reg = regionArr[i];
			prepObj[reg] = {};
			
			for (key in dataObj) {
				
				for (ring in dataObj[key]) {
					
					if (ring == reg) {
						
						prepObj[reg][key] = dataObj[key][ring];
						
					}
					
				}
				
			}
			
			
		}
		
		Util.console.log(prepObj, 'finalObj');
		
		
		var finalObj = {};
		
		for (key in prepObj) {
			
			finalObj[key] = {};
			var bookings = prepObj[key]['customsearch_bbb_bookings'];
			var billings = prepObj[key]['customsearch_bbb_billings'];
			var cqBacklog = prepObj[key]['customsearch_bbb_cq_backlog'];
			var billPlusBacklog = billings + cqBacklog;
			var salesOut = prepObj[key]['customsearch_bbb_sales_out'] + prepObj[key]['customsearch_bbb_backend_rebates'];
			var billPlusSalesOut = prepObj[key]['customsearch_bbb_billings_nonamer'] + salesOut;
			var totalBacklog = prepObj[key]['customsearch_bbb_total_backlog'];
			
			finalObj[key]['bookings'] = bookings;
			finalObj[key]['billings'] = billings;
			finalObj[key]['cqbacklog'] = cqBacklog;
			finalObj[key]['billplusbacklog'] = billPlusBacklog;
			finalObj[key]['salesout'] = salesOut;
			finalObj[key]['billplussalesout'] = billPlusSalesOut;
			finalObj[key]['totalbacklog'] = totalBacklog;
			
		}
		
		Util.console.log(finalObj, 'finalObj');
		//var bookings = dataObj['customsearch_bbb_bookings'] - dataObj['customsearch_bbb_cancelled_bookings'];
		/*var bookings = dataObj['customsearch_bbb_bookings'];
		var billings = dataObj['customsearch_bbb_billings'];
		var cqBacklog = dataObj['customsearch_bbb_cq_backlog'];
		var billPlusBacklog = billings + cqBacklog;
		var salesOut = dataObj['customsearch_bbb_sales_out'] + dataObj['customsearch_bbb_backend_rebates'];
		var billPlusSalesOut = dataObj['customsearch_bbb_billings_nonamer'] + salesOut;
		var totalBacklog = dataObj['customsearch_bbb_total_backlog'];
		
		finalObj['bookings'] = bookings;
		finalObj['billings'] = billings;
		finalObj['cqbacklog'] = cqBacklog;
		finalObj['billplusbacklog'] = billPlusBacklog;
		finalObj['salesout'] = salesOut;
		finalObj['billplussalesout'] = billPlusSalesOut;
		finalObj['totalbacklog'] = totalBacklog;*/
		
		
		
		
		var flashRec = nlapiCreateRecord('customrecord_flash_report_header',  {recordmode: 'dynamic'});
		flashRec.setFieldValue('custrecord_flashhead_type', 1) //QTD
		var theDate = new Date();
		theDate = nlapiDateToString(theDate, 'datetimetz');
		flashRec.setFieldValue('custrecord_flashhead_date', theDate) //thedate
		
		var lineDate = new Date();
		lineDate = nlapiDateToString(lineDate, 'date');
		for (key in finalObj) {
			
			for (ring in finalObj[key]) {
				flashRec.selectNewLineItem('recmachcustrecord_flashdet_header');
				flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_metric', flashTypeMap[ring]);
				flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_region', key);
				flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_amount', finalObj[key][ring]);
				flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_date', lineDate);
				flashRec.commitLineItem('recmachcustrecord_flashdet_header');
			}

		}
		
		
		
		
		
		var recId = nlapiSubmitRecord(flashRec);
		
		if (recId && recId != '') {
			nlapiScheduleScript('customscript_flash_report_sender_sch', 'customdeploy1');			
		}
		
		
		
	}	
}

/*function createFlashRecordsOld(dataObj) {
	
	if (dataObj && dataObj != '') {
		
		var finalObj = {};
	
		
		//var bookings = dataObj['customsearch_bbb_bookings'] - dataObj['customsearch_bbb_cancelled_bookings'];
		var bookings = dataObj['customsearch_bbb_bookings'];
		var billings = dataObj['customsearch_bbb_billings'];
		var cqBacklog = dataObj['customsearch_bbb_cq_backlog'];
		var billPlusBacklog = billings + cqBacklog;
		var salesOut = dataObj['customsearch_bbb_sales_out'] + dataObj['customsearch_bbb_backend_rebates'];
		var billPlusSalesOut = dataObj['customsearch_bbb_billings_nonamer'] + salesOut;
		var totalBacklog = dataObj['customsearch_bbb_total_backlog'];
		
		finalObj['bookings'] = bookings;
		finalObj['billings'] = billings;
		finalObj['cqbacklog'] = cqBacklog;
		finalObj['billplusbacklog'] = billPlusBacklog;
		finalObj['salesout'] = salesOut;
		finalObj['billplussalesout'] = billPlusSalesOut;
		finalObj['totalbacklog'] = totalBacklog;
		
		
		
		
		var flashRec = nlapiCreateRecord('customrecord_flash_report_header',  {recordmode: 'dynamic'});
		flashRec.setFieldValue('custrecord_flashhead_type', 1) //QTD
		var theDate = new Date();
		theDate = nlapiDateToString(theDate, 'datetimetz');
		flashRec.setFieldValue('custrecord_flashhead_date', theDate) //thedate
		
		var lineDate = new Date();
		lineDate = nlapiDateToString(lineDate, 'date');
		for (key in finalObj) {
			flashRec.selectNewLineItem('recmachcustrecord_flashdet_header');
			flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_metric', flashTypeMap[key]);
			flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_region', 'Total');
			flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_amount', finalObj[key]);
			flashRec.setCurrentLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_date', lineDate);
			flashRec.commitLineItem('recmachcustrecord_flashdet_header');
		}
		
		
		
		
		
		var recId = nlapiSubmitRecord(flashRec);
		
		if (recId && recId != '') {
			nlapiScheduleScript('customscript_flash_report_sender_sch', 'customdeploy1');			
		}
		
		
		
	}	
}*/

var flashTypeMap = {
		'bookings': 1,
		'billings': 2,
		'cqbacklog': 3,
		'billplusbacklog': 4,
		'salesout': 5,
		'billplussalesout': 6,
		'totalbacklog': 7,		
}

var searchObj = [
	{'id': 'customsearch_bbb_billings', 'type': 'transaction', 'group': 'total', 'values': ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL'] },
	{'id': 'customsearch_bbb_billings_nonamer', 'type': 'transaction', 'group': 'total', 'values': ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL'] },
	{'id': 'customsearch_bbb_bookings', 'type': 'transaction', 'group': 'total', 'values': ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL']},
	{'id': 'customsearch_bbb_backend_rebates', 'type': 'transaction', 'group': 'total', 'values': ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL']},
	////Not used anymore///{'id': 'customsearch_bbb_cancelled_bookings', 'type': 'transaction', 'group': 'total', 'sum': 'Cancelled Bookings'},
	{'id': 'customsearch_bbb_cq_backlog', 'type': 'transaction', 'group': 'total','values': ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL']},
	{'id': 'customsearch_bbb_total_backlog', 'type': 'transaction', 'group': 'total','values': ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL']},
	{'id': 'customsearch_bbb_sales_out', 'type': 'customrecord_sales_out', 'group': 'total', 'values': ['AMER', 'EMEA', 'APAC', 'OTHER', 'TOTAL']},
	
];


function getFullResultsv3(type, search, dataIn) {

	var searchLoad = nlapiLoadSearch(type, search);
	
	var searchResults = searchLoad.runSearch();

	
	var resultIndex = 0;
	var resultStep = 1000;
	var endIndex = parseInt(resultIndex) + resultStep;

	var resultSet;
	
	var cols = searchLoad.getColumns();
	var resObj = {};
	resObj['headers'] = [];
	resObj['names'] = [];
	resObj['joins'] = [];
	resObj['group'] = [];
	resObj['vals'] = [];
	resObj['forms'] = [];
	
	for (var i=0; i<cols.length; i++) {
		
		resObj['headers'].push(cols[i].getLabel());
		resObj['names'].push(cols[i].getName());
		resObj['joins'].push(cols[i].getJoin());
		resObj['group'].push(cols[i].getSummary());
		resObj['forms'].push(cols[i].getFormula());
		
	}

	do {
		endIndex = resultIndex + resultStep;

	    resultSet = searchResults.getResults(resultIndex, endIndex);

	    var valArr = [];
	    for (var j=0; j< resultSet.length; j++) {
	    	resObj['vals'][resultIndex + j] = [];
	    	
	    	for (var n=0; n<cols.length; n++) {
	    		var inpObj = {};
	    		//Util.console.log(resultSet[j].getValue(resObj['names'][n], resObj['joins'][n], resObj['group'][n]), resObj['names'][n] + 'value');
	    		//Util.console.log(resultSet[j].getText(resObj['names'][n], resObj['joins'][n], resObj['group'][n]), resObj['names'][n] + 'value');
	    		//Util.console.log(resObj['names'][n], 'formula name');
	    		if (resObj['names'][n] == 'formulatext' || resObj['names'][n] == 'formulanumeric' || resObj['names'][n] == 'formulacurrency' ) {
	    			//Util.console.log(cols[n], 'cols n');
	    			//var formVal = resultSet[j].getValue(cols[n], resObj['joins'][n], resObj['group'][n]);
	    			var formVal = resultSet[j].getValue(cols[n]);
	    			var headerName = resObj['headers'][n];
	    			inpObj[headerName] = formVal;
	    			resObj['vals'][resultIndex + j].push(inpObj);
	    			
	    		} else {
	    			var textVal = resultSet[j].getText(resObj['names'][n], resObj['joins'][n], resObj['group'][n]);
		    		var valVal = resultSet[j].getValue(resObj['names'][n], resObj['joins'][n], resObj['group'][n]);
		    		var headerName = resObj['headers'][n];
		    		
		    		if (textVal && textVal != '') {
		    			inpObj[headerName] = textVal;
		    			resObj['vals'][resultIndex + j].push(inpObj);
		    		} else {
		    			inpObj[headerName] = valVal;
		    			resObj['vals'][resultIndex + j].push(inpObj);
		    		}
	    		}
	    		
	    		
	    		
	    		
	    	}
	    	
	    	
	    	
	    }
	    //Util.console.log(resObj['vals'].length, 'result length');
	 // increase pointer
	    resultIndex = resultIndex + resultStep;
	    
	   
	// once no records are returned we already got all of them
	} while (resultSet.length >0);
	
	return resObj;
	
}


function getFullResultsv2(type, search, dataIn) {
	
	//var searchResults = nlapiSearchRecord(type, search);
	var searchLoad = nlapiLoadSearch(type, search);
	//var iidFilter = dataIn['iid'];
	//var tranIdFilter = dataIn['tranid'];
	//var hasFilters = false;
	//if (iidFilter && iidFilter != '') {
	//	hasFilters = true;
	//	searchLoad.addFilter(new nlobjSearchFilter('internalidnumber', null, 'equalto',iidFilter ));
	//} else if (tranIdFilter && tranIdFilter != '') {
	//	hasFilters = true;
	//	searchLoad.addFilter(new nlobjSearchFilter('tranid', null, 'is',tranIdFilter ));
	//}

 	
	
	var searchResults = searchLoad.runSearch();
	var startIndex = 0;
	//Util.console.log(parseInt(startIndex), 'startIndex');
	
	var resultIndex = 0;
	var resultStep = 1000;
	var endIndex = parseInt(startIndex) + resultStep;
	//Util.console.log(endIndex, 'endIndex');
	//return {res: 'test'};
	var resultSet;
	
	var cols = searchLoad.getColumns();
	var resObj = {};
	resObj['headers'] = [];
	resObj['names'] = [];
	resObj['joins'] = [];
	resObj['group'] = [];
	resObj['vals'] = [];
	resObj['forms'] = [];
	
	for (var i=0; i<cols.length; i++) {
		
		resObj['headers'].push(cols[i].getLabel());
		resObj['names'].push(cols[i].getName());
		resObj['joins'].push(cols[i].getJoin());
		resObj['group'].push(cols[i].getSummary());
		resObj['forms'].push(cols[i].getFormula());
		
	}
	//Util.console.log(resObj['forms'], 'resObj');
	
	
	
	//do {
		   // fetch one result set
	    resultSet = searchResults.getResults(startIndex, endIndex);
	   // Util.console.log(resultSet, 'resultSet');
	   // Util.console.log(resultSet.length, 'result length');
	    var valArr = [];
	    for (var j=0; j< resultSet.length; j++) {
	    	resObj['vals'][resultIndex + j] = [];
	    	
	    	for (var n=0; n<cols.length; n++) {
	    		
	    		//Util.console.log(resultSet[j].getValue(resObj['names'][n], resObj['joins'][n], resObj['group'][n]), resObj['names'][n] + 'value');
	    		//Util.console.log(resultSet[j].getText(resObj['names'][n], resObj['joins'][n], resObj['group'][n]), resObj['names'][n] + 'value');
	    		//Util.console.log(resObj['names'][n], 'formula name');
	    		if (resObj['names'][n] == 'formulatext' || resObj['names'][n] == 'formulanumeric' || resObj['names'][n] == 'formulacurrency' ) {
	    			//Util.console.log(cols[n], 'cols n');
	    			//var formVal = resultSet[j].getValue(cols[n], resObj['joins'][n], resObj['group'][n]);
	    			var formVal = resultSet[j].getValue(cols[n]);
	    		
	    			resObj['vals'][resultIndex + j].push(formVal);
	    			
	    		} else {
	    			var textVal = resultSet[j].getText(resObj['names'][n], resObj['joins'][n], resObj['group'][n]);
		    		var valVal = resultSet[j].getValue(resObj['names'][n], resObj['joins'][n], resObj['group'][n]);
		    		if (textVal && textVal != '') {
		    			resObj['vals'][resultIndex + j].push(textVal);
		    		} else {
		    			resObj['vals'][resultIndex + j].push(valVal);
		    		}
	    		}
	    		
	    		
	    		
	    		
	    	}
	    	
	    	
	    	
	    }
	    //Util.console.log(resObj['vals'].length, 'result length');
	 // increase pointer
	    resultIndex = resultIndex + resultStep;
	    
	   
	// once no records are returned we already got all of them
	//} while (resultSet.length >0);
	
	return resObj;
	
}

