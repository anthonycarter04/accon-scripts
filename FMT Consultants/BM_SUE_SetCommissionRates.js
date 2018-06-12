/*
***********************************************************************
*
* The following javascript code is created by FMT Consultants LLC,
* a NetSuite Partner. It is a SuiteFlex component containing custom code
* intended for NetSuite (www.netsuite.com) and use the SuiteScript API.
* The code is provided "as is": FMT Consultants LLC shall not be liable
* for any damages arising out the intended use or if the code is modified
* after delivery.
*
* Company:         FMT Consultants LLC, www.fmtconsultants.com
* Author:          Elean Olguin, eolguin@fmtconsultants.com
* File :           BM_SUE_SetCommissionRates.js
* Script:          [FMT] Set Commission Rates (User Event)
* Date :           Tuesday January 27th 2015
* Last Updated :   Wednesday November 25th 2015
* Script :         User Event Script
* Deployment:      Sales Order
* Version:         2.2
*
* Script calculates the ASA (Alternate Sales Amount) for each line item
* based on the Price Level/Commission rate found.
*
* If the Custom Rate on the sales order line does not correlate
* to the rate set on a price level, the commission customization routine
* will have to determine which of the Price Levels the Custom Rate falls within.
*
* If the Rate on the sales order line is at or above the first
* Price Level (e.g., T1L1), then there is no range consider.
* Also, If the Rate on the sales order line is at or below the last
* Price Level (e.g., T1L7), then there is no range consider.
*
* If the Rate on the sales order line is at or below the last Price Level
* (e.g., T1L7),  then there is no range consider.
* The commission script must uses the following logic if the Custom Rate
* on the SO line falls between the pricing associated with two Price Levels:
*
* If Rate > or = B and < A, then B (where A = T1L1 and B = T1L2).
*
* Said another way, we always use the Price Level closest to the lowest Price
* (when compared to the sales order line rate) as the reference point for
* determining the commission percentage paid.
*
* Update Log - eolguin@fmtconsultants.com:
* 04/23/2015 | Removal of QE Items Logic
* 04/27/2015 | Addition of Try/Catch block
* 07/08/2015 | Added Original Sales Amount Custom Field
* 09/15/2015 | Addition of CreatedPO Logic
* 09/22/2015 | Changed CreatedPO Logic from BeforeSubmit to AfterSubmit
* 11/05/2015 | Added Showroom Credit Line Item and In House Orders Logic
* 11/24/2015 | Added error logging functions and added change that
* allows user to override ASA amounts.
*
***********************************************************************/

//Global Variables
var g_ctx = nlapiGetContext();
var g_logVals = [];
var g_tranInfo = '';
//Script Logging Info - FMT Consultants 3
var SRC_INFO = {
    NAME : '[FMT] Commission Rates UE',
    USER : g_ctx.getName() + ', ID#' + g_ctx.getUser(),
    CTX : g_ctx.getExecutionContext(),
    ERROR : {
        AUTHOR : '14182',
        EMAIL : 'eolguin@fmtconsultants.com'
    }
};
//Constants
var BM_SUE_CR = {
    LINE_MAP : ['item', 'custcol_itemname', 'rate', 'quantity', 'amount', 'altsalesamt', 'custcol_product_type', 'custcol_collection'],
    FIND_PRICE_LEVELS : [1, -1],
    CUS_PRICE_LEVEL : 'custbody_customer_pricelevel',
    ORIGINAL_ALTSALESAMT : 'custcol_original_altsalesamt',
    //Subtotal, Freight 1, Freight 2, Freight 3
    EXCLUDE_ITEMS_ID : [-2, 7571, 7572, 7575],
    //Showroom Credit SRC Item ID
    SRC_ITEM_ID : 7615,
    //BM Noble Sales Rep ID - Used to flag In House Orders and Pablo Barreto Sales Rep
    EXCLUDE_SALESREP_ID : [3414, 5319]
};
/**
 * @author : eolguin@fmtconsultants.com
 * @param  : {String} type, {String} title, {String} msg, {Boolean} logInfo
 * @return : null
 */
