/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Nov 2017     carter
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function openOrderReport(request, response){

	if (request && request.getMethod() == 'GET') {
		
		
		var roleCenter = nlapiGetContext().getRoleCenter();
		var user = nlapiGetUser();
		
		var repForm = nlapiCreateForm('Delta Report');
		repForm.addSubmitButton('Generate Report')
		repForm.setScript('customscript_open_order_class_report_cl');
		repForm.addFieldGroup('custpage_quickfilter', 'Filters');
		repForm.addFieldGroup('custpage_paramgroup', 'Parameters');
		
		
		//Quick Ranges
		var defDate = repForm.addField('custpage_defdate', 'select', 'Quick Range', null, 'custpage_quickfilter').setLayoutType('startrow');
		defDate.addSelectOption('custpage_defdate_blank', '', true);
		defDate.addSelectOption('custpage_defdate_twodaysvsyesterday', 'Two Days Ago vs Yesterday');
		defDate.addSelectOption('custpage_defdate_weeklastvsthis', 'Last Week vs This Week');
		//defDate.addSelectOption('custpage_defdate_last4days', 'Last 4 Days');
		
		//True Order Filter
		var trueOrderFil = repForm.addField('custpage_trueorderfil', 'select', 'True Order', null, 'custpage_quickfilter');
		trueOrderFil.addSelectOption('custpage_trueorderfil_all', 'All');
		trueOrderFil.addSelectOption('custpage_trueorderfil_orders', 'Sales Orders',true);
		trueOrderFil.addSelectOption('custpage_trueorderfil_estimates', 'Estimates');
		
		//Report Summary By
		var repSumFil = repForm.addField('custpage_repsumfil', 'select', 'Summary Type', null, 'custpage_quickfilter');
		repSumFil.addSelectOption('custpage_repsumfil_summary', 'Summary');
		repSumFil.addSelectOption('custpage_repsumfil_salesrep', 'By Sales Rep/Partner');
		
		//Rep Type Filter
		var repTypeFil = repForm.addField('custpage_reptypefil', 'select', 'Sales Rep Category', null, 'custpage_quickfilter').setBreakType('startcol');
		repTypeFil.addSelectOption('custpage_repsumfil_blank', '', true);
		repTypeFil.addSelectOption('custpage_repsumfil_commercial', 'Commercial Sales Rep');
		repTypeFil.addSelectOption('custpage_repsumfil_distributor', 'Distributor');
		repTypeFil.addSelectOption('custpage_repsumfil_salesrep', 'Sales Representative');
		repTypeFil.addSelectOption('custpage_repsumfil_salesmanager', 'Sales Manager');
		
		//Int/Res/Comm Filter
		var locFil = repForm.addField('custpage_replocfil', 'select', 'Location', null, 'custpage_quickfilter');
		locFil.addSelectOption('custpage_replocfil_blank','', true);
		locFil.addSelectOption('custpage_replocfil_residential','Residential');
		locFil.addSelectOption('custpage_replocfil_commercial','Commercial');
		locFil.addSelectOption('custpage_replocfil_international','International');
		
		//Territory Filter By
		var terrFil = repForm.addField('custpage_terrfil', 'select', 'Territory',null, 'custpage_quickfilter');
		terrFil.addSelectOption('custpage_terrfil_0', '');
		terrFil.addSelectOption('custpage_terrfil_1', 'International');
		terrFil.addSelectOption('custpage_terrfil_2', 'West Coast');
		terrFil.addSelectOption('custpage_terrfil_3', 'Mid West');
		terrFil.addSelectOption('custpage_terrfil_4', 'East Coast');
		//terrFil.addSelectOption('custpage_terrfil_5', 'Ocean');
		terrFil.addSelectOption('custpage_terrfil_6', 'Other');
		//terrFil.addSelectOption('custpage_terrfil_7', 'Satellite');
		
		var partnerFil = repForm.addField('custpage_partnerfil', 'select', 'Sales Rep/Partner', 'partner', 'custpage_quickfilter');
		if (roleCenter == 'PARTNERCENTER') {
			terrFil.setDisplayType('inline');
			partnerFil.setDisplayType('inline').setDefaultValue(user);
		}
		
		
		repForm.addField('custpage_label1', 'label', 'Date Range 1', null, 'custpage_paramgroup').setLayoutType('startrow', 'startcol');
		repForm.addField('custpage_datefrom1', 'date', 'From', null, 'custpage_paramgroup')
		repForm.addField('custpage_dateto1', 'date', 'To', null, 'custpage_paramgroup');
		
		repForm.addField('custpage_label2', 'label', 'Date Range 2', null, 'custpage_paramgroup').setLayoutType('startrow', 'startcol');
		repForm.addField('custpage_datefrom2', 'date', 'From', null, 'custpage_paramgroup');
		repForm.addField('custpage_dateto2', 'date', 'To', null, 'custpage_paramgroup');
		repForm.addField('custpage_label3', 'label', 'Date Range 3', null, 'custpage_paramgroup').setLayoutType('startrow', 'startcol').setDisplayType('hidden');
		repForm.addField('custpage_datefrom3', 'date', 'From', null, 'custpage_paramgroup').setDisplayType('hidden');
		repForm.addField('custpage_dateto3', 'date', 'To', null, 'custpage_paramgroup').setDisplayType('hidden');
		repForm.addField('custpage_label4', 'label', 'Date Range 4', null, 'custpage_paramgroup').setLayoutType('startrow', 'startcol').setDisplayType('hidden');
		repForm.addField('custpage_datefrom4', 'date', 'From', null, 'custpage_paramgroup').setDisplayType('hidden');
		repForm.addField('custpage_dateto4', 'date', 'To', null, 'custpage_paramgroup').setDisplayType('hidden');
		
		response.writePage(repForm);
	} else {
		
		
		var roleCenter = nlapiGetContext().getRoleCenter();
		var user = nlapiGetUser();
		
		var params = {};
		params['from1'] = request.getParameter('custpage_datefrom1');
		params['to1'] = request.getParameter('custpage_dateto1');
		params['from2'] = request.getParameter('custpage_datefrom2');
		params['to2'] = request.getParameter('custpage_dateto2');
		params['from3'] = request.getParameter('custpage_datefrom3');
		params['to3'] = request.getParameter('custpage_dateto3');
		params['from4'] = request.getParameter('custpage_datefrom4');
		params['to4'] = request.getParameter('custpage_dateto4');
		Util.console.log(params, 'params');
		
		var trueOrderFilter = request.getParameter('custpage_trueorderfil');
		var quickRangeFilter = request.getParameter('custpage_defdate');
		var sumTypeFilter = request.getParameter('custpage_repsumfil');
		var terrFilter = request.getParameter('custpage_terrfil');
		var partnerFilter = request.getParameter('custpage_partnerfil');
		var repTypeFilter = request.getParameter('custpage_reptypefil');
		var locFilter = request.getParameter('custpage_replocfil');
		
		
		
		var pForm = nlapiCreateForm('Delta Report');
		pForm.addSubmitButton('Generate Report')
		pForm.setScript('customscript_open_order_class_report_cl');
		pForm.addFieldGroup('custpage_quickfilter', 'Filters');
		pForm.addFieldGroup('custpage_paramgroup', 'Parameters');
		
		
		var defDate = pForm.addField('custpage_defdate', 'select', 'Quick Range', null, 'custpage_quickfilter').setLayoutType('startrow');
		defDate.addSelectOption('custpage_defdate_blank', '', true);
		defDate.addSelectOption('custpage_defdate_twodaysvsyesterday', 'Two Days Ago vs Yesterday');
		defDate.addSelectOption('custpage_defdate_weeklastvsthis', 'Last Week vs This Week');
		defDate.addSelectOption('custpage_defdate_last4days', 'Last 4 Days');
		defDate.setDefaultValue(quickRangeFilter);
		
		var trueOrderFil = pForm.addField('custpage_trueorderfil', 'select', 'Order Type', null, 'custpage_quickfilter');
		trueOrderFil.addSelectOption('custpage_trueorderfil_all', 'All');
		trueOrderFil.addSelectOption('custpage_trueorderfil_orders', 'Sales Orders');
		trueOrderFil.addSelectOption('custpage_trueorderfil_estimates', 'Estimates');
		trueOrderFil.setDefaultValue(trueOrderFilter);
		
		
		
		//Report Summary By
		var repSumFil = pForm.addField('custpage_repsumfil', 'select', 'Summary Type', null, 'custpage_quickfilter');
		repSumFil.addSelectOption('custpage_repsumfil_summary', 'Summary');
		repSumFil.addSelectOption('custpage_repsumfil_salesrep', 'By Sales Rep');
		repSumFil.setDefaultValue(sumTypeFilter);
		
		//Rep Type Filter
		var repTypeFil = pForm.addField('custpage_reptypefil', 'select', 'Sales Rep Category', null, 'custpage_quickfilter').setBreakType('startcol');
		repTypeFil.addSelectOption('custpage_repsumfil_blank', '', true);
		repTypeFil.addSelectOption('custpage_repsumfil_commercial', 'Commercial Sales Rep');
		repTypeFil.addSelectOption('custpage_repsumfil_distributor', 'Distributor');
		repTypeFil.addSelectOption('custpage_repsumfil_salesrep', 'Sales Representative');
		repTypeFil.addSelectOption('custpage_repsumfil_salesmanager', 'Sales Manager');
		
		repTypeFil.setDefaultValue(repTypeFilter);
		
		//Int/Res/Comm Filter
		var locFil = pForm.addField('custpage_replocfil', 'select', 'Location', null, 'custpage_quickfilter');
		locFil.addSelectOption('custpage_replocfil_blank','');
		locFil.addSelectOption('custpage_replocfil_residential','Residential');
		locFil.addSelectOption('custpage_replocfil_commercial','Commercial');
		locFil.addSelectOption('custpage_replocfil_international','International');
		locFil.setDefaultValue(locFilter);
		
		//Territory Filter
		//Territory Filter By
		var terrFil = pForm.addField('custpage_terrfil', 'select', 'Territory',null, 'custpage_quickfilter');
		terrFil.addSelectOption('custpage_terrfil_0', '');
		terrFil.addSelectOption('custpage_terrfil_1', 'International');
		terrFil.addSelectOption('custpage_terrfil_2', 'West Coast');
		terrFil.addSelectOption('custpage_terrfil_3', 'Mid West');
		terrFil.addSelectOption('custpage_terrfil_4', 'East Coast');
		//terrFil.addSelectOption('custpage_terrfil_5', 'Ocean');
		terrFil.addSelectOption('custpage_terrfil_6', 'Other');
		//terrFil.addSelectOption('custpage_terrfil_7', 'Satellite');
		terrFil.setDefaultValue(terrFilter);
		
		
		//Partner Filter
		var partnerFil = pForm.addField('custpage_partnerfil', 'select', 'Sales Rep/Partner', 'partner', 'custpage_quickfilter');
		
		if (roleCenter == 'PARTNERCENTER') {
			terrFil.setDisplayType('inline');
			partnerFil.setDisplayType('inline').setDefaultValue(user);
		} else {
			partnerFil.setDefaultValue(partnerFilter);
		}
		
		pForm.addField('custpage_label1', 'label', 'Date Range 1', null, 'custpage_paramgroup').setLayoutType('startrow', 'startcol');
		pForm.addField('custpage_datefrom1', 'date', 'From', null, 'custpage_paramgroup').setDefaultValue(params['from1']);
		pForm.addField('custpage_dateto1', 'date', 'To', null, 'custpage_paramgroup').setDefaultValue(params['to1']);
		pForm.addField('custpage_label2', 'label', 'Date Range 2', null, 'custpage_paramgroup').setLayoutType('startrow', 'startcol');
		pForm.addField('custpage_datefrom2', 'date', 'From', null, 'custpage_paramgroup').setDefaultValue(params['from2']);
		pForm.addField('custpage_dateto2', 'date', 'To', null, 'custpage_paramgroup').setDefaultValue(params['to2']);
		pForm.addField('custpage_label3', 'label', 'Date Range 3', null, 'custpage_paramgroup').setLayoutType('startrow', 'startcol').setDisplayType('hidden');
		pForm.addField('custpage_datefrom3', 'date', 'From', null, 'custpage_paramgroup').setDisplayType('hidden').setDefaultValue(params['from3']);
		pForm.addField('custpage_dateto3', 'date', 'To', null, 'custpage_paramgroup').setDisplayType('hidden').setDefaultValue(params['to3']);
		pForm.addField('custpage_label4', 'label', 'Date Range 4', null, 'custpage_paramgroup').setDisplayType('hidden').setLayoutType('startrow', 'startcol');
		pForm.addField('custpage_datefrom4', 'date', 'From', null, 'custpage_paramgroup').setDisplayType('hidden').setDefaultValue(params['from4']);
		pForm.addField('custpage_dateto4', 'date', 'To', null, 'custpage_paramgroup').setDisplayType('hidden').setDefaultValue(params['to4']);
		
		
		var repList = pForm.addSubList('custpage_replist', 'list', 'Report');
		repList.addField('custpage_classification', 'text', 'Classification');
		if (sumTypeFilter == 'custpage_repsumfil_salesrep') {
			repList.addField('custpage_partner', 'select', 'Sales Rep/Partner', 'partner').setDisplayType('inline');
		}
		repList.addField('custpage_priority', 'text', 'Priority');
		repList.addField('custpage_group', 'text', 'Group');
		repList.addField('custpage_trueorder', 'text', 'True Order');
		var range1Url = repList.addField('custpage_range1detail', 'url', 'Range 1 Detail').setLinkText('See Detail');
		//range1Url.setDefaultValue('https://system.na1.netsuite.com/app/site/hosting/scriptlet.nl?script=518&deploy=1');
		//var testLink = repForm.addField('custpage_testlink', 'url', '').setDisplayType('inline').setLinkText('See Detail');
		//testLink.setDefaultValue('https://system.na1.netsuite.com/app/site/hosting/scriptlet.nl?script=518&deploy=1');
		
		repTypeFilter = repTypeMap[repTypeFilter];
		Util.console.log(repTypeFilter, 'repTypeFilter');
				
		
		if (params['from1'] && params['from1'] != '') {
			var data1 = getReportData(params['from1'], params['to1'], 'range1', trueOrderFilter, sumTypeFilter, terrFilter,partnerFilter,repTypeFilter,locFilter);
			Util.console.log(data1, 'data returned1');
			repList.addField('custpage_ordercount1', 'integer', 'Order Count Range 1');
			repList.addField('custpage_unbilled1', 'integer', 'Amount Unbilled Range 1');
			//repList.addField('custpage_total1', 'currency', 'Total Amount Range 1');
		}
		
		
		
		if (params['from2'] && params['from2'] != '') {
			var data2 = getReportData(params['from2'], params['to2'], 'range2', trueOrderFilter, sumTypeFilter, terrFilter,partnerFilter,repTypeFilter,locFilter);
			Util.console.log(data2, 'data returned2');
			var range2Url = repList.addField('custpage_range2detail', 'url', 'Range 2 Detail').setLinkText('See Detail');
			repList.addField('custpage_ordercount2', 'integer', 'Order Count Range 2');
			repList.addField('custpage_unbilled2', 'integer', 'Amount Unbilled Range 2');
			repList.addField('custpage_ordcount_numvar2', 'integer', 'Range 2 - Count Change');
			repList.addField('custpage_ordcount_percvar2', 'percent', 'Range 2 - Count % Change');
			repList.addField('custpage_unbilled_numvar2', 'integer', 'Range 2 - Unbilled Change');
			repList.addField('custpage_unbilled_percvar2', 'percent', 'Range 2 - Unbilled % Change');
			//repList.addField('custpage_arrowtext', 'image', 'Arrow');
			//repList.addField('custpage_total2', 'currency', 'Total Amount Range 2');
		}
		
		if (params['from3'] && params['from3'] != '') {
			var data3 = getReportData(params['from3'], params['to3'], 'range3', trueOrderFilter, sumTypeFilter, terrFilter,partnerFilter,repTypeFilter,locFilter);
			Util.console.log(data3, 'data returned3');
			repList.addField('custpage_ordercount3', 'float', 'Order Count Range 3');
			repList.addField('custpage_unbilled3', 'currency', 'Amount Unbilled Range 3');
			repList.addField('custpage_ordcount_numvar3', 'float', 'Range 3 - Count Change');
			repList.addField('custpage_ordcount_percvar3', 'percent', 'Range 3 - % Change');
			//repList.addField('custpage_total3', 'currency', 'Total Amount Range 3');
		}
		
		if (params['from4'] && params['from4'] != '') {
			var data4 = getReportData(params['from4'], params['to4'], 'range4', trueOrderFilter,sumTypeFilter, terrFilter,partnerFilter,repTypeFilter,locFilter);
			Util.console.log(data4, 'data returned4');
			repList.addField('custpage_ordercount4', 'float', 'Order Count Range 4');
			repList.addField('custpage_unbilled4', 'currency', 'Amount Unbilled Range 4');
			repList.addField('custpage_ordcount_numvar4', 'float', 'Range 4 - Count Change');
			repList.addField('custpage_ordcount_percvar4', 'percent', 'Range 4 - % Change');
			//repList.addField('custpage_total4', 'currency', 'Total Amount Range 4');
		}
		
		
		if (data1['hasdata'] || data2['hasdata']) {
			var finalData = joinData(data1, data2, sumTypeFilter);
			Util.console.log(finalData, 'finalData');
			
			var i=1;
			var rangeObj = '';
			for (key in finalData) {
				//repList.setLineItemValue('custpage_classification', i, key);
				
				//establish range
				rangeObj = finalData[key];
				for (key2 in rangeObj) {
					repList.setLineItemValue('custpage_classification', i, rangeObj[key2]['classification']);
					repList.setLineItemValue('custpage_partner', i, rangeObj[key2]['partner']);
					repList.setLineItemValue('custpage_priority', i, rangeObj[key2]['priority']);
					repList.setLineItemValue('custpage_group', i,  rangeObj[key2]['group']);
					repList.setLineItemValue('custpage_trueorder', i,  rangeObj[key2]['trueorder']);
					var url = 'https://system.na1.netsuite.com/app/site/hosting/scriptlet.nl?script=518&deploy=1&class=' + rangeObj[key2]['classid'] + '&reptype=' + encodeURIComponent(repTypeFilter) + '&terr=' + encodeURIComponent(terrFilter) + '&partner=' +rangeObj[key2]['partner'] + '&group=' + rangeObj[key2]['groupid'] + '&loc=' + locFilter + '&priority=' + rangeObj[key2]['priorityid'] + '&date1=' + encodeURIComponent(params['from1']) + '&date2=' + encodeURIComponent(params['to1']);             
					repList.setLineItemValue('custpage_range1detail', i, url);
					
					if (key2 == 'range1') {
						
						repList.setLineItemValue('custpage_ordercount1', i, rangeObj[key2]['ordercount'].toFixed(0));
						repList.setLineItemValue('custpage_unbilled1', i,  rangeObj[key2]['unbilled'].toFixed(0));
						//repList.setLineItemValue('custpage_total1', i,  rangeObj[key2]['total']);
					}
					
					if (key2 == 'range2') {
						
						var url = 'https://system.na1.netsuite.com/app/site/hosting/scriptlet.nl?script=518&deploy=1&class=' + rangeObj[key2]['classid'] + '&reptype=' + encodeURIComponent(repTypeFilter) + '&terr=' + encodeURIComponent(terrFilter) + '&partner=' +rangeObj[key2]['partner'] + '&group=' + rangeObj[key2]['groupid']+ '&loc=' + locFilter + '&priority=' + rangeObj[key2]['priorityid'] + '&date1=' + encodeURIComponent(params['from2']) + '&date2=' + encodeURIComponent(params['to2']);             
						repList.setLineItemValue('custpage_range2detail', i, url);
						
						repList.setLineItemValue('custpage_ordercount2', i, rangeObj[key2]['ordercount'].toFixed(0));
						repList.setLineItemValue('custpage_unbilled2', i,  rangeObj[key2]['unbilled'].toFixed(0));
												
						
						if (rangeObj['range1'] && rangeObj['range1'] != '') {
							var range1OrdCount = rangeObj['range1']['ordercount'];
							var range1Unbilled = rangeObj['range1']['unbilled'];
						} else {
							var range1OrdCount = 0;
							var range1Unbilled = 0;
						}
						
						
						if (range1OrdCount != 0) {
							repList.setLineItemValue('custpage_ordcount_numvar2', i, round(rangeObj[key2]['ordercount'] - range1OrdCount,0).toFixed(0) );
							repList.setLineItemValue('custpage_ordcount_percvar2', i,  round(((rangeObj[key2]['ordercount'] - range1OrdCount)/range1OrdCount)*100,3).toFixed(0));
							
							
						} else {
							repList.setLineItemValue('custpage_ordcount_numvar2', i, rangeObj[key2]['ordercount'].toFixed(0) );
							repList.setLineItemValue('custpage_ordcount_percvar2', i,'');
						}
						
						if (range1Unbilled != 0) {
							repList.setLineItemValue('custpage_unbilled_numvar2', i, round(rangeObj[key2]['unbilled'] - range1Unbilled,0).toFixed(0) );
							repList.setLineItemValue('custpage_unbilled_percvar2', i,  round(((rangeObj[key2]['unbilled'] - range1Unbilled)/range1Unbilled)*100,3).toFixed(0));
						} else {
							repList.setLineItemValue('custpage_unbilled_numvar2', i, rangeObj[key2]['unbilled'].toFixed(0) );
							repList.setLineItemValue('custpage_unbilled_percvar2', i,'');
						}
						
						//repList.setLineItemValue('custpage_arrowtext', i, 'https://system.na1.netsuite.com/core/media/media.nl?id=4344361&c=3739054&h=9aa2723913a74192f7ea');
						
					}
					
					/*if (key2 == 'range3') {
						repList.setLineItemValue('custpage_ordercount3', i, rangeObj[key2]['ordercount']);
						repList.setLineItemValue('custpage_unbilled3', i,  rangeObj[key2]['unbilled']);
						if (rangeObj['range1'] && rangeObj['range1'] != '') {
							var range1OrdCount = rangeObj['range1']['ordercount'];
						} else {
							var range1OrdCount = 0;
						}
						repList.setLineItemValue('custpage_ordcount_numvar3', i, rangeObj[key2]['ordercount'] - rangeObj['range1']['ordercount'] );
						repList.setLineItemValue('custpage_ordcount_percvar3', i,  round(((rangeObj[key2]['ordercount'] - rangeObj['range1']['ordercount'])/rangeObj['range1']['ordercount'])*100,1));
					}
					
					if (key2 == 'range4') {
						repList.setLineItemValue('custpage_ordercount4', i, rangeObj[key2]['ordercount']);
						repList.setLineItemValue('custpage_unbilled4', i,  rangeObj[key2]['unbilled']);
						repList.setLineItemValue('custpage_ordcount_numvar4', i, rangeObj[key2]['ordercount'] - rangeObj['range1']['ordercount'] );
						repList.setLineItemValue('custpage_ordcount_percvar4', i,  round(((rangeObj[key2]['ordercount'] - rangeObj['range1']['ordercount'])/rangeObj['range1']['ordercount'])*100,1));
					}*/
					
				}
				
				
				i++;
			}
		}
		
		
		

		response.writePage(pForm);
		
	}
	
}

