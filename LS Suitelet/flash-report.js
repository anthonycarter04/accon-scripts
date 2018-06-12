/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Feb 2018     anthonycarter
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function flashSL(request, response){
	var pdf = nlapiCreateTemplateRenderer();
	var pdfstart = '<html><head></head><body>';

	var reportDetails = getReportDetails('today');
	Util.console.log(reportDetails, 'reportDetails today');
	var reportDetailsYest = getReportDetails('yesterday');
	Util.console.log(reportDetailsYest, 'reportDetailsYest');
	
	
	
	if (reportDetails && reportDetails != '' && reportDetailsYest && reportDetailsYest != '') {
		
		var priorDay = getPriorDay(reportDetails, reportDetailsYest);
		Util.console.log(priorDay, 'prior Day');
		
		var quarterStart = getQuarterStart();
		var reportDate = getTodayDate(reportDetails['reportdate']);
		
		
		var pdfbody = '<h2>Lifesize Sales Flash Report</h2><h4>' + quarterStart + ' to ' + reportDate + '</h4><br/><br/>';
		pdfbody += '<h3>' + 'Prior Day' + '</h3>'
		
		pdfbody += '<table style="margin-top:20px; font-family: sans-serif; font-size: 8pt; margin-top: 0px; table-layout:fixed; width:auto; border-bottom: 1px solid #e6e6e6;" class="itemtable"><thead style ="font-weight: bold; font-size: 8pt; padding-right: 6px; padding-left: 6px; padding-bottom: 3px; padding-top: 5px; color: #000000;border:0 #e6e6e6;"><tr><th align="right" colspan="1"></th>';
			
		for (var i=0; i<reportDetails['columns'].length; i++) {
			pdfbody +='<th align="right" colspan="1">' +reportDetails['columns'][i] + '</th>';
		}
		pdfbody += '</tr></thead>'

			
		
		var theData = priorDay;
		var num = 1;
		for (key in theData) {
			if (key == 'Total Backlog') {
				continue;
			}
			if (num%2 == 1) {
				pdfbody += '<tr style="border-top: 1px solid ; background-color: #E8E8EE">';
			} else {
				pdfbody += '<tr style="border-top: 1px solid; ">';
			}
			var label = key + ' DoD';
			if (key == 'Total Backlog' || key == 'CQ Backlog') {
				label = key;
			}
			pdfbody += '<td align="left" colspan="1" style="padding-right: 6px; padding-left: 6px; padding-bottom: 4px;padding-top: 4px; border-left: 1px solid #e6e6e6">' + label + '</td>';
			for (ring in theData[key]) {
				
				if (accounting.formatNumber(theData[key][ring],0) == -0) {
					var theNum = 0;
				} else {
					var theNum = accounting.formatNumber(theData[key][ring],0);
				}
				pdfbody += '<td align="right" colspan="1" style="padding-right: 6px; padding-left: 6px; padding-bottom: 4px; padding-top: 4px; border-left: 1px solid #e6e6e6">' + theNum + '</td>';
				
			}
			pdfbody += '</tr>';
			num+=1;
			
		}
		
		
		
		

		pdfbody += '</table>';
	
		pdfbody += '<h3 style="padding-top:10px">' + reportDetails['reporttype'] + '</h3>'
		pdfbody += '<table style="margin-top:20px; font-family: sans-serif; font-size: 8pt; margin-top: 0px; table-layout:fixed; width:auto; border-bottom: 1px solid #e6e6e6;" class="itemtable"><thead style ="font-weight: bold; font-size: 8pt; padding-right: 6px; padding-left: 6px; padding-bottom: 3px; padding-top: 5px; color: #000000;border:0 #e6e6e6;"><tr><th align="right" colspan="1"></th>';
			
		for (var i=0; i<reportDetails['columns'].length; i++) {
			pdfbody +='<th align="right" colspan="1">' +reportDetails['columns'][i] + '</th>';
		}
		pdfbody += '</tr></thead>'

		
		var theData = reportDetails['data'];
		var num = 1;
		for (key in theData) {
			if (num%2 == 1) {
				pdfbody += '<tr style="border-top: 1px solid ; background-color: #E8E8EE">';
			} else {
				pdfbody += '<tr style="border-top: 1px solid; ">';
			}
			var label = reportDetails['reporttype'] + ' ' + key;
			if (key == 'Total Backlog' || key == 'CQ Backlog') {
				label = key;
			}
			pdfbody += '<td align="left" colspan="1" style="padding-right: 6px; padding-left: 6px; padding-bottom: 4px; padding-top: 4px; border-left: 1px solid #e6e6e6">' + label + '</td>';
			for (ring in theData[key]) {
				if (accounting.formatNumber(theData[key][ring],0) == -0) {
					var theNum = 0;
				} else {
					var theNum = accounting.formatNumber(theData[key][ring],0);
				}
				pdfbody += '<td align="right" colspan="1" style="padding-right: 6px; padding-left: 6px; padding-bottom: 4px; padding-top: 4px; border-left: 1px solid #e6e6e6">' + theNum + '</td>';
				
			}
			pdfbody += '</tr>';
			num+=1;
			
		}

		pdfbody += '</table>';
		
		
		
		pdfbody += '<br/><br/>Thank you,<br/>Lifesize Reporting Center';
		

		
		var pdfend = '</body></html>';
		
		var pdfFinal = pdfstart + pdfbody + pdfend;
		var recipient = nlapiGetContext().getSetting('SCRIPT', 'custscript_flashreport_recipient');
		if (recipient && recipient != '') {
			
			nlapiSendEmail(549873, recipient, 'Global Flash Report ' + getTodayDateMDY(reportDate) , pdfFinal, null, null, null, null, true);
			Util.console.log('sent');
			
		} else {
			Util.console.log('No recipient in script parameter.');
		}
		
		
		
		
	}
	

	
}

