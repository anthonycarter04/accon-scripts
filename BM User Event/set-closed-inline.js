/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Sep 2017     jcaba
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

//set the "Closed" column display type to "inline"
function setLineDisplay(type, form, request){
	var isClosed = nlapiGetLineItemField('item','isclosed');
	isClosed.setDisplayType('inline');
}