var repTypeMap = {
		
		
		'custpage_repsumfil_blank': '',
		'custpage_repsumfil_commercial': 'Commercial Sales Rep',
		'custpage_repsumfil_distributor': 'Distributor',
		'custpage_repsumfil_salesrep': 'Sales Representative',
		'custpage_repsumfil_salesmanager': 'Sales Manager'
}

function redirectToSearch(request, response) {
	
	var classification = request.getParameter('class');
	var priority = request.getParameter('priority');
	var group = request.getParameter('group');
	var partner = request.getParameter('partner');
	var locFilter = request.getParameter('loc');
	var terrFilter = decodeURIComponent(request.getParameter('terr'));
	var repType = decodeURIComponent(request.getParameter('reptype'));
	var date1 = decodeURIComponent(request.getParameter('date1'));
	var date2 = decodeURIComponent(request.getParameter('date2'));
	
	Util.console.log(classification, 'class');
	Util.console.log(date1, 'date1');
	Util.console.log(date2, 'date2');
	
	
	var filters = [];
	filters.push(new nlobjSearchFilter('custrecord_classrept_reportdate', null, 'within', date1, date2));
	filters.push(new nlobjSearchFilter('custrecord_classrept_classification', null, 'anyof', classification));
	filters.push(new nlobjSearchFilter('mainline', 'custrecord_classrept_salesorder', 'is', 'T'));
	if (repType != '') {
		filters.push(new nlobjSearchFilter('custrecord_classrept_repcat',null, 'is', repType));
		
	}
	
	if (locFilter != 'custpage_replocfil_blank') {
		if (locFilter == 'custpage_replocfil_residential') {
			var locText = "'Sales Representative','SalesManager'";
		} else if (locFilter == 'custpage_replocfil_commercial') {
			var locText = "'Commercial Sales Rep'";
		} else if (locFilter == 'custpage_replocfil_international') {
			var locText = "'Distributor'";
		}
		var locFormula = 'case when {custrecord_classrept_repcat} in (' + locText + ') then 1 else 0 end';
		
		filters.push(new nlobjSearchFilter('formulanumeric', null,'equalto', 1).setFormula(locFormula));
	}
	
	if (terrFilter != '' && terrFilter != 'custpage_terrfil_0') {
		filters.push(new nlobjSearchFilter('custrecord_classrept_territory', null, 'anyof', terrFilter.substr(terrFilter.length - 1)));
	}
	
	if (partner && partner != 'undefined') {
		filters.push(new nlobjSearchFilter('partner', 'custrecord_classrept_salesorder', 'anyof', partner));
	}
	
	var search = nlapiLoadSearch('customrecord_open_order_class_report', 'customsearch_detailed_open_order');
	search.setFilters(filters);
	search.setRedirectURLToSearchResults();
	
	
	//var url = 'https://system.na1.netsuite.com/app/site/hosting/scriptlet.nl?script=518&deploy=1&class=' + rangeObj[key2]['classid'] + '&partner=' +rangeObj[key2]['partner'] + '&group=' + rangeObj[key2]['groupid'] + '&priority=' + rangeObj[key2]['priorityid'] + '&date1=' + encodeURIComponent(params['from1']) + '&date2=' + encodeURIComponent(params['to1']);             
	
	
	
}