function logSrcInfo(type, title, msg, logInfo) {
    g_logVals.push(type + ' : ' + title + ' : <BR> ' + msg);
    if (logInfo) {
        nlapiLogExecution(type, SRC_INFO.NAME + ' - ' + title + ' - ', msg);
    }
}

/**
 * BeforeSubmit, set the commission rate on each line item Commissions
 * are not calculated whenever the order has a Show Room Credit Line Item
 * or if its an In House Order.
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : {String} type
 * @return : null
 */
function beforeSubmit_setCommissionRates(type) {
    if (type == 'create' || type == 'edit') {
    	Util.console.log('running');
        try {
        	
            var orderStatus = nlapiGetFieldValue('status');
            g_tranInfo = 'Context: ' + SRC_INFO.CTX + ' , Type : ' + type + ' , ' + nlapiGetFieldValue('tranid') + ', ID#' + nlapiGetRecordId() + ' , Status : ' + orderStatus;
            orderStatus = SRC_INFO.USR_ID == '14182' ? '' : orderStatus;
            Util.console.log(orderStatus, 'orderstatus');
            //eolguin@fmtconsultants.com - June 9th 2015
            
            var commissionUpdate = nlapiGetFieldValue('custbody_commissions_update');
            if (commissionUpdate == 'T') {
            	nlapiSetFieldValue('custbody_commissions_update', 'F');
            	return true;
            }
            
            if ((orderStatus != 'Billed' && orderStatus != 'Closed')) { //Need to change back the "Billed" - AC 11/9/2017
            	Util.console.log(orderStatus, 'orderstatus');
                //Set Commission Rates
                setCommissionRates(orderStatus);
                //Set Script End Log
                if (g_logVals.length > 0) {
                    logSrcInfo('AUDIT', 'Execution Completed', g_tranInfo + ' <BR> User : ' + SRC_INFO.USER + ' <BR> Time : ' + eo.js.getSysDateWithTimeStamp() + ' <BR> Script Execution Log : <BR> ' + g_logVals.join('<BR>'), true);
                }
            }
        } catch(e) {
            logError(e, 'beforeSubmit_setCommissionRates' + ' , Time : ' + eo.js.getSysDateWithTimeStamp() + ' , ' + g_tranInfo + ' , User : ' + SRC_INFO.USER);
        }
    }
}

/**
 * Calculate and Set Commission Rates on Line Items
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : null
 * @return : null
 */
function setCommissionRates(orderStatus) {
    //Verify if the order is a BM Noble In House Order
	Util.console.log(excludeFromCommissions(), 'Exclude from commissoins');
    if (!excludeFromCommissions()) {
        //Get Line Items
    	
    	//Util.console.log('in iff commissions');
        var lineItems = getCRLineItems(BM_SUE_CR.LINE_MAP);
        Util.console.log(lineItems, 'lineItems');
        if (lineItems.length > 0) {
            var itemIds = eo.js.getUniqueArray(lineItems, 'item');
            //Get the customer price level and run search to get price level results
            var cusPL = String(nlapiGetFieldValue(BM_SUE_CR.CUS_PRICE_LEVEL));
           Util.console.log(cusPL, 'cusPL');
           if (cusPL.length == 0) {
            //if ('a' == 'b') {
            	logSrcInfo('ERROR', 'setCommissionRates: No Customer Price Level Found', '', false);
            } else {
                logSrcInfo('AUDIT', 'setCommissionRates', 'Customer Price Level:  ' + cusPL, false);
                var priceLvls = (itemIds.length > 0) ? getPriceLevelsResults(itemIds, cusPL.trim().substr(0, 3)) : [];
                
                if (priceLvls.length > 0) {
                    //If user has set price levels in the line item, append them to the lookup array
                    var prLvlIds = (priceLvls.length > 0) ? eo.js.getUniqueArray(priceLvls, 'pricelevel') : [];
                    var lnPrLvlIds = eo.js.getArrayWithout(lineItems, 'pricelevel', 'findPL', true);
                    
                    if (lnPrLvlIds.length > 0) {
                        lnPrLvlIds = lnPrLvlIds.filter(function(elem) {
                            elem = String(elem);
                            if (prLvlIds.indexOf(elem) == -1) {
                                return true;
                            }
                            return false;
                        });
                        if (lnPrLvlIds.length > 0) {
                            prLvlIds = prLvlIds.concat(lnPrLvlIds);
                        }
                    }
                    //  nlapiLogExecution('debug', 'prLvlIds', JSON.stringify(prLvlIds));
                    var productTypeIds = eo.js.getUniqueArray(lineItems, 'custcol_product_type');
                    var collectionIds = eo.js.getUniqueArray(lineItems, 'custcol_collection');
                    var commissionRates = getCommissionRatesResults(prLvlIds, productTypeIds, collectionIds);
                 
                    Util.console.log(commissionRates, 'commissionRates');
                    //Update the ASA Value in each line item
                    if (commissionRates.length == 0) {
                    		
                        logSrcInfo('ERROR', 'setCommissionRates: No Commission Rates Found', '', false);
                    } else {
                        setASALineItemValues(lineItems, priceLvls, commissionRates, orderStatus);
                    }
                } else {
                    logSrcInfo('ERROR', 'setCommissionRates : No Price Levels Found', '', false);
                }
            }
        }
    }
}

