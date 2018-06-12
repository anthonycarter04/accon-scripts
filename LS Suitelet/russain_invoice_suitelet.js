/**
 * File Header
 * Version:  		1.1
 * File ID (Sandbox):  		472
 * File ID (Production):
 * Company: 		LifeSize
 * Owner: Arthur Ardolino
 * Date Created:
 * Modified By: Manoj Hogarti
 * Date Modified:	03/Sept/2015
 * File Description:
 * Adds buttons to print invoices to fulfillment forms.
 * If customer is '14293 AHLERS RUS' with internal id 11656, a Russian invoice button is shown,
 * otherwise RMA and Commercial Invoice buttons are shown.
 *
 */
/**
 * Function Header
 * Script Type: User Event
 * Script ID: customscript_russian_invoice_button
 * Event Type: before load
 * function: printInvoiceButton()
 */
var INVOICE_SUITELET_ID, PDF_FOLDER_ID, BASE_DOMAIN, SUITELET_DEPLOYMENT_ID = '1';
var RUSSIAN_CUSTOMER = '11656';
var RMA_ORDER_FORM = '102';
var ORDER_TYPE_RMA = '4';
var ITEM_TYPE_HARDWARE = '1';
var ITEM_TYPE_AMS = '7';
var SERVICE_REF_AMS_CURRENT = '1';
var RMA_SALES_ORDER_TYPE = '4';
var INTERNAL_SALES_ORDER_TYPE = '1';
var INTERNAL_RMA_SALES_ORDER_TYPE = '6';


//This will determine if we're in sandbox/prod, and set the proper IDs.
var init = function(){
  var env = nlapiGetContext().getEnvironment();
  var acct = nlapiGetContext().getCompany();
  switch(env){
    case 'PRODUCTION':
      INVOICE_SUITELET_ID = "customscript_russian_commercial_invoice";
      BASE_DOMAIN = "https://system.na1.netsuite.com";
      LOGO_URL = '<img src="https://system.na1.netsuite.com/core/media/media.nl?id=478&c=3758266&h=39e3c8561ea4c3dfb08b"/>';
	  //RUSSIAN_CUSTOMER = '';
	  //RMA_ORDER_FORM = '102';
      break;
    default:
      if(acct.match(/_SB2/)) {
        INVOICE_SUITELET_ID = "customscript_russian_commercial_invoice";
        BASE_DOMAIN = "https://system.sandbox.netsuite.com";

        LOGO_URL = '<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=478&c=3758266&h=39e3c8561ea4c3dfb08b"/>';

//        LOGO_URL = '<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=865&c=3758266_SB2&h=2e37eff52f56ce6d322b"/>';
		//RUSSIAN_CUSTOMER = '11656';
	    //RMA_ORDER_FORM = '103';
      }
      else {
        INVOICE_SUITELET_ID = "customscript_russian_commercial_invoice";
        BASE_DOMAIN = "https://system.sandbox.netsuite.com";
		LOGO_URL = '<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=478&c=3758266&h=39e3c8561ea4c3dfb08b"/>';
       // LOGO_URL = '<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=478&c=3758266_SB2&h=c3f3fa6a94da0f174cbb"/>';
		//RUSSIAN_CUSTOMER = '11656';
	    //RMA_ORDER_FORM = '103';
      }
      break;
  }
  // nlapiLogExecution('debug', 'env', env + ', suitelet' + INVOICE_SUITELET_ID + ', baseDomain' + BASE_DOMAIN);
};

init();

function invoicePageInit(){};


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

function getEin(subsidiary){
	
	var vatNumber =null;	
	var filters = new Array();	
	filters[0] = new nlobjSearchFilter('internalid', null, 'anyof', subsidiary);	
	var columns = new Array();	
	columns[0] = new nlobjSearchColumn( 'taxidnum' );	
	//columns[0] = new nlobjSearchColumn( 'federalidnumber' );	
	var searchResults = nlapiSearchRecord('subsidiary', null, filters, columns); 	
		
	if (searchResults && searchResults != '') {	
		var ein_num = searchResults[0].getValue('taxidnum');	
		if (ein_num && ein_num != ''){	
		vatNumber=ein_num	
		}	
		  	
	  }	
	return vatNumber;		
			
}