function compare(a,b) {
	if (a.last_nom < b.last_nom)
	    return -1;
	  if (a.last_nom > b.last_nom)
	    return 1;
	  return 0;
}

function joinDataOld(data1, data2, sumFilter) {
	//var dataArr =[data1,data2,data3,data4];
	var dataArr =[data1,data2];
	var fullClassList = getFullClassList(dataArr, sumFilter);
	
	var theClass = '';
	
	
	var retObj = {};
	
	for (var i=0; i< fullClassList.length; i++) {

		theClass = fullClassList[i];
		retObj[theClass] = {};
		if (data1['hasdata']) {
			
			for (var j=0; j<data1['data'].length; j++) {
			
				if (data1['data'][j]['classification'] == theClass) {
					retObj[theClass]['range1'] = {
						
					    'priority':data1['data'][j]['priority'],
					    'trueorder':data1['data'][j]['trueorder'],
					    'group':data1['data'][j]['group'],
					    'ordercount': parseInt(round(data1['data'][j]['ordercount'],0)),
					    'unbilled': round(data1['data'][j]['unbilled'],0),
					    'total':round(data1['data'][j]['total'],0)         
					   
					};
				}
				
			}
			
		}
		
		if (data2['hasdata']) {
			
			for (var j=0; j<data2['data'].length; j++) {
				
				if (data2['data'][j]['classification'] == theClass) {
					retObj[theClass]['range2'] = {
						   
					    'priority':data2['data'][j]['priority'],
					    'trueorder':data2['data'][j]['trueorder'],
					    'group':data2['data'][j]['group'],
					    'ordercount': round(data2['data'][j]['ordercount'],0),
					    'unbilled':round(data2['data'][j]['unbilled'],0),
					    'total':round(data2['data'][j]['total'],0)         
						   
					};
				}
				
			}
			
		}
		
	}
	return retObj;
	
	
}

