/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Feb 2018     anthonycarter	  Initial Logic
 * 
 * This script runs on item fulfillment records and is intended to modify the GL Impact of fulfillments tied to Sales Orders tied to an RMA Case
 *
 */


function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
	//get customer
	try {
		//var entityId = transactionRecord.getFieldValue('entity');
		
		var period = transactionRecord.getFieldValue('postingperiod');
		var glCount = transactionRecord.getFieldValue('custbody_custom_gl_line_count');
		Util.console.log(period, 'period');
		var perStatus = getPeriodStatus(period);
		Util.console.log(perStatus, 'Per Status');
		Util.console.log(glCount, 'Custom Line Count');
		if (perStatus == 'T') {
			Util.console.log('in period check');
		} else {
			Util.console.log('outside period check');
		}
		
		//get created from
		var soId = transactionRecord.getFieldValue('custbody_sales_order_wo');
		Util.console.log(soId, 'soId');
		//if there is an SO ID and the posting period is not locked
		if (soId && soId != '' && (perStatus == 'F' || (perStatus == 'T'  && glCount != '' && glCount > 0))) {
			Util.console.log('made it!');
			//get case number from SO
			var soCase = transactionRecord.getFieldValue('custbody_transaction_case');
			if (!soCase || soCase == '') {
				soCase = nlapiLookupField('salesorder', soId, 'custbody_transaction_case');
			}
			
			
			//if case exists, proceed.  else exit
			if (soCase && soCase != '') {
				
				
				var accts = getAccounts();
				
				
				//get count of standard lines
				var count = standardLines.getCount();
				var customGLCount = 0;
				//loop through lines
				
				for (var i=0; i<count; i++) {
					
					
					//get instance of GL impact line
					var line = standardLines.getLine(i);
					
					//get acct Id
					var acctId = line.getAccountId();
					
					if (acctId && acctId != '') {
						Util.console.log('line ' + i + '-' + JSON.stringify(accts[acctId]) + '-' + accts[acctId].accttype, 'Account Type' )
						//get debit/credit amount
						var creditAmount = line.getCreditAmount();
						var debitAmount = line.getDebitAmount();
						
						//if there is a debit amount, execute logic to net out COGS amount and move to RMA-Clearing account
						if (accts[acctId].accttype && accts[acctId].accttype == 'COGS') {
							
							try {
								//create line to net out COGS amount
								if (creditAmount >0) {
									var newLine = customLines.addNewLine();
									newLine.setAccountId(acctId);
									newLine.setDebitAmount(creditAmount);
									newLine.setDepartmentId(line.getDepartmentId());
									newLine.setLocationId(line.getLocationId());
									newLine.setClassId(line.getClassId());
									newLine.setMemo(line.getMemo());
									newLine.setEntityId(line.getEntityId());
									customGLCount +=1;
									
									//create line to establish RMA account
									var newLine = customLines.addNewLine();
									newLine.setAccountId(500); //set to RMA-External account
									newLine.setCreditAmount(creditAmount);
									newLine.setDepartmentId(line.getDepartmentId());
									newLine.setLocationId(line.getLocationId());
									newLine.setClassId(line.getClassId());
									newLine.setMemo(line.getMemo());
									newLine.setEntityId(line.getEntityId());
									customGLCount +=1;
									Util.console.log('catch');
								} else if (debitAmount > 0){
									
									//create line to establish RMA account
									var newLine = customLines.addNewLine();
									newLine.setAccountId(line.getAccountId()); //set to RMA-External account
									newLine.setCreditAmount(debitAmount);
									newLine.setDepartmentId(line.getDepartmentId());
									newLine.setLocationId(line.getLocationId());
									newLine.setClassId(line.getClassId());
									newLine.setMemo(line.getMemo());
									newLine.setEntityId(line.getEntityId());
									customGLCount +=1;
									Util.console.log('catch');
									
									
									var newLine = customLines.addNewLine();
									newLine.setAccountId(500);
									newLine.setDebitAmount(debitAmount);
									newLine.setDepartmentId(line.getDepartmentId());
									newLine.setLocationId(line.getLocationId());
									newLine.setClassId(line.getClassId());
									newLine.setMemo(line.getMemo());
									newLine.setEntityId(line.getEntityId());
									customGLCount +=1;
									
									
								}
								
							} catch (e) {
								Util.console.log(e.message, 'Error Message');
							}
								
							
						}
						
					}
				}
				
				Util.console.log(customGLCount, 'custom GL Count');
				if (customGLCount > 0 && perStatus == 'F' ) {
					Util.console.log('in custom gl count');
					try {
						nlapiSubmitField(transactionRecord.getRecordType(), transactionRecord.getId(), 'custbody_custom_gl_line_count', customGLCount);
					} catch(e) {
						Util.console.log(e.message, 'Error Message');
					}
					
				}
			}

		} else{
			Util.console.log('did not make it!');
			//nlapiSubmitField(transactionRecord.getRecordType(), transactionRecord.getId(), 'custbody_custom_gl_line_count', 0);
		}
	} catch(err) {
		Util.console.log(err.message, 'Final Error');
	}
	
	
}

function getPeriodStatus(period) {
	
	var aFilter = new Array();
	aFilter.push(new nlobjSearchFilter('internalid', null, 'anyof', period));
	
	var aColumn = new Array();
	aColumn.push(new nlobjSearchColumn('internalid'));
	aColumn.push(new nlobjSearchColumn('periodname'));
	aColumn.push(new nlobjSearchColumn('closed'));
	aColumn.push(new nlobjSearchColumn('arlocked'));
	aColumn.push(new nlobjSearchColumn('aplocked'));
	aColumn.push(new nlobjSearchColumn('alllocked'));
	
	
	var resultPeriod = nlapiSearchRecord('accountingperiod', null, aFilter, aColumn);
	Util.console.log(resultPeriod, 'result period');
	if (resultPeriod && resultPeriod != '') {
		return resultPeriod[0].getValue('closed');
	} else {
		return 'F';
	}
	
}

function getAccounts() {
	var acctObj = {};
	var columns = [];
	columns.push(new nlobjSearchColumn('type'));
	columns.push(new nlobjSearchColumn('name'));
	
	var searchResults = nlapiSearchRecord('account',null,null,columns);
	if (searchResults && searchResults != '') {
		
		var lineObj = {};
		for (var i=0; i<searchResults.length; i++) {
			var acctId = searchResults[i].getId();
			var type = searchResults[i].getValue('type');
			var name = searchResults[i].getValue('name');
			acctObj[acctId] = {accttype: type, acct: name};
			
		}
		
	}
	
	Util.console.log(acctObj, 'acctObj');
	return acctObj;
	
	
}