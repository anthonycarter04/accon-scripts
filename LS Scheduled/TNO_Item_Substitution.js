/*

	Created By: Craig Killian
	Created On: 11/15/2014

	Description: This script will process and ready hardware sales orders for physical fulfillment.
	
	11-14-17 NP Hotfix for product family being read from the sales order line - included in item lookup and moved lookup up several blocks

*/

var SUBSIDIARY_PARENT_COMPANY = '7',
    RMA_SALES_FORM = '102',
    RMA_DEFAULT_ASSEMBLY_ITEM = '18084',
    CLASS_NONE = '1409',
    DEPARTMENT_NONE = '23',
    ORDERS_EMPLOYEE = '102234',
    SALES_ORDER_SEARCH = 'customsearch_item_substitution_search_so',
    ASSEMBLY_ITEM_TYPE = 'Assembly',
    WORK_ORDER_STATUS_RELEASED = 'B',
    PREVENT_ACTIVITY_FULFILLMENT = '2',
    NEW_FULFILLMENT = '1',
    CUSTOM_FULFILL_PENDING = '1',
    STATUS_ON_HOLD = '1',
    SCRIPT_DEPLOYMENT = 'customdeploy_item_sub',
    SCRIPT_ID = 'customscript_item_sub_and_item_creation',
    PICK_BATCH_STATUS_ACTIVE = '1',
    TYPE_HARDWARE = '1',
    TYPE_PHANTOM = '3',
    RMA_ITEM_SUBSTITUTION_PREFIX = '458',
    LABEL_TYPE_LIFESIZE = '1',
    SATURDAY = '6',
    SUNDAY = '0',
    TYPE_SERVICE = '6',
    ORDER_TYPE_RMA = '4',
    FAMILY_POWER_CORD = '31',
    PRODUCT_FAMILLY_BUNDLE = '36';
STATUS_PICKED = 'A';


function itemSubDriver() {

    nlapiLogExecution('DEBUG', 'Item Sub Start');
    var multLocationParam, singleLocationParam, singleSalesOrdParam, singleCustomerParam, pickBatchParam, pickBatchId, rmaOnlyParam;
    var ordersToProcess = [];
    var filters = [];
    var locationArr = [];
    var context = nlapiGetContext();

    multLocationParam = context.getSetting('SCRIPT', 'custscript_location');
    singleLocationParam = context.getSetting('SCRIPT', 'custscript_single_location');
    singleSalesOrdParam = context.getSetting('SCRIPT', 'custscript_sales_order_sub');
    singleCustomerParam = context.getSetting('SCRIPT', 'custscript_customer_sub');
    pickBatchParam = context.getSetting('SCRIPT', 'custscript_pickbatch');
    rmaOnlyParam = context.getSetting('SCRIPT', 'custscript_rma_orders_only');


    if (multLocationParam) {

        multLocationParam = multLocationParam.split(',');
        locationArr = multLocationParam
        nlapiLogExecution('DEBUG', 'Mult Loc', JSON.stringify(multLocationParam));
        filters.push(new nlobjSearchFilter('location', null, 'anyof', multLocationParam));
        if (rmaOnlyParam == 'T') {

            filters.push(new nlobjSearchFilter('custbody_tno_order_type', null, 'anyof', ORDER_TYPE_RMA));
        }
        ordersToProcess = nlapiSearchRecord(null, SALES_ORDER_SEARCH, filters);
        pickBatchId = createPickBatch(PICK_BATCH_STATUS_ACTIVE, null, null, null, pickBatchParam);
        scheduledItemSubstitution(ordersToProcess, pickBatchId, locationArr);
        return;
    }
    else if (singleLocationParam) {

        nlapiLogExecution('DEBUG', 'Single Location', singleLocationParam);
        locationArr = [singleLocationParam];
        filters.push(new nlobjSearchFilter('location', null, 'anyof', singleLocationParam, 'item'));
        pickBatchId = createPickBatch(PICK_BATCH_STATUS_ACTIVE, null, null, singleLocationParam, pickBatchParam);
    }
    else if (singleSalesOrdParam) {

        nlapiLogExecution('DEBUG', 'Sales Order', singleSalesOrdParam);
        filters.push(new nlobjSearchFilter('internalid', null, 'anyof', singleSalesOrdParam));
        pickBatchId = createPickBatch(PICK_BATCH_STATUS_ACTIVE, null, singleSalesOrdParam, null, pickBatchParam);
    }
    else if (singleCustomerParam) {

        filters.push(new nlobjSearchFilter('entityid', null, 'anyof', singleCustomerParam));
        pickBatchId = createPickBatch(PICK_BATCH_STATUS_ACTIVE, singleCustomerParam, null, null, pickBatchParam);
    }
    else {

        return;
    }

    if (rmaOnlyParam == 'T') {

        filters.push(new nlobjSearchFilter('custbody_tno_order_type', null, 'anyof', ORDER_TYPE_RMA));
    }
    ordersToProcess = nlapiSearchRecord(null, SALES_ORDER_SEARCH, filters);
    Util.console.log(ordersToProcess, 'ordersToProcess');
    pickBatchId = createPickBatch(PICK_BATCH_STATUS_ACTIVE, singleCustomerParam, null, null, pickBatchParam);
    scheduledItemSubstitution(ordersToProcess, pickBatchId, locationArr);
}


function createPickBatch(status, customer, salesOrderId, location, batchRecord) {

    if (batchRecord) return batchRecord;

    var isRMA = false;
    var today = nlapiDateToString(new Date());
    var batchRecord = nlapiCreateRecord('customrecord_pick_batch');

    batchRecord.setFieldValue('custrecord_pick_date_time_created', today);
    batchRecord.setFieldValue('custrecord_pick_related_so', salesOrderId);
    batchRecord.setFieldValue('custrecord_pick_status', status);
    batchRecord.setFieldValue('custrecord_pick_location', location);
    batchRecord.setFieldValue('custrecord_pick_related_customer', customer);

    return nlapiSubmitRecord(batchRecord);
}


function scheduledItemSubstitution(ordersToProcess, pickBatchId, locationArr) {

    var i, j, k, l;
    var orderCount, shipSetCount, usageRemaining, substitutionItems, runContextParameter,
        customFulfillmentId, customer, salesOrdId, assemblyItemloc, salesOrdForm, productType,
        subItem, locationParameter, previousOrderId, pickBatchParam, customform, isRMAOverrideProvided,
        isRMA, isRMASubstitutable, customerDoesNotAcceptRefurbs, fulfillmentId;
    var assemblyItemRec = {}, holdObject = {}, runContextObject = {}, subItemQuantities = {}, params = {};
    var workOrderLines = [], filters = [], lineLevelHolds = [], orderLevelHolds = [], possibleSubItems = [], shipSetArray = [];
    salesOrderContainer = {};
    var context = nlapiGetContext();

    if (!ordersToProcess) {

        nlapiLogExecution('AUDIT', 'NO ORDERS TO PROCESS');
        return;
    }

    orderCount = ordersToProcess.length;

    for (i = 0; i < orderCount; i++) {

        usageRemaining = context.getRemainingUsage();
        nlapiLogExecution('DEBUG', 'Usage Remaning: Per Order', usageRemaining);
        if (usageRemaining <= 2000) {

            params['custscript_pickbatch'] = pickBatchId;
            nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), params);
            return;
        }

        isRMA = false;
        salesOrdId = ordersToProcess[i].getValue('internalid', null, 'GROUP');



        if (salesOrdId) {
            nlapiLogExecution('AUDIT', 'Sales Order#', salesOrdId);
            salesOrderContainer = createSalesOrderObject(salesOrdId, locationArr);
            nlapiLogExecution('DEBUG', 'SALES ORDER CONTAINER', JSON.stringify(salesOrderContainer));
            //return;

            orderLevelHolds = fetchExistingHold(PREVENT_ACTIVITY_FULFILLMENT, salesOrdId, false);
            Util.console.log(orderLevelHolds, 'orderLevelHolds');
            lineLevelHolds = fetchExistingHold(PREVENT_ACTIVITY_FULFILLMENT, salesOrdId, true);
            Util.console.log(lineLevelHolds, 'lineLevelHolds');


            if (orderLevelHolds || lineLevelHolds) {
                var err = {};
                var err = nlapiCreateError('Order Has Holds', JSON.stringify(orderLevelHolds), true)

                //Util.ssError(err, salesOrdId, 'transaction');
            }



            if (orderLevelHolds) {
                continue;
            }
            salesOrdForm = salesOrderContainer.salesOrderCustomForm;
            customer = salesOrderContainer.salesOrderCustomer;
            //nlapiLogExecution('AUDIT', 'Sales Order Form', salesOrdForm);

            if (salesOrdForm == RMA_SALES_FORM) {

                isRMA = true;
            }

            shipSetCount = salesOrderContainer.salesOrderShipsets.length;
            nlapiLogExecution('DEBUG', 'Ship Set Count', shipSetCount);

            for (j = 0; j < shipSetCount; j++) {

                shipSetArray = salesOrderContainer.salesOrderShipsets[j];

                if (shipSetArray) {

                    nlapiLogExecution('DEBUG', 'Ship Set Info: ', JSON.stringify(shipSetArray));
                    fulfillmentId = processShipSet(shipSetArray, fulfillmentId, salesOrdId, pickBatchId, customer, lineLevelHolds, isRMA, context, j);
                }
            }
        }
    }
}

