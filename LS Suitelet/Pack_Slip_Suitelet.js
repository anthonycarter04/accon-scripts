//This suitelet handles rendering the HTML for a pick slip or pack slip generated from a sales order.


var SUITELET_ID, PDF_FOLDER_ID, BASE_DOMAIN, SUITELET_DEPLOYMENT_ID = '1', ORDER_TYPE_RMA = '4';

//This will determine if we're in sandbox/prod, and set the proper IDs.
var init = function(){
	var env = nlapiGetContext().getEnvironment();
	var acct = nlapiGetContext().getCompany();
	switch(env){
	case 'PRODUCTION':
		SUITELET_ID = "customscript_printpickpackslip";
		BASE_DOMAIN = "https://system.na1.netsuite.com";
		LOGO_URL = '<img src="https://system.na1.netsuite.com/core/media/media.nl?id=478&c=3758266&h=39e3c8561ea4c3dfb08b"/>';
		break;
	default:
		if(acct.match(/_SB2/)) {
			SUITELET_ID = "customscript_printpickpackslip";
			BASE_DOMAIN = "https://system.sandbox.netsuite.com"; 

			LOGO_URL = '<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=478&c=3758266_SB2&h=c3f3fa6a94da0f174cbb"/>';
//			LOGO_URL = '<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=865&c=3758266_SB2&h=2e37eff52f56ce6d322b"/>';
		}
		else {
			SUITELET_ID = "customscript_printpickpackslip";
			BASE_DOMAIN = "https://system.sandbox.netsuite.com";
			LOGO_URL = '<img src="https://system.na1.netsuite.com/core/media/media.nl?id=478&c=3758266&h=39e3c8561ea4c3dfb08b"/>';
			// LOGO_URL = '<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=327&c=3758266&h=5ab4c9dd8d1bbb9a2dc9"/>';
		}
	break;
	}
	//nlapiLogExecution('debug', 'env', env + ', suitelet' + SUITELET_ID + ', baseDomain' + BASE_DOMAIN);
};

init();

function pickpackpageInit(){}

function openWindow(url, dimensions){
	var dim, centerWidth, centerHeight, params, newWindow;
	dim = dimensions || {centerW:20, centerH:20, mainW:1200, mainH:750};
	centerWidth = (window.screen.width - dim.centerW) / 2;
	centerHeight = (window.screen.height - dim.centerW) / 2;
	params = 'resizable=1,width=' + dim.mainW + ',height=' + dim.mainH + ',left=' + centerWidth + ',top=' + centerHeight + ',scrollbars=1';
	newWindow = window.open(url, 'PopUp', params);
	//open a popup
	newWindow.focus();
	return newWindow;
}

//groups the item fulfillment data
var groupBy = function(array, func, keys){
	var groups = {};
	array.forEach(function(obj){
		var group = JSON.stringify(func(obj, keys));
		groups[group] = groups[group] || [];
		groups[group].push(obj);  
	});
	return Object.keys(groups).map(function(group){ return groups[group]; });
};

//group linearr objects
var groupByObj = function(xs, key) {
	  return xs.reduce(function(rv, x) {
	    (rv[x[key]] = rv[x[key]] || []).push(x);
	    return rv;
	  }, {});
	};

//ns line item item types don't match up to what can be used to load or lookup a record. this switch statement will return the correct form
function determineItemType(nonUsefulType){	
	var field;
	switch(nonUsefulType){
	case "Kit":
		field = 'kititem';
		break;
	case "Service":
		field = 'serviceitem';
		break
	case "Discount":
		field = 'discountitem';
		break;
	case "NonInvtPart":
		field = 'noninventoryitem';
		break;
	case "InvtPart":
		field = 'inventoryitem';
		break;
	case "Assembly":
		field = 'assemblyitem';
		break;
	default:
		field = null;
	}

	return field;
}

function contains(array, string) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] === string) {
			return true;
		}
	}
	return false;
}