/**
 * Verifies if the order has a BM Noble Sales Rep set, return true/false.
 * Commission Rates should not be calculated for orders that are in House/BM Noble Orders.
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : null
 * @return : {Boolean} isInHouse
 */
function excludeFromCommissions() {
    var isInHouse = false;
    var salesRepCount = nlapiGetLineItemCount('partners');
    for (var k = 1; k <= salesRepCount; k++) {
        var partner = parseInt(nlapiGetLineItemValue('partners', 'partner', k));
        if (BM_SUE_CR.EXCLUDE_SALESREP_ID.indexOf(partner) != -1) {
            isInHouse = true;
            break;
        }
    }
    return isInHouse;
}

/**
 * Returns an array of line items of the order being processed
 * Please modify the constants LINE_MAP array if you would like to add more fields in the results
 *
 * @author :  eolguin@fmtconsultants.com
 * @param  : {Object} map
 * @return : {Object} lineItems
 */
function getCRLineItems(map) {
    var lineItems = [];
    var count = nlapiGetLineItemCount('item');
    for (var k = 1; k <= count; k++) {
        //Verify if for Showroom Credit Line Item
    	
        var item = parseInt(nlapiGetLineItemValue('item', 'item', k));
        
        if (item == BM_SUE_CR.SRC_ITEM_ID) {
        	
            lineItems = [];
            break;
        }
        
      
        
        var origAsaAmt = nlapiGetLineItemValue('item', BM_SUE_CR.ORIGINAL_ALTSALESAMT, k);
        var asaAmt = nlapiGetLineItemValue('item', 'altsalesamt', k);
        
        
        logSrcInfo('AUDIT', 'getCRLineItems : Current Line Item Values', 'Item : ' + item + ', Index : ' + k + ', Alt Sales Amt : ' + origAsaAmt + ' , ASA Amt : ' + asaAmt, false);

        if (BM_SUE_CR.EXCLUDE_ITEMS_ID.indexOf(parseFloat(nlapiGetLineItemValue('item', 'item', k))) == -1) {
            //9/15/15 - eolguin@fmtconsultants.com - Only process lines without ASA amounts
            if ((!eo.js.isNumber(origAsaAmt) && eo.js.isNumber(!origAsaAmt)) || ('a' == 'a') ) {
                var priceLevel = parseFloat(nlapiGetLineItemValue('item', 'price', k));
                var findThisPL = (BM_SUE_CR.FIND_PRICE_LEVELS.indexOf(priceLevel) == -1) ? false : true;
                if (!isNaN(priceLevel)) {
                    var line = {
                        findPL : findThisPL,
                        index : k,
                        pricelevel : priceLevel
                    };
                    //Get the line item values
                    for (var m = 0; m < map.length; m++) {
                        line[map[m]] = nlapiGetLineItemValue('item', map[m], k);
                    }
                    //Add the line item
                    lineItems.push(line);
                    
                }
            }
        } else {
            if (eo.js.isNumber(origAsaAmt)) {
                nlapiSetLineItemValue('item', BM_SUE_CR.ORIGINAL_ALTSALESAMT, k, '');
            }
            if (eo.js.isNumber(asaAmt)) {
                nlapiSetLineItemValue('item', 'altsalesamt', k, '');
            }
        }
    }
    // nlapiLogExecution('DEBUG', 'Line Items to process ', JSON.stringify(lineItems));
    return lineItems;
}

