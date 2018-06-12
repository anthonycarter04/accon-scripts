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
 * File :               BM_SUE_SetBoxConversion.js
 * Date :               Wednesday November 26th 2014
 * Script :             User Event Script
 * Version              3.0
 *
 * User Event Script deployed on:
 * Purchase Item
 * Sale Item
 * Opportunity Item
 * Work Order
 * Transfer Order
 * Item Receipt  - Custom Form ID 102
 * Item Fulfillment - Custom Form ID 39
 * Purchase Order - Custom Form ID 101
 * Sales Order - Custom Form ID 103, 109
 * Estimate Order - Custom Form ID 97
 *
 ******************************************************************************/
var BM_CUE_BOX_CONV = {
    CONTEXT : ['csvimport', 'webservices'],
    TYPES : ['edit', 'create'],
    FORMS : [39, 102, 101, 103, 97, 109],
    FIELDS : {
        cartons : 'custcol_qtyofboxs',
        actualSQft : 'custcol_actualsfbx',
        cusNeeds : 'custcol_customerneed',
        sqFtPerBox : 'custcol_boxsf',
        qty : 'quantity'
    }
};

/**
 * On Before Submit, update the Box Conversion line item values
 * @param {String} type, {String} name, {String} linenum
 * @return null
 * @author eolguin@fmtconsultants.com
 */
function beforeSubmit_setBoxConversion(type) {
    if (serverBoxConversionInit(type)) {
        try {
            //Get Line Items
            var lineItems = getBoxConversionLineItems(BM_CUE_BOX_CONV.FIELDS);
            //Loop through retrieved line items and update Box Conversion values
            if (lineItems) {
                for (var k = 0; k < lineItems.length; k++) {
                    //If Qty is not empty, and Customer Needs and Qty (Custom) are not empty, next, else calculate values, continue
                    if (lineItems[k].hasOwnProperty('qty') && !lineItems[k].hasOwnProperty('cartons') && !lineItems[k].hasOwnProperty('qty')) {
                        continue;
                    } else {
                        //If BXSF is not empty
                        if (lineItems[k].hasOwnProperty('sqFtPerBox')) {
                            //If  BX/SF is not empty and Customer Needs is not empty
                            if (lineItems[k].hasOwnProperty('cusNeeds')) {
                                //Calculate Actual SF/BX = Customer Needs/BXSF
                                var actualSFBx = parseFloat(lineItems[k].cusNeeds) / parseFloat(lineItems[k].sqFtPerBox);
                                //Set Actual SF/BX = Customer Needs/BXSF
                                nlapiSetLineItemValue('item', 'custcol_actualsfbx', lineItems[k].index, actualSFBx);
                                //Set Qty of Boxes = Qty * BXSF (Round up)
                                nlapiSetLineItemValue('item', 'custcol_qtyofboxs', lineItems[k].index, Math.ceil(actualSFBx));
                                //Set Quantity = Qty of Boxes * BXSF
                                nlapiSetLineItemValue('item', 'quantity', lineItems[k].index, parseFloat(line.cartons * line.sqFtPerBox));
                            }
                            //If Customer Needs is empty and Qty of Boxes is not
                            else if (lineItems[k].hasOwnProperty('cartons') && !lineItems[k].hasOwnProperty('cusNeeds')) {
                                //Set Quantity = Qty of Boxes * BXSF
                                nlapiSetLineItemValue('item', 'quantity', lineItems[k].index, parseFloat(lineItems[k].cartons * parseFloat(lineItems[k].sqFtPerBox)));
                            }
                        } else {
                            //Set Customer Need = null
                            nlapiSetLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.cusNeeds, lineItems[k].index, '');
                            //Set Actual SF/BX = null
                            nlapiSetLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.sqFtPerBox, lineItems[k].index, '');
                            //Set Qty of Box = null
                            nlapiSetLineItemValue('item', BM_CUE_BOX_CONV.FIELDS.qtyBoxs, lineItems[k].index, '');
                        }
                    }
                }
            }
        } catch(e) {
            nlapiLogExecution('ERROR', 'Error beforeSubmit_setBoxConversion', e);
        }
    }
}

/**
 * Get Box Conversion line item values and store in object.
 * Validation of nulls to be performed using hasOwnProperty.
 * @param null
 * @return {Object} lineItems
 * @author eolguin@fmtconsultants.com
 */
function getBoxConversionLineItems() {
    var lineItems = [];
    var lnc = nlapiGetLineItemCount('item');
    for (var k = 1; k <= lnc; k++) {
        var line = {};
        for (var id in BM_CUE_BOX_CONV.FIELDS) {
            if (BM_CUE_BOX_CONV.FIELDS.hasOwnProperty(id)) {
                var val = parseFloat(nlapiGetLineItemValue('item', BM_CUE_BOX_CONV.FIELDS[id], k));
                if (!isNaN(val)) {
                    line[id] = val;
                }
            }
        }
        //Add line index and push line to array
        line.index = k;
        lineItems.push(line);
    }
    return lineItems;
}

/**
 * Return true/false if the specified custom form is found
 * and if the execution context is the one listed in the script constants
 * Pass type as a parameter to determine user event type.
 * @param {String} type
 * @return {Boolean} True/False
 * @author eolguin@fmtconsultants.com
 */
function serverBoxConversionInit(type) {
    var thisContext = nlapiGetContext().getExecutionContext().toString();
    //  return (BM_CUE_BOX_CONV.CONTEXT.indexOf(thisContext) != -1 && BM_CUE_BOX_CONV.FORMS.indexOf(parseFloat(nlapiGetFieldValue('customform'))) != -1 && BM_CUE_BOX_CONV.TYPES.indexOf(type) != -1) ? true : false;
    return (BM_CUE_BOX_CONV.CONTEXT.indexOf(thisContext) != -1 ) ? true : false;

}