function pickPackSlipSuitelet(req, res){
	nlapiLogExecution("DEBUG", "Inside suitelet", req);

	var timestamp, action, pickSlipHtml, itemFulfillmentId, itemFulfillmentRecord, salesOrderId, salesOrderRecord, customerId, customerRecord, vatNumber, html = '';
	timestamp    = new Date().getTime();
	action       = req.getParameter('action');
	var form = null;
	if(action=='packslip')
	{
		form = nlapiCreateForm("PackSlipForm");
	}
	else
	{
		form = nlapiCreateForm("PickSlipForm");
	}
	pickSlipHtml = form.addField("custpage_pickslip", "inlinehtml");
	rectype = req.getParameter('rectype');
	itemFulfillmentId = req.getParameter('ifid');
	salesOrderId = req.getParameter('soid');
	var nativeFulfillment = null;
	var reltype = 'salesorder';
	if(rectype=='itemfulfillment')
	{
		type = nlapiLookupField('transaction',salesOrderId,'type');
		if(type=='TrnfrOrd') reltype ='transferorder';
		else reltype = 'salesorder';
		salesOrderRecord = nlapiLoadRecord(reltype, salesOrderId);
		nativeFulfillment = nlapiLoadRecord('itemfulfillment',itemFulfillmentId);
	}
	else if(rectype=='transferorder')
	{
		salesOrderRecord = nlapiLoadRecord('transferorder', itemFulfillmentId);
	}
	else
	{
		salesOrderRecord = nlapiLoadRecord('salesorder', salesOrderId);
		itemFulfillmentRecord = nlapiLoadRecord("customrecord_custom_fulfillment", itemFulfillmentId);
	}
	customerId = nlapiLookupField('customrecord_custom_fulfillment', itemFulfillmentId, 'custrecord_customer');

	if(customerId) {
		vatNumber = nlapiLookupField('customer', customerId, 'vatregnumber');    
	}
	else {
		vatNumber = "";
	}

	// var shipFrom = " L11 - LifeSize MIS Inventory Org<br/>c/o New Breed Logistics<br/>8640 Nail Road, Suite 100<br/>Olive Branch, MS 38654, US";

	var valueKeys = ["tranid", "otherrefnum", "total", "custbody_ship_to_contact_phone", "custbody_ship_to_customer_address_text", "billaddress", "custbody_shipping_instructions", "shipdate", "billaddressee", "billaddr1", "billaddr2", "billcity", "billstate", "billzip", "shipaddressee", "shipaddr1", "shipaddr2", "shipcity", "shipstate", "shipzip"];
	var textKeys = ["custbody_ship_to_contact", "shipmethod","custbody_tno_order_type"];

	var soKeys = valueKeys.concat(textKeys);
	var soKeyCount = soKeys.length;
	var customerPONumber = salesOrderRecord.getFieldValue('otherrefnum') || '';
	var deliveryName = itemFulfillmentRecord ? itemFulfillmentRecord.getFieldValue('name') : '';
	if(nativeFulfillment) deliveryName = nativeFulfillment.getFieldValue('tranid');
	var packSlipNumber;
	var pickSlipNumber = itemFulfillmentRecord ? itemFulfillmentRecord.getFieldText('custrecord_fulfillment_batch_no') : '';
	var salesOrderObject = {};
	var salesOrderJSON = JSON.parse(JSON.stringify(salesOrderRecord));

//	accounts for some fields that need to be pulled in as text and others as values
	for (var j = 0; j < soKeyCount; j++) {
		if (contains(valueKeys, soKeys[j])) {

			salesOrderObject[soKeys[j]] = salesOrderRecord.getFieldValue(soKeys[j]) || '';
		}
		else if (contains(textKeys, soKeys[j])) {
			salesOrderObject[soKeys[j]] = salesOrderRecord.getFieldText(soKeys[j]) || '';
		}
	};

	nlapiLogExecution("DEBUG", "checkpoint 2: ", JSON.stringify(salesOrderObject));


	var list = [];
	if(rectype!='transferorder' && rectype!='itemfulfillment')
	{
		list = JSON.parse(itemFulfillmentRecord.getFieldValue('custrecord_fulfillment_data'));
	}
	else if(rectype=='transferorder')
	{
		for(var i=1; i<=salesOrderRecord.getLineItemCount('item'); i++)
		{
			list.push(
					{
						assyitem: salesOrderRecord.getLineItemValue('item','item',i),
						component: salesOrderRecord.getLineItemValue('item','item',i),
						lineid: salesOrderRecord.getLineItemValue('item','line',i),
						linenumber: i,
						qtyneeded: salesOrderRecord.getLineItemValue('item','quantity',i)
					}
			);
		}
	}
	else if(rectype=='itemfulfillment')
	{
		for(var i=1; i<=nativeFulfillment.getLineItemCount('item'); i++)
		{
			list.push(
					{
						assyitem: nativeFulfillment.getLineItemValue('item','item',i),
						component: nativeFulfillment.getLineItemValue('item','item',i),
						lineid: nativeFulfillment.getLineItemValue('item','orderline',i),
						linenumber: i,
						qtyneeded: nativeFulfillment.getLineItemValue('item','quantity',i)
					}
			);
		}
	}

	var pickKeys = ["assyitem", "component"];
	var packKeys = ["assyitem", "assyserialnumber"];

//	groups the pick table results by assembly item and component so quantities can be stacked
	var pickResult = groupBy(list, function(item, pickKeys){

		var numKeys = pickKeys.length;
		var ret = [];
		for(var i = 0; i < numKeys; i++){
			ret.push(item[pickKeys[i]]);
		}
		return ret;
	}, pickKeys);
	
	Util.console.log(pickResult, 'pickResult');

//	groups the pack table results by assembly item and serial number so each item can be shown separately
	var packResult = groupBy(list, function(item, packKeys){
		var numPackKeys = packKeys.length;
		var ret = [];

		for(var i = 0; i < numPackKeys; i++){
			ret.push(item[packKeys[i]]);     
		}
		return ret;
	}, packKeys);

	var packResultCount, pickResultCount, itemType, itemRecord, itemLookupRecord, componentCount, componentLine, componentItemType, componentItemRecord, componentItemLookupRecord, currentItem;
	var pickItemHtml = '', packItemHtml = '', packComponentHeaderHtml='', packComponentHtml = '', packHeaderHtml = '';

	var locationRecord = null;
	nlapiLogExecution('DEBUG','start location');
	if(rectype=='transferorder')
	{
		locationRecord = nlapiLoadRecord('location',salesOrderRecord.getFieldValue('location'));
	}
	else if(rectype=='itemfulfillment')
	{
		var locid = nativeFulfillment.getLineItemValue('item','location',1);
		nlapiLogExecution('DEBUG','location',locid);
		locationRecord = nlapiLoadRecord('location',locid);
	}
	else
	{
		var lineId = itemFulfillmentRecord ? itemFulfillmentRecord.getLineItemValue('custpage_serialnumber_sublist','lineid',1) : '';
		lineId = lineId.split(' - ');
		var lineNumber = lineId[0];
		var salesOrderLineNumber = salesOrderRecord.findLineItemValue('item', 'line', lineNumber);
		var salesOrderLocation = salesOrderRecord.getLineItemValue('item', 'location', salesOrderLineNumber);
		locationRecord = nlapiLoadRecord('location', salesOrderLocation);
	}
	//var shipFrom = '<p>' + locationRecord.getFieldValue('addressee') + '</br>' + locationRecord.getFieldValue('addr1')  + '</br>' + locationRecord.getFieldValue('city') + ' ' + locationRecord.getFieldValue('state') + ' ' + locationRecord.getFieldValue('zip') + '</p>';

	var shipfrom = '<p>';
	if(locationRecord.getFieldValue('addressee')) shipfrom += locationRecord.getFieldValue('addressee') + '</br>';
	if(locationRecord.getFieldValue('attention')) shipfrom += locationRecord.getFieldValue('attention') + '</br>';
	if(locationRecord.getFieldValue('addr1')) shipfrom += locationRecord.getFieldValue('addr1') + '</br>';
	if(locationRecord.getFieldValue('addr2')) shipfrom += locationRecord.getFieldValue('addr2') + '</br>';
	if(locationRecord.getFieldValue('addr3')) shipfrom += locationRecord.getFieldValue('addr3') + '</br>';
	if(locationRecord.getFieldValue('city')) shipfrom += locationRecord.getFieldValue('city') + ', ';
	if(locationRecord.getFieldValue('state')) shipfrom += locationRecord.getFieldValue('state') + ' ';
	if(locationRecord.getFieldValue('zip')) shipfrom += locationRecord.getFieldValue('zip') + ' ';
	if(locationRecord.getFieldValue('country')) shipfrom += '<br/>' + locationRecord.getFieldValue('country') + '</p>';;

	var shipto = '';

	var ship_cust_Id = salesOrderRecord.getFieldValue('custbody_ship_to_customer');
	var ship_address_Id = salesOrderRecord.getFieldValue('custbody_ship_to_customer_address');
	var bill_Cust_Id = salesOrderRecord.getFieldValue('entity');
	var bill_address_Id = salesOrderRecord.getFieldValue('billaddresslist');

	var shipAddrLine4 = '';
	var billAddrLine4 = '';

	try{
		shipAddrLine4 = getAddrLine4(ship_cust_Id,ship_address_Id);
		billAddrLine4 = getAddrLine4(bill_Cust_Id,bill_address_Id);
	}
	catch(e){

	}
	if(action == 'pickslip'){
		if(salesOrderRecord.getFieldValue('custbody_tno_order_type')== ORDER_TYPE_RMA){
			//	if(salesOrderRecord.getFieldValue('shipattention')) shipto += salesOrderRecord.getFieldValue('shipattention') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddressee')) shipto += salesOrderRecord.getFieldValue('shipaddressee') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddr1')) shipto += salesOrderRecord.getFieldValue('shipaddr1') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddr2')) shipto += salesOrderRecord.getFieldValue('shipaddr2') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddr3')) shipto += salesOrderRecord.getFieldValue('shipaddr3') + '<br/>';
			if(shipAddrLine4) shipto += shipAddrLine4  + '<br/>';
			if(salesOrderRecord.getFieldValue('shipcity')) shipto += salesOrderRecord.getFieldValue('shipcity') + ', ';
			if(salesOrderRecord.getFieldValue('shipstate')) shipto += salesOrderRecord.getFieldValue('shipstate') + ' ';
			if(salesOrderRecord.getFieldValue('shipzip')) shipto += salesOrderRecord.getFieldValue('shipzip') + ' ';
			if(salesOrderRecord.getFieldValue('shipcountry')) shipto += '<br/>' + salesOrderRecord.getFieldValue('shipcountry') + ' ';
		}
		else{
			//if(salesOrderRecord.getFieldValue('shipattention')) shipto += salesOrderRecord.getFieldValue('shipattention') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddressee')) shipto += salesOrderRecord.getFieldValue('shipaddressee') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipattention')) shipto += salesOrderRecord.getFieldValue('shipattention') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddr1')) shipto += salesOrderRecord.getFieldValue('shipaddr1') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddr2')) shipto += salesOrderRecord.getFieldValue('shipaddr2') + '<br/>';
			if(salesOrderRecord.getFieldValue('shipaddr3')) shipto += salesOrderRecord.getFieldValue('shipaddr3') + '<br/>';
			if(shipAddrLine4) shipto += shipAddrLine4  + '<br/>';
			if(salesOrderRecord.getFieldValue('shipcity')) shipto += salesOrderRecord.getFieldValue('shipcity') + ', ';
			if(salesOrderRecord.getFieldValue('shipstate')) shipto += salesOrderRecord.getFieldValue('shipstate') + ' ';
			if(salesOrderRecord.getFieldValue('shipzip')) shipto += salesOrderRecord.getFieldValue('shipzip') + ' ';
			if(salesOrderRecord.getFieldValue('shipcountry')) shipto += '<br/>' + salesOrderRecord.getFieldValue('shipcountry') + ' ';
		}
	} 
	else{
		//if(salesOrderRecord.getFieldValue('shipattention')) shipto += salesOrderRecord.getFieldValue('shipattention') + '<br/>';
		if(salesOrderRecord.getFieldValue('shipaddressee')) shipto += salesOrderRecord.getFieldValue('shipaddressee') + '<br/>';
		if(salesOrderRecord.getFieldValue('shipattention')) shipto += salesOrderRecord.getFieldValue('shipattention') + '<br/>';
		if(salesOrderRecord.getFieldValue('shipaddr1')) shipto += salesOrderRecord.getFieldValue('shipaddr1') + '<br/>';
		if(salesOrderRecord.getFieldValue('shipaddr2')) shipto += salesOrderRecord.getFieldValue('shipaddr2') + '<br/>';
		if(salesOrderRecord.getFieldValue('shipaddr3')) shipto += salesOrderRecord.getFieldValue('shipaddr3') + '<br/>';
		if(shipAddrLine4) shipto += shipAddrLine4  + '<br/>';
		if(salesOrderRecord.getFieldValue('shipcity')) shipto += salesOrderRecord.getFieldValue('shipcity') + ', ';
		if(salesOrderRecord.getFieldValue('shipstate')) shipto += salesOrderRecord.getFieldValue('shipstate') + ' ';
		if(salesOrderRecord.getFieldValue('shipzip')) shipto += salesOrderRecord.getFieldValue('shipzip') + ' ';
		if(salesOrderRecord.getFieldValue('shipcountry')) shipto += '<br/>' + salesOrderRecord.getFieldValue('shipcountry') + ' ';
	}
	var billto = '';
	if(salesOrderRecord.getFieldValue('billattention')) billto += salesOrderRecord.getFieldValue('billattention') + '<br/>';
	if(salesOrderRecord.getFieldValue('billaddressee')) billto += salesOrderRecord.getFieldValue('billaddressee') + '<br/>';
	if(salesOrderRecord.getFieldValue('billaddr1')) billto += salesOrderRecord.getFieldValue('billaddr1') + '<br/>';
	if(salesOrderRecord.getFieldValue('billaddr2')) billto += salesOrderRecord.getFieldValue('billaddr2') + '<br/>';
	if(salesOrderRecord.getFieldValue('billaddr3')) billto += salesOrderRecord.getFieldValue('billaddr3') + '<br/>';
	if(billAddrLine4) billto += billAddrLine4 + '<br/>';
	if(salesOrderRecord.getFieldValue('billcity')) billto += salesOrderRecord.getFieldValue('billcity') + ', ';
	if(salesOrderRecord.getFieldValue('billstate')) billto += salesOrderRecord.getFieldValue('billstate') + ' ';
	if(salesOrderRecord.getFieldValue('billzip')) billto += salesOrderRecord.getFieldValue('billzip') + ' ';
	if(salesOrderRecord.getFieldValue('billcountry')) billto += '<br/>' + salesOrderRecord.getFieldValue('billcountry') + ' ';

	shiptocontact = salesOrderObject.custbody_ship_to_contact;
	
	
	if(shiptocontact.indexOf(':')>1){
		shiptocontact = shiptocontact.split(':');
		shiptocontact = shiptocontact[1];
	}
	
	
	shiptocontactphone = ', Phone: ' + salesOrderObject.custbody_ship_to_contact_phone;
	if(rectype=='transferorder' || reltype=='transferorder')
	{
		billto = 'Lifesize, Inc.</p><p>1601 S. MoPac Expressway</p><p>Suite 100</p><p>Austin, TX 78746</p><p>US';
		shiptocontact = nlapiLookupField('location',salesOrderRecord.getFieldValue('transferlocation'),'custrecord_ship_to_contact_info');
		shiptocontactphone = '';
	}
	else if(salesOrderRecord.getFieldValue('custbody_tno_order_type')==ORDER_TYPE_RMA)
	{
		shiptocontact = salesOrderRecord.getFieldValue('custbody_end_customer_email_address');	
		shiptocontactphone = ', Phone: ' + salesOrderRecord.getFieldValue('custbody_ship_to_contact_phone');
	}
	shiptocontact += shiptocontactphone;
	if(action == 'pickslip'){
		if(salesOrderRecord.getFieldValue('custbody_tno_order_type')== ORDER_TYPE_RMA){
			var shipAttention = salesOrderRecord.getFieldValue('shipattention');		
			shiptocontact = shipAttention + ', ' + shiptocontact;
		}
		/*if(salesOrderRecord.getFieldValue('custbody_tno_order_type')== '2') {
		var shipAttention = salesOrderRecord.getFieldValue('shipattention');	
		shipAttention = shipAttention.split(':');
		shipAttention = shipAttention[1];
	}
		 */	

	}

	if(action == 'pickslip'){

		// generate html pick table from pickResult
		var lastItem = '';
		pickResultCount = pickResult.length;
		var filters = [];
		var columns = [];
		var thisItemLookupRel = {};
		columns.push(new nlobjSearchColumn("itemid"));
		columns.push(new nlobjSearchColumn("displayname"));
		var itemIds = [];
		
		for (var r = 0; r < pickResultCount; r++){
			itemIds.push(pickResult[r][0].assyitem);
		}
		
		filters.push(new nlobjSearchFilter("internalid", null, "anyof", itemIds));
		var searchResults = nlapiSearchRecord("item", null, filters, columns);
		  for(var res = 0; searchResults != null && res < searchResults.length; res++){
            thisItemLookupRel[searchResults[res].getId()] = {itemid : searchResults[res].getValue("itemid"), displayname : searchResults[res].getValue("displayname")};
        }
		
		

		for (var k = 0; k < pickResultCount; k++) {
			nlapiLogExecution('DEBUG','item index',k);
			currentItem = pickResult[k][0].assyitem;
			
			// itemType = determineItemType(nlapiLookupField('item', pickResult[k][0].assyitem, 'type')) || false;
			// itemRecord = nlapiLoadRecord(itemType, pickResult[k][0].assyitem);

			//itemLookupRecord = nlapiLookupField('item', currentItem, ['itemid', 'displayname']);

			if (currentItem != lastItem && rectype!='transferorder' && rectype!='itemfulfillment' && salesOrderRecord.getFieldValue('custbody_tno_order_type')!=ORDER_TYPE_RMA) {
				// generate item header
				pickHeaderHtml = '<tr style="outline: thin solid"><td class="no-border"></td><td class="no-border">' + thisItemLookupRel[currentItem].itemid + '</td><td class="no-border">' + thisItemLookupRel[currentItem].displayname + '</td><td class="no-border"></td><td class="no-border"></td></tr>';
				pickItemHtml += pickHeaderHtml;
			}
			// generate item rows, adding quantities
			var lineItemId = '';//pickResult[k][0].lineid.split('-');
			var lineStr = '';
			for(var pRes =0;pRes<pickResult[k].length;pRes++){
				//AC - HELP-3439 Fix
				//lineItemId = 	 pickResult[k][pRes].lineid.split('-');
				lineItemId = 	 pickResult[k][pRes].linenumber;
				lineStr += lineItemId+',';
			}
			lineStr = lineStr.slice(0,-1);
			lineItemId = lineStr;


			componentLine = pickResult[k][0];
			//BA-47 - NP changes to how qty is calculated - right now  for grouped items it's just taking the first item  and pulling the quantity needed for the component and multiplying it by the number of items that were grouped - ie 5*2 instead of 5+3 which resulted in incorrect quantity calculations on groupings - changed to look at all quantity needed for items grouped by item  
			//var quantity = componentLine.qtyneeded * pickResult[k].length;
			var quantity = 0; 
			for(result in pickResult[k]){
				quantity += parseInt(pickResult[k][result].qtyneeded);
			}
			//var quantity = componentLine.qtyneeded * pickResult[k].length;

//			if(rectype=='transferorder' || rectype=='itemfulfillment') quantity = componentLine.qtyneeded;
			//rectype == transferorder removed from above line in order to get exact quantities after grouping: NSTE-2725. 
			// quantity and line numbers updated
			if(rectype=='itemfulfillment' || rectype == 'transferorder'){
				quantity = 0;
				for(var pr=0;pr<pickResult[k].length;pr++)
					quantity += parseInt(pickResult[k][pr].qtyneeded); 

			}
			else{

			}

			// componentItemType = determineItemType(nlapiLookupField('item', componentLine.component, 'type')) || false;
			// componentItemRecord = nlapiLoadRecord(componentItemType, componentLine.component);

			componentItemLookupRecord = nlapiLookupField('item', componentLine.component, ['itemid', 'displayname']);

			pickComponentHtml = '<tr><td>' + lineItemId + '</td><td>' + componentItemLookupRecord.itemid + '</td>' + '<td>' + componentItemLookupRecord.displayname + '</td><td>EA</td><td>' + quantity + '</td></tr>';
			pickItemHtml += pickComponentHtml;
			lastItem = currentItem;
		}
		
		Util.console.log(list, 'list');

		var totalPrice = 0.0;
		for(var s=1;s<=salesOrderRecord.getLineItemCount('item');s++) {
			
			var soLineNum = salesOrderRecord.getLineItemValue('item', 'custcol_line_id', s);
			Util.console.log(soLineNum, 'soLinenum');
			for(var t=0; t<list.length; t++) {
				Util.console.log(list[t], 'list t');
				Util.console.log(s, 's');
				Util.console.log(rectype, 'rectype');
				Util.console.log(reltype, 'reltype');
				if((list[t].linenumber==soLineNum) || ((rectype == 'transferorder' || reltype == 'transferorder') && list[t].linenumber==s)) {
					
					
					//AC BIZ-543 Bundle Support
					var groupParent = salesOrderRecord.getLineItemValue('item', 'custcol_group_parent', s);
					Util.console.log(groupParent, 'groupParent');
					if (groupParent && groupParent != '') {
						
						
						for (var jj=s; jj<= salesOrderRecord.getLineItemCount('item'); jj++) {
							var itemName = salesOrderRecord.getLineItemValue('item', 'item', jj);
							
							if (itemName == 0 || itemName == '0') { //i.e End of Group or "None"
								break;
							} else {
								totalPrice += parseFloat(salesOrderRecord.getLineItemValue('item', 'amount', jj));
							}
						}
					} else {
						totalPrice += parseFloat(salesOrderRecord.getLineItemValue('item','amount',s));
					}
					//END AC BIZ-543 Support
					
					
					
					break;
				}
			}
		}
		totalPrice = nlapiFormatCurrency(totalPrice);

		html = '<div id="PickSlipWrapper">'
			html += '<style type="text/css">body{margin:0; padding: 0;} #TopLeft, #TopMiddle, #OrderNumberTitle, #OrderNumber, #PurchaseOrderNumberTitle, #PurchaseOrderNumber, #TotalPriceTitle, #TotalPrice, #VATNumberTitle, #VATNumber, #MiddleLeft, #MiddleRight, #DeliveryDetails, #DeliveryLines {border: 1px solid black; padding: 8px;} #TopSection {height: 150px;} #TopLeft {height: 150px; float: left; width: 33.33%;} #TopMiddle {height: 150px; float: left; width: 33.33%;} #TopRight {height: 150px; float: right; width: 33.33%} #OrderNumber, #PurchaseOrderNumber, #TotalPrice, #VATNumber {height: 37.5px;} #OrderNumberTitle {height: 37.5px; float: left; width: 40%;} #PurchaseOrderNumberTitle {height: 37.5px; float: left; width: 40%;} #TotalPriceTitle {height: 37.5px; float: left; width: 40%;} #VATNumberTitle {height: 37.5px; float: left; width: 40%;} #MiddleSection {height: 150px;} #MiddleLeft {height: 150px; float: left; width: 50%;} #MiddleRight {height: 150px; float: right; width: 50%;} table, th, td {border: 1px solid black;} table {width: 100%;} thead {background-color: #d3d3d3;} th, .bold {font-weight: bold;} td.no-border {border: none;} .pick-header {font-size: 20px; text-align: center;} .pick-number {font-size: 15px; text-align:center;} .uir-page-title {display: none;} </style>';
		html += '<div id="TopSection"><div id="TopLeft">'+ LOGO_URL +'<br/><p class="bold">SHIP FROM:</p><p id="ShipFrom">' + shipfrom + '</p></div>';
		html += '<div id="TopMiddle"><p class="bold pick-header">PICK SLIP</p><p class="pick-number">' + pickSlipNumber + '</p></div>';
		html += '<div id="TopRight"><div id="OrderNumberTitle"><p class="bold">';
		if(rectype=='transferorder' || reltype=='transferorder')
		{
			html += 'TRANSFER ';
		}

		//  Order number filed needs to be updated as (orderType) + (Order Number). And remove the 'order' string from order type. Ex: RMA Order will be displayed as RMA  		
		var orderType ='';
		var orderTypeString= '';

		try{
			orderType = salesOrderObject.custbody_tno_order_type;
			orderTypeString = orderType; 
			if(orderType.search('ORDER'))
				orderTypeString = orderTypeString.replace('Order','');
		}
		catch(e)
		{
			//handle errors
		}

		html += 'ORDER NUMBER</p></div><div id="OrderNumber"><p>' + orderTypeString+" "+salesOrderObject.tranid + '</p></div>';
		if(!(rectype=='transferorder' || reltype=='transferorder'))
		{
			html += '<div id="PurchaseOrderNumberTitle"><p class="bold">PO NUMBER.</p></div><div id="PurchaseOrderNumber"><p>' + salesOrderObject.otherrefnum + '</p></div>';
		}
		html += '<div id="TotalPriceTitle"><p class="bold">TOTAL PRICE</p></div><div id="TotalPrice"><p>' + totalPrice + '</p></div><div id="VATNumberTitle"><p class="bold">VAT NUMBER</p></div><div id="VATNumber">' + vatNumber + '</div></div></div>';
		html += '<div id="MiddleSection"><div id="MiddleLeft"><p class="bold">SHIP TO:</p><p>' + shipto + '</p><p class="bold">CONTACT:</p> ' + shiptocontact + '</div><div id="MiddleRight"><p class="bold">BILL TO:</p><p>' + billto + '</p></div></div>';
		html += '<div id="DeliveryDetails"><p class="bold">DELIVERY DETAILS:</p><br/><table><thead><tr><th>Delivery Name</th><th>Shipping Instructions</th><th>Ship Method</th></tr></thead><tbody><tr><td>' + deliveryName + '</td><td>' + salesOrderObject.custbody_shipping_instructions + '</td><td>' + salesOrderObject.shipmethod + '</td></tr></tbody></table></div>';
		html += '<div id="DeliveryLines"><p class="bold">DELIVERY LINES:</p><br/><table><thead><tr><th>Line No.</th><th>Item Number</th><th>Item Description</th><th>Unit</th><th>Qty Requested</th></tr></thead>' + pickItemHtml + '</table></div>';
		html += '</div>';
	}

	else if (action == 'packslip') {
		nlapiLogExecution("DEBUG", "inside pack slip action", action);
		// if pack slip exists
		if(nativeFulfillment)
		{
			packSlipNumber = nativeFulfillment.getFieldValue('tranid');
		}
		else if (itemFulfillmentRecord.getFieldValue('custrecord_packslipnumber')) {
			// use pack slip field
			packSlipNumber = itemFulfillmentRecord.getFieldValue('custrecord_packslipnumber');
		}
		else {
			// store pack slip number
			packSlipNumber = makePackSlipNumber(10);
			nlapiSubmitField('customrecord_custom_fulfillment', itemFulfillmentId, 'custrecord_packslipnumber', packSlipNumber);
		}

		// generate html pack table from packResult
		packComponentHeaderHtml = '<div class="packtable bold">Components:</div><table class="packtable"><thead><th>Line No.</th><th>Item Number</th><th>Description</th><th>Serial Number</th></thead>';
		packResultCount = packResult.length;

		loadComponentData(packResultCount,packResult);

		var pFilters = [];
		var pColumns = [];
		var thisPackLookupRel = {};
		pColumns.push(new nlobjSearchColumn("itemid"));
		pColumns.push(new nlobjSearchColumn("displayname"));
		var pItemIds = [];
		
		for(var z = 0; z < packResultCount; z++){
			
			
			var assyitem = packResult[z][0].assyitem;
			
			
			if(salesOrderRecord.getFieldValue('custbody_tno_order_type')==ORDER_TYPE_RMA)
			{
				assyitem = packResult[z][0].component;
			}
			
			pItemIds.push(packResult[z][0].assyitem);
		}
		
		pFilters.push(new nlobjSearchFilter("internalid", null, "anyof", pItemIds));
		var pSearchResults = nlapiSearchRecord("item", null, pFilters, pColumns);
		
		for(var pRes = 0; pSearchResults != null && pRes < pSearchResults.length; pRes++){
				thisPackLookupRel[pSearchResults[pRes].getId()]={itemid: pSearchResults[pRes].getValue("itemid"),displayname: pSearchResults[pRes].getValue("displayname")};
		}
		
		
		for (var k = 0; k < packResultCount; k++) {
			nlapiLogExecution('DEBUG','item index',k);
			pCurrentItem = packResult[k][0].assyitem;
			
			//var customerItemSearch = searchCustomerItem(assyitem);
			nlapiLogExecution("DEBUG", "lifesize_item", assyitem);
			var customerItemHtml = '';
			// itemType = determineItemType(nlapiLookupField('item', packResult[k][0].assyitem, 'type')) || false;
			// itemRecord = nlapiLoadRecord(itemType, packResult[k][0].assyitem);

			//itemLookupRecord = nlapiLookupField('item', assyitem, ['itemid', 'displayname']);

			// if search matches customer item
			// if (customerItemSearch) {
			// 	// html string with customer item filled out
			// 	if(!nativeFulfillment) customerItemHtml += '<td></td>';
			// 	customerItemHtml = '<td>' + DrawCode39Barcode(customerItemSearch[0].getValue('custrecord_custom_customer_item')) + '</td>';
			// }
			// else {
				// html string with item number filled out
			customerItemHtml = '<td colspan= "12">' + DrawCode39Barcode(thisPackLookupRel[pCurrentItem].itemid) + '</td>';
			if(!nativeFulfillment) customerItemHtml += '<td colspan = "3"></td>';
			//}

			//if(nativeFulfillment) customerItemHtml = '';

			var assemblySerialNumber = packResult[k][0].assyserialnumber;
			if (packResult[k][0].assyserialnumber == "Not Required") {
				assemblySerialNumber = "";
			}
			else {
				assemblySerialNumber = packResult[k][0].assyserialnumber;
			}

			packHeaderHtml = '<table><thead><tr><th colspan= "12">Item Number</th>';

			if(!nativeFulfillment){packHeaderHtml += '<th colspan= "3">Customer Item</th>';}

			packHeaderHtml += '<th colspan= "2">Description</th>';

			if(rectype!='itemfulfillment') {packHeaderHtml += '<th colspan= "3">Serial Number</th>';}


			packHeaderHtml += '<th colspan= "1">Qty</th></tr></thead>';



			packHeaderHtml += '<tr>' + customerItemHtml + '<td colspan= "2">' + thisPackLookupRel[pCurrentItem].displayname + '</td>';
nlapiLogExecution('ERROR', 'packResult', JSON.stringify(packResult));

if(rectype!='itemfulfillment') 
{
if(packResult[k][0].assypartnum == 'RMA Default Assembly'){

	
	packHeaderHtml += '<td colspan= "3">' + packResult[k][0].serialnumber + '</td>';
}
else
packHeaderHtml += '<td colspan= "3">' + assemblySerialNumber + '</td>';

}

//			if(rectype!='itemfulfillment') packHeaderHtml += '<td colspan= "3">' + assemblySerialNumber + '</td>';

			/*
			var packTotalQuantity = 0;
			
			for(var pC=0;pC<packResult[k].length;pC++){
				packTotalQuantity += parseInt(packResult[k][pC].qtyneeded);
			}
			*/
			
			
			
			//BA-232 (AC-NimbusLabs) - Quantity should be the 1 for serialized items.  Should be line quantity for non-serialized
			var packTotalQuantity = 0;
			Util.console.log(packResult[k], 'packResult');
			for(var pC=0;pC<packResult[k].length;pC++){
				if (packResult[k][pC].assyserialnumber && packResult[k][pC].assyserialnumber != 'Not Required') {
					packTotalQuantity = 1;
					break;
				} else {
					Util.console.log(packResult[k][pC], 'pack result PC');
					packTotalQuantity += parseFloat(packResult[k][pC].qtyneeded);
				}
			
			}
			
			if(rectype == 'itemfulfillment' || rectype == 'transferorder')
			packHeaderHtml += '<td colspan= "1">' + packTotalQuantity + '</td></tr></table>';
			else
			packHeaderHtml += '<td colspan= "1">' + packTotalQuantity + '</td></tr></table>';


			packItemHtml += packHeaderHtml;

			componentCount = packResult[k].length;
			var componentSerialNumber;
			var emptyComponentList = true;
			for (var m = 0; m < componentCount; m++) {
				if (packResult[k][m].serialnumber != 'Not Required') {
					emptyComponentList = false;
					componentLine = packResult[k][m];
					nlapiLogExecution("DEBUG", "component line: ", componentLine.lineid);
					//componentItemLookupRecord = nlapiLookupField('item', componentLine.component, ['itemid', 'displayname']);
					componentItemLookupRecord = findComponentData(componentLine.component);

					var packComponentHtmlTemp = '<tr><td>' + componentLine.lineid + '</td><td>' + componentItemLookupRecord.itemid + '</td><td>' + componentItemLookupRecord.displayname + '</td>';
					if(rectype!='itemfulfillment') packComponentHtmlTemp += '<td>' + packResult[k][m].serialnumber + '</td>';
					packComponentHtmlTemp += '</tr>';
					// packItemHtml += packComponentHtml;
					packComponentHtml += packComponentHtmlTemp;
				}
			}
			if(rectype=='itemfulfillment' || salesOrderRecord.getFieldValue('custbody_tno_order_type')==ORDER_TYPE_RMA) emptyComponentList = true;
			if (!emptyComponentList) {
				packItemHtml += packComponentHeaderHtml;
				packItemHtml += packComponentHtml;
			}
			else {
				packItemHtml += '<br/>';
			}
			packComponentHtml = '';
			// packItemHtml += '</table>';
		}

		var freightTerms = salesOrderRecord.getFieldText('custbody_custom_shipping_freight_terms');		
		if(nativeFulfillment) freightTerms = nativeFulfillment.getFieldText('custbody_custom_shipping_freight_terms');
		nlapiLogExecution("DEBUG", "freightTerms", freightTerms);
		var fulfilldate = null;
		if(nativeFulfillment)
		{
			//fulfilldate = nativeFulfillment.getFieldValue('trandate');
			fulfilldate = salesOrderRecord.getFieldValue('shipdate');
		}
		else
		{
			fulfilldate = itemFulfillmentRecord.getFieldValue('custrecord_fulfillment_date');
		}

		html = '<div id="PackSlipWrapper">'
			html += '<style type="text/css">#TopLeft, #TopMiddle, #OrderNumberTitle, #OrderNumber, #CustomerNumberTitle, #CustomerNumber, #ShipDateTitle, #ShipDate, #MiddleLeft, #MiddleRight, #DeliveryDetails {border: 1px solid black; padding: 8px;} #DeliveryLines {padding: 8px;} #TopSection {height: 150px;} #TopLeft {height: 150px; float: left; width: 33.33%;} #TopMiddle {height: 150px; float: left; width: 33.33%;} #TopRight {height:150px; float: right; width: 33.33%;} #OrderNumberTitle, #CustomerNumberTitle, #ShipDateTitle {float: left; height: 50px; width: 40%;} #CustomerNumber, #OrderNumber, #ShipDate {height: 50px;} #MiddleLeft {height: 150px; float: left; width: 50%;} #MiddleRight {height: 150px; float: right; width: 50%;} table, th, td {border: 1px solid black;} .packtable {width: 95%; float: right;} table.packtable {margin-bottom: 10px;} table {width: 100%;} thead {background-color: #d3d3d3;} th, .bold {font-weight: bold;} .pack-header {font-size: 20px; text-align: center;} .uir-page-title {display: none;}</style>';
		html += '<div id="TopSection"><div id="TopLeft">'+ LOGO_URL +'<br/><p class="bold">SHIP FROM:</p><p id="ShipFrom">' + shipfrom + '</p></div>'
		html += '<div id="TopMiddle"><p class="bold pack-header">PACKING SLIP</p><br/>' + DrawCode39Barcode(packSlipNumber) + '</div>';
		html += '<div id="TopRight">';
		if(!(rectype=='transferorder' || reltype=='transferorder'))
		{
			html += '<div id="CustomerNumberTitle"><p class="bold">CUSTOMER PO NUMBER</p></div>';
			html += '<div id="CustomerNumber"><p>' + customerPONumber + '</p></div>';
		}
		html += '<div id="OrderNumberTitle"><p class="bold">ORDER NUMBER</p></div><div id="OrderNumber"><p>' + salesOrderObject.tranid + '</p></div><div id="ShipDateTitle"><p class="bold">SHIP DATE</p></div><div id="ShipDate"><p>' + fulfilldate + '</p></div></div></div>';
		html += '<div id="MiddleSection"><div id="MiddleLeft"><p class="bold">SHIP TO:</p><p>' + shipto + '</p></div><div id="MiddleRight"><p class="bold">BILL TO:</p><p>' + billto + '</p></div></div>';
		html += '<div id="DeliveryDetails"><p class="bold">DELIVERY DETAILS:</p><br/><table><thead><tr>';
		if(!(rectype=='transferorder' || reltype=='transferorder'))
		{
			html += '<th>PO Number</th>';
		}
		html += '<th>Delivery Name</th><th>Freight Terms</th><th>Ship Method</th></tr></thead><tbody><tr>';
		if(!(rectype=='transferorder' || reltype=='transferorder'))
		{
			html += '<td>' + DrawCode39Barcode(salesOrderObject.otherrefnum) + '</td>';
		}
		html += '<td>' + DrawCode39Barcode(deliveryName) + '</td><td>' + freightTerms + '</td><td>' + salesOrderObject.shipmethod + '</td></tr></tbody></table></div></br>';
		html += '<div id="DeliveryLines"><p class="bold">DELIVERY LINES:</p><br/>' + packItemHtml + '</table></div>';
		html += '</div>';
	}

	form.setScript('customscript_printpickpackslip');
	pickSlipHtml.setDefaultValue(html);
	response.writePage(form);
}

