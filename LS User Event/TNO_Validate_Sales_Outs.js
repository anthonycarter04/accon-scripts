var STATUS_PENDING = 2,
	STATUS_SOLD_OUT = 1;
var SERIAL_NO_CONTROL = '2';
//Warranty Types
var TYPE_AMS = 3,
	TYPE_STD_SOFTWARE = 1,
	TYPE_STD_HARDWARE = 2;

var dates = {
	// Converts the date in d to a date-object. The input can be:
	//   a date object: returned without modification
	//   an array	  : Interpreted as [year,month,day]. NOTE: month is 0-11.
	//   a number	  : Interpreted as number of milliseconds since 1 Jan 1970 (a timestamp) /
	//   a string	  : Any format supported by the javascript engine, like "YYYY/MM/DD", "MM/DD/YYYY", "Jan 31 2009" etc.
	//   an object	 : Interpreted as an object with year, month and date attributes.  **NOTE** month is 0-11.
	convert: function (d) {
		return(
			d.constructor === Date ? d :
			d.constructor === Array ? new Date(d[0], d[1], d[2]) :
			d.constructor === Number ? new Date(d) :
			d.constructor === String ? new Date(d) :
			typeof d === "object" ? new Date(d.year, d.month, d.date) : NaN
		);
},
	// Compare two dates (could be of any type supported by the convert
	// function above) and returns:
	//  -1 : if a < b
	//   0 : if a = b
	//   1 : if a > b
	// NaN : if a or b is an illegal date
	// NOTE: The code inside isFinite does an assignment (=).
	compare: function(a, b)
	{

		return (
			isFinite(a = this.convert(a).valueOf()) &&
			isFinite(b = this.convert(b).valueOf()) ? (a > b) - (a < b) : NaN
		);
	},
	// Checks if date in d is between dates in start and end.
	// Returns a boolean or NaN:
	//	true  : if d is between start and end (inclusive)
	//	false : if d is before start or after end
	//	NaN   : if one or more of the dates is illegal.
	// NOTE: The code inside isFinite does an assignment (=).
	inRange: function(d, start, end)
	{
		return (
			isFinite(d = this.convert(d).valueOf()) &&
			isFinite(start = this.convert(start).valueOf()) &&
			isFinite(end = this.convert(end).valueOf()) ? start <= d && d <= end : NaN
		);
	}
};