function invoiceSuitelet(req, res) {
  nlapiLogExecution("DEBUG", "Inside suitelet", req);
  action       = req.getParameter('action');
  rectype = req.getParameter('rectype');
  var timestamp, action, invoiceHtml, salesorderid, salesOrderRecord, fulfillmentid, customerId, vatNumber,lineItemHtml = '', html = '';

  if (action == 'russian_invoice') {
    var invoiceForm = nlapiCreateForm("RussianInvoice");
    invoiceHtml = invoiceForm.addField("custpage_russian_invoice", "inlinehtml");
  }
  if (action == 'commercial_invoice') {
    var invoiceForm = nlapiCreateForm("CommericalInvoice");
    invoiceHtml = invoiceForm.addField("custpage_commercial_invoice", "inlinehtml");
  }
  if (action == 'rma_invoice') {
    var invoiceForm = nlapiCreateForm("RMAInvoice");
    invoiceHtml = invoiceForm.addField("custpage_rma_invoice", "inlinehtml");
  }

  timestamp    = new Date().getTime();
  salesorderid = req.getParameter('salesorderid');
  fulfillmentid = req.getParameter('fulfillmentid');
  nlapiLogExecution("DEBUG", "sales order id: ", salesorderid);
  var nativeFulfillment = null;
  var fulfillmentRecord = null;
  var orderType=null;

  var created_From =  nlapiLookupField('transaction',salesorderid,'type');//*

  if(rectype=='itemfulfillment' && created_From == 'TrnfrOrd') //*
  {
	salesOrderRecord = nlapiLoadRecord('transferorder', salesorderid);
	nativeFulfillment = nlapiLoadRecord('itemfulfillment', fulfillmentid);
  }
  else if(rectype=='itemfulfillment' && created_From == 'SalesOrd'){  //*
		salesOrderRecord = nlapiLoadRecord('salesorder', salesorderid);
		nativeFulfillment = nlapiLoadRecord('itemfulfillment', fulfillmentid);
		orderType = salesOrderRecord.getFieldValue('custbody_tno_order_type');

  }
  else
  {
	fulfillmentRecord = nlapiLoadRecord('customrecord_custom_fulfillment', fulfillmentid);
	var commerceFulfillmentId = fulfillmentRecord.getFieldValue('custrecord_native_fulfillment');	
	if (commerceFulfillmentId) {	
		var commerceFulfillment = nlapiLoadRecord('itemfulfillment', commerceFulfillmentId);	
	}
	salesOrderRecord = nlapiLoadRecord('salesorder', salesorderid);
	nlapiLogExecution("DEBUG", "fulfillmentid id: ", fulfillmentid);
	customerId = salesOrderRecord.getFieldValue('custbody_bill_customer'); // nlapiLookupField('customrecord_custom_fulfillment', fulfillmentid, 'custrecord_customer');
	nlapiLogExecution("DEBUG", "customer id: ", customerId);
  }

  var printAMS = false;
  if(customerId) {
    custFields = nlapiLookupField('customer', customerId, ['vatregnumber','custentity_print_ams_comm_invoice']);
	vatNumber = custFields.vatregnumber;
	printAMS = (custFields.custentity_print_ams_comm_invoice == 'T');
	nlapiLogExecution('DEBUG','printAMS',custFields);
  }	else if(rectype=='itemfulfillment' && created_From == 'TrnfrOrd'){		
	  var subsidiary_from_order=nativeFulfillment.getFieldValue('subsidiary');	
	  vatNumber=getEin(subsidiary_from_order);	
  } else {
    vatNumber = "";
  }
	nlapiLogExecution('DEBUG','printAMS','value: ' + printAMS);
	if(rectype=='itemfulfillment' && created_From == 'SalesOrd' && orderType == 9){	
		  	
	var subsidiary_from_order=nativeFulfillment.getFieldValue('subsidiary');	
	vatNumber=getEin(subsidiary_from_order);	
	}	

	nlapiLogExecution('DEBUG','printAMS','value: ' + printAMS);

// change formatting for date
  var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var monthHash = {};
  var shipDate, shipDateString = '';

  for (var m = 1; m <=12; m++) {
    monthHash[m] = months[m-1];
  }

  shipDate = nativeFulfillment ? nativeFulfillment.getFieldValue('trandate') : fulfillmentRecord.getFieldValue('custrecord_fulfillment_date'); //salesOrderRecord.getFieldValue('shipdate');
  nlapiLogExecution('DEBUG','shipDate',shipDate);
  shipDate = shipDate.split('/');
  shipDateString = shipDate[1] + '-' + monthHash[shipDate[0]] + '-' + shipDate[2];

  var locationRecord = null;
  if(rectype=='itemfulfillment')
  {
	var locid = nativeFulfillment.getLineItemValue('item','location',1);
	nlapiLogExecution('DEBUG','location',locid);
	locationRecord = nlapiLoadRecord('location',locid);
	
  }
  else
  {
	  var lineId = fulfillmentRecord.getLineItemValue('custpage_serialnumber_sublist','lineid',1);
	  lineId = lineId.split(' - ');
	  var lineNumber = lineId[0];
	  var salesOrderLineNumber = salesOrderRecord.findLineItemValue('item', 'line', lineNumber);
	  var salesOrderLocation = salesOrderRecord.getLineItemValue('item', 'location', salesOrderLineNumber);
	  locationRecord = nlapiLoadRecord('location', salesOrderLocation);
	  
  }
  var shipper = 'Lifesize, Inc.</p><p>1601 S. MoPac Expressway</p><p>Suite 100</p><p>Austin, TX 78746</p><p>US';
  var title = '';
  var shipto = '';
  var ship_cust_Id = salesOrderRecord.getFieldValue('custbody_ship_to_customer');
var ship_address_Id = salesOrderRecord.getFieldValue('custbody_ship_to_customer_address');
var bill_Cust_Id = salesOrderRecord.getFieldValue('entity');
var bill_address_Id = salesOrderRecord.getFieldValue('billaddresslist');

var shipAddrLine4 = '';
var billAddrLine4 = '';
var shipFromLine4 = '';
try{
if(locationRecord)
shipFromLine4 = getShipFromAddrLine4(locationRecord.getId());

shipAddrLine4 = getAddrLine4(ship_cust_Id,ship_address_Id);
billAddrLine4 = getAddrLine4(bill_Cust_Id,bill_address_Id);

}
catch(e){
	
}
 // if(salesOrderRecord.getFieldValue('shipattention')) shipto += salesOrderRecord.getFieldValue('shipattention') + '<br/>';
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

  var shipfrom = '<p>';
  if(locationRecord.getFieldValue('addressee')) shipfrom += locationRecord.getFieldValue('addressee') + '</br>';
  if(locationRecord.getFieldValue('attention')) shipfrom += locationRecord.getFieldValue('attention') + '</br>';
  if(locationRecord.getFieldValue('addr1')) shipfrom += locationRecord.getFieldValue('addr1') + '</br>';
  if(locationRecord.getFieldValue('addr2')) shipfrom += locationRecord.getFieldValue('addr2') + '</br>';
  if(locationRecord.getFieldValue('addr3')) shipfrom += locationRecord.getFieldValue('addr3') + '</br>';
  if(shipFromLine4) shipfrom += shipFromLine4 + '</br>';
  
  if(locationRecord.getFieldValue('city')) shipfrom += locationRecord.getFieldValue('city') + ', ';
  if(locationRecord.getFieldValue('state')) shipfrom += locationRecord.getFieldValue('state') + ' ';
  if(locationRecord.getFieldValue('zip')) shipfrom += locationRecord.getFieldValue('zip') + ' ';
  if(locationRecord.getFieldValue('country')) shipfrom += '<br/>' + locationRecord.getFieldValue('country') + '</p>';;

  if(action=='russian_invoice')
  {
	shipfrom = '<p>Lifesize, Inc.</p><p>c/o Agility Logistics B.V. Fokkerweg 300</p><p>Unit 2A</p><p>Oude Meer, 1438 AN</p><p>NL</p>';
  }


  var numLines = salesOrderRecord.getLineItemCount('item');

	if(action == 'commercial_invoice')
	{
		title = '<p>Commercial Invoice</p>';

	}
	if(action == 'rma_invoice')
	{
		title = '<p>Commercial Invoice</p><p>(For RMA Returns)</p>';
		var tempshipto = shipto;
		shipto = shipfrom;
		shipfrom = tempshipto;
		//shipfrom = billto;
	}
	else if(action == 'russian_invoice')
	{
		title = '<p>Invoice / Ã‘ï¿½Ã‘â€¡Ã�ÂµÃ‘â€š Ã¢â€žâ€“:</p>';
	}


	var data = [];
	if(rectype=='itemfulfillment')
	{
		for(var i=1; i<=nativeFulfillment.getLineItemCount('item'); i++)
		{
			data.push(
				{
					linenumber: nativeFulfillment.getLineItemValue('item','line',i),
					assyserialnumber: 'Not Required',
					component: nativeFulfillment.getLineItemValue('item','item',i),
					qtypicked: nativeFulfillment.getLineItemValue('item','quantity',i)
				}
			);
		}
		nlapiLogExecution('DEBUG','data',JSON.stringify(data));
	}
	else
	{
		data = fulfillmentRecord.getFieldValue('custrecord_fulfillment_data');
		data = JSON.parse(data);
	}

	// generate line item detail
	var totalQuantity = 0;
	var totalValue = 0;
	var itemDesc;
	
			var itemHTSCode='';
		var eCCNNumber='';
		var countryOfOrigin = '';

	
	var custcolLines = [];
	
	// Loop through lines to get all item ids for search/lookup	
	var itemIds = [];	
	var itemLookupObj = {};	
	for (var i = 1; i <= numLines; i++) {	
		var itemId = salesOrderRecord.getLineItemValue('item','item',i);	
		if (itemIds.indexOf(itemId) == -1) {	
			itemIds.push(itemId);	
		}	
	}	
	if(fulfillmentRecord){	
		var fulfillLines = fulfillmentRecord.getLineItemCount('custpage_serialnumber_sublist');	
		for (var i = 1; i <= fulfillLines; i++) {	
			var itemId = fulfillmentRecord.getLineItemValue('custpage_serialnumber_sublist','assyitem',i);	
			if (itemIds.indexOf(itemId) == -1) {	
				itemIds.push(itemId);	
			}	
	
			var itemId = fulfillmentRecord.getLineItemValue('custpage_serialnumber_sublist','component',i);	
			if (itemIds.indexOf(itemId) == -1) {	
				itemIds.push(itemId);	
			}	
		}	
	}	
		//nlapiLogExecution('debug', 'Item Ids', itemIds);	
			
		// Build and run search for lookups	
		var filters = [];	
		filters.push(new nlobjSearchFilter('internalid', '', 'anyof', itemIds));	
		var columns = [];	
		columns.push(new nlobjSearchColumn('itemid'));	
		columns.push(new nlobjSearchColumn('custitem_tariff_code'));	
		columns.push(new nlobjSearchColumn('custitem_eccn_number'));	
		columns.push(new nlobjSearchColumn('custitem_country_of_origin'));	
		columns.push(new nlobjSearchColumn('description'));	
		var searchItems = nlapiSearchRecord('item',null,filters,columns);	
			
		for(var i = 0; searchItems != null && i < searchItems.length; i++){	
			var result = searchItems[i];	
			var itemId = result.getId();	
			var name = result.getValue('itemid');	
			var tariff = result.getValue('custitem_tariff_code');	
			var eccn = result.getValue('custitem_eccn_number');	
			var origin = result.getText('custitem_country_of_origin');	
			var desc = result.getValue('description');	
				
			itemLookupObj[itemId] = {name: name, tariff: tariff, eccn: eccn, origin: origin, desc: desc};	
		}	
	nlapiLogExecution('debug', 'itemLookupObj', JSON.stringify(itemLookupObj));
	
	for (var i = 1; i <= numLines; i++) {

	  var itemType = salesOrderRecord.getLineItemValue('item','custcol_item_type',i);
	  nlapiLogExecution('DEBUG','itemtype',itemType);
	  if(itemType!=ITEM_TYPE_HARDWARE && rectype!='itemfulfillment')
	  {
			if(printAMS && salesOrderRecord.getLineItemValue('item','custcol_service_ref_type',i)==SERVICE_REF_AMS_CURRENT)
			{
				nlapiLogExecution('DEBUG','printAMS','found AMS line');
			}
			else continue;
	  }

	  itemId = salesOrderRecord.getLineItemValue('item', 'item', i);
	  itemText = salesOrderRecord.getLineItemText('item', 'item', i);
	  itemDesc = salesOrderRecord.getLineItemValue('item', 'description', i);

			var item_Lookup = nlapiLookupField('item',itemId,['custitem_tariff_code','custitem_eccn_number']);
			var itemTextLookUpCountry_Origin = nlapiLookupField('item', itemId, 'custitem_country_of_origin', true);
	  //itemHTSCode = itemLookupObj[itemId].tariff;//item_Lookup.custitem_tariff_code;
	  itemHTSCode = item_Lookup.custitem_tariff_code;
	 // eCCNNumber = itemLookupObj[itemId].eccn;//item_Lookup.custitem_eccn_number;	+
	  eCCNNumber = item_Lookup.custitem_eccn_number;
	 // countryOfOrigin = itemLookupObj[itemId].origin; //itemTextLookUpCountry_Origin;
	  countryOfOrigin = itemTextLookUpCountry_Origin;
		  
		  //new block added to get itemHTSCode, eccNNumber, countryOfOrigin from component instead of item, for internal RMA and RAM order type
		  if((salesOrderRecord.getFieldValue('custbody_tno_order_type')==ORDER_TYPE_RMA || salesOrderRecord.getFieldValue('custbody_tno_order_type')== INTERNAL_RMA_SALES_ORDER_TYPE) && rectype != 'itemfulfillment')
			  {
			  var fulLineID = fulfillmentRecord.findLineItemValue('custpage_serialnumber_sublist', 'assyitem', itemId);
			  var RMACompId = fulfillmentRecord.getLineItemValue('custpage_serialnumber_sublist', 'component', fulLineID);
			  nlapiLogExecution('DEBUG', 'filfil line id', fulLineID);
			  nlapiLogExecution('DEBUG', 'RMACompId', RMACompId);
				//var item_LookupRMA = nlapiLookupField('item',RMACompId,['custitem_tariff_code','custitem_eccn_number']);
				//  var itemTextLookUpCountry_OriginRMA = nlapiLookupField('item', RMACompId, 'custitem_country_of_origin', true);
			  itemHTSCode = itemLookupObj[RMACompId].tariff;  //item_LookupRMA.custitem_tariff_code;
			  eCCNNumber = itemLookupObj[RMACompId].eccn;  //item_LookupRMA.custitem_eccn_number;
			  countryOfOrigin = itemLookupObj[RMACompId].origin;  //itemTextLookUpCountry_OriginRMA;
			  
			  

			  
			  }
	  
	  //itemDesc = nlapiLookupField('item',itemId,'displayname');
	  if(salesOrderRecord.getFieldValue('custbody_tno_order_type')==ORDER_TYPE_RMA)
	  {
		if(action=='rma_invoice')
		{
			itemId = salesOrderRecord.getLineItemValue('item','custcol_rma_container_item',i);
			itemText = salesOrderRecord.getLineItemText('item', 'custcol_rma_container_item', i);
			itemDesc = salesOrderRecord.getLineItemValue('item', 'description', i);
		}
		else
		{
			itemId = data[0].component;
			//rmaItemFields = nlapiLookupField('item',itemId,['name','description']);
			itemText = itemLookupObj[itemId].name;  //rmaItemFields.name;
			itemDesc = itemLookupObj[itemId].desc;  //rmaItemFields.description;
		}
		nlapiLogExecution('DEBUG','RMA Order',itemId);
	  }
	  var serials = [];
	  var itemfound = false;
	  nlapiLogExecution('DEBUG','sales order line',salesOrderRecord.getLineItemValue('item','line',i));

	  // first find all unique serial numbers (for serialized components)
	    if(rectype=='itemfulfillment')
		{
	    	if(data[i-1] != null)
			serials.push(data[i-1]);
			itemfound = true;
			nlapiLogExecution('DEBUG','serials itemfulfillment',JSON.stringify(serials));
		}
		else
		{
			for(var j=0; j<data.length; j++)
			{
				if(data[j].linenumber==salesOrderRecord.getLineItemValue('item','custcol_line_id',i))
				{
					var serialfound = false;
					for(var k=0; k<serials.length; k++)
					{
						if(serials[k].assyserialnumber==data[j].assyserialnumber)
						{
							serialfound = true;
							break;
						}
					}
					if(!serialfound && data[j].assyserialnumber && data[j].assyserialnumber!='Not Required')serials.push(data[j]);
					itemfound = true;
					if(rectype!='itemfulfillment') custcolLines.push(data[j].linenumber);
					nlapiLogExecution('DEBUG','itemfound','data[j].linenumber: ' + data[j].linenumber);
				}
			}

			// if no serials, then look for non-serialized component line (i.e. assyserialnumber = Not Required)
			if(serials.length==0)
			{
				for(var j=0; j<data.length; j++)
				{
					if(
						(rectype=='itemfulfillment' && data[j].linenumber==salesOrderRecord.getLineItemValue('item','line',i)) ||
						(rectype!='itemfulfillment' && data[j].linenumber==salesOrderRecord.getLineItemValue('item','custcol_line_id',i))
					)
					{
						var serialfound = false;
						for(var k=0; k<serials.length; k++)
						{
							if(serials[k].assyserialnumber==data[j].assyserialnumber)
							{
								serialfound = true;
								break;
							}
						}
						if(!serialfound && data[j].assyserialnumber && data[j].assyserialnumber=='Not Required')serials.push(data[j]);
						itemfound = true;
						if(rectype!='itemfulfillment') custcolLines.push(data[j].linenumber);
					}
				}
			}
		}

		if(salesOrderRecord.getLineItemValue('item','custcol_service_ref_type',i)==SERVICE_REF_AMS_CURRENT)
		{
			var refLine = salesOrderRecord.getLineItemValue('item','custcol_service_ref_line_number',i);
			nlapiLogExecution('DEBUG','printAMS','search for matching line: ' + refLine);
			var foundLine = true;

			if(foundLine)
			{
				nlapiLogExecution('DEBUG','printAMS','found line: ' + refLine);
				itemfound = true;
			}
		}

		if(itemfound)
		{
			var orderType = salesOrderRecord.getFieldValue('custbody_tno_order_type');
			var hasserial = serials.length>0;
			
			var quantity = salesOrderRecord.getLineItemValue('item', 'quantity', i);
			nlapiLogExecution('DEBUG','quantity',quantity);
			var amount = salesOrderRecord.getLineItemValue('item', 'amount', i);
			var rate = salesOrderRecord.getLineItemValue('item', 'rate', i);
			
			//AC BIZ-543 Bundle Support
			var groupParent = salesOrderRecord.getLineItemValue('item', 'custcol_group_parent', i);
			Util.console.log(groupParent, 'groupParent');
			if (groupParent && groupParent != '') {
				amount = 0;
				rate = 0;
				for (var j=i; j<= numLines; j++) {
					var itemName = salesOrderRecord.getLineItemValue('item', 'item', j);
					
					if (itemName == 0 || itemName == '0') { //i.e End of Group or "None"
						break;
					} else {
						amount += parseFloat(salesOrderRecord.getLineItemValue('item', 'amount', j));
						rate += parseFloat(salesOrderRecord.getLineItemValue('item', 'rate', j));
					}
				}
			}
			//END AC BIZ-543 Support
			
			
			var rmarate = 400;
//var INTERNAL_SALES_ORDER_TYPE = '1';
//var INTERNAL_RMA_SALES_ORDER_TYPE = '6';
      if(orderType == RMA_SALES_ORDER_TYPE || orderType == INTERNAL_SALES_ORDER_TYPE || orderType == INTERNAL_RMA_SALES_ORDER_TYPE){

  			if(salesOrderRecord.getFieldValue('shipcountry')=='IN') rmarate = 100;
  			if(amount==0)amount=rmarate;
			  if(!rate || rate==0)rate=rmarate;
			}
			nlapiLogExecution('DEBUG','amount',amount);
			totalQuantity += parseInt(quantity);
		//	totalValue += parseFloat(amount);
			nlapiLogExecution('DEBUG','totalValue',totalValue);
			if(!hasserial)
			{
				serials.push({
					component:itemId,
					componentdescription:itemDesc,
					itemnumber:itemText,
					assyserialnumber:null,
					serialnumber:null,
					qtypicked:quantity
				});
			}
			else
			{

				nlapiLogExecution('DEBUG','serials length L 389',serials.length);
				nlapiLogExecution('DEBUG','serials length L 389',serials[0]);

				//amount = rate;
				if(serials[0].assyserialnumber!='Not Required'){
					amount = rate;
				}

				/*var newserials = [];
				newserials.push({
					component:itemId,
					componentdescription:itemDesc,
					itemnumber:itemText,
					assyserialnumber:serials[0].assyserialnumber,
					serialnumber:serials[0].serialnumber,
					qtypicked:quantity
				});
				//if(serials[0].assyserialnumber!='Not Required') amount = rate;
				serials = newserials;*/
			}
			nlapiLogExecution('DEBUG','serials length',serials.length);

			// var dataItemIds = [];

		  // for(var z=0; z<serials.length; z++){

			  // var serItemId = serials[z].component;
			  // nlapiLogExecution('DEBUG', 'Serial Item Id', serItemId);

			  // dataItemIds.push(serItemId);
		  // }

			//var itemfields = getItemInfo(dataItemIds);
			//nlapiLogExecution('DEBUG', 'item fields', JSON.stringify(itemfields));

			for(var s=0; s<serials.length; s++)
			{
				nlapiLogExecution('DEBUG','serials s: ' + s,JSON.stringify(serials[s]));
				nlapiLogExecution('DEBUG','serials[s].qtypicked : ' + s,serials[s].qtypicked);
				//if(serials[s].itemnumber=='Not Required' && serials[s].serialnumber=='Not Required')continue;

				if(action=='russian_invoice')
				{
						lineItemHtml += '<tr><td>' + i + '</td>\
						<td>' + serials[s].assypartnum + '<br/>' +
						serials[s].componentdescription;
						if(serials[s]!='')
						{
							lineItemHtml += '</p><p>Serial #: '+ serials[s].assyserialnumber;
						}
						lineItemHtml += '\
						</td>\
						<td>' + serials[s].qtypicked + '</td>\
						<td>EA</td>\
						<td></td>\
						<td>' + rate + '</td>\
						<td>' + amount + '</td>\
						</tr>';
				}
				else
				{
					//var itemfields = nlapiLookupField('item',serials[s].component,['name','custitem_eccn_number','custitem_tariff_code','custitem_country_of_origin']);
					var countryoforigin = serials[s].countryoforigin;
					if(salesOrderRecord.getLineItemValue('item','custcol_service_ref_type',i)==SERVICE_REF_AMS_CURRENT)
					{
						var refLine = salesOrderRecord.getLineItemValue('item','custcol_service_ref_line_number',i);
						for(var l=1; l<=salesOrderRecord.getLineItemCount('item'); l++)
						{
							if(salesOrderRecord.getLineItemValue('item','custcol_line_id',l)==refLine)
							{
								var relatedItem = salesOrderRecord.getLineItemValue('item','item',l);
								//countryoforigin = nlapiLookupField('item',relatedItem,'custitem_country_of_origin',true);
								countryoforigin = itemLookupObj[relatedItem].origin;
								/*itemfields2 = nlapiLookupField('item',relatedItem,['name','custitem_tariff_code','custitem_country_of_origin']);
								itemfields2.custitem_eccn_number = itemfields.custitem_eccn_number;
								itemfields = itemfields2;*/
								break;
							}
						}
					}

					//nlapiLogExecution('DEBUG', 'Item Text / Desc', itemfields.name + '  /  ' + serials[s].componentdescription);
					lineItemHtml += '<tr><td>' + serials[s].qtypicked +
					'</td><td><p>' + itemText + '</p><p>' + itemDesc +
					//'</p><p>Country of Origin: '+ countryoforigin +
					//'</p><p>ECCN Number: '+ itemfields.custitem_eccn_number +
					//'</p><p>HTS Code: '+ itemfields.custitem_tariff_code;
					'</p><p>Country of Origin: '+ countryOfOrigin +
						'</p><p>ECCN Number: '+ eCCNNumber +
						'</p><p>HTS Code: '+ itemHTSCode;
						
					
					
					
					
					if(serials)
					if(serials[s]!='' && serials[s].assyserialnumber && serials[s].assyserialnumber!='Not Required')
					{
						
						nlapiLogExecution('ERROR', 'serials[s]', JSON.stringify(serials));
						if(serials[s].assypartnum == 'RMA Default Assembly'){
							lineItemHtml += '</p><p>Serial #: '+ serials[s].serialnumber;
						}
						else{
						lineItemHtml += '</p><p>Serial #: '+ serials[s].assyserialnumber;
						}
					}

					lineItemHtml += '</p></td><td>EA</td>';
					if(!nativeFulfillment)
					{
						lineItemHtml += '<td>' + salesOrderRecord.getFieldValue('otherrefnum') + '</td>';
					}
					lineItemHtml += '<td>' + salesOrderRecord.getFieldValue('tranid') + '</td>';
					if(!nativeFulfillment)
					{
						if(orderType == RMA_SALES_ORDER_TYPE){
							lineItemHtml += '<td>' + salesOrderRecord.getFieldValue('shipattention') + '</td>';
						}
						else{
							var contact = salesOrderRecord.getFieldText('custbody_ship_to_contact');
							var contactStr = contact;
						
							if(contactStr.indexOf(':')>-1){
								contact = contact.split(':');
								contactStr = contact[1];
							}
							
							lineItemHtml += '<td>' + contactStr + '</td>';
						}
					}
					lineItemHtml += '<td>$' + rate + '</td>';
					lineItemHtml += '<td>$' + amount + '</td></tr>';
					nlapiLogExecution('DEBUG','lineItemHtml',lineItemHtml);
				}
				totalValue += parseFloat(amount);
			}
		}
	}
	totalValue = Math.round(totalValue*100)/100;
	nlapiLogExecution('DEBUG','totalValue1',totalValue);

	html +=
'<div id="invoice-wrapper">\
	<style type="text/css">'
	if(action=='russian_invoice')
	{
		html += '\
		#top-left, #top-middle, #shipper, #ship-from, #ship-to, #bill-to, #carriers, #terms {border: 1px solid black; padding: 8px;}\
		#invoice-number-title, #invoice-number, #contract-title, #contract, #annex-title, #annex, #ship-date, #ship-date-title {border: 1px solid black; padding: 3px;}\
		table, th, tr, td {border: 1px solid black;}\
		th {height: 40px;}\
		#top-section {height: 120px;}\
		#top-middle, #top-left {height: 120px; float: left; width: 33.33%;}\
		#top-middle {text-align: center; font-size: 20px;}\
		#top-right {height: 120px; float: right; width: 33.33%;}\
		#second-row {height: 150px;}\
		#shipper, #ship-from, #ship-to {height: 150px; width: 25%; float: left}\
		#bill-to {height: 150px; width: 25%; float: right;}\
		#third-row {height: 50px;}\
		#carriers {float: left; height: 50px; width: 50%}\
		#terms {height: 50px; width: 50%; float: right;}\
		#invoice-number-title, #contract-title, #annex-title, #ship-date-title {float: left; height: 30px; width: 50%;}\
		#invoice-number, #contract, #annex, #ship-date {float: right; height: 30px; width: 50%;}\
		table {width: 100%;}\
		.uir-page-title {display: none;}\
		#total-right {float:right;}\
		#total-left, #total-middle {float:left;}\
		#total-left, #total-middle, #total-right {width: 33.33%; border-top: 1px solid black; padding:5px; text-align:center;}\
		#footer {padding:10px;}';
	}
	else
	{
		html += '\
		#top-left, #top-middle, #shipper, #ship-from, #ship-to, #bill-to, #carriers, #terms {border: 1px solid black; padding: 8px;}\
		#invoice-number-title, #invoice-number, #contract-title, #contract, #annex-title, #annex, #ship-date, #ship-date-title {border: 1px solid black; padding: 3px;}\
		table, th, tr, td {border: 1px solid black;} \
		th {height: 40px;}\
		#top-section {height: 100px;}\
		#top-middle, #top-left {height: 100px; float: left; width: 33.33%;}\
		#top-middle {text-align: center; font-size: 20px;}\
		#top-right {height: 100px; float: right; width: 33.33%;}\
		#second-row {height: 150px;}\
		#shipper, #ship-from, #ship-to {height: 150px; width: 25%; float: left}\
		#bill-to {height: 150px; width: 25%; float: right;}\
		#third-row {height: 50px;}\
		#carriers {float: left; height: 50px; width: 50%}\
		#terms {height: 50px; width: 50%; float: right;}\
		#invoice-number-title, #ship-date-title {float: left; height: 50px; width: 50%;}\
		#invoice-number, #ship-date {float: right; height: 50px; width: 50%;}\
		table {width: 100%;} .uir-page-title {display: none;}\
		#total-right {float:right;}\
		#total-left, #total-middle {float:left;}\
		#total-left, #total-middle, #total-right {width: 33.33%; border-top: 1px solid black; padding:5px; text-align:center;}\
		#footer {padding:10px;}';
	}
	html += '\
	</style>\
	<div id="top-section">\
		<div id="top-left">'+ LOGO_URL +'<br/></div>\
		<div id="top-middle">' + title + '</div>\
		<div id="top-right">'

	var fulfillmentNumber = nativeFulfillment ? nativeFulfillment.getFieldValue('tranid') : fulfillmentRecord.getFieldValue('name');
if(action=='russian_invoice')
	{
		html += '\
			<div id="invoice-number-title"><p>Invoice Number / Ã‘ï¿½Ã‘â€¡Ã�ÂµÃ‘â€š Ã¢â€žâ€“:</p></div>\
			<div id="invoice-number"><p>' + fulfillmentNumber + '</p></div>\
			<div id="contract-title"><p>Contract / Ã�â€�Ã�Â¾Ã�Â³Ã�Â¾Ã�Â²Ã�Â¾Ã‘â‚¬:</p></div>\
			<div id="contract"><p>RI-130601A, 01.06.2013</p></div>\
			<div id="annex-title"><p>Annex Number / Ã�Å¸Ã‘â‚¬Ã�Â¸Ã�Â»Ã�Â¾Ã�Â¶Ã�ÂµÃ�Â½Ã�Â¸Ã�Âµ Ã�Â½Ã�Â¾Ã�Â¼Ã�ÂµÃ‘â‚¬:</p></div>\
			<div id="annex"><p>1-130601S from 01.06.2013</p></div>\
			<div id="ship-date-title">Ship Date / Ã�â€�Ã�Â°Ã‘â€šÃ�Â° Ã�Â¾Ã‘â€šÃ�Â³Ã‘â‚¬Ã‘Æ’Ã�Â·Ã�ÂºÃ�Â¸:</div>\
			<div id="ship-date">' + nullCheck(shipDateString) + '</div>'
	}
	else
	{
		html += '\
			<div id="invoice-number-title"><p>Invoice Number</p></div>\
			<div id="invoice-number"><p>' + fulfillmentNumber + '</p></div>\
			<div id="ship-date-title">Ship Date</div>\
			<div id="ship-date">' + nullCheck(shipDateString) + '</div>';
	}
	html += '\
		</div>\
	</div>\
	<div id="second-row">'
	if(action=='russian_invoice')
	{
		html += '\
			<div id="shipper"><p>Shipper / Ã�Å¾Ã‘â€šÃ�Â¿Ã‘â‚¬Ã�Â°Ã�Â²Ã�Â¸Ã‘â€šÃ�ÂµÃ�Â»Ã‘Å’:</p>' + '<br/>' + '<p>' + nullCheck(shipper) + '</p></div>\
			<div id="ship-from"><p>Ship From / Ã�ï¿½Ã�Â´Ã‘â‚¬Ã�ÂµÃ‘ï¿½ Ã�Â·Ã�Â°Ã�Â³Ã‘â‚¬Ã‘Æ’Ã�Â·Ã�ÂºÃ�Â¸:</p>' + '<br/>' + nullCheck(shipfrom) + '</p></div>\
			<div id="ship-to"><p>Ship To / Ã�Å¸Ã�Â¾Ã�Â»Ã‘Æ’Ã‘â€¡Ã�Â°Ã‘â€šÃ�ÂµÃ�Â»Ã‘Å’ Ã�Â¸ Ã�ï¿½Ã�Â´Ã‘â‚¬Ã�ÂµÃ‘ï¿½ Ã�Â´Ã�Â¾Ã‘ï¿½Ã‘â€šÃ�Â°Ã�Â²Ã�ÂºÃ�Â¸:</p>' + '<br/>' + '<p>' + nullCheck(shipto) + '</p></div>\
			<div id="bill-to"><p>Bill To / Ã�Å¸Ã�Â»Ã�Â°Ã‘â€šÃ�ÂµÃ�Â»Ã‘Å’Ã‘â€°Ã�Â¸Ã�Âº:</p>' + '<br/>' + '<p>' + nullCheck(billto) + '</p></div>';
	}
	else
	{
		html += '\
			<div id="shipper"><p>Shipper:</p>' + '<br/>' + '<p>' + nullCheck(shipper) + '</p></div>\
			<div id="ship-from"><p>Ship From:</p>' + '<br/>' + '<p>'+ nullCheck(shipfrom) +'</p></div>\
			<div id="ship-to"><p>Ship To:</p>' + '<br/>' + '<p>' + nullCheck(shipto) + '</p></div>';
		if(nativeFulfillment)
		{
			//html += '<div id="bill-to"><p>Ship To Contact:</p>' + '<br/>' + '<p>' + nullCheck(locationRecord.getFieldValue('custrecord_ship_to_contact_info')) + '</p></div>';
			if (created_From == 'TrnfrOrd') {	
				shiptocontact = nlapiLookupField('location',salesOrderRecord.getFieldValue('transferlocation'),'custrecord_ship_to_contact_info');	
			} else {	
				shiptocontact = locationRecord.getFieldValue('custrecord_ship_to_contact_info')	
			}	
			//nlapiLogExecution('DEBUG', 'RMACompId', "xyz");	
			//shiptocontact = nlapiLookupField('location',salesOrderRecord.getFieldValue('transferlocation'),'custrecord_ship_to_contact_info');	
			html += '<div id="bill-to"><p>Ship To Contact:</p>' + '<br/>' + '<p>' + nullCheck(shiptocontact) + '</p></div>';	
			//html += '<div id="bill-to"><p>Ship To Contact:</p>' + '<br/>' + '<p>' + nullCheck(salesOrderRecord.getFieldValue('custbody_ship_to_contact')) + '</p></div>';
		
		}
		else
		{
			html += '\
			<div id="bill-to"><p>Bill To:</p>' + '<br/>' + '<p>' + billto + '</p></div>';
		}
	}
	html += '\
	</div>\
	<div id="third-row">';
	// Get terms and ship method from native fulfillment. If empty, get from sales order
	var freightTerms;
	var fobTerms;
	var shipMethod;
	if (commerceFulfillment) {	
		freightTerms = commerceFulfillment.getFieldText('custbody_custom_shipping_freight_terms');	
		fobTerms = commerceFulfillment.getFieldText('custbody_po_fob');	
		shipMethod = commerceFulfillment.getFieldText('shipmethod');	
	}	
				
	if (!freightTerms) {	
		freightTerms = salesOrderRecord.getFieldText('custbody_custom_shipping_freight_terms');	
	}	
	if (!fobTerms) {	
		fobTerms = salesOrderRecord.getFieldText('custbody_po_fob');	
	}	
	if (!shipMethod) {	
		shipMethod = salesOrderRecord.getFieldText('shipmethod');	
	}	
	nlapiLogExecution('DEBUG','freightTerms - fobTerms - shipMethod', freightTerms + ' - ' + fobTerms + ' - ' + shipMethod);
	//AC commenting out for merge of commercial invoice confusion
	/*var freightTerms = salesOrderRecord.getFieldText('custbody_custom_shipping_freight_terms');
	nlapiLogExecution('DEBUG','freightTerms',freightTerms);
	if(rectype=='itemfulfillment') freightTerms = nativeFulfillment.getFieldText('custbody_custom_shipping_freight_terms');
	nlapiLogExecution('DEBUG','freightTerms',freightTerms);*/
if(action=='russian_invoice')
	{
		/*html += '\
		<div id="carriers"><p>Freight Carriers / Ã�Å¸Ã�ÂµÃ‘â‚¬Ã�ÂµÃ�Â²Ã�Â¾Ã�Â·Ã‘â€¡Ã�Â¸Ã�Âº: ' + salesOrderRecord.getFieldText('shipmethod') + '</p></div>\
		<div id="terms"><p>Freight Terms / Ã�Â£Ã‘ï¿½Ã�Â»Ã�Â¾Ã�Â²Ã�Â¸Ã‘ï¿½ Ã�Â¿Ã�Â¾Ã‘ï¿½Ã‘â€šÃ�Â°Ã�Â²Ã�ÂºÃ�Â¸: ' + freightTerms + '</p><p>Order Number / Ã�ï¿½Ã�Â¾Ã�Â¼Ã�ÂµÃ‘â‚¬ Ã�Â·Ã�Â°Ã�ÂºÃ�Â°Ã�Â·Ã�Â° : ' + salesOrderRecord.getFieldValue('tranid') + '</p></div>';
		*/
		html += '\
		<div id="carriers"><p>Freight Carriers / Ã�Å¸Ã�ÂµÃ‘â‚¬Ã�ÂµÃ�Â²Ã�Â¾Ã�Â·Ã‘â€¡Ã�Â¸Ã�Âº: ' + shipMethod + '</p></div>\
		<div id="terms"><p>Freight Terms / Ã�Â£Ã‘ï¿½Ã�Â»Ã�Â¾Ã�Â²Ã�Â¸Ã‘ï¿½ Ã�Â¿Ã�Â¾Ã‘ï¿½Ã‘â€šÃ�Â°Ã�Â²Ã�ÂºÃ�Â¸: ' + freightTerms + '</p><p>FOB Terms: ' + fobTerms + '</p><p>Order Number / Ã�ï¿½Ã�Â¾Ã�Â¼Ã�ÂµÃ‘â‚¬ Ã�Â·Ã�Â°Ã�ÂºÃ�Â°Ã�Â·Ã�Â° : ' + salesOrderRecord.getFieldValue('tranid') + '</p></div>';
	}	else
	{
		/*html += '\
		<div id="carriers"><p>Freight Carriers: ' + salesOrderRecord.getFieldText('shipmethod') + '</p><p>EIN Number: '+ vatNumber +'</p></div>\
		<div id="terms"><p>Freight Terms: ' + freightTerms + '</p></div>';
		*/
		html += '\
		<div id="carriers"><p>Freight Carriers: ' + shipMethod + '</p><p>EIN Number: '+ vatNumber +'</p></div>\
		<div id="terms"><p>Freight Terms: ' + freightTerms + '</p><p>FOB Terms: ' + fobTerms + '</p></div>';
	}
	html += '\
	</div>\
	<table>\
		<thead>\
			<tr>';
if(action=='russian_invoice')
	{
		html += '\
				<th>Line Number / Ã�Å¸Ã�Â¾Ã‘â‚¬Ã‘ï¿½Ã�Â´Ã�ÂºÃ�Â¾Ã�Â²Ã‘â€¹Ã�Â¹ Ã�Â½Ã�Â¾Ã�Â¼Ã�ÂµÃ‘â‚¬</th>\
				<th>Item / Ã�ï¿½Ã�Â°Ã�Â¸Ã�Â¼Ã�ÂµÃ�Â½Ã�Â¾Ã�Â²Ã�Â°Ã�Â½Ã�Â¸Ã�Âµ</th>\
				<th>Quantity / Ã�Å¡Ã�Â¾Ã�Â»Ã�Â¸Ã‘â€¡Ã�ÂµÃ‘ï¿½Ã‘â€šÃ�Â²Ã�Â¾</th>\
				<th>Unit of Measure</th>\
				<th>Customs Code / Ã�Å¡Ã�Â¾Ã�Â´ Ã�Â¢Ã�ï¿½ Ã�â€™Ã�Â­Ã�â€�</th>\
				<th>Unit Value / Ã�Â¡Ã‘â€šÃ�Â¾Ã�Â¸Ã�Â¼Ã�Â¾Ã‘ï¿½Ã‘â€šÃ‘Å’ Ã�Â·Ã�Â° 1 Ã‘Ë†Ã‘â€š.</th>\
				<th>Extended Value / Ã�Â¡Ã‘â€šÃ�Â¾Ã�Â¸Ã�Â¼Ã�Â¾Ã‘ï¿½Ã‘â€šÃ‘Å’ Ã�Â·Ã�Â° Ã�Â²Ã‘ï¿½Ã�Âµ Ã�ÂºÃ�Â¾Ã�Â»Ã�Â¸Ã‘â€¡Ã�ÂµÃ‘ï¿½Ã‘â€šÃ�Â²Ã�Â¾</th>';
	}
	else
	{
		html += '\
				<th>Quantity</th>\
				<th>Item</th>\
				<th>UOM</th>';
		if(!nativeFulfillment)
		{
			html += '<th>Customer PO</th>';
		}
		html += '<th>Order Number</th>';
		if(!nativeFulfillment)
		{
			html += '<th>Ship To Contact</th>';
		}
		html += '<th>Unit Value</th>\
				<th>Extended Value</th>';
	}
	html += '\
			</tr>\
		</thead>\
		<tbody>' + lineItemHtml + '</tbody>\
	</table>\
	<br/>\
	<div id=total-section>'

	var weight = 0.0;
	var uom = '';
	if(nativeFulfillment)
	{
		for(var i=1; i<=nativeFulfillment.getLineItemCount('package'); i++)
		{
			var w = nativeFulfillment.getLineItemValue('package','packageweight',i);
			if(w) weight += parseFloat(w);
		}
		weight = Math.round(weight*100)/100;
	}
	else{
		weight = fulfillmentRecord.getFieldValue('custrecord_custom_shipping_weight');
		uom = fulfillmentRecord.getFieldText('custrecord_custom_weight_uom');
		totalQuantity = fulfillmentRecord.getFieldValue('custrecord_total_packages');
	}
	if(weight == null || weight == ''){

		weight = 0.0;

	}



	if(action=='russian_invoice')
	{
		html += '\
		<div id="total-left"><p>Total/Ã�â€™Ã‘ï¿½Ã�ÂµÃ�Â³Ã�Â¾ Packages: '+ totalQuantity +'</p></div>\
		<div id="total-middle"><p>Total weight/Ã�Å¾Ã�Â±Ã‘â€°Ã�Â¸Ã�Â¹ Ã�Â²Ã�ÂµÃ‘ï¿½: '+ weight +'</p></div>\
		<div id="total-right"><p>USD Total Value/Ã�Â¡Ã‘â€šÃ�Â¾Ã�Â¸Ã�Â¼Ã�Â¾Ã‘ï¿½Ã‘â€šÃ‘Å’ Ã�Â²Ã‘ï¿½Ã�ÂµÃ�Â³Ã�Â¾: $'+ nlapiFormatCurrency(totalValue) +'</p></div>';
	}
		else
	{
		if(nativeFulfillment)
		{
		html += '\
		<div id="total-left"><p>Total Packages: '+ totalQuantity +'</p></div>\
		<div id="total-middle"><p>Total weight: '+ weight +'</p></div>\
		<div id="total-right"><p>USD Total Value: $'+ nlapiFormatCurrency(totalValue) +'</p></div>';
		}
		else{

				html += '\
				<div id="total-left"><p>Total Packages: '+ totalQuantity +'</p></div>\
				<div id="total-middle"><p>Total weight: '+ weight +' ' + uom + '</p></div>\
				<div id="total-right"><p>USD Total Value: $'+ nlapiFormatCurrency(totalValue) +'</p></div>';
		}
	}
	html += '\
	</div>\
	<br/>\
	<div id="footer">'
	var nldloc = '';
	if(orderType == RMA_SALES_ORDER_TYPE || orderType == INTERNAL_SALES_ORDER_TYPE){
	var shipFromCountry = locationRecord.getFieldValue('country');
	/*if(shipFromCountry == 'NL') {
		var shipToCountry = salesOrderRecord.getFieldValue('shipcountry');
		nlapiLogExecution('DEBUG','ship from country',shipFromCountry);
		nlapiLogExecution('DEBUG','ship to country',shipToCountry);	
		var filters = new Array();	
		filters.push(new nlobjSearchFilter('custrecord_look_up_country_code', '', 'is', shipToCountry));
		var columns = new Array();
		columns.push(new nlobjSearchColumn('custrecord_look_up_country_code'));
		columns.push(new nlobjSearchColumn('custrecord_look_up_region'));
		var searchLocRes = nlapiSearchRecord('customrecord_location_look_up',null,filters,columns);
		if(searchLocRes) {
			nlapiLogExecution('DEBUG','searchLocRes length',searchLocRes.length);		
			var region = searchLocRes[0].getValue('custrecord_look_up_region');
			nlapiLogExecution('DEBUG','region',region);
			if(region == '2')
				//nldloc += '<br/><p><b>Please Note : </b>Ã¢â‚¬Å“Shipment is sent free of charge. Value for customs purposes only.Ã¢â‚¬ï¿½ </p>';
			    nldloc += '<br/><p><b>Please Note : </b>Shipment is sent free of charge. Value for customs purposes only.</p>';
		}
	}	*/
	
	nldloc += '<br/><p><b>Please Note : </b>Shipment is sent free of charge. Value for customs purposes only.</p>';
	nlapiLogExecution('DEBUG','nldloc',nldloc);
}
if(action=='russian_invoice')
	{
		html += nldloc;
		html += '			<br/><p>FREE OF CHARGE DELIVERY. THE PRICE IS MENTIONED ONLY FOR CUSTOMS PURPOSES.</p><br/>\
		<p>I declare that all information contained in this Invoice is True and Correct. Ã�ï¿½Ã�Â°Ã‘ï¿½Ã‘â€šÃ�Â¾Ã‘ï¿½Ã‘â€°Ã�Â¸Ã�Â¼ Ã�Â¿Ã�Â¾Ã�Â´Ã‘â€šÃ�Â²Ã�ÂµÃ‘â‚¬Ã�Â¶Ã�Â´Ã�Â°Ã‘Å½, Ã‘â€¡Ã‘â€šÃ�Â¾ Ã�Â²Ã‘ï¿½Ã‘ï¿½ Ã�Â¸Ã�Â½Ã‘â€žÃ�Â¾Ã‘â‚¬Ã�Â¼Ã�Â°Ã‘â€ Ã�Â¸Ã‘ï¿½ Ã‘ï¿½Ã�Â¾Ã�Â´Ã�ÂµÃ‘â‚¬Ã�Â¶Ã�Â°Ã‘â€°Ã�Â°Ã‘ï¿½Ã‘ï¿½Ã‘ï¿½ Ã�Â² Ã‘ï¿½Ã‘â€šÃ�Â¾Ã�Â¼ Ã‘ï¿½Ã‘â€¡Ã�ÂµÃ‘â€šÃ�Âµ Ã�Â´Ã�Â¾Ã‘ï¿½Ã‘â€šÃ�Â¾Ã�Â²Ã�ÂµÃ‘â‚¬Ã�Â½Ã�Â° Ã�Â¸ Ã�ÂºÃ�Â¾Ã‘â‚¬Ã‘â‚¬Ã�ÂµÃ�ÂºÃ‘â€šÃ�Â½Ã�Â°.</p><br/>\
		<p>Signature of Shipper/Exporter:_________________________________ Date: _________________</p></br>\
		<p>Ã�Å¸Ã�Â¾Ã�Â´Ã�Â¿Ã�Â¸Ã‘ï¿½Ã‘Å’ Ã�Å¾Ã‘â€šÃ�Â¿Ã‘â‚¬Ã�Â°Ã�Â²Ã�Â¸Ã‘â€šÃ�ÂµÃ�Â»Ã‘ï¿½/Ã�Â­Ã�ÂºÃ‘ï¿½Ã�Â¿Ã�Â¾Ã‘â‚¬Ã‘â€šÃ�ÂµÃ‘â‚¬Ã�Â°:_________________________________ Ã�â€�Ã�Â°Ã‘â€šÃ�Â°: _________________</p></br>';
	}
	else{
		
		// Add Packing instructions if populated 	+		html += nldloc;				
		var packingInstr = salesOrderRecord.getFieldValue('custbody_packing_instructions');	
		if (packingInstr) {	
			packingInstr = '<b>Final Destination Country : </b>' + packingInstr + '<br/><br/>';	
		}	
		else {	
			packingInstr = '';	
		}	
			
		// NSTE-5548	
		//		<br/><p><b>Please Note : </b>Shipment is sent free of charge. Value for customs purposes only.</p><br/>\	
		html += nldloc;		
					
		html += '\
		<br/>\
		<br/><p>' + packingInstr + 'These items are controlled by the U.S. Government and authorized for export only to the country of ultimate destination for use by the ultimate consignee or end-user(s) herein identified. They may not be resold, transferred, or otherwise disposed of, to any other country or to any person other than the authorized ultimate consignee or end-user(s), either in their original form or after being incorporated into other items, without first obtaining approval from the U.S. government or as otherwise authorized by U.S. law and regulations.</p><br/>\
		<p>Lifesize, Inc. has reviewed all available documentation and has determined that none of the cargo being offered in this\
		consignment or consolidation either originated from, or transited through any point in Egypt, Syria, Somalia or Yemen.</p><br/>\
		<p>I declare that all information contained in this Invoice is True and Correct.</p>\
		<br/><p>Signature of Shipper/Exporter:_________________________________ Date: _________________</p></br>';
	}	
	html += '\
	</div>\
	</div>';

  invoiceForm.setScript('customscript_russian_commercial_invoice');
  invoiceHtml.setDefaultValue(html);
  response.writePage(invoiceForm);
}