function buttonUrl(action, dim){
	var id, url, soid;
	id = nlapiGetRecordId();
	// soid = nlapiGetFieldValue('custrecord_fulfillment_so_no');
	if(nlapiGetRecordType() == 'itemfulfillment')
	{
		soid = nlapiGetFieldValue('createdfrom');
	}
	else if(nlapiGetRecordType()!='transferorder')
	{
		soid = nlapiLookupField('customrecord_custom_fulfillment', id, 'custrecord_fulfillment_so_no');
	}
	//dim = JSON.stringify(dim);

	url = nlapiResolveURL('SUITELET', SUITELET_ID, SUITELET_DEPLOYMENT_ID) + '&ifid=' + id + '&soid=' + soid + '&action=' + action + '&rectype=' + nlapiGetRecordType();
	openWindow(url, JSON.parse(dim));
}

function addSuiteletButtons(buttons, form){	
	var numButtons = buttons.length;
	for(var i = 0; i < numButtons; i++){
		var actionString, dim, dimString, button_function;
		actionString = encodeURI(buttons[i].action);
		dim = JSON.stringify(buttons[i].dim);
		dimString = encodeURI(dim);			
		button_function = 'buttonUrl(decodeURI(\'' + actionString + '\'), decodeURI(\'' +  dimString + '\'))';
		form.addButton(buttons[i].id, buttons[i].label, button_function);	
	}
}

