/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Feb 2018     anthonycarter
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function tranMonSave(){
	
	try {
		var recType = nlapiGetRecordType();
		if (recType == 'salesorder') {
			
			var hasPrimary = 'F';
			
			
			var partnerListCount = nlapiGetLineItemCount('partners');
			if (partnerListCount && partnerListCount != '') {
				
				for (var i=1; i<=partnerListCount; i++) {
					var isPrimary = nlapiGetLineItemValue('partners', 'isprimary', i);
					if (isPrimary == 'T') {
						hasPrimary = 'T';
						break;
					}
				}
				
			}
			
			if (hasPrimary == 'F') {
				alert('A Primary Sales Rep must be selected under Relationships > Sales Rep/Partner > Primary (checkbox)');
				return false;
			}
			
		} else if (recType == 'itemreceipt') {
			
			var lineCount = nlapiGetLineItemCount('item');
			
			for (var i=1; i<=lineCount; i++) {
				
				var rate = nlapiGetCurrentLineItemValue('item', 'rate', i);
				var prodType = nlapiGetCurrentLineItemValue('item', 'custcol_product_type', i);
				
				if (rate && rate > 0 && prodType && (prodType == 8 || prodType == 25)) {
					alert('This item receipt has sample material with a positive Item Rate. Please update the "Rate" on line #' + i + ' to $0.00 before receiving.');
					return false;
				}
				
			}
			
		}
		
		return true;
	} catch (err) {
		
		Util.ssError(err);
	}
	
	
    return true;
}

function tranMonFC(type, name) {
	
	var recType = nlapiGetRecordType();
	
	if (recType == 'itemreceipt') {
		Util.console.log(name, 'name');
		if (type == 'item' && (name == 'rate' || name == 'custcol_product_type')) {
			
			var rate = nlapiGetCurrentLineItemValue('item', 'rate');
			var prodType = nlapiGetCurrentLineItemValue('item', 'custcol_product_type');
			if (rate && rate > 0 && prodType && (prodType == 8 || prodType == 25)) {
				alert('This item receipt has sample material with a positive Item Rate. Please update the "Rate" to $0.00 before receiving.');
				return false;
			}
			
		}
		
	}
	
	return true;
}
