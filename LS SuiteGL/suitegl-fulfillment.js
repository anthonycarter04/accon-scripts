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
		var entityId = transactionRecord.getFieldValue('entity');
		//var count = standardLines.getCount();
		//Util.console.log(count, 'Count');
		
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
		var soId = transactionRecord.getFieldValue('createdfrom');
		Util.console.log(soId, 'soId');
		//if there is an SO ID and the posting period is not locked
		if (soId && soId != '' && (perStatus == 'F' || (perStatus == 'T'  && glCount != '' && glCount > 0))) {
			Util.console.log('made it!');
			//get case number from SO
			var soCase = transactionRecord.getFieldValue('custbody_transaction_case');
			if (!soCase || soCase == '') {
				soCase = nlapiLookupField('salesorder', soId, 'custbody_transaction_case');
			}
			Util.console.log(soCase, 'soCase');
			
			//if case exists, proceed.  else exit
			if (soCase && soCase != '') {
				
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
						
						//get debit/credit amount
						var creditAmount = line.getCreditAmount();
						var debitAmount = line.getDebitAmount();
						
						//if there is a debit amount, execute logic to net out COGS amount and move to RMA-Clearing account
						if (debitAmount && debitAmount != '' && debitAmount >0) {
							try {
								//create line to net out COGS amount
								var newLine = customLines.addNewLine();
								newLine.setCreditAmount(debitAmount);
								newLine.setAccountId(acctId);
								newLine.setDepartmentId(line.getDepartmentId());
								newLine.setLocationId(line.getLocationId());
								newLine.setClassId(line.getClassId());
								newLine.setMemo(line.getMemo());
								newLine.setEntityId(line.getEntityId());
								customGLCount +=1;
								
								//create line to establish RMA account
								var newLine = customLines.addNewLine();
								newLine.setDebitAmount(debitAmount);
								newLine.setAccountId(500); //set to RMA-External account
								newLine.setDepartmentId(line.getDepartmentId());
								//newLine.setLocationId(line.getLocationId());
								newLine.setLocationId(68); //hardcode to None for RMA External
								newLine.setClassId(line.getClassId());
								newLine.setMemo(line.getMemo());
								newLine.setEntityId(line.getEntityId());
								customGLCount +=1;
								Util.console.log('catch');
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
					
				} else {
					return;
				}
			} else {
				Util.console.log('in return');
				return;
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