function printPackSlipButton(type, form){
	if(type != 'delete' && type != 'create'){

		if(nlapiGetRecordType()=='itemfulfillment')
		{
			var createdfrom = nlapiGetFieldValue('createdfrom');
			type = nlapiLookupField('transaction',createdfrom,'type');
			if(type!='TrnfrOrd' && type != 'SalesOrd') return;
		}	

		var ifid, itemFulfillmentRecord, subsidiary, suiteletButtons;
		suiteletButtons = [
		                   {id:'custpage_pick_slip_suitelet', label:'Print Pick Slip', action: 'pickslip', dim:{centerW:0, centerH:0, mainW:1280, mainH:640}}, 
		                   ]; 
		if(nlapiGetRecordType()!='transferorder')
		{
			suiteletButtons.push({id:'custpage_pack_slip_suitelet', label:'Print Pack Slip', action: 'packslip', dim:{centerW:0, centerH:0, mainW:1280, mainH:960}});
		}
		ifid = nlapiGetRecordId();
		//itemFulfillmentRecord = nlapiLoadRecord('customrecord_custom_fulfillment', ifid);
		//subsidiary = itemFulfillmentRecord.getFieldValue('subsidiary');
		//if (itemFulfillmentRecord.getFieldValue('custrecord_fulfillment_data')) {
		// if(parseInt(subsidiary) == 3){
		addSuiteletButtons(suiteletButtons, form);
		//custom clientside script
		form.setScript('customscript_printpickpackclientside');
		// } 
		//}
	}
}