function invoiceButtonUrl(action, dim){
  var salesorderid, id, url;
  id = nlapiGetRecordId();
  if(nlapiGetRecordType()=='itemfulfillment')
  {
	salesorderid = nlapiGetFieldValue('createdfrom');
  }
  else
  {
	salesorderid = nlapiLookupField('customrecord_custom_fulfillment', id, 'custrecord_fulfillment_so_no');
  }
  nlapiLogExecution("DEBUG", "fulfillment in button function: ", id);
  // dim = JSON.stringify(dim);
  url = nlapiResolveURL('SUITELET', INVOICE_SUITELET_ID, SUITELET_DEPLOYMENT_ID) + '&salesorderid=' + salesorderid + '&fulfillmentid=' +id + '&action=' + action + '&rectype=' + nlapiGetRecordType();
  openWindow(url, JSON.parse(dim));
}

function addInvoiceSuiteletButtons(invoiceButtons, invoiceForm){
  var numButtons = invoiceButtons.length;
  for(var i = 0; i < numButtons; i++){
    var actionString, dim, dimString, button_function;
    actionString = encodeURI(invoiceButtons[i].action);
    dim = JSON.stringify(invoiceButtons[i].dim);
    dimString = encodeURI(dim);
    button_function = 'invoiceButtonUrl(decodeURI(\'' + actionString + '\'), decodeURI(\'' +  dimString + '\'))';
    invoiceForm.addButton(invoiceButtons[i].id, invoiceButtons[i].label, button_function);
  }
}