var UsedItems = {};

function processShipSet(shipSet, fulfillmentId, salesOrd, pickBatch, customer, lineLevelHolds, isRMA, context, shipSetNum) {

    nlapiLogExecution('AUDIT', 'Processing Shipset: ' + shipSetNum + '...');
    var i, itemCount, j, k, workOrderCount, propt;
    var productType, itemType, lineQuantity, groupId, discAmt, compItem, isPreferredPart,
        compQuan, substitutable, assyId, assyLoc, substitutionItems, lineInternalId, lineRequestDate,
        labelType, assignedLineId, substitutedComp, compItemType, compProductType;
    var lineItem = {}, phantomRec = {};
    var componentList = [], workOrderLines = [], possibleSubItems = [], subItemQuantities = [], allWorkOrders = [];

    UsedItems = {};

    var dateToday = new Date();

    itemCount = shipSet.length;
    for (i = 0; i < itemCount; i++) {

        workOrderLines = [];
        lineItem = shipSet[i];
        Util.console.log(lineItem, 'lineItem in Ship Set');
        lineQuantity = lineItem.quantity;
        lineInternalId = lineItem.internalID;
        productType = lineItem.productType;
        itemType = lineItem.itemType;
        assyId = lineItem.item;
        assyLocation = lineItem.loc;
        lineRequestDate = lineItem.requestdate;
        lineFulfillment = lineItem.lineFulfillment;
        groupId = lineItem.lineGroupId;
        discAmt = lineItem.lineDiscAmt;
        assignedLineId = lineItem.assignedLineId;
        isPreferredPart = lineItem.isPreferredPart;

        serialNumGen = nlapiLookupField('item', assyId, 'custitem_serial_number_generation');

        var stopPickDate = context.getSetting('SCRIPT', 'custscriptstop_pick_date');
        var stopNumDays = context.getSetting('SCRIPT', 'custscript_number_days');
        //Util.console.log(lineRequestDate, 'lineRequestDate');
        var requestDate = nlapiStringToDate(lineRequestDate);
        //Util.console.log(requestDate, 'lineRequestDate after');
        if (stopNumDays) {
            var stopNumDaysDate = calcWorkingDays(dateToday, stopNumDays);
            dateToday = stopNumDaysDate;
        }
        //Util.console.log(stopNumDays, 'stopNumDays');
        //.console.log(stopNumDaysDate, 'stopNumDaysDate');

        //Util.console.log(stopPickDate, 'stopPickDate');
        if (stopPickDate) {
            stopPickDate = nlapiStringToDate(stopPickDate);
            dateToday = stopPickDate;
        }


        if (stopNumDays && stopPickDate && stopNumDaysDate < stopPickDate) {
            dateToday = stopNumDaysDate;
        }
        //Util.console.log(dateToday, 'dateToday');

        if (requestDate <= dateToday) {

            nlapiLogExecution('DEBUG', 'Process Order Shipset', 'Request Date Today or Earlier');
        }
        else {
            var err = {};
            var err = nlapiCreateError('Request Date After "Today"', '', true)
            //Util.ssError(err, salesOrd, 'transaction');
            nlapiLogExecution('DEBUG', 'Exit1');
            return;
        }
        //Util.console.log(lineLevelHolds, 'lineLevelHolds in processShipSet');


        var breakShipSetLoop = 'F';
        if (lineLevelHolds) {
            //AC-NimbusLabs BA-81 Adding functionality to loop through the line holds, as this was incorrectly trying to find the line by the array count before.
            for (var lh = 0; lh < lineLevelHolds.length; lh++) {

                var holdInstanceLine = lineLevelHolds[lh].getValue('custrecord_hold_instance_so_line');
                Util.console.log(holdInstanceLine, 'holdInstanceLine');
                Util.console.log(lineInternalId, 'lineInternalId');
                if (holdInstanceLine && holdInstanceLine == assignedLineId) {
                    var err = {};
                    var err = nlapiCreateError('Line On Hold', 'Line Internal ID = ' + lineInternalId, true)
                    //Util.ssError(err, salesOrd, 'transaction');
                    nlapiLogExecution('DEBUG', 'Line On Hold');
                    breakShipSetLoop = 'T';
                    continue;
                }
            }
        }

        if (breakShipSetLoop == 'T') {
            continue;
        }
        //return;
        nlapiLogExecution('DEBUG', 'Product Type/Item Type', productType + '   /   ' + itemType);
        if (productType == TYPE_HARDWARE && itemType == 'Assembly') {

            nlapiLogExecution('DEBUG', 'PT Hard/Assembly');
            componentList = lineItem.componentList;
            nlapiLogExecution('DEBUG', 'componentList:', componentList);
            Util.console.log(componentList, 'Component List');
            for (propt in componentList) {

                compItem = componentList[propt].item;
                compQuan = componentList[propt].quantity;
                compItemType = componentList[propt].itemType;
                compProductType = componentList[propt].productType;
                phantomItem = componentList[propt].phantomItem;

                nlapiLogExecution('AUDIT', 'CompQuan / LineQuan:', compQuan + ' ' + lineQuantity);
                quanNeeded = parseInt(compQuan) * parseInt(lineQuantity);

                substitutionItems = [];

                // if(UsedItems.hasOwnProperty(compItem)){
                // 	var usedQuantity = UsedItems[compItem].quantity_used
                // 
                // 	if(usedQuantity){
                // 		quanNeeded += usedQuantity;
                // 	}
                // }

                nlapiLogExecution('AUDIT', 'Quantity Needed: ' + propt, quanNeeded);

                substitutable = nlapiLookupField('item', compItem, 'custitem_item_is_substitutable');

                nlapiLogExecution('DEBUG', 'Item Type', compItemType);
                //if(compItemType != 'Assembly' && compItemType != 'InvtPart'){continue;}
                if (compItemType != 'Assembly' && compItemType != 'InvtPart' && compItemType != 'NonInvtPart') { continue; }

                if (substitutable == 'T' && isPreferredPart == 'F') {
                    possibleSubItems = [];
                    nlapiLogExecution('DEBUG', 'isRMA', isRMA);

                    if (isRMA) {

                        substitutionItems = getSubstituteOptions(assyId, compItem, null, assyLocation);
                    }
                    else if (phantomItem) {

                        substitutionItems = getSubstituteOptions(phantomItem, compItem, null, assyLocation);
                        nlapiLogExecution('DEBUG', 'Item Sub Options', JSON.stringify(substitutionItems));
                    }
                    else {

                        substitutionItems = getSubstituteOptions(assyId, compItem, null, assyLocation);
                        nlapiLogExecution('DEBUG', 'Item Sub Options', JSON.stringify(substitutionItems));
                    }

                    if (substitutionItems) {

                        for (k = 0; k < substitutionItems.length; k++) {

                            possibleSubItems.push(substitutionItems[k].getValue('custrecord_item_sub_valid_sub'));
                        }
                        possibleSubItems.push(compItem);
                    }
                    else {
                        possibleSubItems.push(compItem);
                    }
                }
                else if (compProductType != TYPE_HARDWARE && compProductType != TYPE_PHANTOM && serialNumGen != 2) {
                    nlapiLogExecution('DEBUG', 'Push 1');
                    workOrderLines.push({
                        itemId: compItem,
                        quantity: compQuan,
                        assyItem: assyId,
                        lineQuan: lineQuantity,
                        lineId: lineInternalId,
                        lineGroupId: groupId,
                        lineDiscAmt: discAmt,
                        assignedLineId: assignedLineId
                    });
                    storeItemQuantity(compItem, quanNeeded);
                    continue;
                }
                else {

                    possibleSubItems = [];
                    possibleSubItems.push(compItem);
                }
                Util.console.log(possibleSubItems, 'possibleSubItems');
                if (possibleSubItems) {

                    nlapiLogExecution('DEBUG', 'SUB  Possibilities', JSON.stringify(possibleSubItems));
                    subItemQuantities = getAllQuantitiesInLocation(possibleSubItems, assyLocation, quanNeeded, isRMA);

                    if (subItemQuantities) {
                        nlapiLogExecution('DEBUG', 'SubItemQuans', JSON.stringify(subItemQuantities));
                        if (isRMA == true && isPreferredPart == 'F') {
                            var subPriority = getHighestPriority(assyId, subItemQuantities)
                            Util.console.log(subPriority, 'subPriority');
                            if (subPriority) {
                                substitutedComp = subPriority[0].getValue('custrecord_item_sub_valid_sub');
                            }
                            else {
                                substitutedComp = subItemQuantities[0].getId();
                            }
                            nlapiLogExecution('DEBUG', 'RMA SUB  Quantities', JSON.stringify(subItemQuantities));
                        }
                        else {
                            //Create loop that compares quantities used.
                            var hasValidPart = false;
                            for (var x = 0; x < subItemQuantities.length; x++) {

                                var prevUsed = 0;
                                substitutedComp = subItemQuantities[x].getId();
                                quanAvailable = subItemQuantities[x].getValue('locationquantityavailable');
                                nlapiLogExecution('AUDIT', substitutedComp + ' ' + quanAvailable);

                                if (UsedItems.hasOwnProperty(substitutedComp)) {
                                    prevUsed = UsedItems[substitutedComp].quantity_used;
                                    nlapiLogExecution('AUDIT', 'PrevUsed1:', prevUsed);
                                }
                                nlapiLogExecution('AUDIT', 'PrevUsed2:', prevUsed);
                                if (quanAvailable >= (parseInt(quanNeeded) + parseInt(prevUsed))) {
                                    hasValidPart = true;
                                    break;
                                }
                            }
                            if (!hasValidPart) {
                                subItemQuantities = [];
                            }
                        }
                    }
                    nlapiLogExecution('DEBUG', 'Push 2');
                    nlapiLogExecution('DEBUG', 'Sub Quantities', JSON.stringify(subItemQuantities));
                    if (subItemQuantities && subItemQuantities.length > 0) {
                        workOrderLines.push({
                            itemId: substitutedComp,
                            quantity: compQuan,
                            assyItem: assyId,
                            lineQuan: lineQuantity,
                            lineId: lineInternalId,
                            lineGroupId: groupId,
                            lineDiscAmt: discAmt,
                            assignedLineId: assignedLineId
                        });
                        nlapiLogExecution('DEBUG', 'SubComp/Line Quan', substitutedComp + '  ' + lineQuantity);
                        storeItemQuantity(substitutedComp, quanNeeded);
                    }
                    else {
                        var err = {};
                        var err = nlapiCreateError('No Items Available', 'Component Item ' + nlapiLookupField('item', compItem, 'itemid'), true)
                        //Util.ssError(err, salesOrd, 'transaction');
                        nlapiLogExecution('DEBUG', 'No Items Available ' + salesOrd);
                        return 0;
                    }
                }

                if (isRMA == true) break;
            }
            nlapiLogExecution('DEBUG', 'Add Work Order Line', JSON.stringify(workOrderLines));
            allWorkOrders.push(workOrderLines);
        }
    }


    if (allWorkOrders.length > 0) {

        nlapiLogExecution('DEBUG', 'All Work Orders', JSON.stringify(allWorkOrders));

        if (!fulfillmentId) {

            labelType = nlapiLookupField('customer', customer, 'custentity_label_type');

            fulfillmentId = createCustomFulfillment(NEW_FULFILLMENT, salesOrd, pickBatch, labelType, assyLocation);
            nlapiLogExecution('DEBUG', 'Fullfillment Created', fulfillmentId);
        }

        workOrderCount = allWorkOrders.length;

        nlapiLogExecution('DEBUG', 'Line Quantity', workOrderCount);
        var fulfilledLines = [];
        for (k = 0; k < workOrderCount; k++) {

            createWorkOrder(salesOrd, allWorkOrders[k], allWorkOrders[k][0].assyItem, customer, fulfillmentId, pickBatch, assyLocation, allWorkOrders[k][0].lineQuan, allWorkOrders[k][0].lineId, allWorkOrders[k][0].lineGroupId, allWorkOrders[k][0].lineDiscAmt, allWorkOrders[k][0].assignedLineId);
            fulfilledLines.push(allWorkOrders[k][0].lineId);
        }

        var nativeFulfillmentId = transformItemFulfillment(salesOrd, fulfilledLines);

        setFulfillmentOnSalesOrderLines(salesOrd, fulfilledLines, fulfillmentId);


        nlapiLogExecution('DEBUG', 'Work Order Creation Finished');

        var fulRec = nlapiLoadRecord('customrecord_custom_fulfillment', fulfillmentId);
        fulRec.setFieldValue('custrecord_native_fulfillment', nativeFulfillmentId);
        nlapiSubmitRecord(fulRec);

        nlapiLogExecution('DEBUG', 'Used Items', JSON.stringify(UsedItems));

        sendPickSlipEmail(fulfillmentId, salesOrd);
    }
}