function makePackSlipNumber(uniqueness){
	return 'LOGI-xxxxxxx-PS'.replace(/[xy]/g, function(c){
		var r = Math.random() * uniqueness | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(15);
	});
}

function searchCustomerItem(lifesize_item){
	nlapiLogExecution("DEBUG", "inside search customer item", lifesize_item);
	var filters = [new nlobjSearchFilter('custrecord_custom_ls_item_number', null, 'anyof', lifesize_item)];
	var columns = [new nlobjSearchColumn('custrecord_custom_customer_item')];

	return nlapiSearchRecord('customrecord_custom_customer_items', null, filters, columns);
}

var COMPONENTS=[];
function loadComponentData(packResultCount,packResult)
{
	var items=[];
	for (var k = 0; k < packResultCount; k++) {
		componentCount = packResult[k].length;
		for (var m = 0; m < componentCount; m++) {
			if (packResult[k][m].serialnumber != 'Not Required') {
				componentLine = packResult[k][m];
				var found = false;
				for(var c=0; c<items.length; c++)
				{
					if(items[c] == componentLine.component)
					{
						found = true;
						break;
					}
				}
				if(!found) items.push(componentLine.component);
			}
		}
	}

	if(items.length>0)
	{
		var filters = [new nlobjSearchFilter('internalid',null,'anyof',items)];
		var columns = [new nlobjSearchColumn('itemid'),new nlobjSearchColumn('displayname')];
		COMPONENTS = nlapiSearchRecord('item',null,filters,columns);
	}
}