/**
 * Using the Commission and Price Level search results, function loops through the line items
 * in the order, finds the appropiate commission rate based on the price level and
 * sets the ASA value.
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : {Object} lineItems, {Object} priceLvls, {Object} commissionRates
 * @return : null
 */
function setASALineItemValues(lineItems, priceLvls, commissionRates, orderStatus) {
	
	
	
	
    for (var k = 0; k < lineItems.length; k++) {
        var lnPriceLevel = lineItems[k].pricelevel;
        if (lineItems[k].findPL) {
        	
            lnPriceLevel = null;
            var itemPriceLevels = eo.js.findArray(priceLvls, 'item', lineItems[k].item);
            
            if (itemPriceLevels.length == 0) {
                logSrcInfo('ERROR', 'setASALineItemValues : No Min/Max PLV Range Found', 'Item : ' + lineItems[k].item + ' , Index : ' + lineItems[k].index + ' , Rate : ' + lineItems[k].rate, false);
                // nlapiSetLineItemValue('item', BM_SUE_CR.ORIGINAL_ALTSALESAMT, lineItems[k].index, '');
                // nlapiSetLineItemValue('item', 'altsalesamt', lineItems[k].index, '');
                continue;
            } else {
                lnPriceLevel = getPriceLevelLineValue(itemPriceLevels, lineItems[k].rate);
            }
        }
        
        //Get the corresponding Commission Rate
        var crObj = null;
        var crMatches = eo.js.findArray(commissionRates, 'pricelevel', String(lnPriceLevel));
        if (crMatches.length > 0) {
            //Match by Collection/Product Type
            crObj = crMatches.filter(function(elem) {
            	
                if ((parseInt(elem.custrecord_cr_collection) == parseInt(lineItems[k].custcol_collection)) && (parseInt(elem.custrecord_cr_product_type) == parseInt(lineItems[k].custcol_product_type))) {
                    return true;
                }
                return false;
            });
            crObj = crObj.length == 0 ? null : crObj[crObj.length - 1];
        }
        if (crObj == null) {
            logSrcInfo('ERROR', 'setASALineItemValues : No Commission Rate Match Found', 'Item : ' + lineItems[k].item + ' , Index : ' + lineItems[k].index + ' , Rate : ' + lineItems[k].rate + ' , PLV : ' + lnPriceLevel, false);
            //eolguin@fmtconsultants.com - November 24th 2015 - Grasiela Request -
            //nlapiSetLineItemValue('item', BM_SUE_CR.ORIGINAL_ALTSALESAMT, lineItems[k].index, '');
            //nlapiSetLineItemValue('item', 'altsalesamt', lineItems[k].index, '');
        } else {
            //Calculate and set the line item ASA Amount
      
            asaAmount = nlapiFormatCurrency(parseFloat(crObj.commissionrate) * parseFloat(lineItems[k].amount));
            var lineItemPriceLevel = nlapiGetLineItemValue('item', 'price', lineItems[k].index);
            var currAsaAmt = nlapiGetLineItemValue('item', 'altsalesamt', lineItems[k].index);
            Util.console.log(lineItemPriceLevel, 'lineItemPriceLevel')
            nlapiLogExecution('DEBUG', SRC_INFO.NAME + ' - Updating Values - ', g_tranInfo + ', Item : ' + lineItems[k].item + ' , Index : ' + lineItems[k].index + ' , Rate : ' + lineItems[k].rate + ' , PLV : ' + lnPriceLevel + ' , Commission Rate : ' + parseFloat(crObj.commissionrate) + ' , ASA : ' + asaAmount);
           // Util.console.log(g_tranInfo + ', Item : ' + lineItems[k].item + ' , Index : ' + lineItems[k].index + ' , Rate : ' + lineItems[k].rate + ' , PLV : ' + lnPriceLevel + ' , Commission Rate : ' + parseFloat(crObj.commissionrate) + ' , ASA : ' + asaAmount, 'All Values');
            //eolguin@fmtconsultants.com - July 8th 2015 - Added Original Sales Amount Custom Field
           Util.console.log(orderStatus, 'order Status');
            if ( orderStatus != 'Billed') {
            	  Util.console.log(orderStatus, 'inside of the if');
            	//if the line price level is Custom and already populated, do not set anything, else set values
            	if (lineItemPriceLevel == -1 && currAsaAmt != '' && 'a' == 'b') { //adding a=b logic per Lucy to make all orders recalculate
            		Util.console.log('in the first if');
            	} else {
            		nlapiSetLineItemValue('item', BM_SUE_CR.ORIGINAL_ALTSALESAMT, lineItems[k].index, asaAmount);
                    Util.console.log(asaAmount, 'asaAmount');
            		nlapiSetLineItemValue('item', 'altsalesamt', lineItems[k].index, asaAmount);
                    var amount = nlapiGetLineItemValue('item', 'amount', lineItems[k].index);
                   Util.console.log('setting alt sales amt');
                    if (amount > 0 || amount <0) {
                    	 var altSalesPercent = (asaAmount/amount) * 100;
                    } else {
                    	var altSalesPercent = 0;
                    }
                   
                   // nlapiSetLineItemValue('item', 'custcol_alt_sales_percent', lineItems[k].index, altSalesPercent );
            	}
            	
                
            }
            
            //if the price level is custom, set the price level from the object, else set the line item price level
            if (lineItemPriceLevel && lineItemPriceLevel == -1) {
            	nlapiSetLineItemValue('item', 'custcol_commission_level', lineItems[k].index, lnPriceLevel);
            } else {
            	nlapiSetLineItemValue('item', 'custcol_commission_level', lineItems[k].index, lineItemPriceLevel);
            }
            logSrcInfo('AUDIT', 'setASALineItemValues: Updated Line Item Values', 'Item : ' + lineItems[k].item + ' , Index : ' + lineItems[k].index + ', Alt Sales Amt : ' + asaAmount + ' , ASA Amt : ' + asaAmount + ' , Commission Rate : ' + parseFloat(crObj.commissionrate) + ' , PL : ' + crObj.pricelevelName + ' , Rate : ' + lineItems[k].rate, false);
        }
    }
}