function setFulfillmentOnSalesOrderLines(salesOrder, fulfilledLines, fulfillmentId) {

    for (var t = 0; t <= 5; t++) {

        nlapiLogExecution('AUDIT', 'SO Submit Atempt: ' + t);
        var salesOrdRec = nlapiLoadRecord('salesorder', salesOrder);
        var hasSubmitError = false;

        var shipCost = salesOrdRec.getFieldValue('shippingcost')


        var numLines = salesOrdRec.getLineItemCount('item');

        for (var k = 1; k <= numLines; k++) {

            var lineId = salesOrdRec.getLineItemValue('item', 'line', k);
            if (fulfilledLines.indexOf(lineId) != -1) {

                salesOrdRec.setLineItemValue('item', 'custcol_lifesize_fulfillment', k, fulfillmentId);

            }
        }

        try {
            salesOrdRec.setFieldValue('shippingcost', shipCost);
            var submitId = nlapiSubmitRecord(salesOrdRec, null, true);

        }
        catch (e) {
            nlapiLogExecution('AUDIT', 'Error Caught', e);
            hasSubmitError = true;
        }

        if (!hasSubmitError) {
            return;
        }
        else {
            break;
        }
    }
}


function transformItemFulfillment(salesOrdId, linesToFulfill) {

    var i, lineCount, j, fulfillLineCount, soLine;
    var fulfillLine = false;
    var fulfillcount = 0;
    var itemFulfillmentRec = nlapiTransformRecord('salesorder', salesOrdId, 'itemfulfillment');

    nlapiLogExecution('DEBUG', 'Lines To Fulfill', JSON.stringify(linesToFulfill));
    //nlapiLogExecution('DEBUG', 'Line Count');
    for (i = 1, lineCount = itemFulfillmentRec.getLineItemCount('item'); i <= lineCount; i++) {

        soLine = itemFulfillmentRec.getLineItemValue('item', 'orderline', i);
        //nlapiLogExecution('DEBUG', 'SO Line', soLine);
        for (j = 0, fulfillLineCount = linesToFulfill.length; j < fulfillLineCount; j++) {

            if (soLine == linesToFulfill[j]) {
                nlapiLogExecution('DEBUG', 'Line Match');
                fulfillLine = true;
            }
        }
        if (fulfillLine === true) {

            itemFulfillmentRec.setLineItemValue('item', 'quantity', i, itemFulfillmentRec.getLineItemValue('item', 'quantityremaining', i));
            fulfillLine = false;
            fulfillcount++;
        }
        else {

            itemFulfillmentRec.setLineItemValue('item', 'itemreceive', i, 'F');
        }
    }


    //BIZ-77 AC - NimbusLabs - Freight Billing - Search for shipping cost already charged. If no charge, then set shipping
    var filters = [];
    filters.push(new nlobjSearchFilter('internalid', null, 'anyof', salesOrdId));

    var searchResults = nlapiSearchRecord('transaction', 'customsearch_ship_cost_charged_by_so', filters);

    Util.console.log(searchResults, 'searchResults');

    if (searchResults && searchResults != '' && searchResults.length > 0) {

        var shipCostCharged = searchResults[0].getValue('shippingcost', 'fulfillingtransaction', 'sum');
        var soShipCost = searchResults[0].getValue('shippingcost', null, 'max');
        Util.console.log(shipCostCharged, 'shipCost');
        //shipping cost is >0, thus already set.  Do not set shipping cost
        if (shipCostCharged > 0) {

        } else {
            itemFulfillmentRec.setFieldValue('shippingcost', soShipCost);
        }

    } else {
        //Could not find any fulfillments for this so, thus set shipping cost
        itemFulfillmentRec.setFieldValue('shippingcost', soShipCost);
    }

    itemFulfillmentRec.setFieldValue('shipstatus', STATUS_PICKED);

    nlapiLogExecution('DEBUG', 'Creating Item Fulfillment', JSON.stringify(itemFulfillmentRec));
    if (fulfillcount == 0) return 0;
    return nlapiSubmitRecord(itemFulfillmentRec, true, true);
}