// a and b are javascript Date objects
function dateDiffInDays(a, b)
{

	nlapiLogExecution('AUDIT', 'date a', a);
	nlapiLogExecution('AUDIT', 'date b', b);

	var _MS_PER_DAY = 1000 * 60 * 60 * 24,
		utc1, utc2;
	// Discard the time and time-zone information.
	utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
	utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

	nlapiLogExecution('AUDIT', 'utc1', utc1);
	nlapiLogExecution('AUDIT', 'utc1', utc2);

	return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function incrementDate(date, days)
{
	date.setDate(date.getDate() + days);
	return date;
}

//ns line item item types don't match up to what can be used to load or lookup a record. this switch statement will return the correct form
function determineItemType(nonUsefulType)
{
nlapiLogExecution('DEBUG', 'Type', nonUsefulType);

	var types, field;
	types = {
		'Kit': 'kititem',
		'Service': 'serviceitem',
		'Discount': 'discountitem',
		'NonInvtPart': 'noninventoryitem',
		'InvtPart': 'inventoryitem',
		'Assembly': 'assemblyitem'
	};
	field = types[nonUsefulType] || '';
	return field;
}

//The customer/partner number is valid and can be found as an active record in NetSuite.
//*here i am going to check for a customer record matching the eniy field of the Sales Out record*
function validatePartner(custid)
{
	if (custid != null && custid != '')
	{
		nlapiLogExecution('DEBUG', 'valid partner', true);
		return true;
	}
	else
	{
		return false;
	}
}

//The customer/partner number is valid and can be found as an active record in NetSuite.
//*here i am going to check for a customer record matching the eniy field of the Sales Out record*
function validateSFPartner(sfid, custid)
{
	var filters, columns, search, results;
	filters = [
		new nlobjSearchFilter('custbody_sfdc_account_number', null, 'is', sfid),
		new nlobjSearchFilter('entity', null, 'is', custid)
	];
	columns = [new nlobjSearchColumn('custbody_sfdc_account_number')];
	search = nlapiSearchRecord('returnauthorization', null, filters, columns) || false;
	if (search && search.length)
	{
		return true;
	}
	else
	{
		return false;
	}
}

//The serial number must exist on an existing Install Base record.
//*here I am doing a lookup for any install base record that has a serial number filled value equal to the serial number on the sales out record
function validateSerialNumber(sn)
{
	var results, filters;
	filters = [new nlobjSearchFilter('custrecord_ib_serial_number', null, 'is', sn)];
	results = nlapiSearchRecord('customrecord_installed_base', null, filters, null) || false;
	if (results && sn.length > 0)
	{
		nlapiLogExecution('DEBUG', 'valid serial number', true);
		return true;
	}
	else
	{
		return false;
	}
}

//If a matching Install Base record is found, its top most parent Install Base record cannot already have an existing Sales Out record associated with it.
//*here I am recurively validating for parnet record of install base until i get to the topmost parent and then i check for a sales out record tied to the topmost parent
//we assume that if an install base has no parent then its parent id will be its own internalid
function validateInstallBaseParent(ibid)
{
	var ibParent = getParentInstallBase(ibid);
	var ibRecord, hasParent, parentid, hasSalesOut;
	ibRecord = nlapiLoadRecord('customrecord_installed_base', ibParent);
	hasSalesOut = false;
	if (hasSalesOut)
	{
		nlapiLogExecution('DEBUG', 'parnet ib has no sales out', hasSalesOut);
		return false;
	}
	else
	{
		return true;
	}
}

//If a matching Install Base record is found, the customer/partner on the Install Base must match the one on the Sales Out record
//(i.e. as a result of looking up the customer/partnerâ€™s number).
function validateInstallBasePartner(partnerid, ibpartnerid)
{
	if (partnerid == ibpartnerid)
	{
		nlapiLogExecution('DEBUG', 'validated ib partner', true);
		return true;
	}
	else
	{
		return false;
	}
}

//Check the date on the install base

//make sure no updates are permitted via CSV import for successfully imported/processed Sales Out records
//* here I am getting the id of the imported sales out and checking if a sales out record already exists for that sales out record id
//no way to do this without a search since we don't have an internalid for the new record yet
function validateSalesOutExists(serialNum, type)
{
	if (serialNum)
	{
		if(serialNum != 'SERVICE' && serialNum != 'NON SERIALIZED'){
			var num = 0;
			if(type == 'aftersubmit'){
				num = 1;
			}

		var filters, columns = null,
			search, resultCount;
		filters = [new nlobjSearchFilter('custrecord_sales_out_serial_number', null, 'is', serialNum)];
		search = nlapiSearchRecord('customrecord_sales_out', null, filters, null) || false;
		if (search && search.length)
		{
			resultCount = search.length;
			if(resultCount > num){
			nlapiLogExecution('DEBUG', 'number of existing sales outs found', resultCount);
			for (var i = 0; i < resultCount; i++)
			{
				nlapiLogExecution('DEBUG', 'id of existing sales out', search[i].getId());
			}
			//nlapiLogExecution('DEBUG', 'valid sales out, does not yet exist in system', false);
			return false;
			}
			else{
				return true;
			}
		}
		else
		{
			return true;
		}
		}
		else{

			return true;
		}
	}
	else
	{
		return false;
	}
}

// All required fields need to have values.
function validateSalesOutRequiredFields(checkFields)
{
	var fieldCount, checked = true;
	fieldCount = checkFields.length;
	for (var i in checkFields)
	{
		if (checkFields[i] == null)
		{
			checked = false;
		}
	}
	nlapiLogExecution('DEBUG', 'checked required fields', checked);
	return checked;
}

function getInstallBaseBySerial(serial)
{
	var filters, search, resultCount, ibId, ib;
	filters = [new nlobjSearchFilter('custrecord_ib_serial_number', null, 'is', serial)];
	search = nlapiSearchRecord('customrecord_installed_base', null, filters, null) || false;
	if (search && search.length)
	{
		resultCount = search.length;
		nlapiLogExecution('DEBUG', 'number of install bases found by serial number', resultCount);
		for (var i = 0; i < resultCount; i++)
		{
			var ibId = search[i].getId();
			nlapiLogExecution('DEBUG', 'id of install base found by serial', ibId);
		}
		ib = nlapiLoadRecord('customrecord_installed_base', ibId);
		return ib;
	}
	else
	{
		return false;
	}
}

//The sales out date provided must be greater than or equal to the ship date of the item based upon the item fulfillment.
//*here I am loading the item fulfillment linked to the sales out and comparing ship dates on both to make sure that the sales out date is greater than or equal to the ship date on the item fulfuillment
function validateSalesOutDate(ifShipDate, salesOutdate, dates)
{
	nlapiLogExecution('AUDIT', 'Validate Dates');
	var compareDates;
	if (salesOutdate >= ifShipDate)
	{
		compareDates = 1;
	}
	else
	{

		compareDates = 2;
	}
	//compareDates = dates.compare(salesOutdate, ifShipDate);
	nlapiLogExecution('DEBUG', 'date comparison', compareDates);
	if (compareDates == 1 || compareDates == 0)
	{
		nlapiLogExecution('DEBUG', 'dates not out of range', compareDates);
		return true;
	}
	else
	{
		return false;
	}
}

//Gets the ship date form the item fulfillment that the installbase was created from
function getItemFulfillmentShipDate(ibid)
{
	var installBase, salesOrder, itemFulfillment, ifdate, filters, columns, search, resultCount, originalSO, ibid, actualShipDate;
	installBase = nlapiLoadRecord('customrecord_installed_base', ibid);
	
	var datePref = nlapiGetContext().getPreference('DATEFORMAT');
	nlapiLogExecution('DEBUG', 'datePref ', datePref);
	
	soShipDate = moment(installBase.getFieldValue('custrecord_ib_date_created'), datePref);
	//var finalDate = soShipDate.format("MM-DD-YYYY");

	nlapiLogExecution('DEBUG', 'ship date from sales order using soShipDate', soShipDate);

	return soShipDate;
}

var validationErrors = [];
//run all of the validation for the sales out being created
function validateSalesOut(context, record, type)
{
	var checkFields = {},
		keys, isValid = false,
		numKeys, isServiceItem, currentIB, customer, ibSalesOrder, ibCustomer, ifDate;
	nlapiLogExecution('DEBUG', 'context in validate function', context);
	keys = ['custrecord_sales_out_date', 'custrecord_sales_out_company_name', 'custrecord_sales_out_serial_number'];

	numKeys = keys.length;

	try
	{
		for (var i = 0; i < numKeys; i++)
		{
			checkFields[keys[i]] = nlapiGetFieldValue(keys[i]);
		}
	}
	catch (e)
	{
		nlapiLogExecution('DEBUG', 'lookup fields failed', e);
	}

	if (validateSalesOutRequiredFields(checkFields))
	{
		isValid = true;
	}
	else
	{
		isValid = false;
		validationErrors.push('some required field values are null or missing...');
	}
	if (context != 'uiedit' && context != 'userinterface')
	{
		if (validateSalesOutExists(checkFields.custrecord_sales_out_serial_number, type))
		{
			isValid = true;
		}
		else
		{
			isValid = false;
			validationErrors.push('sales out record being imported already exists, you cannot update an existing sales out via partner portal...');
		}
		nlapiLogExecution('DEBUG', 'is valid ', isValid);
	}
	else if (type == 'create')
	{
		if (validateSalesOutExists(checkFields.custrecord_sales_out_serial_number, type))
		{

			isValid = true;
		}
		else
		{
			isValid = false;
			validationErrors.push('sales out record being imported already exists, you cannot update an existing sales out via csv import...');
		}
		nlapiLogExecution('DEBUG', 'is valid ', isValid);
	}
	if (checkFields.custrecord_sales_out_serial_number != 'SERVICE' && checkFields.custrecord_sales_out_serial_number != 'NON SERIALIZED')
	{
		if (validateSerialNumber(checkFields.custrecord_sales_out_serial_number))
		{
			isValid = true;
		}
		else
		{
			isValid = false;
			validationErrors.push('serial number ' + checkFields.custrecord_sales_out_serial_number + '  was not found on any install base records...');
		}
	}

	nlapiLogExecution('DEBUG', 'serial for IB for sales out imported/created manully', checkFields.custrecord_sales_out_serial_number);

	currentIB = getInstallBaseBySerial(checkFields.custrecord_sales_out_serial_number);
	if (currentIB)
	{
		ibid = currentIB.getFieldValue('id');
		/*
		customer = getCustomerByCompanyName(checkFields.custrecord_sales_out_company_name);
		nlapiLogExecution('DEBUG', 'customer id from customer record', customer);
		ibSalesOrder = nlapiLoadRecord('salesorder', currentIB.getFieldValue('custrecord_ib_original_so'));
		ibCustomer = ibSalesOrder.getFieldValue('entity');
		nlapiLogExecution('DEBUG', 'customer id from ib sales order record', ibCustomer);

		if(validatePartner(customer)){ isValid = true; }
		else{
			isValid = false;
			validationErrors.push('partner ' + checkFields.custrecord_sales_out_customer + ', with number ' + checkFields.custrecord_sales_out_customer_number + '  does not exist...');
		}

		if(validateInstallBasePartner(customer, ibCustomer)){
			isValid = true;
			nlapiSetFieldValue('custrecord_sales_out_customer', customer);
			nlapiSetFieldValue('custrecord_sales_out_customer_number', customer);
		}
		else{
			isValid = false;
			validationErrors.push('install base partner does not match sales out partner...');
		}
		*/

		//Since we are deriving the install base from serial number we need to get that first before we can run this validation
		if (validateInstallBaseParent(ibid))
		{
			isValid = true;
		}
		else
		{
			isValid = false;
			validationErrors.push('install base ' + currentIB + '  has a parent record with a sales out record...');
		}

		//Since we are deriving the install base form serial number we need to get that first before we can run this validation
		
		var datePref = nlapiGetContext().getPreference('DATEFORMAT');
		nlapiLogExecution('DEBUG', 'datePref ', datePref);
		
		nlapiLogExecution('DEBUG', 'data to validate itemfulfillment ship date', 'ibid: ' + ibid + ' sales out date ' + checkFields.custrecord_sales_out_date);
		var editDate = null;
		var finalDate = null;
		ifDate = getItemFulfillmentShipDate(ibid);
		nlapiLogExecution('DEBUG', 'if date', ifDate);
		if (record)
		{
			//editDate = moment(record.getFieldValue('custrecord_sales_out_date'), "MM-DD-YYYY hh:mm:ss a");
			editDate = moment(record.getFieldValue('custrecord_sales_out_date'), datePref);
			nlapiLogExecution('DEBUG', 'edit date before Final', editDate );
			//finalDate = editDate.format("MM-DD-YYYY");
		}
		
		var dateSet = moment(checkFields.custrecord_sales_out_date, datePref);
		nlapiLogExecution('DEBUG', 'dateSet', dateSet );
		//var dateSet = moment(checkFields.custrecord_sales_out_date, datePref);
		//dateSet = dateSet.format("MM-DD-YYYY");
		nlapiLogExecution('DEBUG', 'edit date ', finalDate + 'sales out date ' + checkFields.custrecord_sales_out_date);

		// && context == 'csvimport'
		if (editDate != dateSet && context == 'csvimport' && finalDate != null)
		{

			isValid = false;
			validationErrors.push('sales out date is already set and cannot be updated through csv import - ' + finalDate);
			nlapiLogExecution('DEBUG', 'date is already set', finalDate);
		}
		if (validateSalesOutDate(ifDate, dateSet, dates))
		{
			isValid = true;
		}
		else
		{
			isValid = false;
			validationErrors.push('sales out date is before the item fulfillment date - ' + ifDate.format("MM-DD-YYYY") + ' so Date - ' + dateSet.format("MM-DD-YYYY"));
			nlapiLogExecution('DEBUG', 'date is out of range of ship date', ifDate);
		}
	}
	else
	{
		if (checkFields.custrecord_sales_out_serial_number != "NON SERIALIZED" && checkFields.custrecord_sales_out_serial_number != "SERVICE")
		{
			isValid = false;
			validationErrors.push('install base was not found for serial number: ' + checkFields.custrecord_sales_out_serial_number);
		}
	}

	if (validationErrors.length>0)
	{
		//we may not need to throw this error as long as creating it will prevent the record from being imported
		checkFields.importerrors = validationErrors.toString().split(',').join(' | ');
		//errorCSV.push(checkFields);
		return false;
	}
	else
	{
		nlapiLogExecution('DEBUG', 'date to adjust by', checkFields.custrecord_sales_out_date);
		//here we will submit the sales out to trigger the after submit script which will call this function below....
		return isValid;
	}
}

function beforeSubmitSalesOut(type, form)
{
	var executionContext = nlapiGetContext().getExecutionContext();

	
	var datePref = nlapiGetContext().getPreference('DATEFORMAT');
	nlapiLogExecution('DEBUG', 'datePref ', datePref);
	
	
	
	if(executionContext = 'suitelet'){

		executionContext = 'csvimport';
	}

	nlapiLogExecution('DEBUG', 'EXECUTION CONTEXT', executionContext);
	var id = nlapiGetRecordId();
	var record = false;
	if (id)
	{
		record = nlapiLoadRecord('customrecord_sales_out', id);
	}
	nlapiLogExecution('DEBUG', 'ID ', id);
	var valid;
	manualAdjustment = (nlapiGetFieldValue('custrecord_sales_out_manual_adj') == 'T') ? true : false;

	nlapiLogExecution('DEBUG', 'Is Manual', manualAdjustment);
	if (type == 'create' && manualAdjustment == false && (executionContext == 'csvimport' || executionContext == 'userinterface'))
	{
		nlapiLogExecution('DEBUG', 'EXECUTION CONTEXT', executionContext);
		try
		{
			valid = validateSalesOut(executionContext, record, 'beforesubmit');
		}
		catch(e)
		{
			nlapiLogExecution('AUDIT','beforeSubmitSalesOut',e);
		}
		if (valid)
		{
			return true;
		}
		else
		{
			if(executionContext=='csvimport')
			{
				throw (nlapiCreateError('FAILED CUSTOM VALIDATION', validationErrors.toString(), false));
			}
			else
			{
				throw (nlapiCreateError('FAILED CUSTOM VALIDATION', validationErrors.toString().split(',').join('<br />'), true));
			}
		}
	}
	else
	{
		return true;
	}
}

function getCustomerByCompanyName(companyName)
{
	var filters, columns, search, resultCount, custId;
	nlapiLogExecution('DEBUG', 'company name being imported', companyName);
	filters = [new nlobjSearchFilter('companyname', null, 'is', companyName)];
	search = nlapiSearchRecord('customer', null, filters, null) || false;
	if (search && search.length)
	{
		resultCount = search.length;
		for (var i = 0; i < resultCount; i++)
		{
			nlapiLogExecution('DEBUG', 'customer id found in search', search[i].getId());
		}
		return search[0].getId();
	}
	else
	{
		return null;
	}
}

function getParentInstallBase(ibId)
{
	nlapiLogExecution('DEBUG', 'ibId', ibId);
	var parentIbId = ibId;
	while (parentIbId != null && parentIbId != '')
	{
		var ibId = parentIbId;
		var parentIbId = nlapiLookupField('customrecord_installed_base', ibId, 'custrecord_parent_installed_base');
	}
	return ibId;
}

//create sales out with serial number matching an install base, find all sales outs who have the same install base but whose serial is service are marked sold out

function afterSubmitSalesOut(type, form)
{
	//try
	//{
		manualAdjustment = nlapiGetFieldValue('custrecord_sales_out_manual_adj') == 'T' ? true : false;
		//manualAdjustment = false;
		var executionContext = nlapiGetContext().getExecutionContext();

		if(executionContext = 'suitelet'){

			executionContext = 'csvimport';
		}
		
		var datePref = nlapiGetContext().getPreference('DATEFORMAT');
		nlapiLogExecution('DEBUG', 'datePref ', datePref);
		
		nlapiLogExecution('DEBUG', 'executionContext ', executionContext);

		if (type != 'delete' && executionContext != 'scheduled')
		{
			var valid, ibSalesOrderId, filters, search, resultCount, salesOutId, salesOut, salesOutDate, salesOutAmount, salesOutListPrice, salesOutQuantity, salesRegion, currentInstallBase, parentInstallBase, ibSalesOrder, ibSalesOrderLineId, installBaseItem, soSubmitFields, soSubmitValues, customerValues, newSalesOutId, newSalesOut, manualAdjustment;
			salesOutId = nlapiGetRecordId();
			nlapiLogExecution('DEBUG', '1, sales out made after submit of sales out', salesOutId);
			nlapiLogExecution('DEBUG', 'new sales out id', salesOutId);

			//Sales Out Field Retrievals
			salesOut = nlapiLoadRecord('customrecord_sales_out', salesOutId);
			var serialtypecheck = salesOut.getFieldValue("custrecord_sales_out_serial_number");
			nlapiLogExecution('DEBUG', 'reversecogscheck', reversecogscheck);
			var currentstatus = salesOut.getFieldValue("custrecord_sales_out_status");
			nlapiLogExecution('DEBUG', 'current status ', currentstatus);
			var originaltran = salesOut.getFieldValue("custrecord_sales_out_original_trans");
			var nonserialcheck = 'F';
			var reversecogscheck = salesOut.getFieldValue("custrecord_sales_out_reverse_def_cogs");
			var soOrderLine = salesOut.getFieldValue("custrecord_sales_out_original_line_num");
			var soQuantity = salesOut.getFieldValue("custrecord_sales_out_quantity");
			var soCogsAccount = salesOut.getFieldValue("custrecord_sales_out_cogs_account");
			var soRevAccount = salesOut.getFieldValue("custrecord_sales_out_revenue_account");
			var salesOutDate = salesOut.getFieldValue('custrecord_sales_out_date');
			nlapiLogExecution('AUDIT', 'salesOutDate AC', salesOutDate);
			var originalSalesOrder = salesOut.getFieldValue("custrecord_original_sales_order");
			var isDropShip = 'F';
			var subsidiary = null;
			var currentInstallBaseId = null;
			if (originalSalesOrder)
			{
				try
				{
					nlapiLogExecution('AUDIT', 'originalSO', originalSalesOrder);
					isDropShip = nlapiLookupField('salesorder', originalSalesOrder, 'custbody_drop_ship_order');
					subsidiary = nlapiLookupField('salesorder', originalSalesOrder, 'subsidiary');
				}
				catch (ex)
				{
					nlapiLogExecution('AUDIT', 'Exception', ex);
				}
			}
			var nonSerialChecker = salesOut.getFieldValue("custrecord_non_serial_rec_sales_out");
			var installBase = salesOut.getFieldValue("custrecord_sales_out_install_base");
			var relatedTransaction = salesOut.getFieldValue('custrecord_sales_out_original_trans');

			//Get Install Base Fields if Available
			currentInstallBase = getInstallBaseBySerial(salesOut.getFieldValue('custrecord_sales_out_serial_number'));
			if (currentInstallBase)
			{
				currentInstallBaseId = currentInstallBase.getFieldValue('id');
				nlapiLogExecution('DEBUG', 'returned id of install base found by serial', currentInstallBaseId);

				ibSalesOrderId = currentInstallBase.getFieldValue('custrecord_ib_original_so');
				var status = currentInstallBase.getFieldText('custrecord_ib_status');
				nlapiLogExecution('DEBUG', 'install base status ', status);
				if (ibSalesOrderId)
				{
					try
					{
						nlapiLogExecution('AUDIT', 'ibSalesOrder', ibSalesOrder);
						ibSalesOrder = nlapiLoadRecord('salesorder', ibSalesOrderId);
						isDropShip = nlapiLookupField('salesorder', ibSalesOrderId, 'custbody_drop_ship_order');
						subsidiary = nlapiLookupField('salesorder', ibSalesOrderId, 'subsidiary');
					}
					catch (ex)
					{
						nlapiLogExecution('AUDIT', 'Exception', ex);
					}
				}
				nlapiLogExecution('DEBUG', 'install base for this sales out', currentInstallBaseId);
				parentInstallBase = getParentInstallBase(currentInstallBaseId);
				if(parentInstallBase){
					currentInstallBaseId = parentInstallBase;
				}
				nlapiLogExecution('DEBUG', '1 parent Install Base', parentInstallBase);
				parentIbRec = nlapiLoadRecord('customrecord_installed_base', parentInstallBase);
				installBaseItem = parentIbRec.getFieldValue('custrecord_ib_item');

				nlapiLogExecution('DEBUG', 'install base item', installBaseItem);
				ibSalesOrderLineId = parentIbRec.getFieldValue('custrecord_ib_original_so_line');
				var salesOrderLineIndex = ibSalesOrder.findLineItemValue('item', 'custcol_line_id', ibSalesOrderLineId);

				nlapiLogExecution('DEBUG', 'sales order line index', salesOrderLineIndex);
				nlapiLogExecution('DEBUG', 'sales order line id', ibSalesOrderLineId);
			}
			else
			{
				if (installBase)
					ibSalesOrderId = nlapiLookupField("customrecord_installed_base", installBase, "custrecord_ib_original_so");
			}

			nlapiLogExecution('DEBUG', 'susbidiary check ', subsidiary);

			nlapiLogExecution('DEBUG', 'reversecogscheck', reversecogscheck);
			// && !journalcheck
			if ((reversecogscheck == 'T' || currentstatus == STATUS_SOLD_OUT))
			{
				try
				{
					var reversedCOGSJEs = [];
					var reversedRevJes = [];
					var createJeCogs = [];
					var createJeRev = [];

					if (serialtypecheck != "NON SERIALIZED" && serialtypecheck != "SERVICE" && currentInstallBase)
					{

						/* GDP Code being deferred for later integration
						if (ibSalesOrder.getFieldText("custbody_tno_order_type") == "GDP Order")
						{
							var quantity = parseInt(1);
							nlapiLogExecution('DEBUG', 'reverse quantity ', quantity);
							var columns = [];
							columns.push(new nlobjSearchColumn("quantity", null, "SUM"));

							var filters = [];
							filters.push(new nlobjSearchFilter("item", null, "anyof", installBaseItem));
							filters.push(new nlobjSearchFilter("internalid", null, "anyof", ibSalesOrderId));

							var quantitySearch = nlapiSearchRecord("transaction", null, filters, columns);
							if (quantitySearch.length > 0)
							{
								var totalquantity = parseInt(quantitySearch[0].getValue("quantity", null, "SUM"));
								if (totalquantity > 0)
									quantity = parseFloat(quantity / totalquantity);
							}

							nlapiLogExecution('DEBUG', 'quantity val ', quantity);
							var totalamountrev = parseFloat(parentIbRec.getFieldValue("custrecord_ib_deferred_gdp_rev_amount"));
							nlapiLogExecution('DEBUG', 'total amount to rev to reverse ', totalamountrev);
							var totalamountcog = parseFloat(parentIbRec.getFieldValue("custrecord_ib_deferred_gdp_cogs_amount"));
							nlapiLogExecution('DEBUG', 'total amount to cog to reverse ', totalamountcog);

							if (quantity > 0)
							{
								if (totalamountrev > 0)
								{
									totalamountrev = totalamountrev * quantity;
								}
								else
								{
									totalamountrev = 0;
								}

								if (totalamountcog > 0)
								{
									totalamountcog = totalamountcog * quantity;
								}
								else
								{
									totalamountcog = 0;
								}
							}

							var custitem_deferred_cogs_gdp_acct = nlapiLookupField('item', installBaseItem, 'custitem_deferred_cogs_gdp_acct', false);
							nlapiLogExecution('DEBUG', 'custitem_deferred_cogs_gdp_acct ', custitem_deferred_cogs_gdp_acct);
							var custitem_deferred_rev_gdp_acct = nlapiLookupField('item', installBaseItem, 'custitem_deferred_rev_gdp_acct', false);
							nlapiLogExecution('DEBUG', 'custitem_deferred_rev_gdp_acct ', custitem_deferred_rev_gdp_acct);
							var soCogsAccountCheck = nlapiLookupField('item', installBaseItem, 'expenseaccount');
							if (soCogsAccountCheck)
							{
								soCogsAccount = soCogsAccountCheck;
							}
							var soRevAccountCheck = nlapiLookupField('item', installBaseItem, 'incomeaccount', false);
							if (soRevAccountCheck)
							{
								soRevAccount = soRevAccountCheck;
							}
							var custrecord_ib_deferred_gdp_rev_amount = totalamountrev;
							var custrecord_ib_deferred_gdp_cogs_amount = totalamountcog;
							var COGSAcct = parentIbRec.getFieldValue("custrecord_cogs_account");
							var revAcct = parentIbRec.getFieldValue("custrecord_revenue_account");

							if (custitem_deferred_cogs_gdp_acct && custrecord_ib_deferred_gdp_cogs_amount > 0)
							{
								createJeCogs.push(
								{
									deferredcogsaccount: custitem_deferred_cogs_gdp_acct,
									cogsaccount: soCogsAccount,
									cogsamount: custrecord_ib_deferred_gdp_cogs_amount
								});
							}
							if (custitem_deferred_rev_gdp_acct && custrecord_ib_deferred_gdp_rev_amount > 0)
							{
								createJeRev.push(
								{
									deferredrevaccount: custitem_deferred_rev_gdp_acct,
									revaccount: soRevAccount,
									revamount: custrecord_ib_deferred_gdp_rev_amount
								});
							}
							var nonserialcogsamount = 0;
							var nonserialrevamount = 0;

							var filters = [];
							filters.push(new nlobjSearchFilter("custrecord_non_serial_recognized", null, "is", "T"));
							filters.push(new nlobjSearchFilter("custrecord_ib_original_so", null, "anyof", ibSalesOrderId));

							var searchInstallBases = nlapiSearchRecord("customrecord_installed_base", null, filters, null);
							nlapiLogExecution('DEBUG', 'search install bases ', searchInstallBases);

							var filters2 = [];
							filters2.push(new nlobjSearchFilter("custrecord_non_serial_rec_sales_out", null, "is", "T"));
							filters2.push(new nlobjSearchFilter("custrecord_original_sales_order", null, "anyof", ibSalesOrderId));

							var searchSalesOuts = nlapiSearchRecord("customrecord_sales_out", null, filters2, null);
							nlapiLogExecution('DEBUG', 'search install bases ', searchInstallBases);
							if (!searchInstallBases && !searchSalesOuts)
							{
								var solinecount = ibSalesOrder.getLineItemCount("item");
								nlapiLogExecution('DEBUG', 'so line count for non-serialized search ', solinecount);
								for (var m = 1; m <= solinecount; m++)
								{
									var itemcheck = ibSalesOrder.getLineItemValue("item", "item", m);
									nlapiLogExecution('DEBUG', 'item check ', itemcheck);

									var nonseriallookup = nlapiLookupField("item", itemcheck, "custitem_serial_number_generation", true);
									nlapiLogExecution('DEBUG', 'non-serial lookup ', nonseriallookup);

									if (nonseriallookup == "No Control")
									{
										var custitem_deferred_cogs_gdp_acct = nlapiLookupField('item', itemcheck, 'custitem_deferred_cogs_gdp_acct', false);
										var custitem_deferred_rev_gdp_acct = nlapiLookupField('item', itemcheck, 'custitem_deferred_rev_gdp_acct', false);

										nonserialcogsamount = searchNonSerialTransactionsCogs(itemcheck, ibSalesOrderId);
										nonserialrevamount = searchNonSerialTransactionsRev(itemcheck, ibSalesOrderId);
										var soCogsAccountCheck = nlapiLookupField('item', itemcheck, 'expenseaccount', false);
										if (soCogsAccountCheck)
										{
											soCogsAccount = soCogsAccountCheck;
										}
										var soRevAccountCheck = nlapiLookupField('item', itemcheck, 'incomeaccount', false);
										if (soRevAccountCheck)
										{
											soRevAccount = soRevAccountCheck;
										}
										if (nonserialcogsamount > 0 && custitem_deferred_cogs_gdp_acct)
										{
											createJeCogs.push(
											{
												deferredcogsaccount: custitem_deferred_cogs_gdp_acct,
												cogsaccount: soCogsAccount,
												cogsamount: nonserialcogsamount
											});
										}
										if (nonserialrevamount > 0 && custitem_deferred_rev_gdp_acct)
										{
											createJeRev.push(
											{
												deferredrevaccount: custitem_deferred_rev_gdp_acct,
												revaccount: soRevAccount,
												revamount: nonserialrevamount
											});
										}
										nonserialcheck = 'T';
									}

									if (nonserialrevamount > 0 && nonserialcogsamount > 0)
									{
										salesOut.setFieldValue('custrecord_deferred_sales_out_non_ser_re', nonserialcogsamount);
										salesOut.setFieldValue('custrecord_deferred_sales_out_non_ser_co', nonserialrevamount);
									}
								}
							}
							var deferredCOGSJEs = [];
							if (nonSerialChecker != 'T')
							{
								if (createJeCogs.length > 0 && createJeRev.length > 0)
								{
									reversedCOGSJEs = createReverseJeCogs(createJeCogs, salesOut, relatedTransaction, ibSalesOrderId, subsidiary);
									reversedRevJes = createReverseJeRev(createJeRev, salesOut, relatedTransaction, ibSalesOrderId, subsidiary);
								}

								if (reversedCOGSJEs.length > 0 && reversedRevJes.length > 0)
								{
									deferredCOGSJEs = reversedCOGSJEs.concat(reversedRevJes);
								}
							}

							if (deferredCOGSJEs.length > 0)
							{
								var reversedJEs = salesOut.getFieldValues('custrecord_sales_out_rec_gdp_journal');
								if (reversedJEs && reversedJEs.length > 0)
								{
									for (var i = 0; i < reversedJEs.length; i++)
									{
										nlapiDeleteRecord('journalentry', reversedJEs[i]);
									}
								}

								salesOut.setFieldValue("custrecord_sales_out_rec_gdp_journal", deferredCOGSJEs);
								nlapiSubmitField("customrecord_installed_base", parentInstallBase, 'custrecord_ib_recognizing_gdp_journal', deferredCOGSJEs);
							}

							// todo make custrecord_ib_recognizing_gdp_journal multi-select and inline text
							if (nonserialcheck == 'T')
							{
								nlapiSubmitField("customrecord_installed_base", parentInstallBase, 'custrecord_non_serial_recognized', nonserialcheck);
								salesOut.setFieldValue('custrecord_non_serial_rec_sales_out', nonserialcheck);
							}

							salesOut.setFieldValue('custrecord_deferred_sales_out_gdp_amount', custrecord_ib_deferred_gdp_cogs_amount);
							salesOut.setFieldValue('custrecord_deferred_sales_out_gdp_rev', custrecord_ib_deferred_gdp_rev_amount);
						}
*/
						if (status == 'Shipped')
						{
							nlapiSubmitField("customrecord_installed_base", parentInstallBase, 'custrecord_ib_status', 2);
							nlapiSubmitField("customrecord_installed_base", currentInstallBaseId, 'custrecord_ib_status', 2);
						}
						//nlapiSubmitField("customrecord_installed_base", parentInstallBase, 'custrecord_ib_credited_sales_out', salesOutId);
						salesOut.setFieldValue('custrecord_sales_out_original_line_num', ibSalesOrderLineId);
						salesOut.setFieldValue('custrecord_original_sales_order', ibSalesOrderId);
						if (!relatedTransaction)
						{
							salesOut.setFieldValue('custrecord_sales_out_original_trans', ibSalesOrderId);
						}
						salesOut.setFieldValue('custrecord_sales_out_item', installBaseItem);

						//Get Field Data for Updates to Other Sales Outs from Current Sales Out
						var initValues = null;
						if (isDropShip == 'T')
						{
							initValues = setSalesOutValuesSerialNonDrop(ibSalesOrderId, salesOut);
						}
						else
						{
							initValues = setSalesOutValuesSerial(ibSalesOrderId, salesOut, executionContext);
						}
						//Set Non-Serial to Sold Out
						/*
						if (ibSalesOrder.getFieldText("custbody_tno_order_type") == "GDP Order")
						{
							var filters = [];
							filters.push(new nlobjSearchFilter("custrecord_sales_out_serial_number", null, "is", "NON SERIALIZED"));
							filters.push(new nlobjSearchFilter("custrecord_original_sales_order", null, "anyof", ibSalesOrderId));

							var searchSalesOuts = nlapiSearchRecord("customrecord_sales_out", null, filters, null);
							nlapiLogExecution('DEBUG', 'search sales out non-serialized check ', searchSalesOuts);
							if (searchSalesOuts)
							{
								nlapiLogExecution('DEBUG', 'search sales out non-serialized check length ', searchSalesOuts.length);

								for (var m = 0; m < searchSalesOuts.length; m++)
								{
									var soRecordLoad = nlapiLoadRecord('customrecord_sales_out', searchSalesOuts[m].getId());
									for (var l in initValues)
									{
										try
										{
											soRecordLoad.setFieldValue(l, initValues[l], false);
											var journalLookup = soRecordLoad.getFieldValue('custrecord_sales_out_rec_gdp_journal');
											if (deferredCOGSJEs.length > 0 && !journalLookup)
											{
												soRecordLoad.setFieldValue("custrecord_sales_out_rec_gdp_journal", deferredCOGSJEs);
											}
										}
										catch (ex)
										{
											nlapiLogExecution('DEBUG', 'Error Setting Field Values to Non-Serialized ', ex);
										}
									}

									soRecordLoad.setFieldValue("custrecord_sales_out_status", STATUS_SOLD_OUT);
									var soRecordSubmit = nlapiSubmitRecord(soRecordLoad);
									nlapiLogExecution('DEBUG', 'So Record Submit ', soRecordSubmit);
								}
							}
						}
*/
						//Set Service to Sold Out
						var filters = [];
						filters.push(new nlobjSearchFilter("custrecord_sales_out_serial_number", null, "is", "SERVICE"));
						filters.push(new nlobjSearchFilter("custrecord_sales_out_install_base", null, "is", currentInstallBaseId));
						filters.push(new nlobjSearchFilter("custrecord_sales_out_status", null, "is", STATUS_PENDING));

						var searchSalesOuts = nlapiSearchRecord("customrecord_sales_out", null, filters, null);
						nlapiLogExecution('DEBUG', 'search sales out service check ', searchSalesOuts);
						if (searchSalesOuts)
						{
							for (var m = 0; m < searchSalesOuts.length; m++)
							{
								var soRecordLoad = nlapiLoadRecord('customrecord_sales_out', searchSalesOuts[m].getId());
								for (var l in initValues)
								{
									try
									{
										soRecordLoad.setFieldValue(l, initValues[l], false);
									}
									catch (ex)
									{
										nlapiLogExecution('DEBUG', 'Error Setting Field Values to Service ', ex);
									}
								}
								soRecordLoad.setFieldValue("custrecord_sales_out_status", STATUS_SOLD_OUT);

								// var revRecCheck = soRecordLoad.getFieldValue("custrecord_rev_rec_recognized");
								// if (revRecCheck != "T")
								// {
								// 	var createdFrom = soRecordLoad.getFieldValue("custrecord_sales_out_original_trans");
								// 	if (createdFrom)
								// 	{

										// if(manualAdjustment == false){
										// var setRevRec = setRevRecSchedule(createdFrom, salesOutDate);
										// }
										// if (setRevRec)
										// {
										// 	nlapiLogExecution('DEBUG', 'set rev rec submit ', setRevRec);
										// }
									//}
								//}

								var soRecordSubmit = nlapiSubmitRecord(soRecordLoad);
								nlapiLogExecution('DEBUG', 'So Record Submit ', soRecordSubmit);
							}
						}
					}
					else
					{
						if ((serialtypecheck == "NON SERIALIZED"))
						{
							var transcheck = [];
							if (originaltran)
							{
								transcheck.push(originaltran);
							}
							if (originalSalesOrder)
							{
								transcheck.push(originalSalesOrder);
							}
							if (ibSalesOrderId)
							{
								transcheck.push(ibSalesOrderId);
							}

							/*
							nlapiLogExecution('DEBUG', 'Trans Check ', transcheck);
							var filters = [];
							filters.push(new nlobjSearchFilter("custrecord_non_serial_rec_sales_out", null, "is", "T"));
							filters.push(new nlobjSearchFilter("custrecord_original_sales_order", null, "anyof", transcheck));

							var searchSalesOuts = nlapiSearchRecord("customrecord_sales_out", null, filters, null);
							nlapiLogExecution('DEBUG', 'search sales out non-serialized check ', searchSalesOuts);
							if (!searchSalesOuts)
							{
								var tranrecord = null;
								if ((serialtypecheck == "SERVICE" && ibSalesOrderId) || originalSalesOrder)
								{
									if (ibSalesOrderId)
									{
										tranrecord = nlapiLoadRecord("salesorder", ibSalesOrderId);
									}
									else
									{
										tranrecord = nlapiLoadRecord("salesorder", originalSalesOrder);
									}
								}
								else
								{
									tranrecord = nlapiLoadRecord("invoice", originalSalesOrder);
								}

								var itemcheck = tranrecord.getLineItemValue("item", "item", soOrderLine);
								var createdfrom = tranrecord.getId();
								var totalquantity = parseInt(tranrecord.getLineItemValue("item", "quantity", soOrderLine));
								nlapiLogExecution('DEBUG', 'item check ', itemcheck);
								nlapiLogExecution('DEBUG', 'created from non-serial ', createdfrom);
								var nonseriallookup = nlapiLookupField("item", itemcheck, "custitem_serial_number_generation", true);
								nlapiLogExecution('DEBUG', 'non-serial lookup ', nonseriallookup);

								if (nonseriallookup == "No Control" || nonseriallookup == '')
								{
									var custitem_deferred_cogs_gdp_acct = nlapiLookupField('item', itemcheck, 'custitem_deferred_cogs_gdp_acct', false);
									var custitem_deferred_rev_gdp_acct = nlapiLookupField('item', itemcheck, 'custitem_deferred_rev_gdp_acct', false);

									nonserialcogsamount = parseFloat(searchNonSerialTransactionsCogs(itemcheck, createdfrom));
									nonserialrevamount = parseFloat(searchNonSerialTransactionsRev(itemcheck, createdfrom));

									var quantitycalccogs = nonserialcogsamount * (soQuantity / totalquantity);
									var quantitycalcrev = nonserialrevamount * (soQuantity / totalquantity);
									var soCogsAccountCheck = nlapiLookupField('item', itemcheck, 'expenseaccount', false);
									if (soCogsAccountCheck)
									{
										soCogsAccount = soCogsAccountCheck;
									}
									var soRevAccountCheck = nlapiLookupField('item', itemcheck, 'incomeaccount', false);
									if (soRevAccountCheck)
									{
										soRevAccount = soRevAccountCheck;
									}
									if (quantitycalccogs > 0 && custitem_deferred_cogs_gdp_acct)
									{
										createJeCogs.push(
										{
											deferredcogsaccount: custitem_deferred_cogs_gdp_acct,
											cogsaccount: soCogsAccount,
											cogsamount: quantitycalccogs
										});

									}
									if (quantitycalcrev > 0 && custitem_deferred_rev_gdp_acct)
									{
										createJeRev.push(
										{
											deferredrevaccount: custitem_deferred_rev_gdp_acct,
											revaccount: soRevAccount,
											revamount: quantitycalcrev
										});
									}

									if (createJeCogs.length > 0 && createJeRev.length > 0)
									{
										reversedCOGSJEs = createReverseJeCogs(createJeCogs, salesOut, relatedTransaction, ibSalesOrderId, subsidiary);
										reversedRevJes = createReverseJeRev(createJeRev, salesOut, relatedTransaction, ibSalesOrderId, subsidiary);

										if (reversedCOGSJEs.length > 0 && reversedRevJes.length > 0)
										{
											deferredCOGSJEs = reversedCOGSJEs.concat(reversedRevJes);
										}
									}

									if (deferredCOGSJEs.length > 0)
									{
										var reversedJEs = salesOut.getFieldValues('custrecord_sales_out_rec_gdp_journal');
										if (reversedJEs && reversedJEs.length > 0)
										{
											for (var i = 0; i < reversedJEs.length; i++)
											{
												nlapiDeleteRecord('journalentry', reversedJEs[i]);
											}
										}
										salesOut.setFieldValue("custrecord_sales_out_rec_gdp_journal", deferredCOGSJEs);
									}

									salesOut.setFieldValue('custrecord_deferred_sales_out_non_ser_re', quantitycalccogs);
									salesOut.setFieldValue('custrecord_deferred_sales_out_non_ser_co', quantitycalcrev);
									nonserialcheck = 'T';
								}

								if (nonserialcheck == 'T')
								{
									salesOut.setFieldValue('custrecord_non_serial_rec_sales_out', nonserialcheck);
								}
							}

							*/

							setSalesOutValuesNonSerial(originalSalesOrder, salesOut);
						}

						if (serialtypecheck == "SERVICE")
						{
							// var revRecCheck = salesOut.getFieldValue("custrecord_rev_rec_recognized");
							// if (revRecCheck != "T")
							// {
							// 	var createdFrom = salesOut.getFieldValue("custrecord_sales_out_original_trans");
							// 	if (createdFrom)
							// 	{
							// 		var setRevRec = setRevRecSchedule(createdFrom, salesOutDate);
							// 		if (setRevRec)
							// 		{
							// 			nlapiLogExecution('DEBUG', 'set rev rec submit ', setRevRec);
							// 		}
							// 	}
							// }
							setSalesOutValuesNonSerial(originalSalesOrder, salesOut);
						}
					}
				}
				catch (ex)
				{
					nlapiLogExecution('DEBUG', 'error processing error', ex);
				}
			}
			//Here is where uou get non-serialized hardware also and recognize the COGS and Revenue (Create Install Base or Sales Outs for Non-Serialzed Parts?)

			var finalSoSubmit = nlapiSubmitRecord(salesOut);
			nlapiLogExecution('DEBUG', 'Final SO Submit ', finalSoSubmit);
			try
			{
		nlapiLogExecution('AUDIT', 'Sales Order / OrderLine')
				if (ibSalesOrder && ibSalesOrderLineId)
				{


					salesOutAmount = ibSalesOrder.getLineItemValue('item', 'amount', salesOrderLineIndex) || '';
		  var salesOutQuantity = ibSalesOrder.getLineItemValue('item', 'quantity', salesOrderLineIndex) || '';
		  salesOutAmount = parseFloat(salesOutAmount) / parseFloat(salesOutQuantity);
		  nlapiLogExecution('AUDIT', 'Calculated SO Amount', salesOutAmount);
					nlapiLogExecution('DEBUG', 'sales out amount', salesOutAmount);
					salesOutQuantity = 1;
					salesOutListPrice = ibSalesOrder.getLineItemValue('item', 'custcol_custlistprice', salesOrderLineIndex) || '';
		  nlapiLogExecution('AUDIT','List Price for Line ' + salesOrderLineIndex , 'List Price: ' + salesOutListPrice);
					salesRegion = ibSalesOrder.getFieldValue('custbody_om_salesperson') || '';

					soSubmitFields = [
						'custrecord_sales_out_sales_region', 'custrecord_sales_out_install_base',
						'custrecord_sales_out_amount', 'custrecord_sales_out_list_price', 'custrecord_sales_out_quantity'
					];
					if(parentInstallBase){

						currentInstallBaseId = parentInstallBase;
					}
					soSubmitValues = [salesRegion, currentInstallBaseId, salesOutAmount, salesOutListPrice, salesOutQuantity];
					nlapiLogExecution('DEBUG', 'sales out submit values', soSubmitValues);
					nlapiSubmitField('customrecord_sales_out', salesOutId, soSubmitFields, soSubmitValues);
				}
				else
				{
					salesOutListPrice = 'line not found on sales order';
					salesOutQuantity = 1;
					salesOutAmount = 'line not found on sale order';
					throw (nlapiCreateError('SSS_LINE_ITEM_MISSING', 'The line item being searched for in sales order: ' + ibSalesOrderId + ' is not found in line items list...', false));
				}
			}
			catch (f)
			{
				nlapiLogExecution('DEBUG', 'error processing ib Sales Order Line', f);
				//throw f;
				//return false;
			}

			customerValues = {
				/*address_1:
				{
					'sokey': 'custrecord_sales_out_address_1',
					'ibkey': 'custrecord_ib_address_1'
				},
				address_2:
				{
					'sokey': 'custrecord_sales_out_address_2',
					'ibkey': 'custrecord_ib_address_2'
				},
				city:
				{
					'sokey': 'custrecord_sales_out_city',
					'ibkey': 'custrecord_ib_city'
				},
				company_name:
				{
					'sokey': 'custrecord_sales_out_company_name'
				},
				country:
				{
					'sokey': 'custrecord_sales_out_country'
				},*/
				customer:
				{
					'sokey': 'custrecord_sales_out_customer',
					'ibkey': 'custrecord_ib_end_user'
				},
				customernumber:
				{
					'sokey': 'custrecord_sales_out_customer_number',
					'ibkey': 'custrecord_so_partner_number'
				}/*,
				email:
				{
					'sokey': 'custrecord_sales_out_email',
					'ibkey': 'custrecord_ib_email'
				},
				firstname:
				{
					'sokey': 'custrecord_sales_out_first_name'
				},
				lastname:
				{
					'sokey': 'custrecord_sales_out_last_name'
				},
				messages:
				{
					'sokey': 'custrecord_sales_out_messages'
				},
				phone:
				{
					'sokey': 'custrecord_sales_out_phone',
					'ibkey': 'custrecord_ib_phone'
				},
				state:
				{
					'sokey': 'custrecord_sales_out_state',
					'ibkey': 'custrecord_ib_state'
				},
				zip:
				{
					'sokey': 'custrecord_sales_out_zip',
					'ibkey': 'custrecord_ib_zip'
				},
				salesregion:
				{
					'sokey': 'custrecord_sales_out_sales_region',
					'ibkey': 'custrecord_ib_sales_rep'
				}*/
			};

			var transcheck = [];
			if (originaltran)
			{
				transcheck.push(originaltran);
			}
			if (originalSalesOrder)
			{
				transcheck.push(originalSalesOrder);
			}
			if (ibSalesOrderId)
			{
				transcheck.push(ibSalesOrderId);
			}
			nlapiLogExecution('DEBUG', 'Trans Check Customer Search ', transcheck + 'Serial Type Check ' + serialtypecheck);

			if(transcheck.length > 0){
				if(currentInstallBaseId){
			var filterExpression = [
				['custrecord_sales_out_serial_number', 'isnot', 'SERVICE'],
				'and', ['custrecord_sales_out_serial_number', 'isnot', 'NON SERIALIZED'],
				'and', ['custrecord_sales_out_original_trans', 'anyOf', transcheck],
				'and', ['custrecord_sales_out_install_base',  'is', currentInstallBaseId]
			];

			var columns = [];
			columns.push(new nlobjSearchColumn("created").setSort());

			search = nlapiSearchRecord('customrecord_sales_out', null, filterExpression, columns) || false;
			nlapiLogExecution('DEBUG', 'Sales Out Updates Search ', search);
			
			var datePref = nlapiGetContext().getPreference('DATEFORMAT');
			
			if (search && search.length > 0)
			{
				resultCount = search.length;
				nlapiLogExecution('DEBUG', 'Result Count ', resultCount);
				for (var k = 0; k < resultCount; k++)
				{
					var id = search[k].getId();
					for (var m in customerValues)
					{
						if (customerValues[m].hasOwnProperty('sokey'))
						{
							nlapiSubmitField('customrecord_sales_out', id, customerValues[m]['sokey'], salesOut.getFieldValue(customerValues[m]['sokey']));
						}
					}
				}
			}
				}

				nlapiLogExecution('DEBUG', 'Type/Ex/Man', type + ', ' + executionContext + ', ' + manualAdjustment);

			if (type == 'create' && manualAdjustment == false && (executionContext == 'userinterface' || executionContext == 'csvimport'))
			{
				nlapiLogExecution('DEBUG', 'entered the ui context in edit mode', type + ', ' + executionContext);
				try
				{
					valid = validateSalesOut('uiedit', null, 'aftersubmit');
					if (valid && currentInstallBaseId != null && currentInstallBaseId != '')
					{
						salesOut.setFieldValue('custrecord_sales_out_install_base', currentInstallBaseId);
						//setInstallBaseSalesOut(parentInstallBase, salesOutId);
						//adjustEndDate(currentInstallBaseId, new Date(salesOutDate), salesOutAmount);
						adjustEndDate(currentInstallBaseId, moment(salesOutDate, datePref), salesOutAmount);
					}
				}
				catch (f)
				{
					nlapiLogExecution('DEBUG', 'validation failed', f);
					//throw f;
					return false;
				}
			}
			else
			{
				if (manualAdjustment == false && (executionContext == 'userinterface' || executionContext == 'csvimport'))
				{
					nlapiLogExecution('DEBUG', '2. context: partner portal | parent Install Base', parentInstallBase);
					nlapiLogExecution("DEBUG", "currentInstallBaseId", currentInstallBaseId);
					if (currentInstallBaseId != null && currentInstallBaseId != '' && ibSalesOrderLineId)
					{
						salesOut.setFieldValue('custrecord_sales_out_install_base', currentInstallBaseId);
						//setInstallBaseSalesOut(parentInstallBase, salesOutId);
						//adjustEndDate(currentInstallBaseId, new Date(salesOutDate), salesOutAmount);
						adjustEndDate(currentInstallBaseId, moment(salesOutDate, datePref), salesOutAmount);
					}
				}
			}
		}
	}
	//}
	//catch(e)
	//{
	//	nlapiLogExecution('AUDIT','afterSubmitSalesOut',e);
	//}
}

// function setRevRecSchedule(createdfrom, salesOutDate)
// {
// 	try
// 	{
// 		var invoiceRecord = nlapiLoadRecord("invoice", createdfrom);
// 		var lineCount = invoiceRecord.getLineItemCount("item");
//
// 		for (var j = 1; j <= lineCount; j++)
// 		{
// 			var revrechshedulecheck = invoiceRecord.getLineItemValue("item", "revrecschedule", j);
// 			nlapiLogExecution('DEBUG', 'rev rec schedule check ', revrechshedulecheck);
//
// 			if (revrechshedulecheck)
// 			{
// 				var revRecFilters = [];
// 				revRecFilters.push(new nlobjSearchFilter('internalid', 'transaction', 'is', createdfrom));
//
// 				var revRecSearch = nlapiSearchRecord('revRecSchedule', null, revRecFilters, null);
// 				nlapiLogExecution('DEBUG', 'rev rec schedule search ', revRecSearch);
//
// 				if (revRecSearch)
// 				{
// 					var revRecSchedule = nlapiLoadRecord(revRecSearch[0].getRecordType(), revRecSearch[0].getId());
// 					var startDate = revRecSchedule.getFieldValue('startdate');
// 					nlapiLogExecution('DEBUG', 'start date ', startDate);
// 					var endDate = revRecSchedule.getFieldValue('enddate');
// 					nlapiLogExecution('DEBUG', 'end date ', endDate);
// 					var length = parseInt(revRecSchedule.getFieldValue('amortizationperiod'));
//
// 					//var dateTime = a.format("MM/DD/YYYY");
//
// 					var start = moment(startDate, "MM-DD-YYYY");
//
// 					var end = moment(salesOutDate, "MM-DD-YYYY");
// 					var durator = end.diff(start, 'days', false);
// 					nlapiLogExecution('DEBUG', 'day duration ', durator);
// 					var newEndDate = moment(endDate, "MM-DD-YYYY").add(durator, 'days');
// 					nlapiLogExecution('DEBUG', 'new end date ', newEndDate.format("MM-DD-YYYY"));
// 					revRecSchedule.setFieldValue('startdate', salesOutDate);
// 					revRecSchedule.setFieldText('enddate', newEndDate.format("MM-DD-YYYY"));
// 					revRecSchedule.setFieldText('status', 'In Progress');
// 					var accountingPeriodCheck = nlapiLookupField('accountingperiod', '272', 'startdate', false);
// 					nlapiLogExecution('DEBUG', 'accounting period check ', accountingPeriodCheck);
// 					nlapiLogExecution('DEBUG', 'sales out date ', salesOutDate);
//
// 					var columns = [];
// 					columns.push(new nlobjSearchColumn('startdate'));
// 					columns.push(new nlobjSearchColumn('enddate'));
// 					columns.push(new nlobjSearchColumn('periodname'));
//
// 					var filters = [];
// 					filters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', salesOutDate));
// 					filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', salesOutDate));
// 					filters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
// 					filters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));
// 					filters.push(new nlobjSearchFilter('alllocked', null, 'is', 'F'));
//
// 					var accountingPeriodSearch = nlapiSearchRecord('accountingperiod', null, filters, columns);
// 					nlapiLogExecution('DEBUG', 'accounting period search ', accountingPeriodSearch);
// 					if (accountingPeriodSearch)
// 					{
// 						nlapiLogExecution('DEBUG', 'accounting period search length ', accountingPeriodSearch.length);
//
// 						var startDate = accountingPeriodSearch[0].getValue('startdate');
// 						nlapiLogExecution('DEBUG', 'start date period search ', startDate);
//
// 						var endDate = accountingPeriodSearch[0].getValue('enddate');
// 						nlapiLogExecution('DEBUG', 'end date period search ', endDate);
//
// 						var periodName = accountingPeriodSearch[0].getValue('periodname');
// 						nlapiLogExecution('DEBUG', 'period name period search ', periodName);
//
// 						var internalId = parseInt(accountingPeriodSearch[0].getId());
// 						nlapiLogExecution('DEBUG', 'period name period search ', periodName);
// 					}
//
// 					if (length > 0)
// 					{
// 						var indexCheck = internalId;
// 						var firstIndexCheck = indexCheck;
// 						var lineCount = revRecSchedule.getLineItemCount('recurrence');
// 						var countCompare = 1;
// 						var indexFlag = 'F';
// 						for (var i = 1; i <= lineCount; i++)
// 						{
// 							var periodLock = nlapiLookupField('accountingperiod', indexCheck, 'alllocked');
// 							nlapiLogExecution('DEBUG', 'period lock ', periodLock);
// 							if (periodLock == 'T' && indexFlag == 'F')
// 							{
// 								if (indexFlag == 'F')
// 								{
// 									internalId = internalId - 1;
// 									indexCheck = internalId;
// 									indexFlag = 'T';
// 								}
// 								else
// 								{
// 									indexCheck = internalId;
// 								}
// 							}
// 							nlapiLogExecution('DEBUG', 'indexcheck ', indexCheck + ' i ' + i);
// 							var periodName = nlapiLookupField('accountingperiod', indexCheck, 'periodname');
// 							nlapiLogExecution('DEBUG', 'period name ', periodName);
//
// 							var currentPeriodSet = revRecSchedule.getLineItemValue('recurrence', 'postingperiod', i);
// 							try
// 							{
// 								revRecSchedule.setLineItemValue('recurrence', 'postingperiod', i, indexCheck);
// 								if (periodLock == 'T')
// 								{
// 									indexCheck = internalId;
// 								}
// 								else
// 								{
// 									if (indexFlag == 'F')
// 									{
// 										internalId = internalId + 1;
// 										indexCheck = internalId;
// 									}
// 									else
// 									{
// 										indexCheck = internalId;
// 									}
// 								}
// 							}
// 							catch (ex)
// 							{
// 								nlapiLogExecution('AUDIT', 'Exception', ex);
// 							}
// 						}
// 					}
//
// 					var revScheduleSubmit = nlapiSubmitRecord(revRecSchedule);
// 					nlapiLogExecution('DEBUG', 'rev rec schedule submit ', revScheduleSubmit);
//
// 					return revScheduleSubmit;
// 				}
// 				else
// 				{
// 					return false;
// 				}
// 			}
// 		}
// 	}
// 	catch (ex)
// 	{
// 		nlapiLogExecution('DEBUG', 'rev rec schedule submit error ', ex);
// 		return false;
// 	}
// }

function searchNonSerialTransactionsCogs(itemId, soid)
{
	try
	{
		var columns = [];
		columns.push(new nlobjSearchColumn("item"));
		columns.push(new nlobjSearchColumn("account"));
		columns.push(new nlobjSearchColumn("creditamount"));
		columns.push(new nlobjSearchColumn("debitamount"));
		var filters = [
			new nlobjSearchFilter('createdfrom', null, 'is', soid, null),
			new nlobjSearchFilter('item', null, 'anyof', itemId, null)
		];

		nlapiLogExecution('DEBUG', 'createReversalJEs function');
		filters.push(new nlobjSearchFilter('type', 'account', 'anyof', 'COGS', null));
		var r = nlapiSearchRecord('transaction', null, filters, columns); // todo copy saved search into prod

		//Take the grouping out and take the accounts and add the amounts
		var nonserialcogs = 0;
		if (r && r.length > 0)
		{
			for (var i = 0; i < r.length; i++)
			{
				var creditAmt = parseFloat(r[i].getValue('creditamount'));
				nlapiLogExecution('DEBUG', 'createReversalJEs1 creditAmt', creditAmt);

				var debitAmt = parseFloat(r[i].getValue('debitamount'));
				nlapiLogExecution('DEBUG', 'createReversalJEs1 debitAmt', debitAmt);

				var item = r[i].getValue('item');
				nlapiLogExecution('DEBUG', 'createReversalJEs1 itemId', itemId);

				var debitAcct = r[i].getValue('account');
				nlapiLogExecution('DEBUG', 'createReversalJEs1 debitAcct', debitAcct);

				var trxType = r[i].getRecordType();
				nlapiLogExecution('DEBUG', 'record type ', trxType);

				if (itemId == item && trxType == 'itemfulfillment' && !isNaN(debitAmt) && debitAmt > 0 && debitAcct)
				{
					nonserialcogs = parseFloat(debitAmt);
				}
			}

			if (nonserialcogs > 0)
			{
				return nonserialcogs;
			}
		}
	}
	catch (ex)
	{
		nlapiLogExecution('DEBUG', 'error getting non-serialized fulfillment transactions ', ex);
	}
}


function searchNonSerialTransactionsRev(itemId, soid)
{
	try
	{
		var columns = [];
		columns.push(new nlobjSearchColumn("item"));
		columns.push(new nlobjSearchColumn("account"));
		columns.push(new nlobjSearchColumn("creditamount"));
		columns.push(new nlobjSearchColumn("debitamount"));
		var filters = [
			new nlobjSearchFilter('internalid', null, 'anyof', soid, null),
			new nlobjSearchFilter('item', null, 'anyof', itemId, null)
		];

		filters.push(new nlobjSearchFilter('type', 'account', 'anyof', 'Income', null));
		var r = nlapiSearchRecord('transaction', null, filters, columns); // todo copy saved search into prod

		//Take the grouping out and take the accounts and add the amounts
		if (r && r.length > 0)
		{
			var revnonserial = 0;
			for (var i = 0; i < r.length; i++)
			{
				var creditAmt = parseFloat(r[i].getValue('creditamount'));
				nlapiLogExecution('DEBUG', 'createReversalJEs2 creditAmt', creditAmt);

				var debitAmt = parseFloat(r[i].getValue('debitamount'));
				nlapiLogExecution('DEBUG', 'createReversalJEs2 debitAmt', debitAmt);

				var item = r[i].getValue('item');
				nlapiLogExecution('DEBUG', 'createReversalJEs2 itemId', itemId);

				var debitAcct = r[i].getValue('account');
				nlapiLogExecution('DEBUG', 'createReversalJEs2 debitAcct', debitAcct);

				var trxType = r[i].getRecordType();
				nlapiLogExecution('DEBUG', 'record type2 ', trxType);

				if (itemId == item && trxType == 'salesorder' && !isNaN(creditAmt) && creditAmt > 0 && debitAcct)
				{
					revnonserial = creditAmt;
				}
			}

			if (revnonserial > 0)
			{
				return revnonserial;
			}
		}
	}
	catch (ex)
	{
		nlapiLogExecution('DEBUG', 'error getting non-serialized so transactions ', ex);
	}
}

function getSalesOutInvoice(ibid)
{
	var ibRec, originalSO, invoiceRec, filters, columns, search, resultCount;
	ibRec = nlapiLoadRecord('customrecord_installed_base', ibid);
	originalSO = ibRec.getFieldValue('custrecord_ib_original_so');
	if(originalSO)
	{
		filters = [new nlobjSearchFilter('createdfrom', null, 'is', originalSO), new nlobjSearchFilter('mainline', null, 'is', 'T')];
		//columns	= [new nlobjSearchColumn('recognizedrevenue')];
		search = nlapiSearchRecord('invoice', null, filters, null) || false;
		if (search && search.length)
		{
			resultCount = search.length;
			invoiceRec = nlapiLoadRecord('invoice', search[0].getId());
			return invoiceRec;
		}
	}
}

function itemIsService(item)
{
	if (item.getFieldValue('custitem_ams') == 'T')
	{
		return true;
	}
}

function makeDateAdjustment(adjustment, fields)
{
	var endDateAdjustment, newEndDate, submitValues, currentStartDate, currentEndDate;
	currentStartDate = new Date(adjustment.start);
	currentEndDate = new Date(adjustment.end);
	endDateAdjustment = dateDiffInDays(currentStartDate, adjustment.salesoutdate);
	newEndDate = incrementDate(currentEndDate, endDateAdjustment);
	submitValues = [nlapiDateToString(adjustment.salesoutdate), nlapiDateToString(newEndDate)];
	nlapiLogExecution('DEBUG','makeDateAdjustment','fields: ' + JSON.stringify(fields));
	nlapiLogExecution('DEBUG','makeDateAdjustment','submitValues: ' + JSON.stringify(submitValues));
	try
	{
		nlapiSubmitField(adjustment.recordtype, adjustment.id, fields, submitValues);
	}
	catch (f)
	{
		nlapiLogExecution('DEBUG', 'submit fields falied', f);
	}
}

function adjustInstallBaseDates(ibRec, salesOutDate)
{
	var serviceContracts;
	serviceContracts = {
		//'custrecord_ib_software_warranty_start': ibRec.getFieldValue('custrecord_ib_software_warranty_start'),
		//'custrecord_ib_standard_warranty_start': ibRec.getFieldValue('custrecord_ib_standard_warranty_start'),
		'custrecord_ib_ams_start_date': ibRec.getFieldValue('custrecord_ib_ams_start_date'),
		//'custrecord_ib_software_warranty_end': ibRec.getFieldValue('custrecord_ib_software_warranty_end'),
		//'custrecord_ib_software_warranty_end': ibRec.getFieldValue('custrecord_ib_software_warranty_end'),
		'custrecord_ib_ams_end_date': ibRec.getFieldValue('custrecord_ib_ams_end_date')
	}
	var fields = [],
		adjustment = {};
	adjustment.recordtype = 'customrecord_installed_base';
	adjustment.salesoutdate = salesOutDate;
	nlapiLogExecution('DEBUG','adjustInstallBaseDates','salesOutDate: ' + salesOutDate);
	adjustment.id = ibRec.getFieldValue('id');
	for (var i in serviceContracts)
	{
		var service = serviceContracts[i];
		if (service != null && service != '')
		{
			fields.push(i);
			if (i.match(/start/))
			{
				adjustment.start = serviceContracts[i];
			}
			if (i.match(/end/))
			{
				adjustment.end = serviceContracts[i];
			}
		}
	}
	makeDateAdjustment(adjustment, fields);

	nlapiSubmitField('customrecord_installed_base', ibRec, 'custrecord_ib_parent_lastmodified', new Date());
}

/*
4.	The Sales Out record (one being imported) is set on all child, grandchild, etc. Install Base records in the Install Base hierarchy.

4. changed to:  generate a sales out record for each install base records in the install base hierarchy,
based on data from current install base in hierarchy and the imported sales out

4. changed again to: generate a sales out for each install base in the tree if the install base has children, (parents & grandparents only)
*/

function getChildIds(filter)
{
	var filters, columns, search, resultcount, childIds = [];
	filters = [new nlobjSearchFilter('custrecord_parent_installed_base', null, 'is', filter)];
	search = nlapiSearchRecord('customrecord_installed_base', null, filters, null) || false;
	if (search && search.length)
	{
		resultCount = search.length;
		for (var i = 0; i < resultCount; i++)
		{
			childIds.push(search[i].getId());
		}
		return childIds;
	}
	else
	{
		return false;
	}
}

//**************************************************************************************************************************************************************
//* if a sales out is reported and is a parent that has a parent and the top level parent does not have a sales out then create one for the top level parent...*
//**************************************************************************************************************************************************************

function setInstallBaseSalesOut(ibid, salesoutid)
{
	var ibParentId, ibParent, childCount = 0,
		childIds = [],
		originalSalesOut;
	originalSalesOut = nlapiLoadRecord('customrecord_sales_out', salesoutid);
	ibCurrent = nlapiLoadRecord('customrecord_installed_base', ibid);
	ibParentId = getParentInstallBase(ibid);
	ibParent = nlapiLoadRecord('customrecord_installed_base', ibParentId);
	status = originalSalesOut.getFieldValue('custrecord_sales_out_status');

	salesOutDate = originalSalesOut.getFieldValue('custrecord_sales_out_date');
	dateArray = salesOutDate.split('/');
	month = parseInt(dateArray[1]) + 1;
	dateArray[1] = month;
	dateString = dateArray.join(',');

	generateSalesOutFromIB(ibParent, originalSalesOut, status);
	//adjustInstallBaseDates(ibParent, new Date(dateString));

	childIds = getChildIds(ibParentId);
	childCount = childIds.length;
	nlapiLogExecution('DEBUG', 'number of children', childCount);

	if (childCount > 0)
	{
		//we have a top level parent here
		for (var i = 0; i < childCount; i++)
		{
			var ibChildId, ibChild;
			ibChildId = childIds[i];
			ibChild = nlapiLoadRecord('customrecord_installed_base', ibChildId);
			grandChildIds = getChildIds(ibChildId);
			grandChildCount = grandChildIds.length;
			nlapiLogExecution('DEBUG', 'number of grandchildren', grandChildCount);
			nlapiLogExecution('DEBUG', 'ib child id for  ' + i, ibChildId);
			if (grandChildIds && grandChildCount > 0)
			{
				generateSalesOutFromIB(ibChild, originalSalesOut, status);
				//adjustInstallBaseDates(ibChild, new Date(dateString));
			}
		}
	}
}

function generateSalesOutFromIB(ibRec, orgSalesOut, status)
{

	var saleOutKeys, relatedSO, soFields, ibSerial, ibName, entityName, custNumber, custName, endCustomer, firstName, lastName, lineCount, email, phone, memo, relatedSoLine, salesRegion, lineQty, lineRate, dateOfOriginalSalesOut, originalSalesOutCustomer, ibKeyVals, newSalesOut, newSalesOutId, fieldCount, initValues;

	ibSerial = ibRec.getFieldValue('custrecord_ib_serial_number');
	ibName = ibRec.getFieldValue('name');
	ibItem = ibRec.getFieldValue('custrecord_ib_item');
	relatedSO = nlapiLoadRecord('salesorder', ibRec.getFieldValue('custrecord_ib_original_so'));
	soFields = JSON.parse(JSON.stringify(relatedSO));
	nlapiLogExecution('DEBUG', '(Log 607) sales order fields', JSON.stringify(soFields));
	nlapiLogExecution('DEBUG', 'Related Filter  ', relatedSO.getFieldValue("custbody_ship_customer_filtered"));
	var shipCustomerCheck = relatedSO.getFieldValue("custbody_ship_customer_filtered");
	entityName = soFields.entity['name'];
	if (shipCustomerCheck)
	{
		entityName = nlapiLookupField("customrecord_relationship", relatedSO.getFieldValue("custbody_ship_customer_filtered"), "custrecord_relationship_ship_to_customer", true) || soFields.entity['name'] || '';
	}
	nlapiLogExecution('DEBUG', 'Entity Name ', entityName);
	entity = soFields.entity['internalid'] || '';
	custNumber = entityName.substr(0, entityName.indexOf(' ')) || '';
	custName = relatedSO.getFieldValue('custbody_ship_to_contact') || '';
	endCustomer = relatedSO.getFieldValue('custbody_end_customer') || '';
	if (custName)
	{
		firstName = nlapiLookupField("contact", custName, "firstname");
		lastName = nlapiLookupField("contact", custName, "lastname");
	}
	else
	{
		firstName = '';
		lastName = '';
	}
	lineCount = relatedSO.getLineItemCount('item');
	email = soFields.custbody_end_customer_email_address || 'noemail@salesorder.com';
	phone = soFields.custbody_ship_to_contact_phone || '';
	memo = soFields.memo || '';
	ibId = ibRec.getFieldValue('id');
	salesRegion = soFields.salesrep || '';

	nlapiLogExecution('DEBUG', 'ibid', ibId);

	relatedSoLine = ibRec.getFieldValue('custrecord_ib_original_so_line') || getLineItem(relatedSO, 'item', 'item', ibItem);
	var relatedSoLineIndex = relatedSO.findLineItemValue('item', 'custcol_line_id', relatedSoLine)

	salesRegion = relatedSO.getFieldValue('custbody_om_salesperson') || '';

	addr1 = soFields.shippingaddress['addr1'] || '';
	addr2 = soFields.shippingaddress['addr2'] || '';
	addr3 = soFields.shippingaddress['addr3'] || '';
	addr4 = soFields.shippingaddress['addr4'] || '';
	city = soFields.shippingaddress['city'] || '';
	zip = soFields.shippingaddress['zip'] || '';
	state = soFields.shippingaddress['state'] || '';
	country = soFields.shippingaddress['country']['name'] || '';

	if (relatedSoLine)
	{
		lineQty = 1;
		lineRate = relatedSO.getLineItemValue('item', 'amount', relatedSoLineIndex) || '';
		var quantity = relatedSO.getLineItemValue('item', 'quantity', relatedSoLineIndex) || '';
		lineRate = parseFloat(lineRate) / parseFloat(quantity);
		nlapiLogExecution('AUDIT', 'Calculated Line Rate', lineRate);
		listprice = relatedSO.getLineItemValue('item', 'custcol_custlistprice', relatedSoLineIndex) || '';
	}
	else
	{
		lineQty = 'item not found in transaction';
		lineRate = 'item not found in transaction';
	}
	if (orgSalesOut)
	{
		dateOfOriginalSalesOut = orgSalesOut.getFieldValue('custrecord_sales_out_date');
		originalSalesOutCustomer = orgSalesOut.getFieldValue('custrecord_sales_out_customer');
	}
	else
	{
		dateOfOriginalSalesOut = nlapiDateToString(new Date());
		originalSalesOutCustomer = entity;
	}

	nlapiLogExecution('DEBUG', 'email', email);
	nlapiLogExecution('AUDIT', 'Company Name 5', entityName);
	var ibKeyVals = {
		"custrecord_sales_out_date": dateOfOriginalSalesOut,
		"custrecord_sales_out_customer": originalSalesOutCustomer,
		"custrecord_sales_out_customer_number": originalSalesOutCustomer,
		"custrecord_sales_out_serial_number": ibSerial,
		"custrecord_sales_out_install_base": ibId,
		"custrecord_sales_out_amount": lineRate,
		"custrecord_sales_out_status": status,
		"custrecord_sales_out_sales_region": salesRegion,
		"custrecord_sales_out_upl": "",
		"custrecord_sales_out_sold_thru_reseller": "",
		"custrecord_sales_out_reseller_po_number": soFields.otherrefnum,
		"custrecord_sales_out_first_name": firstName,
		"custrecord_sales_out_last_name": lastName,
		"custrecord_sales_out_company_name": entityName,
		"custrecord_sales_out_phone": phone,
		"custrecord_sales_out_email": email,
		"custrecord_sales_out_address_1": addr1,
		"custrecord_sales_out_address_2": addr2,
		"custrecord_sales_out_address_3": addr3,
		"custrecord_sales_out_address_4": addr4,
		"custrecord_sales_out_city": city,
		"custrecord_sales_out_state": state,
		"custrecord_sales_out_zip": zip,
		"custrecord_sales_out_country": country,
		"custrecord_sales_out_province": null,
		"custrecord_sales_out_county": null,
		"custrecord_sales_out_strategic_reseller": null,
		"custrecord_sales_out_sf_partner_number": null,
		"custrecord_sales_out_messages": memo,
		"custrecord_sales_out_virearnings": null,
		"custrecord_sales_out_quantity": parseInt(lineQty),
		"custrecord_sales_out_list_price": listprice,
		"custrecord_sales_out_item": ibItem,
		"custrecord_sales_out_original_trans": ibRec.getFieldValue('custrecord_ib_original_so'),
		"custrecord_sales_out_original_line_num": relatedSoLine
	};

	newSalesOut = nlapiCreateRecord('customrecord_sales_out');
	for (var k in ibKeyVals)
	{
		try
		{
			newSalesOut.setFieldValue(k, ibKeyVals[k]);
		}
		catch (r)
		{
			nlapiLogExecution('DEBUG', 'failed to set sales out value', r);
		}
	}
	newSalesOutId = nlapiSubmitRecord(newSalesOut, true);

	nlapiLogExecution('DEBUG', '2, sales out made in generateSalesOutFromIB function', newSalesOutId);
}

//retuns the line id for the line found in specified 'rec' in the specified 'subtab' whose specified 'field' has the specified 'value'
function getLineItem(rec, sublist, field, value)
{
	var numLines = rec.getLineItemCount(sublist);
	nlapiLogExecution('DEBUG', 'item count', numLines);
	if (numLines > 0)
	{
		for (var i = 0; i < numLines; i++)
		{
			nlapiLogExecution('DEBUG', 'values', rec.getFieldValue('id') + ' | ' + sublist + ' | ' + field + ' | ' + value);
			var currentLineItem = rec.getLineItemValue(sublist, field, i + 1);
			nlapiLogExecution('DEBUG', 'value', value);
			nlapiLogExecution('DEBUG', 'current line item', currentLineItem);
			if (currentLineItem == value)
			{
				return i + 1;
			}
			else
			{
				nlapiLogExecution('DEBUG', 'no matching installbase on sales order line');
				return false;
			}
		}
	}
}

//occurs after submit for an invoice record if there is a non-serialized line item, drop shipment item
function afterSubmitInvoice(type)
{
	try
	{
		if (type != 'delete' && type == 'create')
		{
			var invoiceId, invoice;
			invoiceId = nlapiGetRecordId();
			invoice = nlapiLoadRecord('invoice', invoiceId);
			invoiceAutoSalesoutItem(invoice);
		}
	}
	catch(e)
	{
		nlapiLogExecution('AUDIT','afterSubmitInvoice',e);
	}
}

//generates a sales out for invoice items if they qualify for auto sales out generation
function invoiceAutoSalesoutItem(invoice){

	var lineCount, invoiceFields, currentLine, customerInfo, invoiceId, entityName, tempName, custNumber, custName, salesRegion, firstName, lastName, strategicReseller, companyName, initValues, orgTransm, dropShipItem, phone;

	salesRegion = invoice.getFieldValue('custbody_om_salesperson') || '';
	invoiceFields = JSON.parse(JSON.stringify(invoice));
	serial = 'NON SERIALIZED';
	entityName = invoiceFields.entity['name'];
	entity = invoiceFields.entity['internalid'];
	nlapiLogExecution('DEBUG', 'entity', entity);
	custNumber = entityName.substr(0, entityName.indexOf(' '));
	custName = invoice.getFieldValue('custbody_ship_to_contact') || '';
	companyName = invoice.getFieldText('custbody_ship_to_customer') || '';
	phone = invoice.getFieldValue('custbody_ship_to_contact_phone') || '';
	endCustomer = invoice.getFieldValue('custbody_end_customer') || '';


	nlapiLogExecution('DEBUG', 'Cust Name ', custName);
	if(endCustomer){
		if(custName){
			firstName = nlapiLookupField("contact", custName, "firstname");
			lastName = nlapiLookupField("contact", custName, "lastname");
		}
		companyName = nlapiLookupField("customer", endCustomer, "companyname");
	}
	else if (custName){
		firstName = nlapiLookupField("contact", custName, "firstname");
		lastName = nlapiLookupField("contact", custName, "lastname");
		companyName = nlapiLookupField("contact", custName, "entityid");
	}
	else{
		firstName = '';
		lastName = '';
	}

	nlapiLogExecution('DEBUG', 'First Name ', firstName);

	nlapiLogExecution('DEBUG', 'Last Name ', lastName);
	lineCount = invoice.getLineItemCount('item');
	nlapiLogExecution('DEBUG', 'line count', lineCount);
	custEmail = nlapiLookupField('customer', invoice.getFieldValue('entity'), 'email') || null;
	salesoutdate = invoiceFields.trandate || nlapiDateToString(new Date());
	strategicReseller = invoice.getFieldValue('billaddressee') || '';

	addr1 = invoiceFields.shippingaddress['addr1'] || '';
	addr2 = invoiceFields.shippingaddress['addr2'] || '';
	addr3 = invoiceFields.shippingaddress['addr2'] || '';
	addr4 = invoiceFields.shippingaddress['addr4'] || '';
	city = invoiceFields.shippingaddress['city'] || '';
	zip = invoiceFields.shippingaddress['zip'] || '';
	state = invoiceFields.shippingaddress['state'] || '';
	country = invoiceFields.shippingaddress['country']['name'] || '';
	memo = invoiceFields.memo || '';
	orgTrans = invoice.getFieldValue('id');
	var statuscheck = invoice.getFieldText("custbody_tno_order_type");
	var status = STATUS_SOLD_OUT;
	if (statuscheck == 'GDP Order')
	{
		status = STATUS_PENDING;
	}
	//'name': serial,
	nlapiLogExecution('AUDIT', 'Company Name 6', companyName);
	initValues = {
		'custrecord_sales_out_address_1': addr1,
		'custrecord_sales_out_address_2': addr2,
		'custrecord_sales_out_city': city,
		'custrecord_sales_out_company_name': companyName,
		'custrecord_sales_out_country': country,
		'custrecord_sales_out_customer': entity,
		'custrecord_sales_out_customer_number': entity,
		'custrecord_sales_out_date': salesoutdate,
		'custrecord_sales_out_email': custEmail,
		'custrecord_sales_out_first_name': firstName,
		'custrecord_sales_out_last_name': lastName,
		'custrecord_sales_out_messages': memo,
		'custrecord_sales_out_phone': phone,
		'custrecord_sales_out_state': state,
		'custrecord_sales_out_status': status,
		'custrecord_sales_out_zip': zip,
		'custrecord_sales_out_sales_region': salesRegion,
		'custrecord_sales_out_serial_number': serial,
		'custrecord_sales_out_amount': 0.00,
		'custrecord_sales_out_quantity': 0,
		'custrecord_sales_out_list_price': 0.00,
		'custrecord_sales_out_strategic_reseller': '',
		'custrecord_sales_out_original_trans': orgTrans,
		'custrecord_sales_out_original_line_num': '',
		'custrecord_sales_out_item': ''
	};

	//dropShipItem = invoice.getFieldValue('custbody_drop_ship_order');

	for (var j = 0; j < lineCount; j++)
	{
		var currentRate, serialNumber, invoiceItem, itemType, itemRec, newSalesOut, newSaleOutId, lineid, listPrice;
		lineid = invoice.getLineItemValue('item', 'custcol_line_id', j + 1);
		nlapiLogExecution('DEBUG', 'line id', lineid);
		serialNumber = 'NON SERIALIZED';
		initValues.custrecord_sales_out_original_line_num = lineid;
		initValues.custrecord_sales_out_serial_number = serialNumber;
		initValues.custrecord_sales_out_quantity = parseInt(invoice.getLineItemValue('item', 'quantity', j + 1));

		var quantity = invoice.getLineItemValue('item', 'quantity', j + 1);
		var amount = invoice.getLineItemValue('item', 'amount', j + 1);
		nlapiLogExecution('DEBUG', 'Quan/Amt:', quantity + ' / ' + amount);
		currentRate = parseFloat(amount) / parseFloat(quantity);
		nlapiLogExecution('DEBUG', 'Rate 1', currentRate);
		invoiceItem = invoice.getLineItemValue('item', 'item', j + 1);
		initValues.custrecord_sales_out_item = invoiceItem;
		listPrice = invoice.getLineItemValue('item', 'custcol_custlistprice', j + 1);
		initValues.custrecord_sales_out_amount = currentRate;
		itemType = determineItemType(nlapiLookupField('item', invoiceItem, 'type')) || false;
		initValues.custrecord_sales_out_serial_number = serialNumber;

		nlapiLogExecution('DEBUG', 'serial number', serialNumber + itemType);

		if (itemType)
		{
			itemRec = nlapiLoadRecord(itemType, invoiceItem);
			nonSerialized = itemRec.getFieldValue('custitem_serial_number_generation');
			serviceItem = itemRec.getFieldValue('custitem_ams');
			nlapiLogExecution('DEBUG', 'is it for service item?', serviceItem);
		}

		nlapiLogExecution('DEBUG', 'checks to create sales out', 'current rate: ' + currentRate + ' service item: ' + serviceItem + ' nonSerialized: ' + nonSerialized);

		if (currentRate != null  &&  (nonSerialized == '2' || nonSerialized == '9' || ((nonSerialized == null || nonSerialized == '') && serviceItem == 'F')))
		{
			try
			{
				nlapiLogExecution('DEBUG', 'found an invoice that needs an auto sales out', 'yay?');
				initValues.custrecord_sales_out_list_price = listPrice;
				initValues.custrecord_sales_out_status = STATUS_SOLD_OUT;
				nlapiLogExecution('DEBUG', 'list price', initValues.custrecord_sales_out_list_price);
				if (initValues.custrecord_sales_out_quantity > 0)
				{
					newSalesOut = nlapiCreateRecord('customrecord_sales_out');
					for (var i in initValues)
					{
						newSalesOut.setFieldValue(i, initValues[i]);
					}
					newSalesOutId = nlapiSubmitRecord(newSalesOut, true);

					nlapiLogExecution('DEBUG', '2.5, sales out made from invoice', newSalesOutId);

					invoice.setLineItemValue('item', 'custcol_auto_sales_out', j + 1, newSalesOutId);
				}
			}
			catch (ex)
			{
				nlapiLogExecution('DEBUG', '2.5, error ', ex);
			}
		}
		/* AJA - 6/20/2015 - spoke to Sailaja, now created when service contract lines are saved, comment out this code - no longer needed
		else if (currentRate != null && serviceItem == 'T')
		{
			initValues.custrecord_sales_out_list_price = listPrice;
			initValues.custrecord_sales_out_serial_number = 'SERVICE';
			if (initValues.custrecord_sales_out_quantity > 0)
			{
				newSalesOut = nlapiCreateRecord('customrecord_sales_out');
				for (var i in initValues)
				{
					try
					{
						newSalesOut.setFieldValue(i, initValues[i]);
					}
					catch (ex)
					{
					}
				}
				newSalesOutId = nlapiSubmitRecord(newSalesOut, true);
				nlapiLogExecution('DEBUG', '3, sales out made from invoice', newSalesOutId);
				invoice.setLineItemValue('item', 'custcol_auto_sales_out', j + 1, newSalesOutId);
			}
		}
		*/
	}
	nlapiSubmitRecord(invoice);
}



function setSalesOutValuesSerial(so, salesOut, context)
{
	var lineCount, soFields, currentLine, customerInfo, invoiceId, entityName, tempName, custNumber, custName, salesRegion, firstName, lastName, strategicReseller, companyName, initValues, orgTransm, dropShipItem, phone;

	var so = nlapiLoadRecord("salesorder", so);

	salesRegion = so.getFieldValue('custbody_om_salesperson') || '';
	soFields = JSON.parse(JSON.stringify(so));
	serial = 'NON SERIALIZED';
	entityName = soFields.entity['name'];
	entity = soFields.entity['internalid'];
	nlapiLogExecution('DEBUG', 'entity', entity);
	custNumber = entityName.substr(0, entityName.indexOf(' '));
	custName = so.getFieldValue('custbody_ship_to_contact') || '';
	companyName = so.getFieldText('custbody_ship_to_customer') || '';
	nlapiLogExecution('DEBUG', 'Cust Name ', custName);
	if (custName && context != 'csvimport')
	{
		firstName = nlapiLookupField("contact", custName, "firstname");
		lastName = nlapiLookupField("contact", custName, "lastname");
		companyName = nlapiLookupField("contact", custName, "entityid");
	}
	else
	{
		firstName = '';
		lastName = '';
	}

	nlapiLogExecution('DEBUG', 'First Name ', firstName);
	nlapiLogExecution('DEBUG', 'Last Name ', lastName);
	lineCount = so.getLineItemCount('item');
	nlapiLogExecution('DEBUG', 'line count', lineCount);
	if (custName && context != 'csvimport')
	{
	custEmail = nlapiLookupField('customer', so.getFieldValue('entity'), 'email') || null;
	}
	else{

		custEmail = '';
	}
	salesoutdate = soFields.trandate || nlapiDateToString(new Date());
	strategicReseller = so.getFieldValue('billaddressee') || '';

	addr1 = soFields.shippingaddress['addr1'] || '';
	addr2 = soFields.shippingaddress['addr2'] || '';
	addr3 = soFields.shippingaddress['addr2'] || '';
	addr4 = soFields.shippingaddress['addr4'] || '';
	city = soFields.shippingaddress['city'] || '';
	zip = soFields.shippingaddress['zip'] || '';
	state = soFields.shippingaddress['state'] || '';

	if (custName && context != 'csvimport')
	{
	country = soFields.shippingaddress['country']['name'] || '';
	phone = soFields.custbody_ship_to_contact_phone
	}else{

		country = '';
		phone = '';

	}
	memo = soFields.memo || '';
	orgTrans = so.getFieldValue('internalid');
	var statuscheck = so.getFieldText("custbody_tno_order_type");
	var status = STATUS_SOLD_OUT;
	nlapiLogExecution('AUDIT', 'Company Name 7', companyName);
	//'name': serial,
	initValues = {
		'custrecord_sales_out_status': status,
		'custrecord_sales_out_address_1': addr1,
		'custrecord_sales_out_address_2': addr2,
		'custrecord_sales_out_city': city,
		'custrecord_sales_out_company_name': companyName,
		'custrecord_sales_out_country': country,
		'custrecord_sales_out_email': custEmail,
		'custrecord_sales_out_first_name': firstName,
		'custrecord_sales_out_last_name': lastName,
		'custrecord_sales_out_messages': memo,
		'custrecord_sales_out_phone': phone,
		'custrecord_sales_out_state': state,
		'custrecord_sales_out_status': status,
		'custrecord_sales_out_zip': zip,
		'custrecord_sales_out_strategic_reseller': strategicReseller,
		'custrecord_sales_out_sf_partner_number': null,
		'custrecord_sales_out_date': salesoutdate,
		'custrecord_sales_out_customer': entity,
		'custrecord_sales_out_customer_number': entity,
		'custrecord_sales_out_sales_region': salesRegion
	};

	//dropShipItem = invoice.getFieldValue('custbody_drop_ship_order');

	nlapiLogExecution('DEBUG', 'journal check ', nlapiLookupField('customrecord_sales_out', salesOut.getId(), 'custrecord_sales_out_rec_gdp_journal'));
	for (var i in initValues)
	{
		var fieldValueCheck = salesOut.getFieldValue(i);
		if (fieldValueCheck)
		{
			initValues[i] = fieldValueCheck;
		}
		try
		{
			salesOut.setFieldValue(i, initValues[i]);
		}
		catch (ex)
		{
			nlapiLogExecution('DEBUG', 'Error Setting Field Values ', ex);
		}

	}
	if (initValues)
	{
		return initValues;
	}
	else
	{
		return false;
	}

}

function setSalesOutValuesNonSerial(so, salesOut)
{
	var lineCount, soFields, currentLine, customerInfo, invoiceId, entityName, tempName, custNumber, custName, salesRegion, firstName, lastName, strategicReseller, companyName, initValues, orgTransm, dropShipItem;

	var so = nlapiLoadRecord("salesorder", so);

	salesRegion = so.getFieldValue('custbody_om_salesperson') || '';
	soFields = JSON.parse(JSON.stringify(so));
	serial = 'NON SERIALIZED';
	entityName = soFields.entity['name'];
	entity = soFields.entity['internalid'];
	nlapiLogExecution('DEBUG', 'entity', entity);
	custNumber = entityName.substr(0, entityName.indexOf(' '));
	custName = so.getFieldValue('custbody_ship_to_contact') || '';
	companyName = so.getFieldText('custbody_ship_to_customer') || '';
	nlapiLogExecution('DEBUG', 'Cust Name ', custName);
	if (custName)
	{
		firstName = nlapiLookupField("contact", custName, "firstname");
		lastName = nlapiLookupField("contact", custName, "lastname");
		companyName = nlapiLookupField("contact", custName, "entityid");
	}
	else
	{
		firstName = '';
		lastName = '';
	}

	nlapiLogExecution('DEBUG', 'First Name ', firstName);

	nlapiLogExecution('DEBUG', 'Last Name ', lastName);
	lineCount = so.getLineItemCount('item');
	nlapiLogExecution('DEBUG', 'line count', lineCount);
	custEmail = nlapiLookupField('customer', so.getFieldValue('entity'), 'email') || null;
	salesoutdate = soFields.trandate || nlapiDateToString(new Date());
	strategicReseller = so.getFieldValue('billaddressee') || '';

	addr1 = soFields.shippingaddress['addr1'] || '';
	addr2 = soFields.shippingaddress['addr2'] || '';
	addr3 = soFields.shippingaddress['addr2'] || '';
	addr4 = soFields.shippingaddress['addr4'] || '';
	city = soFields.shippingaddress['city'] || '';
	zip = soFields.shippingaddress['zip'] || '';
	state = soFields.shippingaddress['state'] || '';
	country = soFields.shippingaddress['country']['name'] || '';
	memo = soFields.memo || '';
	orgTrans = so.getFieldValue('internalid');
	var statuscheck = so.getFieldText("custbody_tno_order_type");
	var status = STATUS_SOLD_OUT;
	if (statuscheck == 'GDP Order')
	{
		status = STATUS_PENDING;
	}
	//'name': serial,
	nlapiLogExecution('AUDIT', 'Company Name 8', companyName);
	initValues = {
		'custrecord_sales_out_address_1': addr1,
		'custrecord_sales_out_address_2': addr2,
		'custrecord_sales_out_city': city,
		'custrecord_sales_out_company_name': companyName,
		'custrecord_sales_out_country': country,
		'custrecord_sales_out_customer': entity,
		'custrecord_sales_out_customer_number': entity,
		'custrecord_sales_out_date': salesoutdate,
		'custrecord_sales_out_email': custEmail,
		'custrecord_sales_out_first_name': firstName,
		'custrecord_sales_out_last_name': lastName,
		'custrecord_sales_out_messages': memo,
		'custrecord_sales_out_phone': soFields.custbody_ship_to_contact_phone,
		'custrecord_sales_out_state': state,
		'custrecord_sales_out_status': status,
		'custrecord_sales_out_zip': zip,
		'custrecord_sales_out_sales_region': salesRegion
	};

	//dropShipItem = invoice.getFieldValue('custbody_drop_ship_order');


	//nlapiLogExecution('DEBUG', 'journal check ', nlapiLookupField('customrecord_sales_out', salesOut.getId(), 'custrecord_sales_out_rec_gdp_journal'));
	for (var i in initValues)
	{
		var fieldValueCheck = salesOut.getFieldValue(i);
		if (fieldValueCheck)
		{
			initValues[i] = fieldValueCheck;
		}
		try
		{
			salesOut.setFieldValue(i, initValues[i]);
		}
		catch (ex)
		{
			nlapiLogExecution('DEBUG', 'Error Setting Field Values ', ex);
		}

	}
	if (initValues)
	{
		return initValues;
	}
	else
	{
		return false;
	}

}

function setSalesOutValuesSerialNonDrop(so, salesOut)
{
	var lineCount, soFields, currentLine, customerInfo, invoiceId, entityName, tempName, custNumber, custName, salesRegion, firstName, lastName, strategicReseller, companyName, initValues, orgTransm, dropShipItem;

	var so = nlapiLoadRecord("salesorder", so);

	salesRegion = so.getFieldValue('custbody_om_salesperson') || '';
	soFields = JSON.parse(JSON.stringify(so));
	serial = 'NON SERIALIZED';
	entityName = soFields.entity['name'];
	entity = soFields.entity['internalid'];
	nlapiLogExecution('DEBUG', 'entity', entity);
	custNumber = entityName.substr(0, entityName.indexOf(' '));
	custName = so.getFieldValue('custbody_ship_to_contact') || '';
	companyName = so.getFieldText('custbody_ship_to_customer') || '';
	nlapiLogExecution('DEBUG', 'Cust Name ', custName);
	if (custName)
	{
		firstName = nlapiLookupField("contact", custName, "firstname");
		lastName = nlapiLookupField("contact", custName, "lastname");
		companyName = nlapiLookupField("contact", custName, "entityid");
	}
	else
	{
		firstName = '';
		lastName = '';
	}

	nlapiLogExecution('DEBUG', 'First Name Non Serial Drop ', firstName);

	nlapiLogExecution('DEBUG', 'Last Name Non-Serial Drip ', lastName);
	lineCount = so.getLineItemCount('item');
	nlapiLogExecution('DEBUG', 'line count', lineCount);
	custEmail = nlapiLookupField('customer', so.getFieldValue('entity'), 'email') || null;
	salesoutdate = soFields.trandate || nlapiDateToString(new Date());
	strategicReseller = so.getFieldValue('billaddressee') || '';

	addr1 = soFields.shippingaddress['addr1'] || '';
	addr2 = soFields.shippingaddress['addr2'] || '';
	addr3 = soFields.shippingaddress['addr2'] || '';
	addr4 = soFields.shippingaddress['addr4'] || '';
	city = soFields.shippingaddress['city'] || '';
	zip = soFields.shippingaddress['zip'] || '';
	state = soFields.shippingaddress['state'] || '';
	country = soFields.shippingaddress['country']['name'] || '';
	memo = soFields.memo || '';
	orgTrans = so.getFieldValue('internalid');
	var statuscheck = so.getFieldText("custbody_tno_order_type");
	var status = STATUS_SOLD_OUT;
	nlapiLogExecution('AUDIT', 'Company Name 9', companyName);
	//'name': serial,
	initValues = {
		'custrecord_sales_out_address_1': addr1,
		'custrecord_sales_out_address_2': addr2,
		'custrecord_sales_out_city': city,
		'custrecord_sales_out_company_name': companyName,
		'custrecord_sales_out_country': country,
		'custrecord_sales_out_customer': entity,
		'custrecord_sales_out_customer_number': entity,
		'custrecord_sales_out_date': salesoutdate,
		'custrecord_sales_out_email': custEmail,
		'custrecord_sales_out_first_name': firstName,
		'custrecord_sales_out_last_name': lastName,
		'custrecord_sales_out_messages': memo,
		'custrecord_sales_out_phone': soFields.custbody_ship_to_contact_phone,
		'custrecord_sales_out_state': state,
		'custrecord_sales_out_status': status,
		'custrecord_sales_out_zip': zip,
		'custrecord_sales_out_sales_region': salesRegion
	};

	//dropShipItem = invoice.getFieldValue('custbody_drop_ship_order');


	nlapiLogExecution('DEBUG', 'journal check ', nlapiLookupField('customrecord_sales_out', salesOut.getId(), 'custrecord_sales_out_rec_gdp_journal'));
	for (var i in initValues)
	{
		var fieldValueCheck = salesOut.getFieldValue(i);
		if (fieldValueCheck)
		{
			initValues[i] = fieldValueCheck;
		}
		try
		{
			salesOut.setFieldValue(i, initValues[i]);
		}
		catch (ex)
		{
			nlapiLogExecution('DEBUG', 'Error Setting Field Values ', ex);
		}
	}
	if (initValues)
	{
		return initValues;
	}
	else
	{
		return false;
	}

}

function afterSubmitServiceContractLine(type)
{
	try
	{
		if ((type != 'delete' && type == 'create') || (type != 'delete' && type == 'edit'))
		{
			var serviceContractLineId, serviceContractLine;
			serviceContractLineId = nlapiGetRecordId();
			nlapiLogExecution('DEBUG','Service Contract Line Id ',serviceContractLineId);
			var contractAuto = nlapiLoadRecord('customrecord_service_contract_line', serviceContractLineId, {recordmode:'dynamic'});
			//nlapiLogExecution('DEBUG','Contract Object ',contractAuto);

			if(type == 'create'){

				nlapiLogExecution('DEBUG', 'Create SC Sales Out 1');
				contractLineAutoSalesout(contractAuto);
			}
			else{
				if(contractAuto.getFieldValue('custrecord_create_sales_out') == 'T'){
					nlapiLogExecution('DEBUG', 'Create SC Sales Out 2');
					contractLineAutoSalesout(contractAuto);
				}
			}
		}
	}
	catch(e)
	{
		nlapiLogExecution('AUDIT','afterSubmitServiceContractLine',e);
	}
}

function findLineIemByReference(so, refId)
{
	var lineCount;
	lineCount = so.geLineItemCount('item');
	if (lineCount > 0)
	{
		for (var i = 0; i < lineCount; i++)
		{
			if (nlapiGetLineItemValue('item', 'custcol_service_ref_line_number', i + 1) == refId)
			{
				return i + 1;
			}
		}
	}
}

//creates auto sales outs for a service contract
function contractLineAutoSalesout(sclRec)
{
	var scid, scRec, sclInstallBase, statusCheck, statusCheckVal, manualOvveride, createSalesOut, tempName, soid, soRec, soFields, soLineId, entityName, custNumber, custName, salesRegion, endCustomer, firstName, lastName, lineCount, initValues, customerValues, installBaseRec, ibId, newSalesOutId, sclInstallBase, ibSoRec, lineitem, installBaseRec, ibSoLineId, newSalesOut, rate, qty, listprice, serialnumber, ibHasSalesOut, salesOutToCopy;
	if (sclRec.getFieldValue('custrecord_scl_sc_type') == '3')
	{
		nlapiLogExecution('AUDIT', 'SCL Rec', sclRec.getId());
		sclInstallBase = sclRec.getFieldValue('custrecord_scl_install_base');
		//nlapiLogExecution('DEBUG', 'install base ', sclInstallBase);
		var soRecCheck = sclRec.getFieldValue('custrecord_scl_ib_original_so');
		var origSo = sclRec.getFieldValue('custrecord_scl_sc_origin_transaction');
		if(soRecCheck != null && soRecCheck != ''){
		ibSoRec = nlapiLoadRecord('salesorder', sclRec.getFieldValue('custrecord_scl_ib_original_so'));
		}
		else{
			 ibSoRec = nlapiLoadRecord('salesorder', sclRec.getFieldValue('custrecord_scl_sc_origin_transaction'));
		}
		lineitem = sclRec.getFieldValue('custrecord_scl_ib_item');
		manualOvveride = sclRec.getFieldValue('custrecord_scl_manual_override');
		//nlapiLogExecution('DEBUG', 'init values', JSON.stringify(initValues));
		createSalesOut = sclRec.getFieldValue('custrecord_create_sales_out');
		installBaseRec = nlapiLoadRecord('customrecord_installed_base', sclInstallBase);
		var newSoCust = nlapiLookupField('salesorder', origSo, 'custbody_bill_customer');
		nlapiLogExecution('AUDIT', 'Sales Order', ibSoRec.getId());
		nlapiLogExecution('AUDIT', 'Customer', newSoCust);
		ibSoLineId = installBaseRec.getFieldValue('custrecord_ib_original_so_line'); //getLineItem(rec, sublist, field, value){
		//*************************************************************************************************************************************************************************
		//*************************************************************************************************************************************************************************
		//*************************************************************************************************************************************************************************

		//var relatedSoId = sclRec.getFieldValue('custrecord_scl_sc_origin_transaction');
		//var relatedSo = nlapiLoadRecord('salesorder', relatedSo);
		//var isDropShip = relatedSo.getFieldValue('custbody_drop_ship_order') == 'T' ? true : false;

		//if(isDropShip == true){
		var search, filters, columns, resultCount;
		statusCheck = 'F';
		columns = [new nlobjSearchColumn('custrecord_sales_out_status')];
		filters = [new nlobjSearchFilter('custrecord_sales_out_install_base', null, 'is', sclInstallBase)];

		search = nlapiSearchRecord('customrecord_sales_out', null, filters, columns) || false;
		if (search && search.length > 0)
		{
			resultCount = search.length;
			for (var t = 0; t < resultCount; t++)
			{
				ibHasSalesOut = search[t].getId();
				statusCheckVal = search[t].getValue('custrecord_sales_out_status');
				//nlapiLogExecution('DEBUG', 'status check VAL ', statusCheckVal);
				if(statusCheckVal == '1'){

					statusCheck = 'T';
				}
			}
		}
		else
		{
			ibHasSalesOut = false;
		}
		//}

		salesRegion = ibSoRec.getFieldValue('custbody_om_salesperson') || '';
		newSalesOut = nlapiCreateRecord('customrecord_sales_out');
		rate = sclRec.getFieldValue('custrecord_scl_rate');
		//qty = sclRec.getFieldValue('custrecord_scl_quantity');
		qty = 1;
		listprice = sclRec.getFieldValue('custrecord_scl_listprice');
		serialnumber = installBaseRec.getFieldValue('custrecord_ib_serial_number');
		owner = sclRec.getFieldValue('custrecord_scl_ib_owner');

		customerValues = {
			address_1:
			{
				'sokey': 'custrecord_sales_out_address_1',
				'ibkey': 'custrecord_ib_address_1'
			},
			address_2:
			{
				'sokey': 'custrecord_sales_out_address_2',
				'ibkey': 'custrecord_ib_address_2'
			},
			city:
			{
				'sokey': 'custrecord_sales_out_city',
				'ibkey': 'custrecord_ib_city'
			},
			company_name:
			{
				'sokey': 'custrecord_sales_out_company_name'
			},
			country:
			{
				'sokey': 'custrecord_sales_out_country'
			},
			customer:
			{
				'sokey': 'custrecord_sales_out_customer',
				'ibkey': 'custrecord_ib_end_user'
			},
			customernumber:
			{
				'sokey': 'custrecord_sales_out_customer_number',
				'ibkey': 'custrecord_so_partner_number'
			},
			email:
			{
				'sokey': 'custrecord_sales_out_email',
				'ibkey': 'custrecord_ib_email'
			},
			firstname:
			{
				'sokey': 'custrecord_sales_out_first_name'
			},
			lastname:
			{
				'sokey': 'custrecord_sales_out_last_name'
			},
			messages:
			{
				'sokey': 'custrecord_sales_out_messages'
			},
			phone:
			{
				'sokey': 'custrecord_sales_out_phone',
				'ibkey': 'custrecord_ib_phone'
			},
			state:
			{
				'sokey': 'custrecord_sales_out_state',
				'ibkey': 'custrecord_ib_state'
			},
			zip:
			{
				'sokey': 'custrecord_sales_out_zip',
				'ibkey': 'custrecord_ib_zip'
			}
		};

		initValues = {
			salesoutdate:
			{
				'sokey': 'custrecord_sales_out_date',
				'value': nlapiDateToString(new Date())
			},
			installbase:
			{
				'sokey': 'custrecord_sales_out_install_base',
				'value': sclInstallBase
			},
			salesregion:
			{
				'sokey': 'custrecord_sales_out_sales_region',
				'ibkey': 'custrecord_ib_sales_rep',
				'value': salesRegion
			},
			serialnumber:
			{
				'sokey': 'custrecord_sales_out_serial_number',
				'value': 'SERVICE'
			},
			amount:
			{
				'sokey': 'custrecord_sales_out_amount',
				'value': rate
			},
			reportingdate:
			{
				'ibkey': 'custrecord_ib_reporting_date',
				'value': nlapiDateToString(new Date())
			},
			listprice:
			{
				'sokey': 'custrecord_sales_out_list_price',
				'value': listprice
			},
			quantity:
			{
				'sokey': 'custrecord_sales_out_quantity',
				'value': parseInt(qty)
			},
			customer:
			{
				'sokey': 'custrecord_sales_out_customer',
				'value': newSoCust

			}
		};

		var salesOutCopyDate = nlapiDateToString(new Date());
		newSalesOut.setFieldValue('custrecord_sales_out_date', salesOutCopyDate);
		if (ibHasSalesOut)
		{
			salesOutToCopy = nlapiLoadRecord('customrecord_sales_out', ibHasSalesOut);
			for (var i in customerValues)
			{
				if (customerValues[i].hasOwnProperty('sokey'))
				{
					newSalesOut.setFieldValue(customerValues[i]['sokey'], salesOutToCopy.getFieldValue(customerValues[i]['sokey']));
				}
			}
			initValues.salesoutdate['value'] = salesOutCopyDate;
			//nlapiLogExecution('DEBUG', 'sales out date being copied', initValues.salesoutdate['value']);
			newSalesOut.setFieldValue('custrecord_sales_out_date', salesOutCopyDate);

			if(statusCheck == 'T'){
			newSalesOut.setFieldValue('custrecord_sales_out_status', STATUS_SOLD_OUT);
			}
			else{

			newSalesOut.setFieldValue('custrecord_sales_out_status', STATUS_PENDING);
			}
		}
		else
		{
			newSalesOut.setFieldValue('custrecord_sales_out_status', STATUS_PENDING);
			newSalesOut.setFieldValue('custrecord_sales_out_customer', owner);
		}

		for (var j in initValues)
		{
			if (initValues[j].hasOwnProperty('sokey'))
			{
				newSalesOut.setFieldValue(initValues[j]['sokey'], initValues[j]['value']);
			}
		}

		newSalesOut.setFieldValue('custrecord_original_sales_order',sclRec.getFieldValue('custrecord_scl_sc_origin_transaction'));
		newSalesOut.setFieldValue('custrecord_sales_out_original_trans',sclRec.getFieldValue('custrecord_scl_sc_origin_transaction'));

		newSalesOut.setFieldValue('custrecord_sales_out_original_line_num',sclRec.getFieldValue('custrecord_scl_sc_origin_trans_line'));

		var salesorder = nlapiLookupField('salesorder',sclRec.getFieldValue('custrecord_scl_sc_origin_transaction'),['custbody_om_salesperson']);
		newSalesOut.setFieldValue('custrecord_sales_out_sales_region',salesorder.custbody_om_salesperson);

		var servicecontract = nlapiLookupField('customrecord_service_contract',sclRec.getFieldValue('custrecord_scl_service_contract'),['custrecord_sc_item']);
		newSalesOut.setFieldValue('custrecord_sales_out_item',servicecontract.custrecord_sc_item);
		if(manualOvveride == 'T'){

			newSalesOut.setFieldValue('custrecord_sales_out_manual_adj', 'T');

		}

		if(createSalesOut == 'T'){

			nlapiSubmitField('customrecord_service_contract_line', sclRec.getId(), 'custrecord_create_sales_out', 'F');
		}
		newSalesOutId = nlapiSubmitRecord(newSalesOut, true);

		//nlapiLogExecution('DEBUG', '4, sales out made from service Contract Line', newSalesOutId);
	}
}


//if the date adjustment cannot be more than 60 days....
function afterSubmitInstallBase()
{
	try
	{
		if (type == 'create')
		{
			var serial, relatedSO, dropship, rec, status, salesOutNotExist, newSalesOut;
			rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			serial = rec.getFieldValue('custrecord_ib_serial_number');
			nlapiLogExecution('DEBUG', 'serial number of ib', serial);
			nlapiLogExecution('DEBUG', 'record id', nlapiGetRecordId());
			nlapiLogExecution('DEBUG', 'record type', nlapiGetRecordType());
			nlapiLogExecution('DEBUG', 'got ib rec', rec);
			status = rec.getFieldValue('custrecord_ib_status');
			nlapiLogExecution('DEBUG', 'status of ib', status);
			newSalesOut = false;
			var parentInstallBaseId = rec.getFieldValue('custrecord_parent_installed_base');
			var parentInstallBaseItem, typeChild, typeParent;
			if(parentInstallBaseId){

				typeChild = nlapiLookupField("item", rec.getFieldValue('custrecord_ib_item'), 'custitem_item_type', true);
				//nlapiLogExecution('DEBUG', 'type child ', typeChild);
				nlapiLogExecution('DEBUG', 'parent Install base ', parentInstallBaseId);
				parentInstallBaseItem = nlapiLookupField("customrecord_installed_base", parentInstallBaseId, 'custrecord_ib_item');
				typeParent = nlapiLookupField("item", parentInstallBaseItem, 'custitem_item_type', true);
				//nlapiLogExecution('DEBUG', 'type parent ', typeParent);
				//nlapiLogExecution('DEBUG', 'type child ', typeChild);
			}

			if (parentInstallBaseId == null || parentInstallBaseId == '' || (typeChild == 'Capacity' &&  typeParent == 'Activation'))
			{
				var dropship = nlapiLookupField('salesorder', rec.getFieldValue('custrecord_ib_original_so'), 'custbody_drop_ship_order');
				nlapiLogExecution('DEBUG', 'is drop ship', dropship);
				var positiveSalesOutId = findSalesOut(nlapiGetRecordId(), true);
				nlapiLogExecution('DEBUG', 'positiveSalesOutId', positiveSalesOutId);
				if (dropship == 'T')
				{
					nlapiLogExecution('DEBUG', 'transaction was a drop ship', dropship);
					// only create the sales out record if it has not been previously created
					if (!positiveSalesOutId)
			nlapiLogExecution('AUDIT', 'CREATE IB 1');

						newSalesOut = makeIBSalesOut(rec, STATUS_SOLD_OUT, false);
				}
				if (status == 7)
				{ // 7 = returned for credit
					if (positiveSalesOutId)
					{
						var negativeSalesOutId = findSalesOut(nlapiGetRecordId(), false);
						nlapiLogExecution('DEBUG', 'negativeSalesOutId', negativeSalesOutId);
						// only create the sales out record if it has been previously reported as sales out (i.e. positive sales out exists)
						// AND the negative sales out record for the credit has not been previously created
						if (!negativeSalesOutId)
						{
			  nlapiLogExecution('AUDIT', 'CREATE IB 2');
							newSalesOut = makeIBSalesOut(rec, STATUS_SOLD_OUT, true);
						}
					}
				}
			}
		}
	}
	catch(e)
	{
		nlapiLogExecution('AUDIT','afterSubmitInstallBase',e);
		//throw e;
	}
}

function findSalesOut(installBaseId, isPositiveAmount)
{
	var filters = [];
	filters.push(new nlobjSearchFilter('custrecord_sales_out_install_base', null, 'is', installBaseId));
	if (isPositiveAmount)
		filters.push(new nlobjSearchFilter('custrecord_sales_out_amount', null, 'greaterthanorequalto', 0));
	else
		filters.push(new nlobjSearchFilter('custrecord_sales_out_amount', null, 'lessthan', 0));
	var results = nlapiSearchRecord('customrecord_sales_out', null, filters);
	if (results && results.length > 0)
	{
		return results[0].getId();
	}
	return null;
}

function getSalesOutBySerial(serial, soCheck)
{
	var filters, search, resultCount, salesOutId, salesOut;
	filters = [new nlobjSearchFilter('custrecord_sales_out_serial_number', null, 'is', serial)];
	if (soCheck)
	{
		filters.push(new nlobjSearchFilter('custrecord_sales_out_original_trans', null, 'anyof', soCheck))
	}
	search = nlapiSearchRecord('customrecord_sales_out', null, filters, null) || false;
	if (search && search.length)
	{
		resultCount = search.length;
		nlapiLogExecution('DEBUG', 'number of install bases found by serial number', resultCount);
		for (var i = 0; i < resultCount; i++)
		{
			var salesOutId = search[i].getId();
			nlapiLogExecution('DEBUG', 'id of install base found by serial', salesOutId);
		}
		salesOut = nlapiLoadRecord('customrecord_sales_out', salesOutId);
		return salesOut;
	}
	else
	{
		return false;
	}
}

//need to create sales outs for tree of install bases minus the grandchildren when certain drop ship installbase sales out
function makeIBSalesOut(ibrec, status, iscredit)
{
	//generate a sales out for serialized item install base
	var tempName, item, soFields, entityName, custNumber, custName, salesRegion, firstName, lastName, email, addr1, addr2, addr3, addr4, city, state, country, zip, memo, phone, customer, salesOutDate, lineCount, nsd, amount, qty, listprice, ibrec, newSalesOut, newSalesOut, relatedSalesOut, realtedSO;
	var relatedSoId;
	var soCheck = ibrec.getFieldValue('custrecord_ib_original_so');
	tempName = ibrec.getFieldValue('custrecord_ib_serial_number');
	relatedSalesOut = getSalesOutBySerial(tempName, soCheck) || false;
	installBase = ibrec.getFieldValue('id');
	ibParent = getParentInstallBase(ibrec.getFieldValue('id'));
	ibParentRec = nlapiLoadRecord('customrecord_installed_base', ibParent);
	relatedSoId = ibParentRec.getFieldValue('custrecord_ib_original_so');
	relatedSO = nlapiLoadRecord('salesorder', relatedSoId);
	nlapiLogExecution('AUDIT', 'Related Sales Out', relatedSalesOut);
	if (relatedSalesOut)
	{

		salesOutDate = relatedSalesOut.getFieldValue('custrecord_sales_out_date') || '';
		nlapiLogExecution('DEBUG', 'Related Filter  ', relatedSO.getFieldValue("custbody_ship_customer_filtered"));
		entityName = relatedSO.getFieldValue("custbody_ship_customer_filtered");
		if (entityName)
		{
			entityName = nlapiLookupField("customrecord_relationship", relatedSO.getFieldValue("custbody_ship_customer_filtered"), "custrecord_relationship_ship_to_customer", true) || soFields.entity['name'] || '';
		}
		nlapiLogExecution('DEBUG', 'Entity Name ', entityName);
		custNumber = relatedSalesOut.getFieldValue('custrecord_sales_out_customer') || '';
		custName = relatedSO.getFieldValue("custbody_ship_to_contact") || '';
		salesRegion = relatedSalesOut.getFieldValue('custrecord_sales_out_sales_region') || '';
		if (custName)
		{
			firstName = nlapiLookupField("contact", custName, "firstname");
			lastName = nlapiLookupField("contact", custName, "lastname");
			custName = nlapiLookupField("contact", custName, "entityid");
		}
		else
		{

			firstName = '';
			lastName = '';
		}
		email = relatedSalesOut.getFieldValue('custrecord_sales_out_email') || '';
		addr1 = relatedSalesOut.getFieldValue('custrecord_sales_out_address_1') || '';
		addr2 = relatedSalesOut.getFieldValue('custrecord_sales_out_address_2') || '';
		addr3 = relatedSalesOut.getFieldValue('custrecord_sales_out_address_3') || '';
		addr4 = relatedSalesOut.getFieldValue('custrecord_sales_out_address_4') || '';
		city = relatedSalesOut.getFieldValue('custrecord_sales_out_city') || '';
		state = relatedSalesOut.getFieldValue('custrecord_sales_out_state') || '';
		country = relatedSalesOut.getFieldValue('custrecord_sales_out_country') || '';
		customer = relatedSalesOut.getFieldValue('custrecord_sales_out_customer') || '';
		memo = relatedSalesOut.getFieldValue('custrecord_sales_out_memo') || '';
		phone = relatedSO.getFieldValue("custbody_ship_to_contact_phone") || '';
		zip = relatedSalesOut.getFieldValue('custrecord_sales_out_zip') || '';
		qty = relatedSalesOut.getFieldValue('custrecord_sales_out_quantity') || '';
		listprice = relatedSalesOut.getFieldValue('custrecord_sales_out_list_price') || '';
		amount = relatedSalesOut.getFieldValue('custrecord_sales_out_amount') || '';
		relatedSoId = relatedSalesOut.getFieldValue('custrecord_sales_out_original_trans') || '';
		relatedSoLine = relatedSalesOut.getFieldValue('custrecord_sales_out_original_line_num') || '';
		item = relatedSalesOut.getFieldValue('custrecord_sales_out_item') || '';
	}
	else
	{
		ibParent = getParentInstallBase(ibrec.getFieldValue('id'));
		ibParentRec = nlapiLoadRecord('customrecord_installed_base', ibParent);
		relatedSoId = ibParentRec.getFieldValue('custrecord_ib_original_so');
		relatedSO = nlapiLoadRecord('salesorder', relatedSoId);
		relatedSoLine = ibrec.getFieldValue('custrecord_ib_original_so_line');

		//nlapiGetFieldValue('AUDIT', 'relatedSoLine', relatedSoLine);
		soFields = JSON.parse(JSON.stringify(relatedSO));
		salesOutDate = nlapiDateToString(new Date()) || '';
		nlapiLogExecution('DEBUG', 'Related Filter  ', soFields.custbody_ship_customer_filtered);
		entityName = relatedSO.getFieldValue("custbody_ship_customer_filtered") || '';
		if (entityName)
		{
			entityName = nlapiLookupField("customrecord_relationship", relatedSO.getFieldValue("custbody_ship_customer_filtered"), "custrecord_relationship_ship_to_customer", true) || soFields.entity['name'] || '';
		}
		custNumber = entityName.substr(0, entityName.indexOf(' ')) || '';
		custName = relatedSO.getFieldValue('custbody_ship_to_contact') || '';
		salesRegion = relatedSO.getFieldValue('custbody_om_salesperson') || '';
		if (custName)
		{
			firstName = nlapiLookupField("contact", custName, "firstname");
			lastName = nlapiLookupField("contact", custName, "lastname");
			custName = nlapiLookupField("contact", custName, "entityid");

		}
		else
		{

			firstName = '';
			lastName = '';
		}
		email = soFields.email || 'noemail@salesorder.com';
		addr1 = soFields.shippingaddress['addr1'] || '';
		addr2 = soFields.shippingaddress['addr2'] || '';
		addr3 = soFields.shippingaddress['addr3'] || '';
		addr4 = soFields.shippingaddress['addr4'] || '';
		city = soFields.shippingaddress['city'] || '';
		state = soFields.shipstate || '';
		country = soFields.shippingaddress['country']['name'] || '';
		customer = soFields.entity['internalid'] || '';
		memo = soFields.memo || '';
		phone = soFields.custbody_ship_to_contact_phone || '';
		zip = soFields.shippingaddress['zip'] || '';
		strategicReseller = relatedSO.getFieldValue('billaddressee');
		qty = 1;

		/*for (var i = 1; i < relatedSO.getLineItemCount('item'); i++)
		{
			if (relatedSO.getLineItemValue('item', 'custcol_line_id', i) == relatedSoLine)
			{
				amount = relatedSO.getLineItemValue('item', 'rate', i) || '';
				listprice = relatedSO.getLineItemValue('item', 'custcol_custlistprice', i) || '';
				item = relatedSO.getLineItemValue('item', 'item', i) || '';
				break;
			}
		}*/
		var salesOrderLineIndex = relatedSO.findLineItemValue('item', 'custcol_line_id', relatedSoLine);
		var salesOutQuantity = relatedSO.getLineItemValue('item', 'quantity', salesOrderLineIndex) || '';
		amount = relatedSO.getLineItemValue('item', 'amount', salesOrderLineIndex) || '';
		amount = parseFloat(amount) / parseFloat(salesOutQuantity);
		listprice = relatedSO.getLineItemValue('item', 'custcol_custlistprice', salesOrderLineIndex) || '';
		item = relatedSO.getLineItemValue('item', 'item', salesOrderLineIndex) || '';
	}

	if (iscredit === true)
	{
		amount = -(parseFloat(amount));
	}

	nlapiLogExecution('AUDIT', 'Company Name 1', entityName);
	var initValues = {
		'custrecord_sales_out_address_1': addr1,
		'custrecord_sales_out_install_base': installBase,
		'custrecord_sales_out_address_2': addr2,
		'custrecord_sales_out_address_3': addr3,
		'custrecord_sales_out_address_4': addr4,
		'custrecord_sales_out_city': city,
		'custrecord_sales_out_company_name': entityName,
		'custrecord_sales_out_country': country,
		'custrecord_sales_out_customer': customer,
		'custrecord_sales_out_customer_number': customer,
		'custrecord_sales_out_date': salesOutDate,
		'custrecord_sales_out_email': email,
		'custrecord_sales_out_first_name': firstName,
		'custrecord_sales_out_last_name': lastName,
		'custrecord_sales_out_messages': memo,
		'custrecord_sales_out_phone': phone,
		'custrecord_sales_out_state': state,
		'custrecord_sales_out_status': status,
		'custrecord_sales_out_zip': zip,
		'custrecord_sales_out_sales_region': salesRegion,
		'custrecord_sales_out_serial_number': tempName,
		'custrecord_sales_out_amount': amount,
		'custrecord_sales_out_quantity': parseInt(qty),
		'custrecord_sales_out_list_price': listprice,
		'custrecord_sales_out_original_trans': relatedSoId,
		'custrecord_sales_out_original_line_num': relatedSoLine,
		'custrecord_sales_out_item': item
	};

	nlapiLogExecution('DEBUG', 'init vals1', JSON.stringify(initValues));
	//nlapiLogExecution('AUDIT', 'Init Amount', initValues.custrecord_sales_out_amount);

	newSalesOut = nlapiCreateRecord('customrecord_sales_out');

	for (var i in initValues)
	{
		newSalesOut.setFieldValue(i, initValues[i]);
	}

	newSalesOutId = nlapiSubmitRecord(newSalesOut, true);

	//setInstallBaseSalesOut(ibrec.getFieldValue('id'), newSalesOutId);

	nlapiLogExecution('DEBUG', '5. made sales out from service contract line', newSalesOutId);

	return true;
}

function validateLineForSalesOut(type)
{
	var createdFrom, orderLine, recordId, recordType, record, compareValues;
	createdFrom = nlapiGetFieldValue('createdfrom');
	nlapiLogExecution('DEBUG', 'created from', createdFrom);
	nlapiLogExecution('DEBUG', 'sublist type', type);
	if (type == 'item' && createdFrom != null && createdFrom != '')
	{
		orderLine = nlapiGetCurrentLineItemValue('item', 'orderline');
		nlapiLogExecution('DEBUG', 'order line', orderLine);
		if (orderLine != null && orderLine != '')
		{
			recordId = nlapiGetRecordId();
			nlapiLogExecution('DEBUG', 'record id ', recordId);
			recordType = nlapiGetRecordType();
			nlapiLogExecution('DEBUG', 'record type ', recordType);
			try
			{
				record = nlapiLoadRecord(recordType, recordId);
			}
			catch (ex)
			{
				return true;
			}

			var quan = nlapiGetCurrentLineItemValue('item', 'quantity');
			var amt = nlapiGetCurrentLineItemValue('item', 'amount');
			var lineRate = parseFloat(amt) / parseFloat(quan);

			compareValues = {
				'qty': quan,
				'amount': amt,
				'rate': lineRate

			};
			try
			{
				if (!linesMatch(record, orderLine, compareValues))
				{
					throw alert('lines do not match on originating transaction, cannot save edits to this line item...');
				}
			}
			catch (e)
			{
				return false;
			}
			return true;
		}
	}
	return true;
}

function linesMatch(record, orderLine, compareValues)
{
	var compareType, comparisons, recordType, compare, matches, matchRecord;
	recordType = record.getRecordType();
	compare = {
		'qty': compareValues.qty,
		'rate': compareValues.rate,
		'amount': compareValues.amount
	};
	nlapiLogExecution('DEBUG', 'record type', recordType);
	compareType = recordType == 'invoice' ? 'salesorder' : 'returnauthorization';
	nlapiLogExecution('DEBUG', 'compare type', compareType);
	try
	{
		matchRecord = nlapiLoadRecord(compareType, record.getFieldValue('createdfrom'));
		nlapiLogExecution('DEBUG', 'matchRecord', record.getFieldValue('createdfrom'));
	}
	catch (r)
	{
		nlapiLogExecution('DEBUG', 'failed to load record', JSON.stringify(r));
	}

	var orderIndex = 0;
	for(var i=1; i<=matchRecord.getLineItemCount('item'); i++)
	{
		if(matchRecord.getLineItemValue('item','line',i)==orderLine)
		{
			orderIndex = i;
			break;
		}
	}

	matches = false;
	nlapiLogExecution('DEBUG', 'compare', JSON.stringify(compare));
	if (compare.qty == matchRecord.getLineItemValue('item', 'quantity', orderIndex) && compare.rate == matchRecord.getLineItemValue('item', 'rate', orderIndex) && compare.amount == matchRecord.getLineItemValue('item', 'amount', orderIndex))
	{
		nlapiLogExecution('DEBUG', 'matchRecord values', 'qty: ' + matchRecord.getLineItemValue('item', 'quantity', orderIndex) + ' rate: ' + matchRecord.getLineItemValue('item', 'rate', orderIndex) + ' amount: ' + matchRecord.getLineItemValue('item', 'amount', orderIndex));
		matches = true;
	}
	else
	{
		matches = false;
	}
	nlapiLogExecution('DEBUG', 'lines match?', matches);
	return matches;
}

function afterSubmitCreditMemo(type)
{
	try
	{
		// && type == 'create' <- this can be removed for testing lest we want to manually create credit memos for each test run
		nlapiLogExecution('DEBUG', 'type', type);
		if ((type != 'delete' && type == 'create'))
		{
			var recId, record, recordType, isNSD, createdFrom, nsdNumber;

			createdFrom = nlapiGetFieldValue('createdfrom');
			nsdNumber = nlapiGetFieldValue("custbody_nsd_orn_number");
			if ((createdFrom != null && createdFrom != '') ||
				(nsdNumber != null && nsdNumber != '' && nsdNumber.toLowerCase() != 'coop' &&
				nsdNumber.toLowerCase() != 'vir' && nsdNumber.toLowerCase() != 'manual'))
			{
				recordType = nlapiGetRecordType();
				recId = nlapiGetRecordId();
				nlapiLogExecution('DEBUG', 'record type and id', recordType + ' id: ' + recId);

				if (recordType == 'returnauthorization')
				{
				}
				else if (recordType == 'creditmemo')
				{
					record = nlapiLoadRecord(recordType, recId);
					nlapiLogExecution('DEBUG', 'Created From Val ', createdFrom);

					isNSD = record.getFieldValue('custbody_nsd_orn_number');
					var lineCount = nlapiGetLineItemCount('item');

					for (var i = 1; i <= lineCount; i++)
					{
						var usage = nlapiGetContext().getRemainingUsage();
						nlapiLogExecution('DEBUG', 'Usage Check ', usage);

						serviceItem = record.getLineItemValue('item', 'item', i);
						quantity = record.getLineItemValue('item', 'quantity', i);
						nlapiLogExecution('DEBUG', 'service item line ', serviceItem);
						itemType = determineItemType(nlapiLookupField('item', serviceItem, 'type')) || false;
						itemRec = nlapiLoadRecord(itemType, serviceItem);
						serviceItemCheck = itemRec.getFieldValue('custitem_ams');
						nonSerialized = itemRec.getFieldValue('custitem_serial_number_generation');
						nlapiLogExecution('DEBUG', 'is it for service item line ?', serviceItemCheck);
						createdFrom = nlapiGetLineItemValue('item','custcol_service_ref_order_num',i);
						createdFromLine = nlapiGetLineItemValue('item','custcol_service_ref_line_number',i);

						nlapiLogExecution('DEBUG','field values','serviceItemCheck: ' + serviceItemCheck + ', createdFrom: ' + createdFrom + ', nonSerialized: ' + nonSerialized );
						if (serviceItemCheck == 'T' && createdFrom && createdFromLine)
						{
							nlapiLogExecution('DEBUG','call checkAutoSalesOutService');
							checkAutoSalesOutService(record, recId, createdFrom, serviceItem, quantity, createdFromLine);
						}
						else if ((nonSerialized == null || nonSerialized == '' || nonSerialized == SERIAL_NO_CONTROL) && createdFrom)
						{
							nlapiLogExecution('DEBUG','call checkAutoSalesOutNonSerial');
							makeAutoSalesOutService(record, nlapiLoadRecord('salesorder', createdFrom), serviceItem);
						}
					}

					if (isNSD != null && isNSD != '')
					{
						checkAutoSalesOut(record, recordType);
					}
				}
			}
		}
	}
	catch(e)
	{
		nlapiLogExecution('AUDIT','afterSubmitCreditMemo',e);
	}
}

function checkAutoSalesOutService(record, recId, createdFrom, serviceItem, quantity, createdFromLine)
{
	var filters = [];
	filters.push(new nlobjSearchFilter('custrecord_original_sales_order', null, 'anyof', createdFrom));
	filters.push(new nlobjSearchFilter('custrecord_sales_out_original_line_num', null, 'is', createdFromLine));
	nlapiLogExecution('DEBUG', 'Check Out Service ', createdFrom);
	var soSearch = nlapiSearchRecord('customrecord_sales_out', null, filters, null);
	nlapiLogExecution('DEBUG', 'SO Search ', soSearch);

	if (soSearch)
	{
		try
		{
			var soCopy = nlapiCopyRecord('customrecord_sales_out', soSearch[0].getId());
			soCopy.setFieldValue('custrecord_sales_out_quantity', parseInt(quantity));

			var amount = parseFloat(soCopy.getFieldValue('custrecord_sales_out_amount'));
			soCopy.setFieldValue('custrecord_sales_out_date', nlapiDateToString(new Date()));
			soCopy.setFieldValue('custrecord_sales_out_amount', amount * -1);
			soCopy.setFieldValue('custrecord_sales_out_original_trans', recId);
			soCopy.setFieldValue('custrecord_original_sales_order', createdFrom);
			soCopy.setFieldValue('custrecord_sales_out_virearnings', '');
			soCopy.setFieldValue('custrecord_sales_out_date', nlapiDateToString(new Date()));
			var soSubmit = nlapiSubmitRecord(soCopy, false, true);
			nlapiLogExecution('DEBUG', 'SO Submit ', soSubmit);
		}
		catch (ex)
		{
			nlapiLogExecution('DEBUG', 'SO Search Error ', ex);
		}
	}
	else
	{
		makeAutoSalesOutService(record, nlapiLoadRecord('salesorder', createdFrom), serviceItem);
	}
}

function checkAutoSalesOut(rec, recType)
{
	var recId, filters, columns, search, results, createdFrom, relSO;
	if (recType == 'returnauthorization')
	{
		//search for credit memos created from the current rma
		recId = rec.getFieldValue('id');
		filters = [new nlobjSearchFilter('createdfrom', null, 'is', recId)];
		columns = [new nlobjSearchColumns('createdfrom')];
		search = nlapiSearchRecord('creditmemo', null, filters, columns) || false;
		if (search && search.length)
		{
			//we have a credit memo so we don't need to make sales out
		}
		else
		{
			//this is an rma without a credit memo so we make an RMA Auto sales out
			createdFrom = rec.getLineItemValue('item', 'custcol_service_ref_order_num', 1);
			if (createdFrom != null || createdFrom != '')
			{
				relSO = nlapiLoadRecord('salesorder', createdFrom);
				makeAutoSalesOut(rec, relSO);
			}
		}
	}
	else if (recType == 'creditmemo')
	{
		createdFrom = rec.getFieldValue('createdfrom');
		nsdCheck = rec.getFieldValue('custbody_nsd_orn_number');
		nlapiLogExecution('DEBUG', 'credit memo created from', createdFrom);
		if (createdFrom == null || createdFrom == '')
		{
			if (nsdCheck)
			{
				makeAutoSalesOut(rec);
			}
		}
		else
		{
			makeAutoSalesOut(rec);
		}
	}
}

function makeAutoSalesOutService(rec, relatedSalesOrder, itemId)
{
	var tempName, idStore, soFields, entityName, custNumber, custName, salesRegion, firstName, lastName, email, addr1, addr2, addr3, addr4, city, state, country, zip, memo, phone, customer, salesOutDate, lineCount, initValues, nsd, orgTrans;

	var context = nlapiGetContext()
	nlapiLogExecution('DEBUG', 'Start Auto Service Sales Out', 'Usage: ' + context.getRemainingUsage());

	
	recordType = rec.getRecordType();

	nlapiLogExecution('DEBUG', 'Rec', rec.getId() + ' ' + rec.getRecordType());

	nlapiLogExecution('DEBUG', 'Rec Releated', relatedSalesOrder.getId() + ' ' + relatedSalesOrder.getRecordType());


	if (recordType == 'returnauthorization' || recordType == 'creditmemo')
	{
		nsd = rec.getFieldValue('custbody_nsd_orn_number') || 'NON SERIALIZED';
		tempName = nsd;


	}
	if (relatedSalesOrder)
	{
		soFields = JSON.parse(JSON.stringify(relatedSalesOrder));
		lineCount = relatedSalesOrder.getLineItemCount('item');
		idStore = relatedSalesOrder.getFieldValue('id');
	}
	else
	{
		//get these values from cr memo
		soFields = JSON.parse(JSON.stringify(rec));
		lineCount = rec.getLineItemCount('item');
	}
	nlapiLogExecution('DEBUG', 'so fields', JSON.stringify(soFields));
	//nlapiLogExecution('DEBUG', 'id store ', idStore);
	//nlapiLogExecution('DEBUG', 'line count in the make function', lineCount);

	nlapiLogExecution('DEBUG', 'Related Filter  ', JSON.stringify(soFields.custbody_ship_customer_filtered));
	entityName = soFields.custbody_ship_customer_filtered;

	if (recordType == 'returnauthorization' || recordType == 'creditmemo'){

		entityName = rec.getFieldText('custbody_end_customer');
	}
	else if (entityName)
	{
		entityName = nlapiLookupField("customrecord_relationship", soFields.custbody_ship_customer_filtered, "custrecord_relationship_ship_to_customer", true) || soFields.entity['internalid'] || '';
		nlapiLogExecution('DEBUG', 'Entity Name 2', entityName);

	}
	else
	{
		entityName = soFields.entity['name'] || '';
		nlapiLogExecution('DEBUG', 'Entity Name 2', entityName);

	}
	nlapiLogExecution('DEBUG', 'Entity Name *', entityName);

	custNumber = entityName.substr(0, entityName.indexOf(' ')) || '';
	custName = soFields.custbody_ship_to_contact || '';
	salesRegion = soFields.custbody_om_salesperson;
	if (custName)
	{
		firstName = nlapiLookupField("contact", custName, "firstname");
		lastName = nlapiLookupField("contact", custName, "lastname");
	}
	else
	{
		firstName = '';
		lastName = '';
	}
	email = soFields.email || 'noemail@salesorder.com';
	addr1 = soFields.shippingaddress['addr1'] || '';
	addr2 = soFields.shippingaddress['addr2'] || '';
	addr3 = soFields.shippingaddress['addr3'] || '';
	addr4 = soFields.shippingaddress['addr4'] || '';
	city = soFields.shippingaddress['city'] || '';
	state = soFields.shipstate || '';
	country = soFields.shippingaddress['country']['name'] || '';
	customer = soFields.entity['internalid'] || '';
	saleOutDate = nlapiDateToString(new Date()) || '';
	memo = soFields.memo || '';
	phone = soFields.custbody_ship_to_contact_phone || '';
	zip = soFields.shippingaddress['zip'] || '';
	strategicReseller = rec.getFieldValue('billaddressee');
	orgTrans = rec.getFieldValue('id');
	nlapiLogExecution('AUDIT', 'Company Name 2', entityName);
	initValues = {
		'custrecord_sales_out_address_1': addr1,
		'custrecord_sales_out_address_2': addr2,
		'custrecord_sales_out_address_3': addr3,
		'custrecord_sales_out_address_4': addr4,
		'custrecord_sales_out_city': city,
		'custrecord_sales_out_company_name': entityName,
		'custrecord_sales_out_country': country,
		'custrecord_sales_out_customer': customer,
		'custrecord_sales_out_customer_number': customer,
		'custrecord_sales_out_date': saleOutDate,
		'custrecord_sales_out_email': email,
		'custrecord_sales_out_first_name': firstName,
		'custrecord_sales_out_last_name': lastName,
		'custrecord_sales_out_messages': memo,
		'custrecord_sales_out_phone': phone,
		'custrecord_sales_out_state': state,
		'custrecord_sales_out_status': STATUS_SOLD_OUT,
		'custrecord_sales_out_zip': zip,
		'custrecord_sales_out_sales_region': salesRegion,
		'custrecord_sales_out_serial_number': tempName,
		'custrecord_sales_out_amount': 0,
		'custrecord_sales_out_quantity': 1,
		'custrecord_sales_out_list_price': 0.00,
		'custrecord_sales_out_strategic_reseller': strategicReseller,
		'custrecord_sales_out_original_trans': orgTrans,
		'custrecord_sales_out_original_line_num': '',
		'custrecord_original_sales_order': idStore,
		'custrecord_sales_out_item': ''
	};

	for (var j = 0; j < lineCount; j++)
	{
		var currentRate, newSalesOut, newSalesOutId, quantity, listPrice;

		//initValues.custrecord_sales_out_quantity = 1;

		quantity = rec.getLineItemValue('item', 'quantity', j + 1);
		amount = rec.getLineItemValue('item', 'amount', j + 1);
		item = rec.getLineItemValue('item', 'item', j + 1);
		listPrice = parseFloat(rec.getLineItemValue('item', 'custcol_custlistprice', j + 1));
		currentRate = parseFloat(amount) / parseFloat(quantity);
		itemType = determineItemType(nlapiLookupField('item', item, 'type')) || false;

		initValues.custrecord_sales_out_quantity  = quantity;

		if (itemType)
		{
			itemRec = nlapiLoadRecord(itemType, item);
			isAMS = itemRec.getFieldValue('custitem_ams');
			isServiceItem = itemIsService(itemRec);
			nlapiLogExecution('DEBUG', 'this item is service', isServiceItem);
			nlapiLogExecution('DEBUG', 'this item is AMS', isAMS);
		}

		nlapiLogExecution('DEBUG', 'rate on credit memo line', currentRate);
		salesRegion = rec.getFieldValue('custbody_om_salesperson') || '';

		if (currentRate != null && currentRate > 0)
		{
			initValues.custrecord_sales_out_amount = (parseFloat(currentRate) * -1); //we want the* -1 amount to be negative for each credit memo...

			if(listPrice >= 0){
				listPrice = listPrice * -1
			}
			initValues.custrecord_sales_out_list_price = (listPrice);
			if (isServiceItem)
			{
				initValues.custrecord_sales_out_serial_number = 'SERVICE';
			}
			else
			{

				initValues.custrecord_sales_out_serial_number = 'NON SERIALIZED';
			}
			initValues.custrecord_sales_out_sales_region = salesRegion;
			initValues.custrecord_sales_out_original_line_num = rec.getLineItemValue('item', 'custcol_line_id', j + 1);
			initValues.custrecord_sales_out_item = rec.getLineItemValue('item', 'item', j + 1);

			if (item == itemId)
			{
				newSalesOut = nlapiCreateRecord('customrecord_sales_out');
				for (var i in initValues)
				{
					newSalesOut.setFieldValue(i, initValues[i]);
				}

				newSalesOutId = nlapiSubmitRecord(newSalesOut, true);
				nlapiLogExecution('DEBUG', 'sales out made from auto return authorization', newSalesOutId);
			}
			//need to submit the credit memo
			//nlapiSubmitRecord(rec, true);
		}
	}
}

function makeAutoSalesOut(rec, relatedSalesOrder)
{
	nlapiLogExecution('AUDIT', 'Make Sales Out', relatedSalesOrder);
	var tempName, soFields, entityName, custNumber, custName, salesRegion, firstName, lastName, email, addr1, addr2, addr3, addr4, city, state, country, zip, memo, phone, customer, salesOutDate, lineCount, initValues, nsd, orgTrans, copySalesOutCheck;
	var executionContext = nlapiGetContext().getExecutionContext();
	nlapiLogExecution('DEBUG', 'Execution Context  ', executionContext);
	recordType = rec.getRecordType();
	if (recordType == 'returnauthorization' || recordType == 'creditmemo')
	{
		nsd = rec.getFieldValue('custbody_nsd_orn_number') || 'NON SERIALIZED';
		tempName = nsd;
	}
	if (relatedSalesOrder)
	{
		soFields = JSON.parse(JSON.stringify(relatedSalesOrder));
		lineCount = relatedSalesOrder.getLineItemCount('item');
	}
	else
	{
		//get these values from cr memo
		soFields = JSON.parse(JSON.stringify(rec));
		nlapiLogExecution('DEBUG', 'so fields', JSON.stringify(soFields));
		lineCount = rec.getLineItemCount('item');
	}

	nlapiLogExecution('DEBUG', 'line count in the make function', lineCount);

	nlapiLogExecution('DEBUG', 'Related Filter  ', soFields.custbody_ship_customer_filtered);
	entityName = soFields.custbody_ship_customer_filtered;
	if (entityName)
	{
		entityName = nlapiLookupField("customrecord_relationship", soFields.custbody_ship_customer_filtered, "custrecord_relationship_ship_to_customer", true) || soFields.entity['internalid'] || '';
	}
	else
	{
		entityName = soFields.entity['name'] || '';
	}
	nlapiLogExecution('DEBUG', 'Entity Name ', entityName);

	custNumber = entityName.substr(0, entityName.indexOf(' ')) || '';
	custName = soFields.custbody_ship_to_contact || '';
	salesRegion = soFields.custbody_om_salesperson;
	if (custName)
	{
		firstName = nlapiLookupField("contact", custName, "firstname");
		lastName = nlapiLookupField("contact", custName, "lastname");
	}
	else
	{
		firstName = '';
		lastName = '';
	}
	email = soFields.email || 'noemail@salesorder.com';
	addr1 = soFields.shippingaddress['addr1'] || '';
	addr2 = soFields.shippingaddress['addr2'] || '';
	addr3 = soFields.shippingaddress['addr3'] || '';
	addr4 = soFields.shippingaddress['addr4'] || '';
	city = soFields.shippingaddress['city'] || '';
	state = soFields.shipstate || '';
	country = soFields.shippingaddress['country']['name'] || '';
	customer = soFields.entity['internalid'] || '';
	saleOutDate = nlapiDateToString(new Date()) || '';
	memo = soFields.memo || '';
	phone = soFields.custbody_ship_to_contact_phone || '';
	zip = soFields.shippingaddress['zip'] || '';
	strategicReseller = rec.getFieldValue('billaddressee');
	orgTrans = rec.getFieldValue('id');
	nlapiLogExecution('AUDIT', 'Company Name 3', entityName);
	initValues = {
		'custrecord_sales_out_address_1': addr1,
		'custrecord_sales_out_address_2': addr2,
		'custrecord_sales_out_address_3': addr3,
		'custrecord_sales_out_address_4': addr4,
		'custrecord_sales_out_city': city,
		'custrecord_sales_out_company_name': entityName,
		'custrecord_sales_out_country': country,
		'custrecord_sales_out_customer': customer,
		'custrecord_sales_out_customer_number': customer,
		'custrecord_sales_out_date': saleOutDate,
		'custrecord_sales_out_email': email,
		'custrecord_sales_out_first_name': firstName,
		'custrecord_sales_out_last_name': lastName,
		'custrecord_sales_out_messages': memo + ' ' + nsd,
		'custrecord_sales_out_phone': phone,
		'custrecord_sales_out_state': state,
		'custrecord_sales_out_status': STATUS_SOLD_OUT,
		'custrecord_sales_out_zip': zip,
		'custrecord_sales_out_sales_region': salesRegion,
		'custrecord_sales_out_serial_number': tempName,
		'custrecord_sales_out_amount': 0,
		'custrecord_sales_out_quantity': 0,
		'custrecord_sales_out_list_price': 0.00,
		'custrecord_sales_out_strategic_reseller': strategicReseller,
		'custrecord_sales_out_original_trans': orgTrans,
		'custrecord_sales_out_original_line_num': '',
		'custrecord_original_sales_order': '',
		'custrecord_sales_out_item': ''
	};

	for (var j = 0; j < lineCount; j++)
	{
		var usage = nlapiGetContext().getRemainingUsage();
		nlapiLogExecution('DEBUG', 'usage line check ', usage);

		var currentRate, newSalesOut, newSalesOutId;

		initValues.custrecord_sales_out_quantity = 0;


		//currentRate = rec.getLineItemValue('item', 'rate', j + 1);
		currentLineNumber = rec.getLineItemValue('item','custcol_line_id',j+1);
		item = rec.getLineItemValue('item', 'item', j + 1);
		var quantity = parseFloat(rec.getLineItemValue('item', 'quantity', j + 1));
		var amount = parseFloat(rec.getLineItemValue('item', 'amount', j + 1));
		currentRate = parseFloat(amount) / parseFloat(quantity);
		var nsdCheck = rec.getLineItemValue('item', 'custcol_nsd_item', j + 1);
		nlapiLogExecution('DEBUG', 'NSD Check ', nsdCheck);
		var serial = '';
		var usage = nlapiGetContext().getRemainingUsage();
		nlapiLogExecution('DEBUG', 'usage line 2 ', usage);
		if (nsdCheck)
		{
			var nsdFields = [];
			nsdFields.push('custrecord_nsd_request_item');
			nsdFields.push('custrecord_nsd_request_item_serialnbr');
			nsdFields.push('custrecord_nsd_request_disc_transaction');

			var nsdFieldLookup = nlapiLookupField('customrecord_nsd_request', nsdCheck, nsdFields);
			item = nsdFieldLookup.custrecord_nsd_request_item;
			nlapiLogExecution('DEBUG', 'Item NSD ', item);
			serial = nsdFieldLookup.custrecord_nsd_request_item_serialnbr;

			nlapiLogExecution('DEBUG', 'Serial NSD ', serial);
			copySalesOut = 'F';
			var soId = nsdFieldLookup.custrecord_nsd_request_disc_transaction;;
			nlapiLogExecution('DEBUG', 'So Id ', soId);
			if (soId)
			{
				initValues.custrecord_original_sales_order = soId;
			}

			if (!serial || serial == '')
			{
				serial = 'NON SERIALIZED';
			}
			else
			{
				var salesOutCheck = getSalesOutBySerial(serial, soId);
				nlapiLogExecution('DEBUG', 'Sales Out Check ', salesOutCheck);

				if (salesOutCheck)
				{
					copySalesOutCheck = 'T';
					var copySalesOut = nlapiCopyRecord('customrecord_sales_out', salesOutCheck.getFieldValue('id'));
					copySalesOut.setFieldValue('custrecord_sales_out_manual_adj', 'T');
					copySalesOut.setFieldValue('custrecord_sales_out_amount', (amount * -1).toFixed(2));
					copySalesOut.setFieldValue('custrecord_sales_out_original_trans', orgTrans);
					copySalesOut.setFieldValue('custrecord_sales_out_virearnings', '');
					copySalesOut.setFieldValue('custrecord_sales_out_date', nlapiDateToString(new Date()));
					var salesOutSubmit = nlapiSubmitRecord(copySalesOut, true, true);
					nlapiLogExecution('DEBUG', '6. copy sales out from credit memo', salesOutSubmit);
				}
			}
		}
		if (copySalesOutCheck != 'T')
		{
			var usage = nlapiGetContext().getRemainingUsage();
			nlapiLogExecution('DEBUG', 'usage line 3 ', usage);
			var itemFields = [];
			itemFields.push('type');
			itemFields.push('custitem_ams');
			var itemFieldLookup = nlapiLookupField('item', item, itemFields)
			itemType = determineItemType(itemFieldLookup.type) || false;
			nlapiLogExecution('DEBUG', 'item type ', itemType);
			amount = rec.getLineItemValue('item', 'amount', j + 1);
			if (itemType)
			{
				//itemRec	  = nlapiLoadRecord(itemType, item);
				isAMS = itemFieldLookup.custitem_ams;
				isServiceItem = itemIsService(itemRec);
				nlapiLogExecution('DEBUG', 'this item is service', isServiceItem);
				nlapiLogExecution('DEBUG', 'this item is AMS', isAMS);
			}

			nlapiLogExecution('DEBUG', 'rate on credit memo line', currentRate);
			salesRegion = rec.getFieldValue('custbody_om_salesperson') || '';
			var usage = nlapiGetContext().getRemainingUsage();
			nlapiLogExecution('DEBUG', 'usage line 4 ', usage);

			if (amount != null && amount > 0)
			{
				initValues.custrecord_sales_out_amount = -(parseFloat(amount)); //we want the amount to be negative for each credit memo...
				initValues.custrecord_sales_out_list_price = currentRate;
				initValues.custrecord_sales_out_serial_number = serial;
				initValues.custrecord_sales_out_sales_region = salesRegion;
				initValues.custrecord_sales_out_original_line_num = currentLineNumber;
				initValues.custrecord_sales_out_item = item;
				newSalesOut = nlapiCreateRecord('customrecord_sales_out');
				for (var i in initValues)
				{
					newSalesOut.setFieldValue(i, initValues[i]);
				}
				var usage = nlapiGetContext().getRemainingUsage();
				nlapiLogExecution('DEBUG', 'usage line 5 ', usage);

				try
				{
					newSalesOutId = nlapiSubmitRecord(newSalesOut, true);
				}
				catch (ex)
				{
					nlapiLogExecution('DEBUG', 'error saving sales out record', ex);
				}
				var usage = nlapiGetContext().getRemainingUsage();
				nlapiLogExecution('DEBUG', 'usage line final check ', usage);

				nlapiLogExecution('DEBUG', '7 sales out made from credit memo', newSalesOutId);

				if (recordType == 'returnauthorization' && recordType == 'creditmemo')
				{
					rec.setLineItemValue('item', 'custcol_auto_sales_out', j + 1, newSalesOutId);
				} //need to submit the credit memo

				if (executionContext != 'scheduled')
				{
					nlapiSubmitRecord(rec, true);
					nlapiLogExecution('DEBUG', '6. made sales out from credit memo', newSalesOutId);
				}
			}
		}
	}
}

//Adds the drop ship flag to a sales order if the order and customer qualifies for a drop ship
function beforeSubmitSalesOrder(type)
{
	try
	{
		if (type != 'delete')
		{
			var soid, so, soFields, orderType, shipToCustomer, billToCustomer, dropShipExcluded, relRecord;
			orderType = nlapiGetFieldValue('custbody_tno_order_type');

			//3 is GDP

			shipToCustomer = nlapiGetFieldValue('custbody_ship_customer_filtered') || false;
			nlapiLogExecution('DEBUG', 'Ship to Customer', shipToCustomer);
			if (shipToCustomer)
			{
				relRecord = nlapiLookupField("customrecord_relationship", shipToCustomer, "custrecord_relationship_ship_to_customer");
				nlapiLogExecution('DEBUG', 'relRecord', relRecord);

				if (relRecord)
				{
					shipToCustomer = relRecord;
				}
			}
			billToCustomer = nlapiGetFieldValue('entity');
			nlapiLogExecution('DEBUG', 'Customer Compare', billToCustomer + " Ship TO: " + shipToCustomer);
			if (shipToCustomer)
			{
				dropShipExcluded = (nlapiLookupField('customer', relRecord, 'custentity_exculde_from_drop_ship') == 'T') ? true : false;
				nlapiLogExecution('DEBUG', 'Drop Ship Excluded', dropShipExcluded);
				nlapiLogExecution('DEBUG', 'Customer Compare', billToCustomer + " Ship TO: " + shipToCustomer + " Order Type " + orderType + " Drop Ship " + dropShipExcluded);
				if (shipToCustomer != billToCustomer && orderType != '3' && dropShipExcluded === false)
				{
					nlapiSetFieldValue('custbody_drop_ship_order', 'T');
				}
				else
				{
					nlapiSetFieldValue('custbody_drop_ship_order', 'F');
				}
			}

			if (orderType == '3')
			{
				var linecount = nlapiGetLineItemCount("item");
				for (var i = 1; i <= linecount; i++)
				{
					nlapiSetLineItemValue("item", "deferrevrec", i, "T");
					var revaccountcheck = nlapiGetLineItemValue("item", "revrec_defrevacct", i);
					if (!revaccountcheck)
					{
						//nlapiSetLineItemValue("item", "revrec_defrevacct", i, "326");
					}
				}

				nlapiSetFieldValue("custbody_drop_ship_order", "F");
			}
		}
	}
	catch(e)
	{
		nlapiLogExecution('AUDIT','beforeSubmitSalesOrder',e);
	}
}

//****** Need to make function to search for any services throughout the install base tree to adjust dates
//The dates of any service contracts associated with the parent install base record (e.g. Standard Warranty, Software Warranty, AMS) are adjusted so that the start date is the date on the sales out record, and the end date is extended by the same number of days that the start date is adjusted.
function adjustEndDate(ibid, salesOutDate, salesOutAmount)
{
	
	nlapiLogExecution('DEBUG', 'salesOutDate in adjust', moment(salesOutDate).format('MM-DD-YYYY'));
	var ibRecord, ibParent, filters, columns, search, resultCount, ibItem, ibItemRec, ibItemType, ibInvoice, isAMS, revRecSchedule, revRecTemplate, revRecId, revRecSearch, revRecFilters, revRecName, lineRevRecId, revRecStartDate, revRecEndDate, lineValueFound, currentLineText, currentLineValue, isServiceItem, periodLength;
	ibRecord = nlapiLoadRecord('customrecord_installed_base', ibid);
	ibParent = ibRecord.getFieldValue('parent_record');
	//I need to make an Install base assembly before I can properly test this
	//if(ibParent && ibParent != ibid){ adjustEndDate(ibParent); }
	nlapiLogExecution('DEBUG', 'ib id ', ibid);
	//else{
	ibInvoice = getSalesOutInvoice(ibid) || false; //this returns an invoice record
	if (ibInvoice)
	{
		revRecTemplate = ibInvoice.getLineItemValue('item', 'revrecschedule', 1);
		lineRevRecId = ibInvoice.getLineItemValue('item', 'oldrevrecschedule', 1);
	}
	//need to use the determine item type function here to find which item type we are looking at
	ibItem = ibRecord.getFieldValue('custrecord_ib_item');
	ibItemType = determineItemType(nlapiLookupField('item', ibItem, 'type')) || false;

	if (ibItemType)
	{
		ibItemRec = nlapiLoadRecord(ibItemType, ibItem);
		isAMS = ibItemRec.getFieldValue('custitem_ams');
		isServiceItem = itemIsService(ibItemRec);
		nlapiLogExecution('DEBUG', 'this item is service', isServiceItem);
		nlapiLogExecution('DEBUG', 'this item is AMS', isAMS);
	}

	//need to write a function to determine if the parent install base has service contracts,
	//and if so process the date adjustments and other adjustments
	//also need to adjust each install base in the tree that have service contract dates on them
	//this is not only for AMS but for all service types


	filters = [new nlobjSearchFilter('custrecord_scl_install_base', null, 'is', ibid)];
	//BA-52 changes by Nate Peacock - add OM override as a column 
	columns = [new nlobjSearchColumn('custrecord_scl_ib_ams_start_date'),
			   new nlobjSearchColumn('custrecord_scl_ib_ams_end_date'),
			   new nlobjSearchColumn('custrecord_scl_service_contract'),
			   new nlobjSearchColumn('created'),
			   new nlobjSearchColumn('custrecord_scl_sc_term'),
			   new nlobjSearchColumn('custrecord_scl_manual_override')];

	var datePref = nlapiGetContext().getPreference('DATEFORMAT');
	
	search = nlapiSearchRecord('customrecord_service_contract_line', null, filters, columns) || false;

	nlapiLogExecution('AUDIT', 'search ', JSON.stringify(search));

	if (search && search.length){

		resultCount = search.length;
		for (var i = 0; i < resultCount; i++){

			var endDateAdjustment, newEndDate, newStartDate, sclSubmitFields, sclSubmitValues, ibSubmitFields, ibSubmitValues;
			var contract = search[i].getValue('custrecord_scl_service_contract');
			var contractType = nlapiLookupField('customrecord_service_contract', contract, 'custrecord_sc_type');
			nlapiLogExecution("DEBUG", "contractType", contractType);
			//var originalStartDate = new Date(search[i].getValue('created'));
			var originalStartDate = moment(search[i].getValue('created'), datePref);
			
			var datePref = nlapiGetContext().getPreference('DATEFORMAT');
			
			//var currentStartDate = new Date(search[i].getValue('custrecord_scl_ib_ams_start_date'));
			//var currentEndDate = new Date(search[i].getValue('custrecord_scl_ib_ams_end_date'));
			
			var currentStartDate = moment(search[i].getValue('custrecord_scl_ib_ams_start_date'), datePref);
			var currentEndDate = moment(search[i].getValue('custrecord_scl_ib_ams_end_date'), datePref);
			
			nlapiLogExecution("DEBUG", "currentStartDate", currentStartDate);
			nlapiLogExecution("DEBUG", "currentEndDate", currentEndDate);
			
			
			nlapiLogExecution('DEBUG', 'currentStartDate AC', moment(currentStartDate,'MM-DD-YYYY' ).format(datePref));
			nlapiLogExecution('DEBUG', 'currentEndDate AC', moment(currentStartDate,'MM-DD-YYYY').format(datePref));
			
			var manualOverride = search[i].getValue('custrecord_scl_manual_override');
			Util.console.log(dateDiffInDays(new Date(originalStartDate), new Date(currentStartDate)), 'date diff in days');
			var dayPushMax = 60 - dateDiffInDays(new Date(originalStartDate), new Date(currentStartDate));
			nlapiLogExecution('DEBUG', 'contract: ', contract);
			nlapiLogExecution('DEBUG', 'Original Start Date: ', originalStartDate);
			nlapiLogExecution('DEBUG', 'Max Push Days', dayPushMax);
			
			endDateAdjustment = dateDiffInDays(new Date(currentStartDate), new Date(salesOutDate));
			endDateAdjustmentCheck = endDateAdjustment;

			nlapiLogExecution('DEBUG', 'end date adjustment Before', 'Adj: ' + endDateAdjustment + ' Sales Out Date ' + salesOutDate);

			if(endDateAdjustmentCheck == 0 || dayPushMax == 0){
				nlapiLogExecution('AUDIT', 'Keep Current Date');
				return;
			}

			if (endDateAdjustmentCheck > dayPushMax){
				endDateAdjustment = dayPushMax;
			}
			
			newStartDate = nlapiDateToString(incrementDate(new Date(currentStartDate), endDateAdjustment));
			newEndDate = nlapiDateToString(incrementDate(new Date(currentEndDate), endDateAdjustment));
			nlapiLogExecution('DEBUG', 'newStartDate', newStartDate);
			nlapiLogExecution('DEBUG', 'newEndDate', newEndDate);
			nlapiLogExecution('DEBUG', 'id ', search[i].getId());
			try{
				if(contractType == TYPE_AMS){
					//BA-52 changes by Nate Peacock - only update AMS start if sales out date is less than current start date AND Manual Override is not flagged
					//currentStartDate and currentEndDate variables getting incremeneted automatically, so reset them here 
					//currentStartDate = moment(search[i].getValue('custrecord_scl_ib_ams_start_date'), datePref);
					//currentEndDate = moment(search[i].getValue('custrecord_scl_ib_ams_end_date'), datePref);
					nlapiLogExecution("DEBUG", "BA-52 debugging AMS start date changes", "currentStartDate " + currentStartDate + " currentEndDate " + currentEndDate + " salesOutDate " + salesOutDate + " manualOverride " + manualOverride);
					
					//newStartDate = nlapiDateToString(new Date(currentStartDate));
					nlapiLogExecution("DEBUG", "newStartDate: new End Date Before",newStartDate + ' : ' + newEndDate );
					
					//newEndDate = nlapiDateToString(new Date(currentEndDate));
					if(manualOverride != "T" &&  new Date(currentStartDate).getTime() > new Date(salesOutDate).getTime()){
						nlapiLogExecution("DEBUG", "date is not overridden and sales out date less than current start date");
						//calculate difference between two dates
						//one day in milliseconds
						var one_day = 24*60*60*1000;
						var millisecondsDiff = new Date(salesOutDate).getTime() - new Date(currentStartDate).getTime();
						var daysDiff = millisecondsDiff / one_day;
						
						
						newStartDate = nlapiDateToString(nlapiAddDays(new Date(currentStartDate), daysDiff));
						
						newEndDate = nlapiDateToString(nlapiAddDays(new Date(currentEndDate), daysDiff));
						
						nlapiLogExecution("DEBUG", "newStartDate: new End Date After",newStartDate + ' : ' + newEndDate );
					}
					nlapiLogExecution("DEBUG", "BA-52 debugging AMS start date changes", "newStartDate " + newStartDate + " newEndDate " + newEndDate + " salesOutDate " + salesOutDate + " manualOverride " + manualOverride);
					ibRecord.setFieldValue('custrecord_ib_ams_start_date', newStartDate);
					ibRecord.setFieldValue('custrecord_ib_ams_end_date', newEndDate);
					ibRecord.setFieldValue('custrecord_ib_ams_portal_end_date', newEndDate);
				}
				if(contractType == TYPE_STD_HARDWARE){

					//ibRecord.setFieldValue('custrecord_ib_standard_warranty_start', newStartDate);
					//ibRecord.setFieldValue('custrecord_ib_standard_warranty_end', newEndDate);
				}
				if(contractType == TYPE_STD_SOFTWARE){

					//ibRecord.setFieldValue('custrecord_ib_software_warranty_start', newStartDate);
					//ibRecord.setFieldValue('custrecord_ib_software_warranty_end', newEndDate);
				}

				sclSubmitFields = ['custrecord_scl_ib_ams_start_date', 'custrecord_scl_ib_ams_end_date'];
				sclSubmitValues = [newStartDate, newEndDate];
				nlapiSubmitField('customrecord_service_contract_line', search[i].getId(), sclSubmitFields, sclSubmitValues);
			}
			catch (f){
				nlapiLogExecution('ERROR', 'submit fields falied', f);
			}
		}

		var configListLength = ibRecord.getLineItemCount('recmachcustrecord_parent_installed_base');

		for(var l = 1; l <= configListLength; l++){

			var configIbId =  ibRecord.getLineItemValue('recmachcustrecord_parent_installed_base', 'id', l);
			nlapiLogExecution('DEBUG', 'Set Child Last Mod Date', configIbId);
			nlapiSubmitField('customrecord_installed_base', configIbId, 'custrecord_ib_parent_lastmodified', nlapiDateToString(new Date(),'datetimetz'));
		}

		ibRecord.setFieldValue('custrecord_ib_parent_lastmodified', nlapiDateToString(new Date(),'datetimetz'));
		nlapiSubmitRecord(ibRecord);
	}
}

//we can't use this function yet afaik since the sublist for recurrance lines is currently read only
function setRecurrenceLines(revrec, newrecamount)
{
	var lineCount = revrec.getLineItemCount('recurrence');
	for (var i = 0; i < lineCount; i++)
	{
		if (revrec.getLineItemValue('recurrence', 'journal', i + 1) == '- None -')
		{
			revrec.setLineItemValue('recurrence', 'recamount', i + 1, newrecamount);
		}
	}
}

function getNextPostingPeriod(finalPostingPeriod, endDate, offsets)
{
	var finalMonth, finalDay, months, nextMonth;
	finalMonth = finalPostingPeriod.substring(0, finalPostingPeriod.indexOf('-'));
	//nlapiLogExecution('DEBUG', 'final Month', finalMonth);
	finalDay = finalPostingPeriod.substr(finalPostingPeriod.indexOf('-') + 1);
	//nlapiLogExecution('DEBUG', 'final Day', finalDay);
	months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
	nextMonth = finalMonth == 'DEC' ? months[0] : [months.indexOf(finalMonth) + offsets];
	//nlapiLogExecution('DEBUG', 'next Month', nextMonth);
	postingYear = new Date(endDate).getFullYear();
	//nlapiLogExecution('DEBUG', 'posting year', postingYear);
	postingDate = new Date(postingYear, months.indexOf(nextMonth), finalDay);
	//nlapiLogExecution('DEBUG', 'posting Date', postingDate);
	return {
		period: nextMonth + '-' + finalDay,
		date: postingDate
	};
}

function adjustRevenueRecSchedule(newdates, amount, revtemplateid, revrecid)
{
	//nlapiLogExecution('DEBUG', 'in adjust rev rec schedule', revrecid);
	var revRecRecord, revRecTemplate, revTemplateName, revRecStartDate, revRecEndDate, recurrance, periodOffset, revOffset, amortPeriod, revAmortType, revAmountPerLine, revAmountRecognized, amountNotRecognized, recurrance = {},
		submitFields, submitValues, finalPostingPeriod, countToBeAdjusted, lineCount, newRevEndDate, journalCurrency, journalExchangeRate, totalReversed = 0.00;

	//get values needed to find posting period for reversal and rev rec record
	revRecRecord = nlapiLoadRecord('revrecschedule', revrecid);
	revRecInvoice = revRecRecord.getFieldValue('sourcetran');
	revRecStartDate = revRecRecord.getFieldValue('startdate');
	revRecEndDate = revRecRecord.getFieldValue('enddate');
	//nlapiLogExecution('DEBUG', 'rev rec start date', revRecStartDate);
	//nlapiLogExecution('DEBUG', 'rev rec end date', revRecEndDate);
	revTotalAmount = revRecRecord.getFieldValue('totalamount');
	revAmountRecognized = revRecRecord.getFieldValue('totalamortized');
	amountNotRecognized = revRecRecord.getFieldValue('remainingdeferredbalance');

	//we only need to adjust if there has been an amount recognized
	if (revAmountRecognized > 0)
	{
		//nlapiLogExecution('DEBUG', 'amount recoginzed', revAmountRecognized);
		//we get the name column field for the jouranl entry from looking up to the customer on the releated invoice
		entity = nlapiLookupField('invoice', revRecInvoice, 'entity');
		// the reversal count is calculated in the adjustEndDAte function
		reversalCount = newdates[2];
		//nlapiLogExecution('DEBUG', 'reversal count', reversalCount);
		newRevEndDate = newdates[1];
		//nlapiLogExecution('DEBUG', 'new rev rec end date used to get the year of JE', newRevEndDate);
		lineCount = revRecRecord.getLineItemCount('recurrence');
		countToBeAdjusted = 0;
		//here we iterate backwards from the last line to the first until we find recognized lines and count the number of possible reversals
		var postingCount = 0;
		for (var i = lineCount; i > 0; i--)
		{
			var journal, sourceAccount, destAccount, journalAmount, journalDoc, journalRec, reversalLines, isReversal, journalSubsidiary, journalCurrency, journalExchangeRate, newJournalReversal, monthname, currentDate, currentPostingPeriod, newJournalData, reversalJournalId;
			journal = revRecRecord.getLineItemValue('recurrence', 'journal', i);
			//we only count reversals for journaled lines that have been recognized
			if (journal !== '- None -' && countToBeAdjusted < reversalCount)
			{

				//handle reversals first...
				//nlapiLogExecution('DEBUG', 'current journal to add reversal', journal);
				countToBeAdjusted++; //this will be used to break out the loop when we run out of possible reversal lines
				//reverse lines until countToBeAdjusted hits the reversalCount
				//we want to store values to be reversed from the existing JE lines on the rev rec
				sourceAccount = revRecRecord.getLineItemValue('recurrence', 'incomeaccount', i); //REVENUE
				journalAmount = revRecRecord.getLineItemValue('recurrence', 'recamount', i);
				//nlapiLogExecution('DEBUG', 'source account of reversal journal', sourceAccount);
				destAccount = revRecRecord.getLineItemValue('recurrence', 'defrevaccount', i); //DEFERRED
				//nlapiLogExecution('DEBUG', 'destination account of reversal journal', destAccount);
				journalDoc = revRecRecord.getLineItemValue('recurrence', 'journaldoc', i);
				//nlapiLogExecution('DEBUG', 'journal doc', journalDoc);
				//we load the current journal tied to the line so we can get the values specific to the subsdiary for the current rev rec journal
				journalRec = nlapiLoadRecord('journalentry', journalDoc);
				journalSubsidiary = journalRec.getFieldValue('subsidiary');
				//nlapiLogExecution('DEBUG', 'journal subsidary', journalSubsidiary);
				journalCurrency = journalRec.getFieldValue('currency');
				journalExchangeRate = journalRec.getFieldValue('exchangerate');
				isReversal = true;
				newJournalReversal = nlapiCreateRecord('journalentry',
				{
					recordmode: 'dynamic'
				});
				//make the adjustments and save....
				//this reversal date is for a different purpose than what I thought it was for
				//nlapiLogExecution('DEBUG', 'revrecid', revrecid);
				//build the date setting for the reversals
				monthname = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				currentDate = new Date();
				currentPostingPeriod = monthname[currentDate.getMonth()] + '-' + currentDate.getDate();
				//data for the current journal body fields is stored to be set before the lines
				newJournalData = {
					'subsidiary': journalSubsidiary,
					'postingperiod_display': currentPostingPeriod,
					'currency': journalCurrency,
					'exchangerate': journalExchangeRate,
					'trandate': nlapiDateToString(currentDate)
				};
				reversalLines = [
				{
					'account': sourceAccount,
					'debit': journalAmount,
					'credit': null,
					'memo': 'Rev Rec Source',
					'entity': entity,
					'schedulenum': revrecid
				},
				{
					'account': destAccount,
					'debit': null,
					'credit': journalAmount,
					'memo': 'Rev Rec Destination',
					'entity': entity,
					'schedulenum': revrecid
				}];
				//we send data to the add JE function, when it completes executing we will have created new journals for each reversal with 2 lines for debit and credit
				//nlapiLogExecution('DEBUG', 'reversal JE JSON', JSON.stringify(reversalLines));
				//nlapiLogExecution('DEBUG', 'source account', sourceAccount);
				reversalJournalId = addJournalEntries(newJournalReversal, reversalLines, newJournalData);
				//nlapiLogExecution('DEBUG', 'journal going to be adjusted', reversalJournalId);
				//next handle the future lines
				var futureJournal, futurePostingPeriod, addLines, futureJournalId;
				//create the new journals for JEs adjusted out to offset reversals
				futureJournal = nlapiCreateRecord('journalentry',
				{
					recordmode: 'dynamic'
				});
				//deal with creating new journal entries for the posting period adjusted out
				finalPostingPeriod = revRecRecord.getLineItemValue('recurrence', 'postingperiod_display', lineCount);
				//nlapiLogExecution('DEBUG', 'final posting period', finalPostingPeriod);
				//now we find the JE posting to recogize at the date adjusted out
				futurePostingPeriod = getNextPostingPeriod(finalPostingPeriod, newRevEndDate, postingCount + 1);
				postingCount++;
				//nlapiLogExecution('DEBUG', 'future posting period', finalPostingPeriod);
				//nlapiLogExecution('DEBUG', 'future posting period for new journal entries', JSON.stringify(futurePostingPeriod));
				newJournalData = {
					'subsidiary': journalSubsidiary,
					'postingperiod_display': futurePostingPeriod.period,
					'currency': journalCurrency,
					'exchangerate': journalExchangeRate,
					'trandate': nlapiDateToString(futurePostingPeriod.date)
				};

				addLines = [
				{
					'account': sourceAccount,
					'debit': null,
					'credit': journalAmount,
					'memo': 'Rev Rec Source',
					'entity': entity,
					'schedulenum': revrecid
				},
				{
					'account': destAccount,
					'debit': journalAmount,
					'credit': null,
					'memo': 'Rev Rec Destination',
					'entity': entity,
					'schedulenum': revrecid
				}];
				//nlapiLogExecution('DEBUG', 'add JE JSON', JSON.stringify(addLines));
				futureJournalId = addJournalEntries(futureJournal, addLines, newJournalData);
			}
		}
	}
	else
	{
		nlapiLogExecution('DEBUG', 'amount from sales out must be greater than amount recognized in revenue recognition schedule to adjust the schedule', amountRecognized);
	}
}

function addJournalEntries(journalRec, lines, newJournalData)
{
	var swapAccount, lineCount, newJournalId;
	lineCount = lines.length;
	if (newJournalData.hasOwnProperty('subsidiary'))
	{
		//nlapiLogExecution('DEBUG', 'new Journal Data', JSON.stringify(newJournalData));
		for (var d in newJournalData)
		{
			journalRec.setFieldValue(d, newJournalData[d]);
		}
	}
	//for each line Key object:
	for (var j = 0; j < lineCount; j++)
	{
		//do the debit, need to select the line that we will add instead of the first line
		journalRec.selectNewLineItem('line');
		for (var i in lines[j])
		{
			//nlapiLogExecution('DEBUG', 'value being set for JE line field ' + i + ' to ', lines[j][i]);
			journalRec.setCurrentLineItemValue('line', i, lines[j][i]);
		}
		journalRec.commitLineItem('line');
	}
	newJournalId = nlapiSubmitRecord(journalRec, true);
	//nlapiLogExecution('DEBUG', 'submitted journal id', newJournalId);
}

//For each parent Install Base that becomes associated with the Sales Out, if that Install Base is associated with any service contract lines for AMS, then find the Sales Out record linked to that service contract line and change the status from â€œPendingâ€� to â€œSold Outâ€�, and set the date on that Sales Out record to the same date as the current Sales Out record.
//note: the search column 'custrecord_scl_sales_out', does not yet exist on the service contract line record
function handleAMSContractLines(parentIb)
{
	var filters, columns, search, resultCount;
	filters = [new nlobjSearchFilter('custrecord_scl_ib_parent_install_base', null, 'is', parentIb)];
	columns = [new nlobjSearchColumn('custrecord_scl_sc_type'), new nlobjSearchColumn('custrecord_scl_sales_out')];
	search = nlapiSearchRecord('customrecord_service_contract_line', null, filters, columns) || false;
	if (search && search.length)
	{
		resultCount = search.length;
		for (var i = 0; i < resultCount; i++)
		{
			if (search[i].getValue('custrecord_scl_sc_type') == 'AMS')
			{
				var salesOutKeys, salesOutValues, sclSalesOut, sclSalesOutDate;

				sclSalesOut = nlapiLoadRecord('customrecord_sales_out', search[i].getValue('custrecord_scl_sales_out'));
				sclSalesOutDate = sclSalesOut.getFieldValue('custrecord_sales_out_date');
				salesOutKeys = ['custrecord_sales_out_status', 'custrecord_sales_out_date'];
				salesOutValues = ['2', sclSalesOutDate];
				nlapiSubmitField('customrecord_sales_out', sclSalesOut, salesOutKeys, salesOutValues);
			}
		}
	}
}

/*
//Reset Rev Rec if all inventory on order is reversed, currently deferred
var columns = [];
columns.push(new nlobjSearchColumn("custrecord_deferred_sales_out_gdp_rev", null, "SUM"));
columns.push(new nlobjSearchColumn("custrecord_deferred_sales_out_non_ser_re", null, "SUM"));
var filters = [];

filters.push(new nlobjSearchFilter("custrecord_sales_out_original_trans", null, "anyof", ibSalesOrderId));

var searchSalesOuts = nlapiSearchRecord("customrecord_sales_out", null, filters, columns);
nlapiLogExecution('DEBUG', 'search sales out non-serialized check ', searchSalesOuts);
var sumtotal = 0;
if(searchSalesOuts){

	for(var m = 0; m < searchSalesOuts.length; m++){

		sumtotal += parseFloat(searchSalesOuts[m].getValue("custrecord_deferred_sales_out_gdp_rev", null, "SUM"));

		sumtotal += parseFloat(searchSalesOuts[m].getValue("custrecord_deferred_sales_out_non_ser_re", null, "SUM"));
		nlapiLogExecution('DEBUG', 'sum total ', sumtotal);
	}
}

var salesOrderTotalLookup = parseFloat(nlapiLookupField("salesorder", originalSalesOrder, "NETAMOUNTNOTAX", false));
nlapiLogExecution('DEBUG', 'sum total ', sumtotal + " SO Lookup Total " + salesOrderTotalLookup);
//Reverse Rev Rec Hold on Invoices,

if(sumtotal >= salesOrderTotalLookup){
	 nlapiLogExecution('DEBUG', 'IB SO ',  ibSalesOrderId);
	var filters = [];
	var type = [];
	type.push("invoice");
	filters.push(new nlobjSearchFilter("createdfrom", null, "is", ibSalesOrderId));
	//filters.push(new nlobjSearchFilter("type", null, "anyof", type));
	filters.push(new nlobjSearchFilter("mainline", null, "is", "T"));

	var searchInvoices = nlapiSearchRecord("transaction", null, filters, null);
	nlapiLogExecution('DEBUG', 'search Invoices to reverse rev rec schedule ', searchInvoices);

	if(searchInvoices){

		for(var m = 0; m < searchInvoices.length; m++){

			var type = searchInvoices[m].getRecordType();
			 nlapiLogExecution('DEBUG', 'item type ', type);

			 if(type == "invoice"){
			 try{
			var invoicerecord = nlapiLoadRecord("invoice", searchInvoices[m].getId());

			var linecount = invoicerecord.getLineItemCount("item");

			for(var j = 1; j <= linecount; j++ ){

				var revrechshedulecheck = invoicerecord.getLineItemValue("item", "revrecschedule", j);
				nlapiLogExecution('DEBUG', 'rev rec schedule check ', revrechshedulecheck);

				if(revrechshedulecheck){

					invoicerecord.setLineItemValue("item", "revrecstartdate", j, salesOutDate);
					nlapiSubmitField("revrectemplate", revrechshedulecheck, "status", "2", true);
					nlapiSubmitField("revrectemplate", revrechshedulecheck, "startdate", salesOutDate);
				}

				invoicerecord.setLineItemValue("item", "deferrevrec", j, "F");


			}

			var submittedinvoice = nlapiSubmitRecord(invoicerecord, true, true);
			nlapiLogExecution('DEBUG', 'submitted invoice ', submittedinvoice);
			 }
			 catch(ex){

				 nlapiLogExecution('DEBUG', 'catch ex ', ex);

			 }

		}
		}
	}
}
*/