/**
 * Returns an object containing the highest unit price from the highest Price Level
 * and the lowest unit price from the lowest Price Level based on the Price Level
 * Value Group set on the customer record. Values are to help determine whether an
 * ASA value needs to be set or not.
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : {Object} itemPriceLevels, {Float} lineRate
 * @return : {Float} unitprice
 */
function getPriceLevelLineValue(itemPriceLevels, lineRate) {
    //Sort by ASC-DESC by Unit Price
	
	
    itemPriceLevels = itemPriceLevels.sort(function(a, b) {
      //return parseFloat(a.unitprice) > parseFloat(b.unitprice);
    	return parseFloat(a.unitprice) - parseFloat(b.unitprice);
  
    });
	
	
	
    /*if (eo.js.toNumber(lineRate) != 0) {
        var noZeroPriceLevels = itemPriceLevels.filter(function(elem) {
            elem.unitprice = eo.js.toNumber(elem.unitprice);
            if (elem.unitprice != 0) {
                return true;
            }
            return false;
        });
        itemPriceLevels = noZeroPriceLevels.length == 0 ? itemPriceLevels : noZeroPriceLevels;
        Util.console.log(itemPriceLevels,' item price Levels again');
    }*/
    //Find the rate of the highest and lowest price levels
    var plMin = itemPriceLevels[0].unitprice;
    var plMax = itemPriceLevels[itemPriceLevels.length - 1].unitprice;
    //If price is lower than the lowest price level
    if (parseFloat(lineRate) <= parseFloat(plMin)) {
        //No range to consider if the rate is below the first price level
    	
        return itemPriceLevels[0].pricelevel;
    } else if (parseFloat(lineRate) >= parseFloat(plMax)) {
        //No range to consider if the rate is above the last price level
    	
    	return itemPriceLevels[itemPriceLevels.length - 1].pricelevel;
        
    } else {
        //Rate doesn't fall within the first or last price level, find the range
    	
        return getPriceLevelRangeRateLookup(itemPriceLevels, lineRate);
    }
}