function storeItemQuantity(item, quantity) {

    if (!UsedItems.hasOwnProperty(item)) {
        UsedItems[item] = {
            'quantity_used': parseInt(quantity)
        }
    }
    else {
        UsedItems[item].quantity_used += parseInt(quantity);
    }
}

function getHighestPriority(assembly, components) {

    var filters = [];
    var columns = [];
    var SubstitutionResult;
    var componentArr = [];

    for (var i = 0; i < components.length; i++) {

        componentArr.push(components[i].getId());
    }

    nlapiLogExecution('DEBUG', 'Components', componentArr);
    filters.push(new nlobjSearchFilter('custrecord_item_sub_assembly', null, 'anyof', assembly));
    filters.push(new nlobjSearchFilter('custrecord_item_sub_valid_sub', null, 'anyof', componentArr));
    filters.push(new nlobjSearchFilter('custrecord_item_sub_rma_priority', null, 'noneof', 1));

    columns.push(new nlobjSearchColumn('custrecord_item_sub_valid_sub'));
    columns.push(new nlobjSearchColumn('custrecord_item_sub_rma_priority').setSort(false));

    return nlapiSearchRecord('customrecord_item_substitution', null, filters, columns);
}


function getSubstituteOptions(assembly, component, quantityNeeded, location) {

    var filters = [];
    var columns = [];
    var SubstitutionResult;

    filters.push(new nlobjSearchFilter('custrecord_item_sub_assembly', null, 'anyof', assembly));
    filters.push(new nlobjSearchFilter('custrecord_item_sub_bom_component', null, 'anyof', component));

    columns.push(new nlobjSearchColumn('internalid'));
    columns.push(new nlobjSearchColumn('custrecord_item_sub_assembly'));
    columns.push(new nlobjSearchColumn('custrecord_item_sub_bom_component'));
    columns.push(new nlobjSearchColumn('custrecord_item_sub_valid_sub'));
    columns.push(new nlobjSearchColumn('custrecord_item_sub_rma_priority').setSort(false));

    return nlapiSearchRecord('customrecord_item_substitution', null, filters, columns);
}


function calcWorkingDays(fromDate, days) {
    var count = 0;
    while (count < days) {
        fromDate.setDate(fromDate.getDate() + 1);
        if (fromDate.getDay() != 0 && fromDate.getDay() != 6) // Skip weekends
            count++;
    }
    return fromDate;
}

//create a work order, and wipe all lines. then re-add components and quantity for each component. associate to pick batch record, custom fulfillment, and sales order
//components is an an array of objects. for each object, it will have two properties, item and quantity
//the components will represent all components we are adding to this order post-substitution, keeping in mind that not all components are substitutable but will still need to be added to work order
//create record in dynamic mode so that when the assembly is selected, it's predefined components should default and we will be able to detect that through script
//customer will be customer from the sales order
function createWorkOrder(salesOrder, components, assembly, customer, customFulfillment, pickBatch, location, lineQuantity, lineInternalId, lineGroupId, lineDiscAmt, assignedLineId) {

    nlapiLogExecution('AUDIT', 'Starting WO Creation');
    var rec = nlapiCreateRecord('workorder', { recordmode: 'dynamic' });

    rec.setFieldValue('subsidiary', SUBSIDIARY_PARENT_COMPANY);

    rec.setFieldValue('assemblyitem', assembly);

    //wipe lines
    while (rec.getLineItemCount('item') > 0) {
        rec.removeLineItem('item', 1);
    }

    nlapiLogExecution('DEBUG', 'Sales Order', salesOrder);
    rec.setFieldValue('custbody_sales_order_wo', salesOrder);
    rec.setFieldValue('quantity', lineQuantity);
    rec.setFieldValue('custbody_custom_fulfillment', customFulfillment);
    rec.setFieldValue('custbody_pick_batch', pickBatch);
    rec.setFieldValue('location', location);
    rec.setFieldValue('custbody_sales_order_line', lineInternalId);
    rec.setFieldValue('custbody_group_parent', lineGroupId);
    rec.setFieldValue('custbody_assigned_line_id', assignedLineId);

    rec.setFieldValue('class', CLASS_NONE);
    rec.setFieldValue('department', DEPARTMENT_NONE);

    rec.setFieldValue('entity', customer);

    //add all components
    for (var i = 0; i < components.length; i++) {

        rec.selectNewLineItem('item');
        //nlapiLogExecution('DEBUG', 'Quantity', components[i].quantity);
        rec.setCurrentLineItemValue('item', 'item', components[i].itemId);
        rec.setCurrentLineItemValue('item', 'quantity', (components[i].quantity * lineQuantity));
        rec.commitLineItem('item');
    }

    //link to sales order, pick batch, and custom fulfillment
    var salesOrdRec = nlapiLoadRecord('salesorder', salesOrder);
    var isInterTrans = salesOrdRec.getFieldValue('intercotransaction');
    //var soCase = salesOrdRec.getFieldValue('custbody_transaction_case');
    //rec.setFieldValue('custbody_transaction_case', soCase);

    if (isInterTrans) {
        rec.setFieldValue('entity', '');
    }

    nlapiSubmitRecord(rec, true, true);
    //nlapiLogExecution('DEBUG', 'WORK ORDER CREATED', lineInternalId);
}


//Create custom fulfillment. If this is an RMA then the fulfillment type will be RMA.
function createCustomFulfillment(fulfillmentType, salesOrder, pickBatch, labelType, location) {

    nlapiLogExecution('DEBUG', 'Starting Record Fulfillment');

    if (!fulfillmentType) {
        throw 'Missing Fulfillment Type';
    }
    if (!salesOrder) {
        throw 'Missing Sales Order';
    }
    if (!pickBatch) {
        throw 'Missing Pick Batch';
    }

    var rec = nlapiCreateRecord('customrecord_custom_fulfillment');

    rec.setFieldValue('custrecord_fulfillment_batch_no', pickBatch);
    rec.setFieldValue('custrecord_fulfillment_so_no', salesOrder);
    rec.setFieldValue('custrecord_fulfillment_status', CUSTOM_FULFILL_PENDING);
    rec.setFieldValue('custrecord_fulfillment_type', fulfillmentType);
    rec.setFieldValue('custrecord_ls_fulfillment_location', location);

    if (labelType) {
        rec.setFieldValue('custrecord_label_type', labelType);
    }
    else {
        rec.setFieldValue('custrecord_label_type', LABEL_TYPE_LIFESIZE)
    }

    return nlapiSubmitRecord(rec, true, true);
}