function findComponentData(component)
{
	if(!COMPONENTS)return null;
	for(var i=0; i<COMPONENTS.length; i++)
	{
		if(COMPONENTS[i].getId()==component)
		{
			return {
				itemid: COMPONENTS[i].getValue('itemid'),
				displayname: COMPONENTS[i].getValue('displayname')
			};
		}
	}
	return null;
}

function getAddrLine4(custId,addrId){


	var customerId =custId;
	var shipAddressId = addrId;
	var addrIntId = '';

	if(shipAddressId && customerId){
		var rec = nlapiLoadRecord('customer', customerId);
		for(var i = 1; i <= rec.getLineItemCount('addressbook'); i++){
			if(rec.getLineItemValue('addressbook', 'internalid', i) == shipAddressId){
				var subrecord = rec.viewLineItemSubrecord('addressbook', 'addressbookaddress',i);
				var addrLine4= subrecord.getFieldValue('custrecord_addr4');
			}
		}
		return addrLine4;

		/*
 if(addrIntId){
var filters = new Array();
filters.push(new nlobjSearchFilter('internalid', 'address', 'anyof', addrIntId));
var columns = new Array();
 columns.push(new nlobjSearchColumn('address', 'address', null));
  columns.push(new nlobjSearchColumn('address1', 'address', null));
  columns.push(new nlobjSearchColumn('custrecord_addr4', 'address', null));
  columns.push(new nlobjSearchColumn('zipcode', 'address', null));

var srch = nlapiSearchRecord('customer', null, filters, columns);


if(srch != null)
{

return srch[0].getValue('custrecord_addr4','address');
}

}

		 */
	}


}




