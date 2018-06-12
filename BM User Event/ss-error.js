/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Feb 2018     anthonycarter
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



function innerFunction() {
	
	var error = 'Testing the error message';
	var details = 'Testing the errro details.  Test Test Test';
	try {
		asdf
	} catch (err) {
		Util.console.log(err, 'Error OBject');
		Util.ssError(err);
		
	}
	
}


/*function ssError(err){
	
	
	var context = nlapiGetContext();
	var params = {};
	params.user = context.getUser();
	params.environ = context.getEnvironment();
	params.execctx = context.getExecutionContext();
	params.scriptid = context.getScriptId();
	params.deploymentid = context.getDeploymentId();
	params.role = context.getRole();
	params.err = err.name;
	params.details = err.message;
	params.line = err.lineNumber;
	params.stack = err.stack;
	params.file = err.fileName;
	if (params.environ == 'SANDBOX') {
		var baseUrl = 'https://system.sandbox.netsuite.com';
	} else {
		var baseUrl = 'https://system.na2.netsuite.com';
	}
	
	
	
	var slUrl = nlapiResolveURL('SUITELET', 'customscript_ss_error_sl', 'customdeploy1');
	var fullUrl = baseUrl + slUrl;
	Util.console.log(baseUrl + slUrl, 'slUrl');
	if (slUrl && slUrl != '') {
		
		var resp = nlapiRequestURL('https://forms.sandbox.netsuite.com/app/site/hosting/scriptlet.nl?script=626&deploy=1&compid=3739054&h=24cdf9d8c46f6e1d35fd', params);
		
		
	}
	
	
}*/

function createErr(request, response) {
	Util.console.log('running');
	var context = nlapiGetContext();
	var userParam = request.getParameter('user');
	Util.console.log(userParam);
	var err = nlapiCreateRecord('customrecord_ss_errors');
	var user = request.getParameter('user');
	var environ = request.getParameter('environ');
	var execCtx = request.getParameter('execctx');
	var scriptId = request.getParameter('scriptid');
	var deploymentId = request.getParameter('deploymentid');
	var role = request.getParameter('role');
	var error = request.getParameter('err');
	var details = request.getParameter('details');
	var line = request.getParameter('line');
	var stack = request.getParameter('stack');
	var file = request.getParameter('file');
	var scriptResults = findScript(scriptId, deploymentId);
	
	if (scriptResults && scriptResults != '') {
		var script = scriptResults[0].getValue('script');
		var deployment = scriptResults[0].getValue('internalid');
	} else {
		var script = '';
		var deployment = '';
	}
	//var role = context.getRole();
	err.setFieldValue('custrecord_sserr_script_id', scriptId );
	err.setFieldValue('custrecord_sserr_script', script);
	err.setFieldValue('custrecord_sserr_deployment', deploymentId);
	err.setFieldValue('custrecord_sserr_error_message', error);
	err.setFieldValue('custrecord_sserr_details', details);
	err.setFieldValue('custrecord_sserr_line', line);
	err.setFieldValue('custrecord_sserr_stack', stack);
	err.setFieldValue('custrecord_sserr_filename', file);
	
	if (user && user != '' && user > 0) {
		err.setFieldValue('custrecord_sserr_user', user);
	}
	
	err.setFieldValue('custrecord_sserr_environment', environ);
	err.setFieldValue('custrecord_sserr_execcontext', execCtx);
	if (role && role != '') {
		err.setFieldValue('custrecord_sserr_role', role);
	}
	
	nlapiSubmitRecord(err);
}

function findScript(sid, deploy) {
	var filters = [];
	filters.push(new nlobjSearchFilter('scriptid', 'script', 'is', sid));
	filters.push(new nlobjSearchFilter('scriptid', null, 'is', deploy));
	
	
	var cols = [];
	cols.push(new nlobjSearchColumn('script'));
	cols.push(new nlobjSearchColumn('scriptid'));
	cols.push(new nlobjSearchColumn('scriptid'));
	cols.push(new nlobjSearchColumn('internalid'));
	
	var searchResults = nlapiSearchRecord('scriptdeployment', null, filters, cols );
	
	return searchResults;
	
}