//Find order or line hold associated with a specific order
function fetchExistingHold(holdType, orderId, searchLineHolds) {

    nlapiLogExecution('DEBUG', 'Starting Hold Check', 'Line Hold: ' + searchLineHolds);

    if (!holdType) {
        throw 'Missing Hold Type'
    }
    if (!orderId) {
        throw 'Missing Order Id'
    }
    var filters = [new nlobjSearchFilter('custrecord_hold_instance_hold_status', null, 'anyof', STATUS_ON_HOLD),
    new nlobjSearchFilter('custrecord_hold_instance_sales_order', null, 'anyof', orderId)];

    var columns = [new nlobjSearchColumn('custrecord_hold_instance_hold_status'),
    new nlobjSearchColumn('custrecord_hold_instance_prevent_action'),
    new nlobjSearchColumn('custrecord_hold_instance_so_line'),
    new nlobjSearchColumn('custrecord_hold_instance_hold_type'),
    new nlobjSearchColumn('internalid')];

    if (searchLineHolds == true) {
        filters.push(new nlobjSearchFilter('custrecord_hold_instance_so_line', null, 'isnotempty'));
    }
    else {
        filters.push(new nlobjSearchFilter('custrecord_hold_instance_prevent_action', null, 'anyof', holdType));
        filters.push(new nlobjSearchFilter('custrecord_hold_instance_so_line', null, 'isempty'));
    }

    return nlapiSearchRecord('customrecord_hold_instance', null, filters, columns);
}


//get all quantities on hand and quantities available in a location or locations.
function getAllQuantitiesInLocation(items, location, quantityNeeded, isRMA) {

    nlapiLogExecution('DEBUG', 'Get Quantities in Location: ' + location, 'Quantity Needed: ' + quantityNeeded + ' Items: ' + items + ' isRma: ' + isRMA);
    var filters = [new nlobjSearchFilter('internalid', null, 'anyof', items),
    new nlobjSearchFilter('internalid', 'inventorylocation', 'anyof', location),
    new nlobjSearchFilter('locationquantityavailable', null, 'greaterthanorequalto', quantityNeeded),
    new nlobjSearchFilter('locationquantityavailable', null, 'greaterthanorequalto', quantityNeeded)];

    var columns = [];

    if (isRMA) {
        columns.push(new nlobjSearchColumn('locationquantityavailable'));
    }
    else {
        columns.push(new nlobjSearchColumn('locationquantityavailable').setSort(false));
    }

    return nlapiSearchRecord('item', null, filters, columns);
}


function createSalesOrderObject(salesOrderId, locationArr) {

    var i, j, k, l;
    var kitNumber, itemType, itemClass;
    var lineShipset, lineInternalId, lineQuantity, lineLocation, lineItemId, cordsIncluded, cordsRequired, cordRegion,
        lineItemProductType, lineItemDiscAmt, lineItemGroupId, assignedGroupId, itemType, lineItemfamily;
    var componentList = [];
    var isLocation;
    var context = nlapiGetContext();

    var salesOrderRec = nlapiLoadRecord('salesorder', salesOrderId);

    var salesOrderNumber = salesOrderRec.getFieldValue('tranid');
    var salesOrderCustomForm = salesOrderRec.getFieldValue('customform');
    var salesOrderCustomer = salesOrderRec.getFieldValue('entity');
    var salesOrderCordRegion = salesOrderRec.getFieldValue('custbody_ship_to_region');
    var isIntercoTrans = salesOrderRec.getFieldValue('intercotransaction');
    var isPreferredPart = salesOrderRec.getFieldValue('custbody_override_part_num_provided');
    //Main Object
    var salesOrderContainer = {

        'salesOrderId': salesOrderId,
        'salesOrderCustomer': salesOrderCustomer,
        'salesOrderNumber': salesOrderNumber,
        'salesOrderCustomForm': salesOrderCustomForm,
        'salesOrderLines': {},
        'salesOrderShipsets': []
    }

    var numLines = salesOrderRec.getLineItemCount('item');

    //will hold all the ships set numbers for lines that have stop ship as shecked
    //then all lines with same ship sets should be stopped from fulfillment 
    var holdLinesShipsetsArray = new Array();
    for (j = 1; j <= numLines; j++) {
        var shipHold = salesOrderRec.getLineItemValue('item', 'custcol_stop_ship', j);

        if (shipHold == 'T') {
            var shipSet = salesOrderRec.getLineItemValue('item', 'custcol_ship_set', j);
            holdLinesShipsetsArray.push(shipSet);
        }




    }
    var dateToday = new Date();
    var stopPickDate = context.getSetting('SCRIPT', 'custscriptstop_pick_date');
    var stopNumDays = context.getSetting('SCRIPT', 'custscript_number_days');
    //Util.console.log(lineRequestDate, 'lineRequestDate');

    //Util.console.log(requestDate, 'lineRequestDate after');
    if (stopNumDays) {
        var stopNumDaysDate = calcWorkingDays(dateToday, stopNumDays);
        dateToday = stopNumDaysDate;
    }
    //Util.console.log(stopNumDays, 'stopNumDays');
    //.console.log(stopNumDaysDate, 'stopNumDaysDate');

    //Util.console.log(stopPickDate, 'stopPickDate');
    if (stopPickDate) {
        stopPickDate = nlapiStringToDate(stopPickDate);
        dateToday = stopPickDate;
    }


    if (stopNumDays && stopPickDate && stopNumDaysDate < stopPickDate) {
        dateToday = stopNumDaysDate;
    }
    //Util.console.log(dateToday, 'dateToday');



    for (j = 1; j <= numLines; j++) {
        //hold shipset line check
        var shipSetValue = salesOrderRec.getLineItemValue('item', 'custcol_ship_set', j);
        lineRequest = salesOrderRec.getLineItemValue('item', 'custcol_request_date', j);

        var requestDate = nlapiStringToDate(lineRequest);
        if (requestDate > dateToday) {

            nlapiLogExecution('DEBUG', 'Process Order Shipset', 'Request Date after today.  Do not include');
            continue;
        }


        if (holdLinesShipsetsArray.indexOf(shipSetValue) == -1) {
            isLocation = false;
            lineItemId = salesOrderRec.getLineItemValue('item', 'item', j);
            itemFields = nlapiLookupField('item', lineItemId, ['type', 'custitem_included_power_cords', 'custitem_power_cords_required', 'custitem_cable_region', 'custitem_product_family']);
            lineInternalId = salesOrderRec.getLineItemValue('item', 'line', j);
            lineQuantity = salesOrderRec.getLineItemValue('item', 'quantity', j);
            lineLocation = parseInt(salesOrderRec.getLineItemValue('item', 'location', j));
            lineShipset = salesOrderRec.getLineItemValue('item', 'custcol_ship_set', j);
            lineRequest = salesOrderRec.getLineItemValue('item', 'custcol_request_date', j);
            lineFulfillment = salesOrderRec.getLineItemValue('item', 'custcol_lifesize_fulfillment', j);
            lineReplacementId = salesOrderRec.getLineItemValue('item', 'custcol_rma_container_item', j);
            lineItemGroupId = salesOrderRec.getLineItemValue('item', 'custcol_group_parent', j);
            lineItemDiscAmt = salesOrderRec.getLineItemValue('item', 'custcol_discounted_total', j);
            assignedLineId = salesOrderRec.getLineItemValue('item', 'custcol_line_id', j);
            isClosed = salesOrderRec.getLineItemValue('item', 'isclosed', j);
            productType = salesOrderRec.getLineItemValue('item', 'custcol_item_type', j);
            if (itemFields) {
                lineItemFamily = itemFields.custitem_product_family;
            }
            nlapiLogExecution('DEBUG', 'Line Item', lineItemId + ' - ' + j);

            if (productType != TYPE_HARDWARE || lineItemFamily == PRODUCT_FAMILLY_BUNDLE || lineItemId == 0 || (!lineItemId && !assignedLineId)) {

                continue;
            }


            itemType = itemFields.type;

            cordsIncluded = itemFields.custitem_included_power_cords;
            //nlapiLogExecution('DEBUG', 'Cords Inc', cordsIncluded);
            if (cordsIncluded == '' || cordsIncluded == null) {

                cordsIncluded = 0;
                //nlapiLogExecution('DEBUG', 'Cords Inc2', cordsIncluded);
            }
            cordsIncluded = parseInt(cordsIncluded);
            cordsRequired = parseInt(itemFields.custitem_power_cords_required);

            if (!cordsIncluded) {

                cordsIncluded = 0;
            }

            if (!cordsRequired) {

                cordsRequired = 0;
            }

            cordRegion = itemFields.custitem_cable_region;

            if (lineFulfillment || isClosed == 'T') {

                nlapiLogExecution('DEBUG', 'Line Closed', isClosed);
                continue;
            }

            if (salesOrderCustomForm == RMA_SALES_FORM) {

                lineShipset = '1';
            }

            nlapiLogExecution('DEBUG', 'Ship Set', lineShipset);
            nlapiLogExecution('DEBUG', 'Line Location', lineLocation);

            if (locationArr.length > 0) {
                for (i = 0; i < locationArr.length; i++) {

                    if (lineLocation == parseInt(locationArr[i])) {

                        isLocation = true;
                        break;
                    }
                }
            }
            else {

                isLocation = true;
            }

            if (isLocation == false) {

                continue;
            }

            salesOrderContainer.salesOrderLines[j] = {

                'item': lineItemId,
                'quantity': lineQuantity,
                'internalID': lineInternalId,
                'loc': lineLocation,
                'shipset': lineShipset,
                'lineGroupId': lineItemGroupId,
                'productType': productType,
                'itemType': itemType,
                'requestdate': lineRequest,
                'lineFulfillment': lineFulfillment,
                'lineReplacement': lineReplacementId,
                'lineDiscAmt': lineItemDiscAmt,
                'assignedLineId': assignedLineId,
                'isPreferredPart': isPreferredPart,
                'componentList': {}
            }

            try {
                if (lineItemId == RMA_DEFAULT_ASSEMBLY_ITEM) {

                    nlapiLogExecution('DEBUG', 'DUMMY COMP FOUND');
                    var replacementItemInfo = nlapiLookupField('item', lineReplacementId, ['custitem_item_type', 'type']);

                    salesOrderContainer.salesOrderLines[j].componentList[0] = {

                        'item': lineReplacementId,
                        'quantity': lineQuantity,
                        'itemType': replacementItemInfo.type,
                        'productType': replacementItemInfo.custitem_item_type,
                        'phantomItem': null
                    };
                }
                else {

                    assemblyItemRec = nlapiLoadRecord('assemblyitem', lineItemId);

                    for (k = 1; k <= assemblyItemRec.getLineItemCount('member'); k++) {

                        var compItem = assemblyItemRec.getLineItemValue('member', 'item', k);
                        var compItemInfo = nlapiLookupField('item', compItem, ['custitem_item_type', 'type', 'custitem_warranty_type']);
                        var compItemQuan = assemblyItemRec.getLineItemValue('member', 'quantity', k);

                        var compItemType = compItemInfo.type;
                        var compProductType = compItemInfo.custitem_item_type;
                        var compItemWarranty = compItemInfo.custitem_warranty_type;

                        nlapiLogExecution('DEBUG', 'Product Type', compProductType);
                        Util.console.log(compItemType, 'compItem Type');
                        if (compProductType == TYPE_PHANTOM) {
                            var phantomRec = nlapiLoadRecord('assemblyItem', compItem);
                            //var phantomRec = nlapiLoadRecord('noninventoryitem', compItem);

                            for (l = 1; l <= phantomRec.getLineItemCount('member'); l++) {

                                var phantomCompItem = phantomRec.getLineItemValue('member', 'item', l);
                                var phantomCompItemQuan = phantomRec.getLineItemValue('member', 'quantity', l);

                                salesOrderContainer.salesOrderLines[j].componentList[phantomCompItem] = {
                                    'item': phantomCompItem,
                                    'quantity': phantomCompItemQuan,
                                    'itemType': compItemType,
                                    'productType': compProductType,
                                    'phantomItem': compItem
                                };
                            }
                        }
                        else if (compProductType == TYPE_HARDWARE) {
                            salesOrderContainer.salesOrderLines[j].componentList[compItem] = {
                                'item': compItem,
                                'quantity': compItemQuan,
                                'itemType': compItemType,
                                'productType': compProductType,
                                'phantomItem': null
                            };
                        } else if (compItemType == 'NonInvtPart') {
                            salesOrderContainer.salesOrderLines[j].componentList[compItem] = {
                                'item': compItem,
                                'quantity': compItemQuan,
                                'itemType': compItemType,
                                'productType': compProductType,
                                'phantomItem': null
                            };

                        }
                    }
                    nlapiLogExecution('DEBUG', 'Power Cord Data', JSON.stringify(itemFields));

                    if (cordsRequired > 0 && salesOrderCordRegion && !isIntercoTrans) {
                        var powerCordData = fetchPowerCordData(cordsRequired, cordsIncluded, cordRegion, salesOrderCordRegion);
                        nlapiLogExecution('DEBUG', 'Power Cord Data', JSON.stringify(powerCordData));

                        if (powerCordData !== false) {
                            salesOrderContainer.salesOrderLines[j].componentList[powerCordData.cordId] = {
                                'item': powerCordData.cordId,
                                'quantity': powerCordData.cordQuantity,
                                'itemType': powerCordData.cordItemType,
                                'productType': powerCordData.cordProductType,
                                'phantomItem': null
                            };
                        }
                    }
                }
                nlapiLogExecution('DEBUG', 'Line Item', JSON.stringify(salesOrderContainer.salesOrderLines[j]));

                salesOrderContainer.salesOrderLines[j].shipset = lineShipset;

                if (lineShipset != null && lineShipset != "") {

                    if (salesOrderContainer.salesOrderShipsets[lineShipset] == null) {

                        salesOrderContainer.salesOrderShipsets[lineShipset] = [];
                    }
                    salesOrderContainer.salesOrderShipsets[lineShipset].push(salesOrderContainer.salesOrderLines[j]);
                }
            }
            catch (err) {

                //nlapiLogExecution('DEBUG', 'Sales order line item was not of type assemblyitem', err);
                throw err;
                continue;
            }
        }
    }
    return salesOrderContainer;
}