/**
 * Function finds the appropiate commission rate based on the price level range
 * where the line item rate falls into
 * Number Prototype Author : Vohuman from stackoverflow
 * Ref: http://stackoverflow.com/questions/14718561/check-if-a-number-is-between-two-values
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : {Object} itemPriceLevels, {Float} lineRate
 * @return : {Float} unitprice
 */
function getPriceLevelRangeRateLookup(itemPriceLevels, lineRate) {
    "use strict";
    
    //Define locally array prototype functions to allow the min max calculation from an array
    Number.prototype.between = function(a, b, inclusive) {
        var min = Math.min.apply(Math, [a, b]), max = Math.max.apply(Math, [a, b]);
        return inclusive ? this >= min && this <= max : this > min && this < max;
    };
    //Sort Price Levels
    var unitPrices = eo.js.getUniqueArray(itemPriceLevels, 'unitprice');
    unitPrices = unitPrices.sort(function(a, b) {
        return parseFloat(a) < parseFloat(b);
    });
    //Find Range Between line and price level
    var thisMinRange = null;
    var thisMaxRange = null;
    var lowerRange = -1;
    var maxRange = unitPrices.length - 1;
    while ((lowerRange + 1) <= maxRange) {
        thisMaxRange = parseFloat(unitPrices[lowerRange]);
        thisMinRange = parseFloat(unitPrices[lowerRange + 1]);
        if (parseFloat(lineRate).between(thisMinRange, thisMaxRange, true)) {
            break;
        } else {
            lowerRange += 1;
        }
    }
    if (thisMinRange != null && thisMaxRange != null) {
        var plMinObj = eo.js.findObj(itemPriceLevels, 'unitprice', thisMinRange);
        var plMaxObj = eo.js.findObj(itemPriceLevels, 'unitprice', thisMaxRange);
        var plMin = plMinObj != null ? plMinObj.unitprice : itemPriceLevels[0].unitprice;
        var plMax = plMaxObj != null ? plMaxObj.unitprice : itemPriceLevels[itemPriceLevels.length - 1].unitprice;
        
        
        
        /*if (parseFloat(lineRate) <= parseFloat(plMax) && parseFloat(lineRate) >= parseFloat(plMin)) {
        	Util.console.log('in the if');
        	return plMinObj.pricelevel;
        } else {
        	Util.console.log('in the else');
            return plMaxObj.pricelevel;
        }*/
        
        if (parseFloat(lineRate) < plMin){
        	return plMaxObj.pricelevel;
        } else {
        	return plMinObj.pricelevel;
        }
        
        
    } else {
        logSrcInfo('ERROR', 'getPriceLevelRangeRateLookup : No Min/Max Price Level Range Found', 'Rate : ' + lineRate + ' , Unit Prices Used : ' + JSON.stringify(unitPrices), false);
        return null;
    }
}

/**
 * Runs a search to retrieve all price levels corresponding to the line
 * items set on the transaction.
 * //REGEXP_REPLACE({pricing.pricelevel}, 'T1L', 'A') REGEXP_REPLACE({pricing.pricelevel},'[^0-9]+')
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : {Object} itemIds, {String} cusPL
 * @return : {Object} results
 */
