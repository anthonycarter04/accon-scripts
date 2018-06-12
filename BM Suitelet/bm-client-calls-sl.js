/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Oct 2017     carter		   initial
 * 1.01		  13 Oct 2017     carter           added getMinSTCPrice function for price validation
 *
 *This script is intended to act as server-side validation for a variety of scripts.
 *Instead of creating a suitelet each time a client script needs to do server-side validation, this script
 *will be used, calling the getCall function.  This function will then distribute the call per the parameter
 *passed in
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

var slFunctions = {
		
		//distributor function
		getCall: function(request, response) {
			
			//get the passed in parameters
			var params = request.getHeader('par');
			
			//parse the call to put in object
			params = JSON.parse(params);
			
			//get call name
			var call = params['slcall'];
			
			//distribute to correct function
			switch(call) {
			case 'getMinSTCPrice':
				var resp = this.getMinSTCPrice( params);
				break;
			case 'getSTC57':
				var resp = this.getSTC57Price(params);
				break;
			}
			
			
			//return response
			response.write(JSON.stringify(resp));
		},
		
		//validation function to get the minimum price allowed for a given item
		getMinSTCPrice: function(params) {
			
			//get item ID from passed in parameter
			var item = params['itemid'];
			
			//establish filters array
			var filters = [new nlobjSearchFilter('internalid', null, 'anyof', item)];
		
			//call saved search in NetSuite with item filter
			var searchResults = nlapiSearchRecord('item', 'customsearch_get_stc_min_price', filters);
			
			//if search results exist, get the lowest acceptable price and price level
			//else return 0 as the lowest value allowed
			if (searchResults && searchResults != '') {
				var minPrice = searchResults[0].getValue('unitprice', 'pricing', 'min');
				var priceLvl = searchResults[0].getValue('pricelevel', 'pricing', 'max');
				Util.console.log(minPrice, 'Min Price');
			} else {
				var minPrice = 0;
			}
			
			//establish result object
			var res = {result: 'success', price: minPrice, level: priceLvl};
			
			//return the results to distributor function
			return res;
		},
		getSTC57Price: function(params) {
			//get item ID from passed in parameter
			var item = params['itemid'];
			
			//establish filters array
			var filters = [new nlobjSearchFilter('internalid', null, 'anyof', item)];
		
			//call saved search in NetSuite with item filter
			var searchResults = nlapiSearchRecord('item', 'customsearch_stc_5_7', filters);
			Util.console.log(searchResults, 'searchResults');
			//if search results exist, get the lowest acceptable price and price level
			//else return 0 as the lowest value allowed
			if (searchResults && searchResults != '') {
				
				var priceObj = {};
				for (var i=0; i<searchResults.length; i++) {
					priceObj[searchResults[i].getText('pricelevel', 'pricing')] = searchResults[i].getValue('unitprice', 'pricing');
				}
				
			} else {
				var priceObj = '';
			}
			
			//establish result object
			var res = {result: 'success', obj: priceObj};
			Util.console.log(res, 'res');
			//return the results to distributor function
			return res;
			
			
		}
		
}