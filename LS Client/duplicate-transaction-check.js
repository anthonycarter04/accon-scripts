/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Mar 2018     anthonycarter
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function dupeVF(type, name, linenum){
 
	if (name == 'tranid' || name == 'entity') {
		
		var tranId = nlapiGetFieldValue('tranid');
		var vendId = nlapiGetFieldValue('entity');
		var intId = nlapiGetRecordId();
		
		if (tranId && tranId != '' && vendId && vendId != '') {
			
			var res = lookupTran(tranId, vendId, intId);
			
			if (res == true) {
				alert('There is already a bill for this vendor with the same reference number.  Please change the reference number');
				nlapiSetFieldValue('tranid', '');
				return false;
			}			
		}
		
	}
	return true;
}

function lookupTran(tid, vid, iid) {
	
	var found = false;
	if (tid && tid != '' && vid && vid != '') {
		tid = tid.trim();
		var filters = [];
		filters.push(new nlobjSearchFilter('tranid', null, 'is', tid));
		filters.push(new nlobjSearchFilter('entity', null, 'anyof', vid));
		filters.push(new nlobjSearchFilter('mainline', null, 'is', true));
		filters.push(new nlobjSearchFilter('type', null, 'is', 'VendBill'));
		if (iid && iid != '') {
			filters.push(new nlobjSearchFilter('internalid', null, 'noneof', iid));
		}
		
		
		
		var columns = [];
		columns.push(new nlobjSearchColumn('internalid'));
		columns.push(new nlobjSearchColumn('type'));
		
		var searchResults = nlapiSearchRecord('transaction', null, filters, columns);
		
		if (searchResults && searchResults != '') {
			found = true;
		}
		
	}
	
	return found;
	
}

function dupeBS(type) {
	
	
	if (type != 'delete') {
		var tranId = nlapiGetFieldValue('tranid');
		var vendId = nlapiGetFieldValue('entity');
		var intId = nlapiGetRecordId();
		
		if (tranId && tranId != '' && vendId && vendId != '') {
			
			var res = lookupTran(tranId, vendId, intId);
			
			if (res == true) {
				var err = nlapiCreateError('Duplicate Reference Number', 'There is already a bill for this vendor with the same reference number.  Please change the reference number', true);
				throw err;
			}			
		}
	}
	
	
}