function fetchPowerCordData(cordsRequired, cordsIncluded, cordRegion, salesOrderCordRegion, isIntercoTrans) {

    var powerCordData = {
        addCords: false,
        cordId: null,
        cordQuantity: null,
        cordItemType: null,
        cordProductType: null
    };
    powerCordRec = {};

    if (cordsRequired > 0 && cordsIncluded >= 0 && cordRegion && salesOrderCordRegion && !isIntercoTrans) {
        powerCordRec = findCorrectPowerCord(salesOrderCordRegion);
        powerCordData.cordId = powerCordRec.getId();
        powerCordData.cordItemType = powerCordRec.getValue('type');
        powerCordData.cordProductType = powerCordRec.getValue('custitem_item_type');

        nlapiLogExecution('DEBUG', 'Cords - Included: ' + cordsIncluded + '  Required: ' + cordsRequired);
        if (cordRegion === salesOrderCordRegion && cordsIncluded < cordsRequired) {

            nlapiLogExecution('DEBUG', 'Additional Power Cords Needed 1');
            powerCordData.addCords = true;
            powerCordData.cordQuantity = cordsRequired - cordsIncluded;

            return powerCordData;
        }
        else if (cordRegion !== salesOrderCordRegion) {

            nlapiLogExecution('DEBUG', 'Additional Power Cords Needed 2');
            powerCordData.addCords = true;
            powerCordData.cordQuantity = cordsRequired;

            return powerCordData;
        }
        else {
            nlapiLogExecution('DEBUG', 'No Additional Power Cords Needed');
            return false;
        }
    }
}


/* This function will search for the correct power cord for the region that it is being ship to. */
function findCorrectPowerCord(region) {

    var filters = [new nlobjSearchFilter('custitem_cable_region', null, 'is', region),
    new nlobjSearchFilter('custitem_product_family', null, 'is', FAMILY_POWER_CORD)];
    var columns = [new nlobjSearchColumn('type'),
    new nlobjSearchColumn('custitem_item_type')];
    var results = nlapiSearchRecord('item', null, filters, columns);

    if (results) {
        return results[0];
    }
}


// groups the item fulfillment data
var groupBy = function (array, func, keys) {
    var groups = {};
    array.forEach(function (obj) {
        var group = JSON.stringify(func(obj, keys));
        groups[group] = groups[group] || [];
        groups[group].push(obj);
    });
    return Object.keys(groups).map(function (group) { return groups[group]; });
};