function printInvoiceButton(type, invoiceForm){
	nlapiLogExecution('DEBUG', 'Button Add Start');
  if(type != 'delete' && type != 'create'){
    var salesorderid, salesOrderRecord, salesOrderForm, fulfillmentid, fulfillmentRecord, customerid, subsidiary, russianInvoiceButton, commercialInvoiceButton, rmaInvoiceButton;
    russianInvoiceButton = [
      {id:'custpage_russian_invoice_suitelet', label:'Print Russian Invoice', action: 'russian_invoice', dim:{centerW:0, centerH:0, mainW:1280, mainH:640}}
    ];
    rmaInvoiceButton = [
      {id:'custpage_rma_invoice_suitelet', label:'Print RMA Invoice', action: 'rma_invoice', dim:{centerW:0, centerH:0, mainW:1280, mainH:640}}
    ];
    commercialInvoiceButton = [
      {id:'custpage_commerical_invoice_suitelet', label:'Print Commercial Invoice', action: 'commercial_invoice', dim:{centerW:0, centerH:0, mainW:1280, mainH:640}}

    ];

	if(nlapiGetRecordType()=='itemfulfillment')
	{
		var createdfrom = nlapiGetFieldValue('createdfrom');
		type = nlapiLookupField('transaction',createdfrom,'type');
		if(type!='TrnfrOrd' && type != 'SalesOrd') return;//*
		addInvoiceSuiteletButtons(commercialInvoiceButton, invoiceForm);
	}
	else
	{
		fulfillmentid = nlapiGetRecordId();
		fulfillmentRecord = nlapiLoadRecord('customrecord_custom_fulfillment', fulfillmentid);
		customerid = fulfillmentRecord.getFieldValue('custrecord_customer');
		salesorderid = fulfillmentRecord.getFieldValue('custrecord_fulfillment_so_no');
		// salesOrderRecord = nlapiLoadRecord('salesorder', salesorderid);
		// subsidiary = salesOrderRecord.getFieldValue('subsidiary');
		salesOrderForm = nlapiLookupField('salesorder', salesorderid, 'customform');

		// if the customer is 14293 AHLERS RUS
		if (customerid == RUSSIAN_CUSTOMER) {
		  addInvoiceSuiteletButtons(russianInvoiceButton, invoiceForm);
		}
		else {
		  addInvoiceSuiteletButtons(commercialInvoiceButton, invoiceForm);
		}

		// if it is an RMA order
		if (salesOrderForm == RMA_ORDER_FORM) {
			nlapiLogExecution('DEBUG', 'Order Form', salesOrderForm);
			addInvoiceSuiteletButtons(rmaInvoiceButton, invoiceForm);
		}
	}
      //custom clientside script
      invoiceForm.setScript('customscript_russian_invoice_client');
  }
}

