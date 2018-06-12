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
 * File:                 BM_CUE_ViewSOAllocation.js
 * Date:                 Thursday September 17th 2015
 * Last Updated:         Thursday September 17th 2015
 * Version:              1.0
 *
 * Name:                 [FMT] View SO Allocation (Client)
 * Script ID:            customscript_bm_cue_viewsoallocation
 * Deployment:           Estimate
 *
 * Client Side Script used to redirect the user to the
 * SO Allocation Page - BM_SSU_SetSOAllocation Suitelet.
 * View Mode Only for Estimate Records
 *
 ***********************************************************************/
var BM_SOAR = {
    SS_SCRIPT_ID : 'customscript_bm_ssu_setsoallocation',
    SS_SCRIPT_DEPLOYMENT : 'customdeploy_bm_ssu_setsoallocation',
    VIEW_COL : 'custcol_view_so_allocation',
    MAP : {
        'quantity' : 'qty',
        'custcol_qtyofboxs' : 'crt'
    }
};
var g_arFldHtml = null;
/**
 * @param : {String} type, {String} name, {String} linenum
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function onLineInit_setSOAllocationLink(type) {
    if (type == 'item') {
        return setAllocationAnchors();
    }
}

/**
 * @param : {String} type, {String} name, {String} linenum
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function onFieldChanged_setSOAllocationLink(type, name, lineno) {
    if (type == 'item') {
        if (name == 'item') {
            setAllocationAnchors();
        }
    }
}

/**
 * @param : null
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function getSOARScreen() {
    try {
        var url = nlapiResolveURL('SUITELET', BM_SOAR.SS_SCRIPT_ID, BM_SOAR.SS_SCRIPT_DEPLOYMENT);
        url += '&reqid=' + encodeURIComponent(nlapiGetRecordId());
        url += '&ln=' + encodeURIComponent(nlapiGetCurrentLineItemIndex('item'));
        url += '&item=' + encodeURIComponent(nlapiGetCurrentLineItemValue('item', 'item'));
        url += '&qty=' + encodeURIComponent(nlapiGetCurrentLineItemValue('item', 'quantity'));
        url += '&crt=' + encodeURIComponent(nlapiGetCurrentLineItemValue('item', 'custcol_qtyofboxs'));
        url += '&sfx=' + encodeURIComponent(nlapiGetCurrentLineItemValue('item', 'custcol_boxsf'));
        url += '&view=T';
        return window.open(url, 'SO Allocation', 'left=20,top=20,width=1000,height=500,resizable=0');
    } catch (ex) {
        alert('Error in calling suitelet ' + ex);
    }
}

/**
 * @param :  null
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setAllocationAnchors() {
    if (!isNaN(parseInt(nlapiGetCurrentLineItemValue('item', 'item')))) {
        nlapiDisableLineItemField('item', 'custcol_view_so_allocation', false);
        try {
            var ssFld = document.getElementById('item_custcol_view_so_allocation_fs');
            if (ssFld != null) {
                if (String(ssFld.innerHTML).indexOf('getSOARScreen') == -1) {
                    ssFld.innerHTML = '<a href="#" onclick="getSOARScreen()">View Future PO Allocations</a>';
                }
            }
        } catch(e) {
            nlapiLogExecution('debug', '[FMT] Set Allocation Anchors Error!', e);
        }
    } else {
        nlapiDisableLineItemField('item', 'custcol_view_so_allocation', true);
    }
}