function joinData(data1, data2, sumFilter) {
	//var dataArr =[data1,data2,data3,data4];
	var dataArr =[data1,data2];
	var fullClassList = getFullClassList(dataArr, sumFilter);
	
	var theClass = '';
	
	
	var retObj = {};
	
	for (var i=0; i< fullClassList.length; i++) {

		theClass = fullClassList[i];
		retObj[theClass] = {};
		if (data1['hasdata']) {
			
			for (var j=0; j<data1['data'].length; j++) {
				if (sumFilter == 'custpage_repsumfil_salesrep') {
					var newKey = data1['data'][j]['classification'] + ':' + data1['data'][j]['partner'];
				} else {
					var newKey = data1['data'][j]['classification'];
				}
				if (newKey == theClass) {
					retObj[theClass]['range1'] = {
						'classification': data1['data'][j]['classification'],
						'classid': data1['data'][j]['classid'],
						'partner': data1['data'][j]['partner'],
					    'priority':data1['data'][j]['priority'],
					    'priorityid':data1['data'][j]['priorityid'],
					    'trueorder':data1['data'][j]['trueorder'],
					    'group':data1['data'][j]['group'],
					    'groupid':data1['data'][j]['groupid'],
					    'ordercount': parseInt(round(data1['data'][j]['ordercount'],0)),
					    'unbilled': round(data1['data'][j]['unbilled'],0),
					    'total':round(data1['data'][j]['total'],0)         
					   
					};
				}
				
			}
			
		}
		
		if (data2['hasdata']) {
			
			for (var j=0; j<data2['data'].length; j++) {
				if (sumFilter == 'custpage_repsumfil_salesrep') {
					var newKey = data2['data'][j]['classification'] + ':' + data2['data'][j]['partner'];
				} else {
					var newKey = data2['data'][j]['classification'];
				}
				if (newKey == theClass) {
					retObj[theClass]['range2'] = {
						'classification': data2['data'][j]['classification'],
						'classid': data2['data'][j]['classid'],
						'partner': data2['data'][j]['partner'],
					    'priority':data2['data'][j]['priority'],
					    'priorityid':data2['data'][j]['priorityid'],
					    'trueorder':data2['data'][j]['trueorder'],
					    'group':data2['data'][j]['group'],
					    'groupid':data2['data'][j]['groupid'],
					    'ordercount': round(data2['data'][j]['ordercount'],0),
					    'unbilled':round(data2['data'][j]['unbilled'],0),
					    'total':round(data2['data'][j]['total'],0)         
						   
					};
				}
				
			}
			
		}
		
	}
	return retObj;
	
	
}