function getPriceLevelsResults(itemIds, cusPL) {
    var filters = [];
    if (cusPL != null) {
    	
        filters.push(new nlobjSearchFilter("formulanumeric", null, "equalto", "1").setFormula("case when substr({pricing.pricelevel}, 0,3) = '" + cusPL + "' then 1 else 0 end"));
    }
    filters.push(new nlobjSearchFilter("pricelevel", "pricing", "noneof", ["@NONE@", "1"]));
    filters.push(new nlobjSearchFilter("internalid", null, "anyof", itemIds));
    var columns = {
        "item" : new nlobjSearchColumn("internalid", null, "group").setLabel("item"),
        "itemName" : new nlobjSearchColumn("itemid", null, "max").setLabel("itemName"),
        "pricelevelName" : new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({pricing.pricelevel})").setLabel("pricelevelName"),
        "pricelevel" : new nlobjSearchColumn("pricelevel", "pricing", "group").setLabel("pricelevel"),
        "unitprice" : new nlobjSearchColumn("unitprice", "pricing", "max").setLabel("unitprice"),
        "plno" : new nlobjSearchColumn("formulatext", null, "max").setFormula("REGEXP_REPLACE({pricing.pricelevel}, '" + cusPL.substring(0, 3) + "', '')").setLabel("plno")
    };
    var searchResults = eo.ns.getSearchResults("item", filters, eo.js.getArrayFromObject(columns));
    
    return (searchResults != null && searchResults.length > 0) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
}

/**
 * Runs a search to retrieve all commission rates corresponding to the price levels retrieved.
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : {Object} prLvlIds, {Object} productTypeIds
 * @return : {Object} results
 */
function getCommissionRatesResults(prLvlIds, productTypeIds, collectionIds) {
    var filters = [];
    if (prLvlIds.length > 0) {
        filters.push(new nlobjSearchFilter("custrecord_cr_price_level", null, "anyof", prLvlIds));
    }
    if (eo.js.arrayHasValues(productTypeIds)) {
        filters.push(new nlobjSearchFilter("custrecord_cr_product_type", null, "anyof", productTypeIds));
    }
    if (eo.js.arrayHasValues(collectionIds)) {
        filters.push(new nlobjSearchFilter("custrecord_cr_collection", null, "anyof", collectionIds));
    }
    var columns = {
        "internalid" : new nlobjSearchColumn("internalid", null).setLabel("internalid"),
        "name" : new nlobjSearchColumn("name", null).setSort(true).setLabel("name"),
        "pricelevel" : new nlobjSearchColumn("custrecord_cr_price_level", null).setLabel("pricelevel"),
        "pricelevelName" : new nlobjSearchColumn("formulatext", null).setFormula("TO_CHAR({custrecord_cr_price_level})").setLabel("pricelevelName"),
        "commissionrate" : new nlobjSearchColumn("formulanumeric", null).setFormula("{custrecord_cr_rate}").setLabel("commissionrate"),
        "custrecord_cr_product_type" : new nlobjSearchColumn("custrecord_cr_product_type", null).setLabel("custrecord_cr_product_type"),
        "custrecord_cr_collection" : new nlobjSearchColumn("custrecord_cr_collection", null).setLabel("custrecord_cr_collection")
    };
    var searchResults = eo.ns.getSearchResults("customrecord_commission_rate", filters, eo.js.getArrayFromObject(columns));
    var res = (searchResults != null && searchResults.length > 0) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
    return res;
}

/**
 * AfterSubmit,  Sets the Create PO Link in Line Items
 * Grabs standard Created PO Field and sets it into custom one
 * 9/15/15 - Update Create PO Field Value
 * 9/22/15 - Update Value on AfterSubmit
 * Fixes BeforeSubmit missing createdpo value.
 *
 * @author : eolguin@fmtconsultants.com
 * @param  : {String} type
 * @return  : null
 */
