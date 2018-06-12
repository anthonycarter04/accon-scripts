/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Feb 2018     anthonycarter	  Initial Logic
 * 
 * This script runs on item receipt records and is intended to modify the GL Impact of receipts tied to RMA's tied to an RMA Case
 *
 */


function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
	
	
	//var entityId = transactionRecord.getFieldValue('entity');
	
	var period = transactionRecord.getFieldValue('postingperiod');
	var glCount = transactionRecord.getFieldValue('custbody_custom_gl_line_count');

	var perStatus = getPeriodStatus(period);

	Util.console.log(perStatus, 'Per Status');
	
	var context = nlapiGetContext().getRole();
	Util.console.log(context, 'context');
	//get created from
	var rmaId = transactionRecord.getFieldValue('createdfrom');
	Util.console.log(rmaId, 'rmaId');
	
	//if there is an RMA ID and the posting period is not locked OR (period is locked AND custom GL count > 0)
	if (rmaId && rmaId != '' && (perStatus == 'F' || (perStatus == 'T' && glCount != '' && glCount > 0))) {
		
		//get case number from RMA
		
		
		var rmaCase = transactionRecord.getFieldValue('custbody_transaction_case');
		
		if (!rmaCase || rmaCase == '') {
			rmaCase = nlapiLookupField('returnauthorization', rmaId, 'custbody_transaction_case');
		}
		
		
		
		
		
		
		/*try {
			var filters = [];
			filters.push(new nlobjSearchFilter('internalid', null, 'anyof', rmaId));
			filters.push(new nlobjSearchFilter('custbody_transaction_case', null, 'isnotempty'));
			
			var columns = [new nlobjSearchColumn('internalid')];
			var searchResults = nlapiSearchRecord('transaction', null, filters, columns);
			
			Util.console.log(searchResults, 'Search Results');
		} catch(e) {
			Util.console.log(e.message, 'Error loading return auth');
		}*/
		
		Util.console.log(rmaCase, 'rmaCase');
		//if case exists, proceed.  else exit
		if (rmaCase && rmaCase != '') {
			
			//get count of standard lines
			var count = standardLines.getCount();
			Util.console.log(count, 'count');
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
					if (creditAmount && creditAmount != '' && creditAmount >0) {
						try {
							//create line to net out COGS amount
							var newLine = customLines.addNewLine();
							newLine.setDebitAmount(creditAmount);
							newLine.setAccountId(acctId);
							newLine.setDepartmentId(line.getDepartmentId());
							newLine.setLocationId(line.getLocationId());
							newLine.setClassId(line.getClassId());
							newLine.setMemo(line.getMemo());
							newLine.setEntityId(line.getEntityId());
							customGLCount +=1;
							
							//create line to establish RMA account
							var newLine = customLines.addNewLine();
							newLine.setCreditAmount(creditAmount);
							newLine.setAccountId(500); //set to RMA-External account
							newLine.setDepartmentId(line.getDepartmentId());
							//newLine.setLocationId(line.getLocationId());
							newLine.setLocationId(68); //hardcode to None for RMA External
							newLine.setClassId(line.getClassId());
							newLine.setMemo(line.getMemo());
							newLine.setEntityId(line.getEntityId());
							customGLCount +=1;
						} catch (e) {
							Util.console.log(e.message, 'Error Message');
						}
						
					}
				}
			}
			Util.console.log(customGLCount, 'custom GL Count');
			if (customGLCount > 0 && perStatus == 'F' ) {
				Util.console.log('in custom gl count');
				Util.console.log(transactionRecord.getRecordType(), 'record type');
				Util.console.log(transactionRecord.getId(), 'get transaction ID');
				
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