function getFullClassListOld(dataArr, sumFilter) {
	
	
	var classArr = [];
	for (var i=0; i<dataArr.length; i++) {
		
		if (typeof dataArr[i] == 'object') {
			Util.console.log(dataArr[i]['data'].length, 'inner array');
			for (var j=0; j<dataArr[i]['data'].length; j++) {
				classArr.push(dataArr[i]['data'][j]['classification']);
			}
		}
		
		
	}
	Util.console.log(classArr, 'classArray');
	classArr = uniq(classArr);
	return classArr;
	
	
}

function getFullClassList(dataArr, sumFilter) {
	
	Util.console.log(sumFilter, 'sumFilter');
	
	if (sumFilter == 'custpage_repsumfil_salesrep') {
		var classArr = [];
		Util.console.log('in sum filter');
		for (var i=0; i<dataArr.length; i++) {
			
			if (typeof dataArr[i] == 'object') {
				Util.console.log(dataArr[i]['data'].length, 'inner array');
				for (var j=0; j<dataArr[i]['data'].length; j++) {
					classArr.push(dataArr[i]['data'][j]['classification'] + ':' + dataArr[i]['data'][j]['partner'] );
				}
			}
			
			
		}
	} else {
		var classArr = [];
		for (var i=0; i<dataArr.length; i++) {
			
			if (typeof dataArr[i] == 'object') {
				Util.console.log(dataArr[i]['data'].length, 'inner array');
				for (var j=0; j<dataArr[i]['data'].length; j++) {
					classArr.push(dataArr[i]['data'][j]['classification']);
				}
			}
			
			
		}
	}
	
	
	
	Util.console.log(classArr, 'classArray');
	classArr = uniq(classArr);
	return classArr;
	
	
}

