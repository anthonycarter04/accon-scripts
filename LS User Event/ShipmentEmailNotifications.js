/*
*
*	This script controls the RMA and Sales Order shipment notifications. 
*
*	Created By: Christopher J. Cannata
*	
*	Edited by: Christopher J. Cannata, Technical Analyst
*	9/30/2015 10:25 AM
*	Added tracking info validation, as this email should not be sent if tracking info is not on the order. 
*
*	Edited by: Christopher J. Cannata, Technical Analyst
*	10/14/2015 11:25 AM
*	Added more enhanced ship customer and pricing parameters. 
*
*
*/

var EMPLOYEE_SEND_EMAIL='92928';
var RMA_EMPLOYEE_SEND_EMAIL='108788';
var CONTACT_CATEGORY = '8';
var SO_FORM_TYPE = '102';
var GDP_ORDER_TYPE = '3';


function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function sendCustomFulfillmentEmails(type){
   nlapiLogExecution('DEBUG', 'Function Called Send Shipment Email')
  
   var rec = nlapiLoadRecord('customrecord_custom_fulfillment', nlapiGetRecordId());
   status = rec.getFieldValue('custrecord_fulfillment_status');
   nlapiLogExecution('DEBUG', 'Function Called Status', status);
   var ASNNumber = rec.getFieldValue('name');
   var context = nlapiGetContext()

   var status;
   var contactemails = [];
   var lineID;
   var assyitem;
   var component;
   var componentname;
   var componentdescription;
   var assyserialnumber;
   var qtyneeded;
   var qtypicked;
   var serialnumber;
   var itemnumber;
   var groupitem;
   var parentItem = [];
   var componentItems = '';
 
   // If status is fulfilled (aka value of 4), data will be grabbed and processed
  
    if (status == 4) {
  
	    // This will be used to grab all the Sales Order data associated with the custom fulfillment
		
	    var SalesOrder = rec.getFieldValue('custrecord_fulfillment_so_no')
		
	    // This will load the Sales Order record in script, can be used to get other field values
		
        var sorec = nlapiLoadRecord('salesorder', SalesOrder);
        nlapiLogExecution('DEBUG', 'Function Called SO Number', sorec);
		
		// This will save Sales Order Number from the SO record into a SONumber variable
		
        var SOnumber = sorec.getFieldValue('tranid');
        nlapiLogExecution('DEBUG', 'Function Called Sales Order Number', 'Sales Order Number: ' + SOnumber);
		
		// This will save Sales Order Customer name from the SO record into a variable
		
        var SOcustomer = sorec.getFieldValue('entity');
        nlapiLogExecution('DEBUG', 'Function Called Sales Order Customer', 'Sales Order Customer Name: ' + SOcustomer)
		
		// This will save Purchase Order Number from the SO record into a variable
		
        var POnumber = sorec.getFieldValue('otherrefnum');
        nlapiLogExecution('DEBUG', 'Function Called Purchase Order Number', 'Purchase Order Number: ' + POnumber)
		
		// Name of the customer - this will be used on the email notification
		
		var CustomerName = nlapiLoadRecord('customer', SOcustomer).getFieldValue('companyname');
		nlapiLogExecution('DEBUG', 'Function Called Customer Name', CustomerName);
		
		// Form type set on the Sales Order 
		
		var SOFormType = sorec.getFieldValue('customform')
		nlapiLogExecution('DEBUG', 'Function Called Form Type', SOFormType);
		
		// This will be used to hold the array data for the search filter - the search filter is designed to find the customer contact info from the Sales Order
		
		var filters = new Array();
		var columns = new Array();
		filters.push(new nlobjSearchFilter('internalid',null,'anyof',SOcustomer));
		filters.push(new nlobjSearchFilter('category','contact','anyof', CONTACT_CATEGORY));
        columns.push(new nlobjSearchColumn('email','contact'));
	    var contactdetail = nlapiSearchRecord('customer', null, filters, columns);
		nlapiLogExecution('DEBUG', 'SearchRecord1');
		if (contactdetail != '' && contactdetail != null){
			for (i=0; i < contactdetail.length; i++) {
				var contactemail = contactdetail[i].getValue('email', 'contact');
				nlapiLogExecution('DEBUG', 'Contact Info is: ', contactemail)
				if (contactemail != "") {
					contactemails.push(contactemail);
				}
			}
		}
		nlapiLogExecution('DEBUG', 'Function Called Contact Emails', contactemails);
		
		// This will be used to find all email addresses that meet criteria on the Notification Look-Up table for the Sales Order
		
		var region = sorec.getFieldValue('custbody14');
		nlapiLogExecution('DEBUG', 'Function Called Region Lookup','Region: ' + region);
		if (region != '' && region != null) {
			var filters = new Array();
			filters[0] = new nlobjSearchFilter('custrecord_notification_region', null, 'is', region);
			// -- return opportunity sales rep, customer custom field, and customer ID
			var columns = new Array();
			columns[0] = new nlobjSearchColumn('custrecord_notification_email');
			columns[1] = new nlobjSearchColumn('custrecord_ship_confirmation');
			columns[2] = new nlobjSearchColumn('custrecord_notification_region');
			var searchresults = nlapiSearchRecord('customrecord_notification_lookup', null, filters, columns);
			nlapiLogExecution('DEBUG', 'SearchRecord2');
			var searchresults2 = JSON.stringify(searchresults);
			for (var i = 0; searchresults != null && i < searchresults.length; i++){
				if (searchresults[i].getValue('custrecord_ship_confirmation') != 'F') {
					contactemails.push(searchresults[i].getValue('custrecord_notification_email'));
					nlapiLogExecution('DEBUG', 'Email Address Added', 'Email: ' + contactemails);
				}
			}
		}

		contactemails.push('shipments@lifesize.com');
		
		// The following code will be used to grab all the information from the data field on the custom fulfilment record. 
		
		var data = rec.getFieldValue('custrecord_fulfillment_data');
		nlapiLogExecution('DEBUG', 'Function Called Data', data);
		
		// This will parse the data array from the custom fulfillment record into a JSON object.
		
		var dataObj = JSON.parse(data);
		//nlapiLogExecution('DEBUG', 'Function Called Data Object', 'Data Object ' + dataObj);
        var oldObj = dataObj;
		
		// This will parse through the data object from the custom fulfillment and assign all the information into arrays. 
		
		if (SOFormType != SO_FORM_TYPE){

		
			for (i=0; i < dataObj.length; i++){

				nlapiLogExecution('DEBUG', 'UsageRemaining', context.getRemainingUsage())
				if (oldObj.lineid != dataObj[i].lineid){
					oldObj = dataObj[i];
					lineID = dataObj[i].lineid;
					linenumber = dataObj[i].linenumber;
					assyitem = dataObj[i].assyitem;
					component = dataObj[i].component;
					componentdescription = dataObj[i].componentdescription;
					assyserialnumber = dataObj[i].assyserialnumber;
					qtyneeded = dataObj[i].qtyneeded;
					qtypicked = dataObj[i].qtypicked;
					serialnumber = dataObj[i].serialnumber;
					itemnumber = dataObj[i].itemnumber;
					groupitem = dataObj[i].groupitem;

					itemFields = nlapiLookupField('item', dataObj[i].assyitem, ['description', 'itemid']);
					
					assemblyproduct = itemFields.itemid;
					assemblyproductdescription = itemFields.description;
					nlapiLogExecution('DEBUG', 'LoadRecord1');
					
					if (linenumber != ''){
						
						var lineCount = sorec.getLineItemCount('item');
						for (var nn=1; nn<=lineCount; nn++) {
							if (linenumber == sorec.getLineItemValue('item', 'custcol_line_id', nn)) {
								
								
								//AC BIZ-543 Bundle Support
								var groupParent = sorec.getLineItemValue('item', 'custcol_group_parent', nn);
								Util.console.log(groupParent, 'groupParent');
								if (groupParent && groupParent != '') {
									
									
									for (var jj=nn; jj>= 1; jj--) {
										var loopItemGroup = sorec.getLineItemValue('item', 'custcol_group_parent', jj);
										if (!loopItemGroup || loopItemGroup == '') {
											assemblyproductdescription = sorec.getLineItemValue('item', 'description', jj);
											break;
										}
									}
									rate = 0;
									
									for (var kk=nn; kk<=lineCount; kk++) {
										
										var itemName = sorec.getLineItemValue('item', 'item', kk);
										Util.console.log(itemName, 'itemName');
										if (itemName == 0 || itemName == '0') { //i.e End of Group or "None"
											break;
										} else {
											rate += parseFloat(sorec.getLineItemValue('item', 'rate', kk));
											amount = parseFloat(rate * qtypicked);
											amount = round(amount, 2);
										}
										
									}
									
									break;
								} else {
									rate = sorec.getLineItemValue('item', 'rate', nn)
									amount = parseFloat(rate * qtypicked)
									amount = round(amount, 2);
									break;
								}
								//END AC BIZ-543 Support
								
								
							} else {
								rate = '0.0'
								amount = '0.0'
							}
						}
						
						
					}
					else{
						rate = '0.0'
						amount = '0.0'
					}
					componentItems += '</table>'
					componentItems += '<br>' + '<table border="1"><tr><td colspan="3">Product</td><td colspan="5">Description</td><td colspan="4">Serial Number</td><td colspan="3">Qty</td><td colspan="3">Price</td><td colspan="3">Amount</td></tr>' + 
									  '<tr><td colspan="3">' + assemblyproduct + '</td><td colspan="5">' + assemblyproductdescription + '</td><td colspan="4">' + assyserialnumber + '</td><td colspan="3">' + qtypicked + '</td><td colspan="3">' + rate + '</td><td colspan="3">' + amount + '</td></tr></table>'
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-1');
					if (i < (dataObj.length - 1)) {
						componentItems += ' ' + ' ' + '<b> Components: </b>'
						componentItems += '<br><br>' + '<table border="1"><tr><td colspan="6">Product</td><td colspan="8">Description</td><td colspan="7">Serial Number</td></tr>'
						if (dataObj[i].serialnumber != "Not Required") {
						componentItems += '<tr><td colspan="6">' + itemnumber + '</td><td colspan="8">' + componentdescription + '</td><td colspan="7">' + serialnumber + '</td></tr>'
						}
						//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-2');
					}
					else if (i == (dataObj.length - 1)) {
						componentItems += '</table>'
						//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-3');
					}
					else {
						//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-4');
					}
					//nlapiLogExecution('DEBUG', 'Function Called Full Email Components', 'Unique Parent Items ' + componentItems);
				}
				else if (oldObj.lineid == dataObj[i].lineid && dataObj[i].serialnumber != "Not Required" && (i < (dataObj.length - 1))){
					lineID = dataObj[i].lineid;
					linenumber = dataObj[i].linenumber;
					assyitem = dataObj[i].assyitem;
					component = dataObj[i].component;
					componentdescription = dataObj[i].componentdescription;
					assyserialnumber = dataObj[i].assyserialnumber;
					qtyneeded = dataObj[i].qtyneeded;
					qtypicked = dataObj[i].qtypicked;
					serialnumber = dataObj[i].serialnumber;
					itemnumber = dataObj[i].itemnumber;
					groupitem = dataObj[i].groupitem;
					oldObj = dataObj[i];
					//nlapiLogExecution('DEBUG', 'Function Called Object', ' Object ' + oldObj);
					var lineCount = sorec.getLineItemCount('item');
					for (var nn=1; nn<=lineCount; nn++) {
						if (linenumber == sorec.getLineItemValue('item', 'custcol_line_id', nn)) {
							rate = sorec.getLineItemValue('item', 'rate', nn)
							amount = parseFloat(rate * qtypicked)
							amount = round(amount, 2);
							break;
						} else {
							rate = '0.0'
							amount = '0.0'
						}
					}
					//rate = sorec.getLineItemValue('item', 'rate', linenumber)
					amount = (rate * qtypicked)
					componentItems += '<tr><td colspan="6">' + itemnumber + '</td><td colspan="8">' + componentdescription + '</td><td colspan="7">' + serialnumber + '</td></tr>'
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 2-1');
					
				}
				else if (oldObj.lineid == dataObj[i].lineid && dataObj[i].serialnumber != "Not Required" && (i = (dataObj.length - 1))){
					lineID = dataObj[i].lineid;
					linenumber = dataObj[i].linenumber;
					assyitem = dataObj[i].assyitem;
					component = dataObj[i].component;
					componentdescription = dataObj[i].componentdescription;
					assyserialnumber = dataObj[i].assyserialnumber;
					qtyneeded = dataObj[i].qtyneeded;
					qtypicked = dataObj[i].qtypicked;
					serialnumber = dataObj[i].serialnumber;
					itemnumber = dataObj[i].itemnumber;
					groupitem = dataObj[i].groupitem;
					oldObj = dataObj[i];
					//nlapiLogExecution('DEBUG', 'Function Called Object', ' Object ' + oldObj);
					
                                        if (linenumber != ''){
                                        	var lineCount = sorec.getLineItemCount('item');
                        					for (var nn=1; nn<=lineCount; nn++) {
                        						if (linenumber == sorec.getLineItemValue('item', 'custcol_line_id', nn)) {
                        							rate = sorec.getLineItemValue('item', 'rate', nn)
                        							amount = parseFloat(rate * qtypicked)
                        							amount = round(amount, 2);
                        							break;
                        						} else {
                        							rate = '0.0'
                        							amount = '0.0'
                        						}
                        					}
						//rate = sorec.getLineItemValue('item', 'rate', linenumber)
						//amount = parseFloat(rate * qtypicked)
						//amount = round(amount, 2);
					}
					else{
						rate = '0.0'
						amount = '0.0'
					}					
                       componentItems += '<tr><td colspan="6">' + itemnumber + '</td><td colspan="8">' + componentdescription + '</td><td colspan="7">' + serialnumber + '</td></tr></table>'
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 3-1');
				}
				else if (oldObj.lineid == dataObj[i].lineid && dataObj[i].serialnumber == "Not Required" && (i == (dataObj.length - 1))){
					componentItems += '</table>'
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 4-1');
				}
				else{
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 5-1');
				}
			}
			//nlapiLogExecution('DEBUG', 'Function Called Full Shipment Reached', '');
			
			var ShipCustomer = sorec.getFieldText('custbody_ship_customer_filtered')
			//var ShipCustomerText = nlapiLoadRecord('customer', ShipCustomer).getFieldValue('companyname') 

                        // If regular ship customer is empty, find from another field
                        if (ShipCustomer == '' || ShipCustomer == null){
                           ShipCustomer = sorec.getFieldText('custbody_ship_to_customer')
                        }

			var ShipCustomerAddress = sorec.getFieldValue('shipaddress')
		//	var ShipDate = rec.getFieldValue('custrecord_fulfillment_date') 
			var ShipDate = nlapiLookupField('salesorder',SalesOrder,'actualshipdate');//rec.getFieldValue('actualshipdate'); // actual ship date..
			nlapiLogExecution('DEBUG', 'Lookup1');
			nlapiLogExecution('DEBUG', 'ShipDate', ShipDate);
			var TrackingInfo = rec.getFieldValue('custrecord_fulfillment_tracking_no')
			var ShipCarrier = sorec.getFieldText('shipmethod')
			var OrderType = sorec.getFieldValue('custbody_tno_order_type')
			
			if (ShipCarrier == null){
				ShipCarrier = '';
			}
			
			if (TrackingInfo == null){
				TrackingInfo = '';
			}
			
			if (OrderType == GDP_ORDER_TYPE) {
				contactemails.push('gdp@lifesize.com');
			}
			else{
			}
		
			var body = 

			'To our valued customer:' + '<br><br>' +
			'Lifesize has shipped the following product:' + '<br><br>' +
			'Lifesize Customer: ' + CustomerName + '<br>' + 
			'Ship To Customer: ' + ShipCustomer + '<br>' +
			'Ship To Address: ' + ShipCustomerAddress + '<br>' +
			'Ship Date: ' + ShipDate + '<br>' +
			'Freight Carrier: ' + ShipCarrier + '<br>' +
			'Tracking Number: ' + TrackingInfo + '<br>' +
			'Fulfillment Number: ' + ASNNumber + '<br><br>' +
			'<u>Shipment Detail </u>___________________________________________________________________________' + '<br>' +
			'<b>Purchase Order: </b> ' + POnumber + '<br>' +
			'<b>Sales Order: </b> ' + SOnumber + '<br>' +
			' ' + componentItems + '<br>' +
			'<br><b>Please note:</b> Tracking information will not be available immediately, it may take up to 24 hours for this information to become available on carriers website.<br><br>' +
			'Thank you,<br><br>' +
			'Ken Grant <br>' +
			'World Wide Logistics Manager <br>' +
			'Lifesize';
            //nlapiLogExecution('DEBUG', 'Function Called Body Reached', body);
			var subject = 'FYI: Lifesize Shipment - ' + CustomerName + ' Sales Order: ' + SOnumber+ ' Purchase Order: ' + POnumber;
            //nlapiLogExecution('DEBUG', 'Function Called Subject Reached', subject);
			
			//create object of record ids to attach THIS email to.
			//When you do this, this email will show up under
			//communication tab of record(s) you attached this email to.
			var attachRec = new Object();
			attachRec['transaction'] = SalesOrder; //attach email to Sales Order record

            if (contactemails != "" && TrackingInfo != "") {
                nlapiSendEmail(EMPLOYEE_SEND_EMAIL, contactemails, subject, body, 'shipments@lifesize.com', null, attachRec, null)
                //nlapiLogExecution('DEBUG', 'Function Called Subject Reached');
			}
			else{
            }
		}
		
		if (SOFormType == SO_FORM_TYPE){
			nlapiLogExecution('DEBUG', 'UsageRemaining', context.getRemainingUsage())
			nlapiLogExecution('DEBUG', 'Function Called RMA Reached', '');
			
			for (i=0; i < dataObj.length; i++){
				if (oldObj.lineid != dataObj[i].lineid){
					oldObj = dataObj[i];
					lineID = dataObj[i].lineid;
					linenumber = dataObj[i].linenumber;
					assyitem = dataObj[i].assyitem;
					component = dataObj[i].component;
					componentdescription = dataObj[i].componentdescription;
					assyserialnumber = dataObj[i].assyserialnumber;
					qtyneeded = dataObj[i].qtyneeded;
					qtypicked = dataObj[i].qtypicked;
					serialnumber = dataObj[i].serialnumber;
					itemnumber = dataObj[i].itemnumber;
					groupitem = dataObj[i].groupitem;
					
					if (linenumber != ''){
						
						var lineCount = sorec.getLineItemCount('item');
    					for (var nn=1; nn<=lineCount; nn++) {
    						if (linenumber == sorec.getLineItemValue('item', 'custcol_line_id', nn)) {
    							rate = sorec.getLineItemValue('item', 'rate', nn)
    							amount = parseFloat(rate * qtypicked)
    							amount = round(amount, 2);
    							break;
    						} else {
    							rate = '0.0'
    							amount = '0.0'
    						}
    					}
						//rate = sorec.getLineItemValue('item', 'rate', linenumber)
						//amount = parseFloat(rate * qtypicked)
						//amount = round(amount, 2);
					}
					else{
						rate = '0.0'
						amount = '0.0'
					}
					componentItems += '</table>'
					componentItems += '<br>' + '<table border="1"><tr><td colspan="3">Product</td><td colspan="5">Description</td><td colspan="4">Serial Number</td><td colspan="3">Qty</td><td colspan="3">Price</td><td colspan="3">Amount</td></tr>' + 
									  '<tr><td colspan="3">' + itemnumber + '</td><td colspan="5">' + componentdescription + '</td><td colspan="4">' + serialnumber + '</td><td colspan="3">' + qtypicked + '</td><td colspan="3">' + rate + '</td><td colspan="3">' + amount + '</td></tr></table>'
					nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-1');
					if (i < (dataObj.length - 1)) {
						componentItems += ' ' + ' ' + '<b> Components: </b>'
						componentItems += '<br><br>' + '<table border="1"><tr><td colspan="6">Product</td><td colspan="8">Description</td><td colspan="7">Serial Number</td></tr>'
						if (dataObj[i].serialnumber != "Not Required") {
						componentItems += '<tr><td colspan="6">' + itemnumber + '</td><td colspan="8">' + componentdescription + '</td><td colspan="7">' + serialnumber + '</td></tr>'
						}
						//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-2');
					}
					else if (i == (dataObj.length - 1)) {
						componentItems += '</table>'
						//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-3');
					}
					else {
						//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 1-4');
					}
					nlapiLogExecution('DEBUG', 'Function Called Full Email Components', 'Unique Parent Items ' + componentItems);
				}
				else if (oldObj.lineid == dataObj[i].lineid && dataObj[i].serialnumber != "Not Required" && (i < (dataObj.length - 1))){
					lineID = dataObj[i].lineid;
					linenumber = dataObj[i].linenumber;
					assyitem = dataObj[i].assyitem;
					component = dataObj[i].component;
					componentdescription = dataObj[i].componentdescription;
					assyserialnumber = dataObj[i].assyserialnumber;
					qtyneeded = dataObj[i].qtyneeded;
					qtypicked = dataObj[i].qtypicked;
					serialnumber = dataObj[i].serialnumber;
					itemnumber = dataObj[i].itemnumber;
					groupitem = dataObj[i].groupitem;
					oldObj = dataObj[i];
					//nlapiLogExecution('DEBUG', 'Function Called Object', ' Object ' + oldObj);
					var lineCount = sorec.getLineItemCount('item');
					for (var nn=1; nn<=lineCount; nn++) {
						if (linenumber == sorec.getLineItemValue('item', 'custcol_line_id', nn)) {
							rate = sorec.getLineItemValue('item', 'rate', nn)
							amount = parseFloat(rate * qtypicked)
							amount = round(amount, 2);
							break;
						} else {
							rate = '0.0'
							amount = '0.0'
						}
					}
					//rate = sorec.getLineItemValue('item', 'rate', linenumber)
					//amount = (rate * qtypicked)
					componentItems += '<tr><td colspan="6">' + itemnumber + '</td><td colspan="8">' + componentdescription + '</td><td colspan="7">' + serialnumber + '</td></tr>'
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 2-1');
					
				}
				else if (oldObj.lineid == dataObj[i].lineid && dataObj[i].serialnumber != "Not Required" && (i = (dataObj.length - 1))){
					lineID = dataObj[i].lineid;
					linenumber = dataObj[i].linenumber;
					assyitem = dataObj[i].assyitem;
					component = dataObj[i].component;
					componentdescription = dataObj[i].componentdescription;
					assyserialnumber = dataObj[i].assyserialnumber;
					qtyneeded = dataObj[i].qtyneeded;
					qtypicked = dataObj[i].qtypicked;
					serialnumber = dataObj[i].serialnumber;
					itemnumber = dataObj[i].itemnumber;
					groupitem = dataObj[i].groupitem;
					oldObj = dataObj[i];
					//nlapiLogExecution('DEBUG', 'Function Called Object', ' Object ' + oldObj);
					
					var lineCount = sorec.getLineItemCount('item');
					for (var nn=1; nn<=lineCount; nn++) {
						if (linenumber == sorec.getLineItemValue('item', 'custcol_line_id', nn)) {
							rate = sorec.getLineItemValue('item', 'rate', nn)
							amount = parseFloat(rate * qtypicked)
							amount = round(amount, 2);
							break;
						} else {
							rate = '0.0'
							amount = '0.0'
						}
					}
					//rate = sorec.getLineItemValue('item', 'rate', linenumber)
					//amount = (rate * qtypicked)
					componentItems += '<tr><td colspan="6">' + itemnumber + '</td><td colspan="8">' + componentdescription + '</td><td colspan="7">' + serialnumber + '</td></tr></table>'
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 3-1');
				}
				else if (oldObj.lineid == dataObj[i].lineid && dataObj[i].serialnumber == "Not Required" && (i == (dataObj.length - 1))){
					componentItems += '</table>'
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 4-1');
				}
				else{
					//nlapiLogExecution('DEBUG', 'Function Called Path Cycle', 'Path DEBUG Cycle: Path 5-1');
				}
			}
			
			contactemails.push('LSTech@lifesize.com');

                        var Case = sorec.getFieldValue('custbody_transaction_case')
			//nlapiLogExecution('DEBUG', 'Function Called Case', Case);
                        var ShipCustomer = nlapiLoadRecord('supportcase', Case).getFieldValue('custevent_case_ship_addressee')
						nlapiLogExecution('DEBUG', 'LoadRecord2');
			//nlapiLogExecution('DEBUG', 'Function Called Case', ShipCustomer);
			var ShipCustomerAddress = sorec.getFieldValue('shipaddress')
		//	var ShipDate = rec.getFieldValue('custrecord_fulfillment_date') 
			var ShipDate =  nlapiLookupField('salesorder',SalesOrder,'actualshipdate');//rec.getFieldValue('actualshipdate'); // actual ship date..
			nlapiLogExecution('DEBUG', 'Lookup2');
			//nlapiLogExecution('DEBUG', 'ShipDate', ShipDate);
			var TrackingInfo = rec.getFieldValue('custrecord_fulfillment_tracking_no')
			var ShipCarrier = sorec.getFieldText('shipmethod')
			var ToField = sorec.getFieldValue('custbody_end_customer_email_address')
			
			if (ShipCarrier == null){
				ShipCarrier = '';
			}
		
			if (TrackingInfo == null){
				TrackingInfo = '';
			}
			
			var body = 

			'To our valued customer:' + '<br><br>' +
			'Lifesize has shipped the following product:' + '<br><br>' +
			'Lifesize Customer: ' + CustomerName + '<br>' + 
			'Ship To Customer: ' + ShipCustomer + '<br>' +
			'Ship To Address: ' + ShipCustomerAddress + '<br>' +
			'Ship Date: ' + ShipDate + '<br>' +
			'Freight Carrier: ' + ShipCarrier + '<br>' +
			'Tracking Number: ' + TrackingInfo + '<br>' +
			'Fulfillment Number: ' + ASNNumber + '<br><br>' +
			'<u>Shipment Detail </u>___________________________________________________________________________' + '<br>' +
			'<b>Purchase Order: </b> ' + POnumber + '<br>' +
			'<b>Sales Order: </b> ' + SOnumber + '<br>' +
			' ' + componentItems + '<br>' +
			
			'*  Customer should pack the return merchandise utilizing the RMA Advance Replacement packaging received.' + '<br>' +
			'*  Only the defective part and serial number that was authorized for return should be shipped. Failure to do so may impact' + '<br>' + 'and/or interrupt your Service Warranty with Lifesize.' + '<br>' +
			'* The RMA unit must be shipped back to Lifesize within 15 days after receiving your Advance replacement unit. Should you' + '<br>' +
			'have any delay in meeting this deadline, please alert Lifesize at RMA@lifesize.com' + '<br>' +
			"* Unreturned RMA's beyond 30 days of Advance Replacement receipt will result in an Unreturned RMA fee as outlined in" + '<br>' +
			"Lifesize's price list and per Lifesize's Reseller Agreement." + '<br><br>' +
			'<br><b>Please note:</b> Tracking information will not be available immediately, it may take up to 24 hours for this information to become available on carriers website.<br><br>' +
			'Thank you,<br><br>' +
			'Ken Grant <br>' +
			'World Wide Logistics Manager <br>' +
			'Lifesize';
            nlapiLogExecution('DEBUG', 'Function Called Body Reached', body);
			var subject = 'FYI: Lifesize RMA Shipment - ' + CustomerName + ' Sales Order: ' + SOnumber;
            nlapiLogExecution('DEBUG', 'Function Called Subject Reached', subject);

            //create object of record ids to attach THIS email to.
			//When you do this, this email will show up under
			//communication tab of record(s) you attached this email to.
			var attachRec = new Object();
			attachRec['transaction'] = SalesOrder; //attach email to Sales Order record

            if (contactemails != "" && TrackingInfo != "") {
				if (ToField != "" && ToField != null){
					nlapiSendEmail(RMA_EMPLOYEE_SEND_EMAIL, ToField, subject, body, contactemails, null, attachRec, null, false, false, 'rma_shipments@lifesize.com')
					nlapiLogExecution('DEBUG', 'Function Called Subject Reached');
				}
				else{
					nlapiSendEmail(RMA_EMPLOYEE_SEND_EMAIL, 'rma_shipments@lifesize.com', subject, body, contactemails, null, attachRec, null, false, false, 'rma_shipments@lifesize.com')
					nlapiLogExecution('DEBUG', 'Function Called Subject Reached');
				}
			}
			else{
			}
		}
	}
	else {
	}
}

function SendEmailShipmentConfirmations(type){
    nlapiLogExecution('DEBUG', 'Function Type', 'Type ' + type);
	if (type != 'delete'){
	sendCustomFulfillmentEmails()
	}
}