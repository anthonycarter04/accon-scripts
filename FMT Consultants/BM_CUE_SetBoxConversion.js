/*******************************************************************************
 * The following javascript code is created by FMT Consultants LLC,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": FMT Consultants LLC shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:             FMT Consultants LLC, www.fmtconsultants.com
 * Author:              eolguin@fmtconsultants.com
 * File :               BM_CUE_SetBoxConversion.js
 * Date :               Wednesday November 26th 2014
 * Script :             Client Side Script
 * Version              2.0
 *
 * Client Side Field Change Event Script deployed on:
 * Purchase Item
 * Sale Item
 * Opportunity Item
 * Work Order
 * Transfer Order
 * Item Receipt  - Custom Form ID 102
 * Item Fulfillment - Custom Form ID 39
 * Purchase Order - Custom Form ID 101
 * Sales Order - Custom Form ID 103, 109, 108
 * Estimate Order - Custom Form ID 97
 *
 ******************************************************************************/
var BM_CUE_BOX_CONV = {
    FORMS : [39, 102, 101, 103, 97, 109, 108],
    FIELDS : {
        boxes : 'custcol_qtyofboxs',
        actualSQft : 'custcol_actualsfbx',
        cusNeeds : 'custcol_customerneed',
        sqFtPerBox : 'custcol_boxsf',
        qty : 'quantity'
    }
};
//Creates a field changed trigger in the Quantity Field (NS standard function not working properly)
var g_qtyInit = 0;
/**
 * On Field Changed, update the Box Conversion line item values
 * @param {String} type, {String} name, {String} linenum
 * @return null
 * @author eolguin@fmtconsultants.com
 */
function onFieldChanged_setBoxConversion(type, name, linenum) {
    if (type == 'item') {
        //    if (clientBoxConversionInit() && type == 'item') {
        //If Quantity of Boxes (Custom) or Customer Needs get updated, calculate values
        if (name == BM_CUE_BOX_CONV.FIELDS.cusNeeds || name == BM_CUE_BOX_CONV.FIELDS.boxes) {
            var isSet = false;
            //Get Current Line Item Values
            var line = getBoxConversionLineValues();
            //If there is a BX/SF Value Set, calculate Actual BX/SF Value (Customer Needs / BXSF)
            if (name == BM_CUE_BOX_CONV.FIELDS.cusNeeds && line.hasOwnProperty('sqFtPerBox') && line.hasOwnProperty('cusNeeds') && !isSet) {
                nlapiLogExecution('DEBUG', 'Line Values', JSON.stringify(line));
                //Set Actual SF/BX Value,
                nlapiSetCurrentLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.actualSQft, parseFloat(line.cusNeeds) / parseFloat(line.sqFtPerBox));
                //Set Quantity (Qty Boxs * BX/SF), use Math.ceil to round up
                nlapiSetCurrentLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.boxes, eoToFixed((parseFloat(line.cusNeeds) / parseFloat(line.sqFtPerBox)), 2));
                isSet = true;
            }
            //If the Custom Quantity field gets update, update the Custom Quantity with the latest BXSF valuer
            if (name == BM_CUE_BOX_CONV.FIELDS.boxes) {
                if (line.hasOwnProperty('sqFtPerBox') && line.hasOwnProperty('boxes')) {
                    var qty = parseFloat(line.boxes * line.sqFtPerBox);
                    //qty = !isNaN(qty) ? qty.toFixed(4) : 1;
                    nlapiSetCurrentLineItemValue('item', 'quantity', parseFloat(qty));
                    g_qtyInit = parseFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
                }
            }

        }
    }
}

/**
 * Rounds Float/Ints
 * @param {String} number, {String} precision
 * @return null
 * @author eolguin@fmtconsultants.com
 */
function eoToFixed(number, precision) {
    var num = parseFloat(number.toFixed(precision));
    num = !isNaN(num) ? num : 1;
    return Math.ceil(num);
}

/**
 * On Post Sourcing, clear all the values if the quantity gets changed by the user
 * @param {String} type, {String} name
 * @return null
 * @author eolguin@fmtconsultants.com
 */
function onPostSourcing_setBoxConversion(type, name) {
    var recType = nlapiGetRecordType();
    if (recType != 'itemfulfillment' && recType != 'itemreceipt' && clientBoxConversionInit() && type == 'item') {
        var thisQty = parseFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
        if (g_qtyInit != 0 && (name == 'quantity' || name == 'quantitybilled' || name == 'quantityreceived' || thisQty != g_qtyInit)) {
            //If Quantity (Standard) gets updated, cleared all the values
            nlapiSetCurrentLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.cusNeeds, '');
            nlapiSetCurrentLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.actualSQft, '');
            nlapiSetCurrentLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.boxes, '');
            g_qtyInit = 0;
        }
    }
}

/**
 * Get Box Conversion required line item values and store in object.
 * Validation of nulls to be performed using hasOwnProperty.
 * @param null
 * @return {Object} line
 * @author eolguin@fmtconsultants.com
 */
function getBoxConversionLineValues() {
    var line = {};
    for (var id in BM_CUE_BOX_CONV.FIELDS) {
        if (BM_CUE_BOX_CONV.FIELDS.hasOwnProperty(id)) {
            var val = parseFloat(nlapiGetCurrentLineItemValue('item', BM_CUE_BOX_CONV.FIELDS[id]));
            if (!isNaN(val)) {
                line[id] = val;
            }
        }
    }
    return line;
}

/**
 * Return true/false if the specified custom form is found
 * and if the execution context is the one listed in the script constants
 * @param null
 * @return {Boolean} True/False
 * @author eolguin@fmtconsultants.com
 */
function clientBoxConversionInit() {
    return (BM_CUE_BOX_CONV.FORMS.indexOf(parseFloat(nlapiGetFieldValue('customform'))) != -1) ? true : false;
    return true;
}