function uniq(a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

function getDays(date1, date2) {
	
	Util.console.log(date1, 'date1');
	Util.console.log(date2, 'date2');
	var oneDay = 24*60*60*1000;
	var d1 = new Date(date1);
	var d2 = new Date(date2);
	
	var diffDays = Math.round(Math.abs((d1.getTime() - d2.getTime())/(oneDay)));
	diffDays +=1;
	Util.console.log(diffDays, 'diffDays');
	return diffDays;
}

function getReportData(date1, date2, range, trueOrderFilter, sumTypeFilter, terrFilter,partnerFil,repTypeFilter,locFilter) {
	
	var retParams = {};
	var repParams = [];
	
	var days = getDays(date1, date2);
	Util.console.log(days, 'days');
	repParams['datefrom'] = date1;
	repParams['dateto'] = date2;
	
	repParams['priority'] = '';
	repParams['trueorder'] = '';
	repParams['classification'] = '';
	repParams['group'] = '';
	repParams['ordercount'] = '';
	repParams['unbilled'] = '';
	repParams['total'] = '';
	repParams['partner'] = '';
	repParams['classid'] = '';
	repParams['groupid'] = '';
	repParams['priorityid'] = '';
	Util.console.log(partnerFil, 'partnerFil');
	
	
	var filters = [new nlobjSearchFilter('custrecord_classrept_reportdate', '', 'within', date1, date2)];
	if (trueOrderFilter == 'custpage_trueorderfil_orders') {
		filters.push(new nlobjSearchFilter('custrecord_classrept_trueorder', null, 'is','T' ))
	} else if (trueOrderFilter == 'custpage_trueorderfil_estimates') {
		filters.push(new nlobjSearchFilter('custrecord_classrept_trueorder', null, 'is','F' ))
	}
	
	if (terrFilter != '' && terrFilter != 'custpage_terrfil_0') {
		filters.push(new nlobjSearchFilter('custrecord_classrept_territory', null, 'anyof', terrFilter.substr(terrFilter.length - 1)));
	}
	
	if (partnerFil != '') {
		filters.push(new nlobjSearchFilter('partner','custrecord_classrept_salesorder', 'anyof', partnerFil));
		filters.push(new nlobjSearchFilter('mainline', 'custrecord_classrept_salesorder', 'is', 'T'));
	}
	
	if (repTypeFilter != '') {
		filters.push(new nlobjSearchFilter('custrecord_classrept_repcat',null, 'is', repTypeFilter));
	}
	
	if (locFilter != 'custpage_replocfil_blank') {
		if (locFilter == 'custpage_replocfil_residential') {
			var locText = "'Sales Representative','SalesManager'";
		} else if (locFilter == 'custpage_replocfil_commercial') {
			var locText = "'Commercial Sales Rep'";
		} else if (locFilter == 'custpage_replocfil_international') {
			var locText = "'Distributor'";
		}
		var locFormula = 'case when {custrecord_classrept_repcat} in (' + locText + ') then 1 else 0 end';
		
		filters.push(new nlobjSearchFilter('formulanumeric', null,'equalto', 1).setFormula(locFormula));
	}
	
	if (sumTypeFilter == 'custpage_repsumfil_salesrep') {
		filters.push(new nlobjSearchFilter('mainline', 'custrecord_classrept_salesorder', 'is', 'T'));
		var columns = [new nlobjSearchColumn('partner', 'custrecord_classrept_salesorder', 'group')];
		
	} else {
		var columns = [];
	}
	
	
	
	
	var searchResults = nlapiSearchRecord('customrecord_open_order_class_report', 'customsearch_script_stlt_class_report', filters, columns);
	if (searchResults && searchResults != '') {
		retParams['hasdata'] = true;
		Util.console.log(searchResults, 'searchResults');
		for (var i=0; i<searchResults.length; i++) {
			
			repParams[i] = {};
			repParams[i]['datefrom'] = date1;
			repParams[i]['dateto'] = date2;
			repParams[i]['range'] = range;
			repParams[i]['priority'] = searchResults[i].getText('custrecord_class_priority', 'custrecord_classrept_classification', 'group');
			repParams[i]['priorityid'] = searchResults[i].getValue('custrecord_class_priority', 'custrecord_classrept_classification', 'group');
			repParams[i]['trueorder'] = searchResults[i].getValue('custrecord_true_order', 'custrecord_classrept_classification', 'group');
			repParams[i]['classification'] = searchResults[i].getText('custrecord_classrept_classification', null, 'group');
			repParams[i]['classid'] = searchResults[i].getValue('custrecord_classrept_classification', null, 'group');
			if (sumTypeFilter == 'custpage_repsumfil_salesrep') {
				repParams[i]['partner'] = searchResults[i].getValue('partner', 'custrecord_classrept_salesorder', 'group');
			}
			repParams[i]['group'] = searchResults[i].getText('custrecord_class_group', 'custrecord_classrept_classification', 'group');
			repParams[i]['groupid'] = searchResults[i].getValue('custrecord_class_group', 'custrecord_classrept_classification', 'group');
			repParams[i]['ordercount'] = searchResults[i].getValue('custrecord_classrept_ordercount', null, 'sum')/days;
			
			repParams[i]['unbilled'] = searchResults[i].getValue('custrecord_classrept_unbilled', null, 'sum')/days;
			repParams[i]['total'] = searchResults[i].getValue('custrecord_classrept_totalamount', null, 'sum')/days;
			
		}	
		
		retParams['data'] = repParams;
	} else {
		retParams['hasdata'] = false;
		retParams['data'] = '';
	}

	return retParams;
	
}

function ooSave() {
	
	var from1 = nlapiGetFieldValue('custpage_datefrom1');
	var to1 = nlapiGetFieldValue('custpage_dateto1');
	var from2 = nlapiGetFieldValue('custpage_datefrom2');
	var to2 = nlapiGetFieldValue('custpage_dateto2');
	var from3 = nlapiGetFieldValue('custpage_datefrom3');
	var to3 = nlapiGetFieldValue('custpage_dateto3');
	var from4 = nlapiGetFieldValue('custpage_datefrom4');
	var to4 = nlapiGetFieldValue('custpage_dateto4');
	
	/****************************
	 * Mismatch Validation Start
	 ****************************/
	if ( (from1 == '' && to1 != '') || (to1 == '' && from1 != '')) {
		alert('Enter a from/to in the Date Range 1 section');
		return false;
	}
	
	if ( (from2 == '' && to2 != '') || (to2 == '' && from2 != '')) {
		alert('Enter a from/to in the Date Range 2 section');
		return false;
	}
	
	if ( (from3 == '' && to3 != '') || (to3 == '' && from3 != '')) {
		alert('Enter a from/to in the Date Range 3 section');
		return false;
	}
	
	if ( (from4 == '' && to4 != '') || (to4 == '' && from4 != '')) {
		alert('Enter a from/to in the Date Range 4 section');
		return false;
	}
	
	/****************************
	 * Mismatch Validation End
	 ****************************/
	return true;
	
}



var dateRangeFieldArr = ['custpage_datefrom1', 'custpage_dateto1','custpage_datefrom2', 'custpage_dateto2', 'custpage_datefrom3', 'custpage_dateto3', 'custpage_datefrom4', 'custpage_dateto4'];

function ooFC(type, name) {
	
	if (name == 'custpage_defdate') {
		var quickRange = nlapiGetFieldValue('custpage_defdate');
		
		if (quickRange == 'custpage_defdate_twodaysvsyesterday') {
			
			var twodaysago = getQuickDates(2);
			var yesterday = getQuickDates(1);
			nlapiSetFieldValue('custpage_datefrom1', twodaysago);
			nlapiSetFieldValue('custpage_dateto1', twodaysago);
			nlapiSetFieldValue('custpage_datefrom2', yesterday);
			nlapiSetFieldValue('custpage_dateto2', yesterday);
			nlapiSetFieldValue('custpage_datefrom3', '');
			nlapiSetFieldValue('custpage_dateto3', '');
			nlapiSetFieldValue('custpage_datefrom4', '');
			nlapiSetFieldValue('custpage_dateto4', '');
			
		}
		
		if (quickRange == 'custpage_defdate_weeklastvsthis') {
			var lastweekstart = getQuickDates(14);
			var lastweekend = getQuickDates(8);
			var thisweekstart = getQuickDates(7);
			var thisweekend = getQuickDates(1);
			
			nlapiSetFieldValue('custpage_datefrom1', lastweekstart);
			nlapiSetFieldValue('custpage_dateto1', lastweekend);
			nlapiSetFieldValue('custpage_datefrom2', thisweekstart);
			nlapiSetFieldValue('custpage_dateto2', thisweekend);
			nlapiSetFieldValue('custpage_datefrom3', '');
			nlapiSetFieldValue('custpage_dateto3', '');
			nlapiSetFieldValue('custpage_datefrom4', '');
			nlapiSetFieldValue('custpage_dateto4', '');
		}
		
		if (quickRange == 'custpage_defdate_last4days') {
			var fourdaysago = getQuickDates(4);
			var threedaysago = getQuickDates(3);
			var twodaysago = getQuickDates(2);
			var yesterday = getQuickDates(1);
			
			nlapiSetFieldValue('custpage_datefrom1', fourdaysago);
			nlapiSetFieldValue('custpage_dateto1', fourdaysago);
			nlapiSetFieldValue('custpage_datefrom2', threedaysago);
			nlapiSetFieldValue('custpage_dateto2', threedaysago);
			nlapiSetFieldValue('custpage_datefrom3', twodaysago);
			nlapiSetFieldValue('custpage_dateto3', twodaysago);
			nlapiSetFieldValue('custpage_datefrom4', yesterday);
			nlapiSetFieldValue('custpage_dateto4', yesterday);
		}
		
		
		
		if (quickRange == 'custpage_defdate_blank') {
			
			for (var i=0; i<dateRangeFieldArr.length; i++) {
				nlapiSetFieldValue(dateRangeFieldArr[i], '');
			}
		}
	}
	
	/*if (name == 'custpage_repsumfil') {
		var sumType = nlapiGetFieldValue('custpage_repsumfil');
		var sumTypeField = nlapiGetField('custpage_repsumfil');
		
		if (sumType == 'custpage_repsumfil_salesrep') {
			sumTypeField.setDisplayType('normal');
		} else {
			//nlapiSetFieldValue('custpage_repsumfil', '');
			sumTypeField.setDisplayType('inline');
			
		}
	}*/
	
}

function getQuickDates(daysago) {
	
	var finalDate = new Date((new Date()).valueOf() - 1000*60*60*24*daysago);
	finalDate = nlapiDateToString(finalDate, 'date');
	return finalDate;
	
}

function round(number, power) {
	//Util.console.log(number, 'number');
	number = parseFloat(number);

	number = Math.round((number*(Math.pow(10,power))))/(Math.pow(10,power));

	return number;
	
}



