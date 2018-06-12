/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Feb 2018     anthonycarter	  Initial Logic
 * 
 * This script runs on item receipt records and is intended to modify the GL Impact of receipts tied to transfer orders
 *
 */


function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
	
	
	//var entityId = transactionRecord.getFieldValue('entity');
	
	var period = transactionRecord.getFieldValue('postingperiod');
	var glCount = transactionRecord.getFieldValue('custbody_custom_gl_line_count');

	var perStatus = getPeriodStatus(period);
	Util.console.log(perStatus, 'perStatus');
	var createdText = transactionRecord.getFieldText('createdfrom');
	Util.console.log(createdText, 'createdText');
	
	try {
		var newRec = nlapiGetNewRecord();
		Util.console.log(transactionRecord.getAllFields(), 'All Fields');
		Util.console.log(transactionRecord.getFieldValue('id'));
		
	} catch (e) {
		Util.console.log(e.message, 'Error Message');
	}
	
	if (createdText.search('Transfer') != -1) {
		Util.console.log('in transfer');
		
		//get created from
		var rmaId = transactionRecord.getFieldValue('createdfrom');
		Util.console.log(rmaId, 'rmaId');
		//if there is an RMA ID and the posting period is not locked OR (period is locked AND custom GL count > 0)
		if ((perStatus == 'F' || (perStatus == 'T' && glCount != '' && glCount > 0))) {

			//get count of standard lines
			var count = standardLines.getCount();
			Util.console.log(count, 'count');
			var customGLCount = 0;
			//loop through lines
			var finalImpactDebit = [];
			var finalImpactCredit = [];
			var glSet = {};
			for (var i=0; i<count; i++) {
		
				//get instance of GL impact line
				var line = standardLines.getLine(i);
				Util.console.log(line.getAccountId(), 'Account ID, line #'+i);
				
				
				//get acct Id
				var acctId = line.getAccountId();
				if (acctId && acctId != '') {
					
				
					
					var memo = line.getMemo();
					
					if (acctId == 382 && (memo == '' || !memo)) {
						var finGoods = 0;
						
						var debit = line.getDebitAmount();
						Util.console.log(debit, 'debit');
						var credit = line.getCreditAmount();
						if (debit != 0) {
							finGoods += parseFloat(debit);
						} else {
							finGoods += parseFloat(credit);
						}
						
						Util.console.log(finGoods, 'fingoods before loop');
						
						glSet = {
								acct: line.getAccountId(), 
								memo: line.getMemo(),
								dept: line.getDepartmentId(),
								theclass: line.getClassId(),
								location: line.getLocationId(),
								entity: line.getEntityId(),
								linenum: i+1
						};
						
						
						
						
						for (var j=i+1; j<count; j++) {
							
							var loopLine = standardLines.getLine(j);
							var loopMemo = loopLine.getMemo();
							var loopDebit = loopLine.getDebitAmount();
							
							if ((!loopMemo || loopMemo == '') && loopDebit != '' ) {
								
								glSet.debit = finGoods;
								Util.console.log(glSet,'in loop memo');
								finalImpactDebit.push(glSet);
								break;
							} else {
								
								var loopAcctId = loopLine.getAccountId();
								if (loopAcctId && loopAcctId == 382) {
									var loopDebit = loopLine.getDebitAmount();
									var loopCredit = loopLine.getCreditAmount();
									if (loopDebit != 0) {
										finGoods += parseFloat(loopDebit);
									} else {
										finGoods += parseFloat(loopCredit);
									}
									
								} 
								
								
							}
							
							
							
							
							
						}
						if (j==count) {
							glSet.debit = finGoods;
							finalImpactDebit.push(glSet);
						}
						Util.console.log(finalImpactDebit, 'final impact debit');
						
					} else if (acctId == 131 && (memo == '' || !memo)) {
						var debit = line.getDebitAmount();
						Util.console.log(debit, 'debit');
						var inTransit = 0;
						var credit = line.getCreditAmount();
						if (debit != 0) {
							inTransit += parseFloat(debit);
						} else {
							inTransit += parseFloat(credit);
						}
						
						Util.console.log(inTransit, 'inTransit before loop');
						
						glSet = {
								acct: line.getAccountId(), 
								memo: line.getMemo(),
								dept: line.getDepartmentId(),
								theclass: line.getClassId(),
								location: line.getLocationId(),
								entity: line.getEntityId(),
								linenum: i+1
						};
						
						Util.console.log(glSet, 'gl set after gl set');
						
						
						for (var j=i+1; j<count; j++) {
							
							var loopLine = standardLines.getLine(j);
							var loopMemo = loopLine.getMemo();
							var loopCredit = loopLine.getCreditAmount();
							Util.console.log(loopCredit, 'loopCredit');
							if ((!loopMemo || loopMemo == '') && loopCredit != '' ) {
								
								glSet.credit = inTransit;
								Util.console.log(glSet,'in loop memo');
								finalImpactCredit.push(glSet);
								break;
							} else {
								
								var loopAcctId = loopLine.getAccountId();
								Util.console.log(loopAcctId, 'loop account id');
								if (loopAcctId && loopAcctId == 131) {
									var loopDebit = loopLine.getDebitAmount();
									var loopCredit = loopLine.getCreditAmount();
									if (loopDebit != 0) {
										inTransit += parseFloat(loopDebit);
									} else {
										inTransit += parseFloat(loopCredit);
									}
									
								} 
								
								
							}
							
							
							
							
						}
						if (j==count) {
							Util.console.log('in j = count');
							glSet.credit = inTransit;
							finalImpactCredit.push(glSet);
						}
						
						Util.console.log(finalImpactCredit, 'final impact debit');
						
						
						
						
						
					}
					
					
					
					/* Old Logic
					if (memo && memo != '') {
						
					} else {
						
						glSet = {
								acct: line.getAccountId(), 
								debit: line.getDebitAmount(),
								credit: line.getCreditAmount(),
								memo: line.getMemo(),
								dept: line.getDepartmentId(),
								theclass: line.getClassId(),
								location: line.getLocationId(),
								entity: line.getEntityId(),
								linenum: i+1
						};
						//Util.console.log(glSet, 'glSet');
					
						//Util.console.log(line.getDebitAmount() + '-' + line.getCreditAmount(), 'Debit: Credit #' + i);
						if (line.getDebitAmount() != 0) {
							finalImpactDebit.push(glSet);
						} else if (line.getCreditAmount() != 0) {
							finalImpactCredit.push(glSet);
						}
					}*/
					
					
					/************
					 * Reverse Original Impact Section
					 ************/
					
					
					//get debit/credit amount
					var creditAmount = line.getCreditAmount();
					var debitAmount = line.getDebitAmount();
					
					
					try {
						//if there is a debit amount, execute logic to net out COGS amount and move to RMA-Clearing account
						if (creditAmount && creditAmount != '' && creditAmount >0) {
							var newLine = customLines.addNewLine();
							newLine.setDebitAmount(line.getCreditAmount());
							newLine.setAccountId(line.getAccountId());
							newLine.setDepartmentId(line.getDepartmentId());
							newLine.setLocationId(line.getLocationId());
							newLine.setClassId(line.getClassId());
							newLine.setMemo(line.getMemo());
							newLine.setEntityId(line.getEntityId());
							customGLCount +=1;
						} else if (debitAmount && debitAmount != '' && debitAmount >0) {
							var newLine = customLines.addNewLine();
							newLine.setCreditAmount(line.getDebitAmount());
							newLine.setAccountId(line.getAccountId());
							newLine.setDepartmentId(line.getDepartmentId());
							newLine.setLocationId(line.getLocationId());
							newLine.setClassId(line.getClassId());
							newLine.setMemo(line.getMemo());
							newLine.setEntityId(line.getEntityId());
							customGLCount +=1;
						}
					} catch(e) {
						
						
					}
					
					
					
					
					/************
					 * End Original Impact Section
					 ************/
					
					
				}
				
			}
			
			Util.console.log(finalImpactDebit, 'finalImpactDebit');
			Util.console.log(finalImpactCredit, 'finalImpactCredit');
			
			if (finalImpactDebit && finalImpactDebit.length > 0) {
				
				for (var j=0; j<finalImpactDebit.length; j++) {
					var newLine = customLines.addNewLine();
					newLine.setDebitAmount(finalImpactDebit[j]['debit']);
					newLine.setAccountId(finalImpactDebit[j]['acct']);
					newLine.setDepartmentId(finalImpactDebit[j]['dept']);
					newLine.setLocationId(finalImpactDebit[j]['location']);
					newLine.setClassId(finalImpactDebit[j]['theclass']);
					if (finalImpactDebit[j]['memo'] && finalImpactDebit[j]['memo'] != '') {
						newLine.setMemo(finalImpactDebit[j]['memo']);
					} else {
						newLine.setMemo('');
					}
					if (finalImpactDebit[j]['entity'] && finalImpactDebit[j]['entity'] != '') {
						newLine.setEntityId(finalImpactDebit[j]['entity']);
					} else {
						//newLine.setEntityId('');
					}
					
					customGLCount +=1;
					
					var newLine = customLines.addNewLine();
					newLine.setCreditAmount(finalImpactDebit[j]['debit']);
					newLine.setAccountId(finalImpactCredit[j]['acct']);
					newLine.setDepartmentId(finalImpactCredit[j]['dept']);
					newLine.setLocationId(finalImpactCredit[j]['location']);
					newLine.setClassId(finalImpactCredit[j]['theclass']);
					if (finalImpactCredit[j]['memo'] && finalImpactCredit[j]['memo'] != '') {
						newLine.setMemo(finalImpactCredit[j]['memo']);
					} else {
						newLine.setMemo('');
					}
					if (finalImpactCredit[j]['entity'] && finalImpactCredit[j]['entity'] != '') {
						newLine.setEntityId(finalImpactCredit[j]['entity']);
					} else {
						//newLine.setEntityId('');
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
		

		} else{
			Util.console.log('did not make it!');
			//nlapiSubmitField(transactionRecord.getRecordType(), transactionRecord.getId(), 'custbody_custom_gl_line_count', 0);
		}
		
		
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