// function getItemInfo(itemArr){

	// var itemSerialInfoContainer = {};
	// var itemSerialInfo = {};
	// nlapiLogExecution('DEBUG', 'Item Arr', itemArr);
	// var filters = [new nlobjSearchFilter('internalid', null, 'anyof', itemArr)];

	// var columns = [new nlobjSearchColumn('custitem_eccn_number'),
						 // new nlobjSearchColumn('custitem_tariff_code'),
						 // new nlobjSearchColumn('custitem_country_of_origin')];

	// var res = nlapiSearchRecord('item', null, filters, columns);

	// for(var i = 0; i < res.length; i++){

		// itemSerialInfoContainer[res[i].getId()] = itemSerialInfo = {

			// cntryoforig: res[i].getText('custitem_country_of_origin'),
			// tariffcode: res[i].getValue('custitem_tariff_code'),
			// eccnnum: res[i].getValue('custitem_eccn_number')

		// }
	// }

	// return itemSerialInfoContainer;
// }

function nullCheck(val){
	if(val == null)
		return '';
	else
		return val;

}

function getShipFromAddrLine4(locId){
var cols = new  nlobjSearchColumn('custrecord_addr4', 'address', null, 'label=Addr4', 'type=text');
var filts = new nlobjSearchFilter('internalid', null,'is',locId); 
var search = nlapiCreateSearch('location',filts,cols);
var res = search.runSearch();
var line4 = null;
var cols = res.getColumns();
res.forEachResult(function (rec){
line4 = rec.getValue(cols[0]);
return true;
});
nlapiLogExecution('DEBUG','ship form l4 create search',line4);
return line4;
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