//Netsuite line item item types don't match up to what can be used to load or lookup a record. This switch statement will return the correct form
function determineItemType(nonUsefulType) {
    var field;
    switch (nonUsefulType) {
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

//Sends a pick slip email to the appropriate warehouse.
function sendPickSlipEmail(itemFulfillmentId, salesOrderId, list) {

    if (type == 'create') { return; }

    var timestamp, action, pickSlipHtml, itemFulfillmentRecord, salesOrderRecord, customerId, customerRecord, vatNumber, html = '';
    timestamp = new Date().getTime();
    salesOrderRecord = nlapiLoadRecord('salesorder', salesOrderId);
    salesOrderType = salesOrderRecord.getFieldText('custbody_tno_order_type');
    salesOrderType = salesOrderType.slice(0, - 6);

    itemFulfillmentRecord = nlapiLoadRecord("customrecord_custom_fulfillment", itemFulfillmentId);

    customerId = salesOrderRecord.getFieldValue('custbody_bill_customer');
    if (customerId) {
        vatNumber = nlapiLookupField('customer', customerId, 'vatregnumber') || '';
        if (!vatNumber) {
            vatNumber = nlapiLookupField('customer', customerId, 'custentity_taxpayer_id') || '';
        }
    } else {
        vatNumber = '';
    }

    var valueKeys = ["tranid", "otherrefnum", "total", "custbody_ship_to_contact_phone", "custbody_ship_to_customer_address_text", "billaddress", "custbody_shipping_instructions", "shipdate", "billaddressee", "billaddr1", "billaddr2", "billcity", "billstate", "billzip", "shipaddressee", "shipaddr1", "shipaddr2", "shipcity", "shipstate", "shipzip"];
    var textKeys = ["custbody_ship_to_contact", "shipmethod", "custbody_tno_order_type"];
    var soKeys = valueKeys.concat(textKeys);
    var soKeyCount = soKeys.length;
    var customerPONumber = salesOrderRecord.getFieldValue('otherrefnum');
    var deliveryName = itemFulfillmentRecord.getFieldValue('name');
    var pickSlipNumber = itemFulfillmentRecord.getFieldText('custrecord_fulfillment_batch_no');
    var salesOrderObject = {};
    var salesOrderJSON = JSON.parse(JSON.stringify(salesOrderRecord));

    // accounts for some fields that need to be pulled in as text and others as values
    for (var j = 0; j < soKeyCount; j++) {
        if (contains(valueKeys, soKeys[j])) {
            salesOrderObject[soKeys[j]] = salesOrderRecord.getFieldValue(soKeys[j]) || '';
        }
        else if (contains(textKeys, soKeys[j])) {
            salesOrderObject[soKeys[j]] = salesOrderRecord.getFieldText(soKeys[j]) || '';
        }
    };

    nlapiLogExecution("DEBUG", "checkpoint 2: ", JSON.stringify(salesOrderObject));

    var list = JSON.parse(itemFulfillmentRecord.getFieldValue('custrecord_fulfillment_data'));

    nlapiLogExecution('DEBUG', 'Data', JSON.stringify(list));
    if (list) {

        if (list[0].hasOwnProperty('lineid') == false) { return; }
    }

    var pickKeys = ["assyitem", "component"];

    // groups the pick table results by assembly item and component so quantities can be stacked
    var pickResult = groupBy(list, function (item, pickKeys) {
        var numKeys = pickKeys.length;
        var ret = [];
        for (var i = 0; i < numKeys; i++) {
            ret.push(item[pickKeys[i]]);
        }
        return ret;
    }, pickKeys);

    nlapiLogExecution('DEBUG', 'Pick Result1', JSON.stringify(pickResult[0]));
    nlapiLogExecution('DEBUG', 'Pick Result2', JSON.stringify(pickResult[1]));

    var pickResultCount, itemType, itemRecord, itemLookupRecord, componentLine, componentItemType, componentItemRecord, componentItemLookupRecord, currentItem;
    var pickItemHtml = '<table border = "1" style = "width:100%" font-size= "10px">';

    var lineId = list[0].lineid;
    lineId = lineId.split(' - ');
    var lineNumber = lineId[0];
    var salesOrderLineNumber = salesOrderRecord.findLineItemValue('item', 'line', lineNumber);
    var salesOrderLocation = salesOrderRecord.getLineItemValue('item', 'location', salesOrderLineNumber);
    var locationRecord = nlapiLoadRecord('location', salesOrderLocation);
    var locationEmail = locationRecord.getFieldValue('custrecord_pick_slip_email');

    var shipfrom = '<p>';
    if (locationRecord.getFieldValue('attention')) shipfrom += locationRecord.getFieldValue('attention') + '</br>';
    if (locationRecord.getFieldValue('addr1')) {
        shipfrom += locationRecord.getFieldValue('addr1')
        shipfrom += '</br>';
    }
    if (locationRecord.getFieldValue('addr2')) shipfrom += locationRecord.getFieldValue('addr2') + '</br>';
    if (locationRecord.getFieldValue('addr3')) shipfrom += locationRecord.getFieldValue('addr3') + '</br>';
    if (locationRecord.getFieldValue('city')) shipfrom += locationRecord.getFieldValue('city') + ' ';
    if (locationRecord.getFieldValue('state')) shipfrom += ', ' + locationRecord.getFieldValue('state') + ' ';
    if (locationRecord.getFieldValue('zip')) shipfrom += locationRecord.getFieldValue('zip') + ' ';
    if (locationRecord.getFieldValue('country')) shipfrom += '<br/>' + locationRecord.getFieldValue('country') + '</p>';

    var addresse = salesOrderRecord.getFieldValue('shipaddressee');
    nlapiLogExecution('DEBUG', 'Addresse', addresse.indexOf('&'));
    //addresse = addresse.replace('&','&amp');
    nlapiLogExecution('DEBUG', 'Addresse2', addresse);

    var shipto = '';
    if (salesOrderRecord.getFieldValue('shipaddressee')) {
        shipto += addresse;
        shipto += '<br />';
    }
    if (salesOrderRecord.getFieldValue('shipaddr1')) {
        shipto += salesOrderRecord.getFieldValue('shipaddr1');
        shipto += ' <br />';
    }
    if (salesOrderRecord.getFieldValue('shipaddr2')) {
        shipto += salesOrderRecord.getFieldValue('shipaddr2');
        shipto += ' <br />';
    }
    if (salesOrderRecord.getFieldValue('shipaddr3')) {
        shipto += salesOrderRecord.getFieldValue('shipaddr3');
        shipto += ' <br />';
    }
    if (salesOrderRecord.getFieldValue('shipaddr4')) {
        shipto += salesOrderRecord.getFieldValue('shipaddr4');
        shipto += ' <br />';
    }
    if (salesOrderRecord.getFieldValue('shipcity')) {
        shipto += salesOrderRecord.getFieldValue('shipcity');
        shipto += ', ';
    }
    if (salesOrderRecord.getFieldValue('shipstate')) {
        shipto += salesOrderRecord.getFieldValue('shipstate');
        shipto += ' ';
    }
    if (salesOrderRecord.getFieldValue('shipzip')) {
        shipto += salesOrderRecord.getFieldValue('shipzip');
    }
    if (salesOrderRecord.getFieldValue('shipcountry')) {
        shipto += ' <br />'
        shipto += salesOrderRecord.getFieldValue('shipcountry');
        shipto += ' <br />';
        shipto += 'Contact: ';
        if (salesOrderObject.custbody_ship_to_contact) {
            if (salesOrderObject.custbody_ship_to_contact.indexOf(':') > 1) {
                shipto += salesOrderObject.custbody_ship_to_contact.split(':')[1];
            } else {
                shipto += salesOrderObject.custbody_ship_to_contact;
            }
        } else {
            if (salesOrderRecord.getFieldValue('shipattention')) {
                shipto += salesOrderRecord.getFieldValue('shipattention');
            }
        }
        shipto += '<br/> Phone: ';
        shipto += salesOrderObject.custbody_ship_to_contact_phone;
    }

    var billto = '';
    if (salesOrderRecord.getFieldValue('billattention')) {
        billto += salesOrderRecord.getFieldValue('billattention');
        billto += '<br />';
    }
    if (salesOrderRecord.getFieldValue('billaddressee')) {
        billto += salesOrderRecord.getFieldValue('billaddressee');
        billto += '<br />';
    }
    if (salesOrderRecord.getFieldValue('billaddr1')) {
        billto += salesOrderRecord.getFieldValue('billaddr1');
        billto += '<br />';
    }
    if (salesOrderRecord.getFieldValue('billaddr2')) {
        billto += salesOrderRecord.getFieldValue('billaddr2')
        billto += '<br />';
    }
    if (salesOrderRecord.getFieldValue('billaddr3')) {
        billto += salesOrderRecord.getFieldValue('billaddr3')
        billto += '<br />';
    }
    if (salesOrderRecord.getFieldValue('billaddr4')) {
        billto += salesOrderRecord.getFieldValue('billaddr4')
        billto += '<br />';
    }
    if (salesOrderRecord.getFieldValue('billcity')) {
        billto += salesOrderRecord.getFieldValue('billcity');
        billto += ', ';
    }
    if (salesOrderRecord.getFieldValue('billstate')) {
        billto += salesOrderRecord.getFieldValue('billstate');
        billto += ' ';
    }
    if (salesOrderRecord.getFieldValue('billzip')) {
        billto += salesOrderRecord.getFieldValue('billzip');
    }
    if (salesOrderRecord.getFieldValue('billcountry')) {
        billto += '<br />';
        billto += salesOrderRecord.getFieldValue('billcountry');
        billto += ' ';
    }

    nlapiLogExecution('DEBUG', 'ShipTo Data', JSON.stringify(shipto));

    var shipper = 'Lifesize, Inc. <br/>\
                    1601 S MoPac Expway <br/>\
                    Austin, TX 78746<br/>\
                    US';

    var totalPrice = 0.0;
    for (var nn = 1; nn <= salesOrderRecord.getLineItemCount('item'); nn++) {

        var soLineNum = salesOrderRecord.getLineItemValue('item', 'custcol_line_id', nn);
        for (var t = 0; t < list.length; t++) {



            //AC - NimbusLabs - BIZ-576 Fix
            if (list[t].linenumber == soLineNum) {
                //Util.console.log(s, 's');

                var groupParent = salesOrderRecord.getLineItemValue('item', 'custcol_group_parent', nn);
                Util.console.log(groupParent, 'groupParent');
                if (groupParent && groupParent != '') {


                    for (var jj = nn; jj <= salesOrderRecord.getLineItemCount('item'); jj++) {
                        var itemName = salesOrderRecord.getLineItemValue('item', 'item', jj);

                        if (itemName == 0 || itemName == '0') { //i.e End of Group or "None"
                            break;
                        } else {
                            totalPrice += parseFloat(salesOrderRecord.getLineItemValue('item', 'amount', jj));
                        }
                    }
                } else {
                    totalPrice += parseFloat(salesOrderRecord.getLineItemValue('item', 'amount', nn));
                }
                //END AC BIZ-543 Support
                break;
            }
        }
    }

    nlapiLogExecution('DEBUG', 'Total Price Before', totalPrice);
    totalPrice = nlapiFormatCurrency(totalPrice);

    nlapiLogExecution('DEBUG', 'Total Price', totalPrice);


    //generate html pick table from pickResult
    var lastItem = '';
    pickResultCount = pickResult.length;

    pickItemHtml += '<tr>';
    pickItemHtml += '<th border=".2"> Line</th>';
    pickItemHtml += '<th border=".2"> Item Number </th>';
    pickItemHtml += '<th border=".2"> Item Description </th>';
    pickItemHtml += '<th border=".2"> Unit </th>';
    pickItemHtml += '<th border=".2"> Qty</th>';
    pickItemHtml += '</tr>';

    for (var k = 0; k < pickResultCount; k++) {
        currentItem = pickResult[k][0].assyitem;
        itemType = determineItemType(nlapiLookupField('item', pickResult[k][0].assyitem, 'type')) || false;
        itemRecord = nlapiLoadRecord(itemType, pickResult[k][0].assyitem);

        itemLookupRecord = nlapiLookupField('item', currentItem, ['itemid', 'displayname']);

        if (currentItem != lastItem && salesOrderType != 'RMA') {
            //generate item header
            pickHeaderHtml = '<tr border = ".2">\
            <td></td>\
            <td>' + itemLookupRecord.itemid + '</td>\
            <td>' + itemLookupRecord.displayname + '</td>\
            <td></td>\
            <td></td></tr>';
            pickItemHtml += pickHeaderHtml;
        }
        //generate item rows, adding quantities
        var lineItemId = pickResult[k][0].lineid.split('-');
        lineItemId = lineItemId[0];
        componentLine = pickResult[k][0];
        //BA-47 - NP changes to how qty is calculated - right now  for grouped items it's just taking the first item  and pulling the quantity needed for the component and multiplying it by the number of items that were grouped - ie 5*2 instead of 5+3 which resulted in incorrect quantity calculations on groupings - changed to look at all quantity needed for items grouped by item  
        //var quantity = componentLine.qtyneeded * pickResult[k].length;
        var quantity = 0;
        for (result in pickResult[k]) {
            quantity += parseInt(pickResult[k][result].qtyneeded);
        }

        componentItemLookupRecord = nlapiLookupField('item', componentLine.component, ['itemid', 'displayname']);

        pickComponentHtml = '<tr><td border = ".2">' + lineItemId + '</td><td border = ".2">' + componentItemLookupRecord.itemid + '</td>' + '<td border = ".2">' + componentItemLookupRecord.displayname + '</td><td border = ".2">EA</td><td border = ".2">' + quantity + '</td></tr>';
        pickItemHtml += pickComponentHtml;
        lastItem = currentItem;
    }
    pickItemHtml += '</table>';
    nlapiLogExecution('DEBUG', 'pickItemHtml', pickItemHtml);

    //  Order number filed needs to be updated as (orderType) + (Order Number). And remove the 'order' string from order type. Ex: RMA Order will be displayed as RMA
    var orderType = '';
    var orderTypeString = '';

    try {
        orderType = salesOrderObject.custbody_tno_order_type;
        orderTypeString = orderType;
        if (orderType.search('ORDER'))
            orderTypeString = orderTypeString.replace('Order', '');
    }
    catch (e) {
        //handle errors
    }

    var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n"

    xml += '<pdf>'
    xml += '<head>'
    xml += '<style>'
    xml += 'h1{align: center; font-size: 18px}'

    xml += '</style>';
    xml += "</head>";

    xml += "<body>"
    xml += '<h1>' + salesOrderType + ' Pick Slip <br />' + pickSlipNumber + '</h1>';

    xml += '<table border=".2" style = "width:100%" font-size= "10px">';
    xml += "<tr>"
    xml += '<td border=".2" style = "width:50%"> Order Number: ' + orderTypeString + " " + salesOrderObject.tranid + '</td>';
    xml += '<td border=".2" style = "width:50%"> PO Number: ' + salesOrderObject.otherrefnum + '</td>';
    xml += "</tr>";
    xml += "<tr>"
    xml += '<td border=".2" style = "width:50%"> Total Price: ' + totalPrice + '</td>';
    xml += '<td border=".2" style = "width:50%"> VAT Number: ' + vatNumber + '</td>';
    xml += "</tr>";
    xml += "</table>";

    xml += '<table border=".2" style = "width:100%" font-size= "10px">';
    xml += '<tr>'
    xml += '<td border=".2" style = "width:50%"> Ship To: <br/>' + shipto + '</td>';
    xml += '<td border=".2" style = "width:50%"> Bill To: <br/>' + billto + '</td>';
    xml += '<td border=".2" style = "width:50%"> Shipper: <br/>' + shipper + '</td>';
    xml += "</tr>";
    xml += "</table>";

    xml += '<p/>';

    xml += '<table border=".2" style = "width:100%" font-size= "10px">';
    xml += '<tr>';
    xml += '<th border=".2" style = "width25%"> Delivery Name </th>';
    xml += '<th border=".2" style = "width25%"> Shipping Instructions </th>';
    xml += '<th border=".2" style = "width25%"> Ship Method </th>';
    xml += '</tr>';
    xml += '<tr>';
    xml += '<td border=".2" style = "width25%">' + deliveryName + '</td>';
    xml += '<td border=".2" style = "width:50%">' + salesOrderObject.custbody_shipping_instructions + '</td>';
    xml += '<td border=".2" style = "width:25%">' + salesOrderObject.shipmethod + '</td>';
    xml += '</tr>';
    xml += '</table>';
    xml += '<p/>';

    xml += pickItemHtml;

    xml += "</body></pdf>";

    xml = xml.replace(/&/g, "&amp;")
    var file = nlapiXMLToPDF(xml);

    var records = new Object();
    records['transaction'] = salesOrderRecord.getId();

    nlapiLogExecution('DEBUG', 'locationEmail', locationEmail + '	 ' + file);

    nlapiSendEmail(ORDERS_EMPLOYEE, locationEmail, 'Pick Slip: ' + itemFulfillmentId, 'Pick Slip', null, null, records, file, true);
    nlapiLogExecution('DEBUG', 'Pick Email Sent');
}
