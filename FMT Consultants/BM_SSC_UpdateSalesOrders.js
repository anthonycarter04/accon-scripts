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
 * Company:              FMT Consultants LLC, www.fmtconsultants.com
 * Author:               Elean Olguin - eolguin@fmtconsultants.com
 * File:                 BM_SSC_UpdateSOASAAmount.js
 * Date:                 Sunday August 30th 2015
 * Version:              1.1
 *
 * Name:                 [FMT] Update Sales Orders (Scheduled)
 *
 * DEV Only : Purpose of the script is to load/submit sales order
 * records for the purpose of triggering user event scripts.
 *
 ***********************************************************************/

var g_processed = [];

function triggerSalesOrdersUEScripts() {
    var ctx = nlapiGetContext();
    ctx.setPercentComplete(0.00);
    var allSOs = getSalesOrdersGrasielaCommissionsToUpdate();
    //var allSOs = getAllUnlinkedCreatedPOSOs();
    var len = allSOs.length;
    nlapiLogExecution('debug', '[FMT] Attempting To Update ' + len + ' Sales Orders', 'START');
    for (var k = 0; k < len; k++) {
        processAndYieldScript(40);
        //  var rec = eo.ns.loadRecord('salesorder', allSOs[k].internalid);
        var rec = eo.ns.loadRecord('salesorder', allSOs[k]);
        if (rec != null) {
            var subRec = eo.ns.submitRecord(rec);
            if (subRec != null) {
                g_processed.push(subRec);
            }
        }
        ctx.setPercentComplete(Math.ceil((100 * k) / len));
    }
    nlapiLogExecution('DEBUG', 'Processed ' + g_processed.length + ' Sales Orders', 'IDS : ' + JSON.stringify(g_processed));
}

function getSalesOrdersGrasielaCommissionsToUpdate() {
    return ["7842", "7869", "7873", "8051", "11199", "11282", "11296", "15767", "19123", "21605", "30060", "30274", "30581", "31852", "32165", "33306", "39018", "39985", "40161", "41037", "41094", "47033", "48676", "49318", "49337", "49835"];
}

/**
 * Returns all orders without a created po value in the system
 * @param null
 * @return null
 * @author elean.olguin@gmail.com
 */
function getAllUnlinkedCreatedPOSOs() {
    var filters = [];
    filters.push(new nlobjSearchFilter("type", null, "anyof", "SalesOrd"));
    filters.push(new nlobjSearchFilter("mainline", null, "is", "F"));
    filters.push(new nlobjSearchFilter("custcol_create_po", null, "anyof", "@NONE@"));
    var columns = {
        "internalid" : new nlobjSearchColumn("internalid", null, "group").setLabel("internalid")
    };
    var searchResults = eo.ns.getSearchResults("transaction", filters, eo.js.getArrayFromObject(columns));
    return (searchResults != null && searchResults.length > 0) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
}

/**
 * Returns all Sales Order in the system
 * @param null
 * @return null
 * @author elean.olguin@gmail.com
 */
function getAllSOs() {
    var filters = [];
    filters.push(new nlobjSearchFilter("type", null, "anyof", "SalesOrd"));
    filters.push(new nlobjSearchFilter("mainline", null, "is", "T"));
    var columns = {
        "internalid" : new nlobjSearchColumn("internalid", null).setLabel("internalid")
    };
    var searchResults = eo.ns.getSearchResults("transaction", filters, eo.js.getArrayFromObject(columns));
    return (searchResults != null && searchResults.length > 0) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
}

/**
 * Yields a scheduled execution for a later time
 * @param {Float} lim
 * @return null
 * @author elean.olguin@gmail.com
 */
function processAndYieldScript(lim) {
    var currentUsage = parseInt(nlapiGetContext().getRemainingUsage());
    nlapiLogExecution('audit', 'Requesting Metering Verification for ' + lim + ' units.', 'Current Usage :' + currentUsage);
    nlapiLogExecution('audit', 'Metering Required :', currentUsage - lim);
    if (currentUsage <= lim) {
        if (nlapiGetContext().getExecutionContext() == 'scheduled') {
            var state = nlapiYieldScript();
            nlapiLogExecution('audit', 'Re-scheduling script, metering running low.', 'Yielding status ' + state.status);
            if (state.status == 'FAILURE') {
                nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
                throw nlapiCreateError('FAILED_TO_YIELD', "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size, false);
            } else if (state.status == 'RESUME') {
                nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ".  Size = " + state.size);
            }
        }
    }
}