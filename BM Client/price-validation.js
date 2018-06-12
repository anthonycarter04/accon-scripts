/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Oct 2017     carter
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @returns {Void}
 */
function linePriceVal(type, name) {
   
		try {
			//get item level values
			var item = nlapiGetCurrentLineItemValue('item', 'item');
			var priceLevel = nlapiGetCurrentLineItemValue('item', 'price');
			var overridePrice = nlapiGetCurrentLineItemValue('item', 'custcol_override_price');
			
			
			/******
			 * Below minimum STC price level - START
			 ******/
			
			//if the price level is Customer and the override price is false, then proceed with validation
			if (priceLevel && priceLevel == -1 && (!overridePrice || overridePrice == 'F')) {
				
				
				//establish params object
				var params = {slcall: 'getMinSTCPrice', itemid: item};
				
				//get suitelet URL
				var slURL = nlapiResolveURL('SUITELET', 'customscript_client_calls_suitelet', 'customdeploy1');
				
				//call suitelet, passing in item parameters
				var slResp = nlapiRequestURL(slURL, '', {par:JSON.stringify(params)});
				
				//get suitelet response
				slResp = JSON.parse(slResp.getBody());
				
				//if the response exists
				if (slResp && slResp != '') {
					
					//get result
					var res = slResp['result'];
					
					//get minimum price
					var minPrice = fpf(slResp['price']);
					var level = slResp['level'];
					
					//get the unit price entered on the transaction line
					var unitPrice = fpf(nlapiGetCurrentLineItemValue('item', 'rate'));
					
					//if the unit price is less than the minimum price allowed, return an error
					if (unitPrice < minPrice) {
						alert('The "Rate" used is below the minimum STC price level:\n\n' + level + ' : ' + minPrice + '\n\nIf sales management has approved the custom pricing:\n\n   1. Attach management approval under the “Communication” subtab.\n   2. Mark the checkbox "Override Price" before adding the transaction line.');
						return false;
					}
					
				}
				
			}
			
			/******
			 * Below minimum STC price level - END
			 ******/
			
			/******
			 * Within STC5-STC7 Band - START
			 ******/
			
			
			if (priceLevel && (priceLevel == -1 || priceLevel == 19 || priceLevel == 21) && (!overridePrice || overridePrice == 'F')) {
				
				//establish params object
				var params = {slcall: 'getSTC57', itemid: item};
				
				//get suitelet URL
				var slURL = nlapiResolveURL('SUITELET', 'customscript_client_calls_suitelet', 'customdeploy1');
				
				//call suitelet, passing in item parameters
				var slResp = nlapiRequestURL(slURL, '', {par:JSON.stringify(params)});
				
				//get suitelet response
				slResp = JSON.parse(slResp.getBody());
				
				
				//if the response exists
				if (slResp && slResp != '') {
					
					//get result
					var res = slResp['result'];
					
					//get price object
					var priceObj = slResp['obj'];
					Util.console.log(priceObj, 'priceObj');
					//var level = slResp['level'];
					var STC7 = priceObj['STC7'];
					var STC5 = priceObj['STC5'];
					
					//if both STC7 and STC5 exist, then proceed
					if (STC7 && STC7 != '' && STC5 && STC5 != '') {
						STC7 = fpf(STC7);
						STC5 = fpf(STC5);
						
						//get line item rate
						var unitPrice = fpf(nlapiGetCurrentLineItemValue('item', 'rate'));
						
						//if greater than STC7 and less than STC5, show error.  BUT, do not prevent adding line.  This is a alert message for the user
						if (unitPrice >= STC7 && unitPrice <= STC5) {
							alert('The rate entered is between the STC5 – STC7 price levels:\n\n' + 'STC5 [' + STC5 +'] - STC7 [' + STC7 + ']\n\nPlease attach sales manager approval in the “Communication” subtab.');     
							
						}
					}
					
					
					//get the unit price entered on the transaction line
					//var unitPrice = fpf(nlapiGetCurrentLineItemValue('item', 'rate'));
					
					//if the unit price is less than the minimum price allowed, return an error
					
					
				}
				
			}
			
			/******
			 * Within STC5-STC7 Band - START
			 ******/
			return true;
		} catch (err) {
			Util.ssError(err);
		}
		
	return true;
}


function linePriceInit(type) {
	
	try {
		//get user role
		var role = nlapiGetRole();
		//if the role is non-admin
		
		//get status
		var status = nlapiGetFieldValue('status');
		Util.console.log(status, 'status');
		
		//if non-admin 
		if (role && role != '3') {
			
			//Disable the altsales line item field
			nlapiDisableLineItemField('item', 'altsalesamt',true)
			
			//if the status is not billed, lock the Closed field
			if (status != 'Billed' && status != 'Pending Billing') {
				nlapiDisableLineItemField('item', 'isclosed', true);
			}
			
		}
		return true;
	} catch(err) {
		Util.console.log(err, 'error object');
		Util.ssError(err);
	}
	
}


function fpf(stValue) 
{
	
	return (isNaN(parseFloat(stValue)) ? 0 : parseFloat(stValue));
}