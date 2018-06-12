/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Apr 2018     jcaba
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */

function updateWo_beforeSubmit(type)
{
     //retrieve the Sales Order ID from which the WO has been created
	 var createdFrom = nlapiGetFieldValue('createdfrom');	 
	 
	 
	 if (createdFrom != null)
		 {
		 //load the Sales Order details
		 var order = nlapiLoadRecord('salesorder', createdFrom);
		 //get the SO Sales Rep
		 var salesRepPartner = order.getFieldValue('partner');
		 //set the value of the Sales Rep on the current WO
		 nlapiSetFieldValue( 'custbody_sales_rep_partner', salesRepPartner);
		 }		 
}