//set Today's date as ship date field on transfer order record when status is shipped..
function setShipdate(type){
	var recordType = nlapiGetRecordType();
	nlapiLogExecution('DEBUG','setShipdate','recordType: ' + recordType);
	if(recordType == 'itemfulfillment'){
		var date = new Date();
		var todayDate = nlapiDateToString(date);
		//nlapiLogExecution('DEBUG','setShipdate','todayDate: ' + todayDate);
		var oldRecord = nlapiGetOldRecord();
		var newRecord = nlapiGetNewRecord();
		// get old status and new status of status field..
		//var oldStatus = oldRecord.getFieldValue('status');
		//var newStatus = newRecord.getFieldValue('status');
		//nlapiLogExecution('DEBUG','setShipdate','oldStatus: ' + oldStatus);
		//nlapiLogExecution('DEBUG','setShipdate','newStatus: ' + newStatus);
		var newStatus = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId()).getFieldValue('status');
		nlapiLogExecution('DEBUG','setShipdate','status: ' + newStatus);
		// compare old and new value if value is shipped set today's date to ship date field..
		//if((newStatus == 'Shipped')&&(newStatus != oldStatus)){
		if(newStatus == 'Shipped'){	
			nlapiLogExecution('DEBUG','setShipdate','todayDate: ' + todayDate);
			//get record internal id of transfer order record..
			var trnsfrorderObj = nlapiGetFieldValue('createdfrom');
			nlapiLogExecution('DEBUG','setShipdate','trnsfrorderObj: ' + trnsfrorderObj);
			//set shipdate on transfer order record..
			nlapiSubmitField('transferorder',trnsfrorderObj,'shipdate',todayDate);		
		}
	}
}