function afterSubmit_setCreatedPO(type) {
    var eCtx = nlapiGetContext().getExecutionContext();
    var submitRec = false;
    if (type == 'create' || type == 'edit') {
        var rec = eo.ns.loadRecord(nlapiGetRecordType(), nlapiGetRecordId());
        if (rec != null) {
            g_tranInfo = 'Context: ' + eCtx + ' , Type : ' + type + ' , ' + nlapiGetFieldValue('tranid') + ' , ID#' + nlapiGetRecordId();
            try {
                var count = rec.getLineItemCount('item');
                for (var k = 1; k <= count; k++) {
                    var createdPO = rec.getLineItemValue('item', 'createdpo', k);
                    var cusCreatedPO = rec.getLineItemValue('item', 'custcol_create_po', k);
                    if (eo.js.isNumber(createdPO) && !eo.js.isNumber(cusCreatedPO)) {
                        rec.setLineItemValue('item', 'custcol_create_po', k, createdPO);
                        nlapiLogExecution('DEBUG', '[FMT] Set CreatedPO Value for SO #' + nlapiGetRecordId(), 'Line #' + k + ' Created PO Value Set: ' + createdPO);
                        submitRec = true;
                    } else {
                        if (eo.js.isNumber(createdPO) && !eo.js.isNumber(cusCreatedPO)) {
                            if (createdPO != cusCreatedPO) {
                                rec.setLineItemValue('item', 'custcol_create_po', k, createdPO);
                                submitRec = true;
                            }
                        }
                    }
                }
                if (submitRec) {
                    eo.ns.submitRecord(rec);
                }
            } catch(e) {
                logError(e, 'afterSubmit_setCreatedPO' + ' , Time : ' + eo.js.getSysDateWithTimeStamp() + ' , ' + g_tranInfo + ' , User : ' + SRC_INFO.USER);
            }
        }
    }
}

/**
 * Logs an error in NetSuite, whether it's and nlobjError object or a plain Javascript error.
 * See SRC_INFO object for script info.
 *
 * @param {Object} err The nlobjError object or the plain Javascript error.
 * @param {Object} title The title that will be given to the error log.
 */
function logError(err, title) {
    var msg = [];
    if (err.getCode != null) {
        msg.push('[SuiteScript exception] ' + SRC_INFO.NAME);
        msg.push('Error Code: {0}' + err.getCode());
        msg.push('Error Data: {0}' + err.getDetails());
        msg.push('Error Ticket: {0}' + err.getId());
        if (err.getInternalId) {
            msg.push('Record ID: {0}' + err.getInternalId());
        }
        if (err.getUserEvent) {
            msg.push('Script: {0}' + err.getUserEvent());
        }
        msg.push('User: {0}' + nlapiGetUser());
        msg.push('Role: {0}\n' + nlapiGetRole());
        var stacktrace = err.getStackTrace();
        if (stacktrace) {
            msg.push('Stack Trace');
            msg.push('\n---------------------------------------------');
            if (stacktrace.length > 20) {
                msg.push('**stacktrace length > 20**');
                msg.push(stacktrace);
            } else {
                msg.push('**stacktrace length < 20**');
                for (var i = 0; stacktrace != null && i < stacktrace.length; i++) {
                    msg.push(stacktrace[i]);
                }
            }
        }
    } else {
        msg.push('[javascript exception]');
        msg.push('User: {0}' + nlapiGetUser());
        msg.push(err.toString());
    }
    nlapiLogExecution('ERROR', title, msg);
    var context = nlapiGetContext();
    var companyId = context.getCompany();
    var environment = context.getEnvironment();
    title = "An Error Has Occurred - " + title + '(NS Acct #' + companyId + ' ' + environment + ')';
    try {
        nlapiSendEmail(SRC_INFO.ERROR.AUTHOR, SRC_INFO.ERROR.EMAIL, title, msg);
    } catch (mailErr) {
        if (mailErr.getCode != null) {
            nlapiLogExecution('ERROR', 'Error sending error log email', mailErr.getCode() + ': ' + mailErr.getDetails());
        } else {
            nlapiLogExecution('ERROR', 'Error sending error log email', mailErr.toString());
        }
    }
}