function getPriorDay(today, yest) {
	Util.console.log(today, 'today');
	Util.console.log(yest, 'yest');
	var dodObj = {};
	for (key in today['data']) {
		
		
		dodObj[key] = {};
		for (ring in today['data'][key]) {
			
			var todayVal = today['data'][key][ring];
			//Util.console.log(todayVal, 'todayval');
			var yestVal = yest['data'][key][ring];
			//Util.console.log(yestVal, 'yestVal');
			var dod = todayVal - yestVal;
			dodObj[key][ring] = dod;
		}
		
	}
	Util.console.log(dodObj, 'dodObj');
	return dodObj;
	
}

function getReportDetails(day) {
	
	if (day == 'today') {
		var searchResults = nlapiSearchRecord('customrecord_flash_report_header','customsearch_flash_report_sender');
	} else if (day == 'yesterday') {
		var searchResults = nlapiSearchRecord('customrecord_flash_report_header','customsearch_flash_report_sender_yest');
	}
	
	
	if (searchResults && searchResults != '') {
		
		var recId = searchResults[0].getValue('internalid', null, 'max');
		
		
		var flashHeader = nlapiLoadRecord('customrecord_flash_report_header', recId);
		var lineCount = flashHeader.getLineItemCount('recmachcustrecord_flashdet_header')
	
		
		if (lineCount && lineCount > 0) {
			
			var retObj = {};
			retObj['data'] = {};
			retObj['columns'] = [];
			retObj['reporttype'] = flashHeader.getFieldText('custrecord_flashhead_type');
			retObj['reportdate'] = flashHeader.getFieldValue('custrecord_flashhead_date');
			
			for (var i=1; i<=lineCount; i++) {
				
				
				
				
				var metric = flashHeader.getLineItemText('recmachcustrecord_flashdet_header', 'custrecord_flashdet_metric', i);
				var region = flashHeader.getLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_region', i);
				var amount = flashHeader.getLineItemValue('recmachcustrecord_flashdet_header', 'custrecord_flashdet_amount', i);
				
				if (!retObj['data'][metric]) {
					retObj['data'][metric] = {};
				}
				
				if (!Util.inarray(region, retObj['columns'])) {
					retObj['columns'].push(region);
				}
				
				retObj['data'][metric][region] = amount;
				
				
				
			}
		}
		
		return retObj;
	
		
	} else {
		return 'No search results';
	}
	
	
	
	
}

function getQuarterStart() {
	
	var dated = new Date(); 
	var month = dated.getMonth() + 1;
	var quarter = quarterObj[month];
	
	
	var firstDate = new Date(dated.getFullYear(), quarter-1, 1);
	
	
	
	
	var monthName = monthNames[firstDate.getMonth()];
	var day = firstDate.getDate();
	var year = firstDate.getFullYear();
	var ret = monthName + ' ' + day + ', ' + year;
	return ret;
	
	
	
}

function getTodayDate(repDate) {
	var d = new Date(repDate);
	var month = d.getMonth();
	var monthName = monthNames[month];
	var day = d.getDate();
	var year = d.getFullYear();
	var ret = monthName + ' ' + day + ', ' + year;
	return ret;
}

function getTodayDateMDY(repDate) {
	var d = new Date(repDate);
	var month = d.getMonth() + 1;
	var day = d.getDate();
	var year = d.getFullYear();
	var ret = month + '-' + day + '-' + year;
	return ret;
}

var quarterObj = {1:11,2:2,3:2,4:2,5:5,6:5,7:5,8:8,9:8,10:8,11:11,12:11}

var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];



