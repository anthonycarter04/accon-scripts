/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       12 Nov 2016     Manoj
 * 1.10       16 Jan 2018     npeacock          BA-34 changes
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
//Production Email Id
var SENDER_EMAIL = '621923';

var overRideEmail = '';

try {

    var overRideEmail = nlapiGetContext().getSetting('SCRIPT', 'custscript_override_email');
    var sendToOverride = nlapiGetContext().getSetting('SCRIPT', 'custscript_auto_send_to_override');
    //nlapiLogExecution("DEBUG", "overRideEmail", overRideEmail);
} catch (e) {

}

//get default emails from customer contacts
var DEFAULT_RECEPIENT_EMAIL = '';

if (overRideEmail) {
    DEFAULT_RECEPIENT_EMAIL = overRideEmail;
}

var DEFAULT_INVOICE_SUBJECT = 'Invoice(s) from Lifesize.';
var DEFAULT_INVOICE_BODY = 'Greetings,<br/><br/>';
DEFAULT_INVOICE_BODY += 'Please find the attached invoice(s) for your reference and processing. <br/> ####--#### <br/>';
DEFAULT_INVOICE_BODY += 'If you have any questions, please send your inquiry to:  AR@LIFESIZE.COM <br/><br/><br/>';
DEFAULT_INVOICE_BODY += 'Best regards, <br/> ';
DEFAULT_INVOICE_BODY += 'Lifesize AR Team <br/>';
DEFAULT_INVOICE_BODY += 'AR@Lifesize.com <br/>';


var DEFAULT_CR_MEMO_SUBJECT = 'Credit Memo(s) from Lifesize.';
var DEFAULT_CREDIT_MEMO_BODY = 'Greetings,<br/><br/>';
DEFAULT_CREDIT_MEMO_BODY += 'Please find the attached Credit Memo(s) for your reference and processing. <br/> ####--#### <br/>';
DEFAULT_CREDIT_MEMO_BODY += 'If you have any questions, please send your inquiry to:  AR@LIFESIZE.COM <br/><br/><br/>';
DEFAULT_CREDIT_MEMO_BODY += 'Best regards, <br/> ';
DEFAULT_CREDIT_MEMO_BODY += 'Lifesize AR Team <br/>';
DEFAULT_CREDIT_MEMO_BODY += 'AR@Lifesize.com <br/>';

var EMEA_REGION = '2';

function scheduledAutoEmail(type) {
    //	add 'Send Email' field pending
    //	add 'customer contact emails'
    var invIdsObj = getIds('CustInvc', 'group');
    var custIdsInvoice = invIdsObj.custIds;
    var custNamesInvoice = invIdsObj.custNames;
    var credMemoIds = getIds('CustCred', 'group');
    var custIdsCR_Memos = credMemoIds.custIds;
    var custNamesCR_Memos = credMemoIds.custNames;


    sendEmail(custIdsInvoice, 'CustInvc', custNamesInvoice);
    sendEmail(custIdsCR_Memos, 'CustCred', custNamesCR_Memos);

}

function sendEmail(custIds, emailType, custNames) {

    var recCount = 0;
    var agilityCount = 0;
    var custIdsCount = 0;
    var subject;
    var body;
    var submitType;

    if (emailType == 'CustInvc') {

        subject = DEFAULT_INVOICE_SUBJECT;
        body = DEFAULT_INVOICE_BODY;
        submitType = 'invoice';
    } else if (emailType == 'CustCred') {

        subject = DEFAULT_CR_MEMO_SUBJECT;
        body = DEFAULT_CREDIT_MEMO_BODY;
        submitType = 'creditmemo';
    }
    var agilityPdfArr = [];
    var emailTranIdsAgility = [];
    for (var j = 0; j < custIds.length; j++) {
        nlapiLogExecution("AUDIT", "processing customer id", custIds[j]);
        //BA-34 changes to recipient email - pull recipients first, and if no recipients send to default recipient email
        var recepientEmail = getRecipient(custIds[j]);
        //nlapiLogExecution("DEBUG", "recepientEmail", JSON.stringify(recepientEmail));
        //nlapiLogExecution("DEBUG", "DEFAULT_RECEPIENT_EMAIL", DEFAULT_RECEPIENT_EMAIL);
		nlapiLogExecution("DEBUG", "default recipient email", DEFAULT_RECEPIENT_EMAIL);
        if (recepientEmail.length < 1 || sendToOverride == 'T') {
            recepientEmail = [DEFAULT_RECEPIENT_EMAIL];
        }
        
        
        //nlapiLogExecution("DEBUG", "recepientEmail", JSON.stringify(recepientEmail));
        var resp = getIds(emailType, 'getTranIds', custIds[j]);
        var tranIds = resp.inv_crmemo_ids_array;
        var tranNumbers = resp.tranIdsInvCrMEMO;
		var vatFieldsArray = resp.vatFieldsArray;
        var emailTranIds = [];

        var pdfArr = [];

        var invEmail;
        var tempArrayPDFs;
        var chunk = 20;
        var tempEmailTranIds;
        if (tranIds != null && tranIds != '') {
            //BA-34 , previously pdf array was being constructed alongside agility emails, construct pdf array first and send agility emails 
            //BA-34 have to pull a separate array for agility pdfs because they only matter if they have VAT lang
            for (var k = 0; k < tranIds.length; k++) {
                nlapiLogExecution('DEBUG', 'Transaction', 'id: ' + tranIds[k]);
                var invPdf = nlapiPrintRecord('TRANSACTION', tranIds[k], 'PDF');
                emailTranIds.push(tranNumbers[k]);
                pdfArr.push(invPdf);
                recCount++;
                //agility invoices
                if (emailType == 'CustInvc') {
                    var vatFields = vatFieldsArray[k];
                    var noVatLang = vatFields.custbody_no_vat_lang;
                    var vatRegion = vatFields.custbody14;
                    nlapiLogExecution('DEBUG', 'vatFields', vatRegion + '   ' + noVatLang);
                    if (noVatLang == 'F' && vatRegion == EMEA_REGION) {
						nlapiLogExecution("AUDIT", "agilityInvoice", tranNumbers[k]);
                        agilityPdfArr.push(invPdf);
                        emailTranIdsAgility.push(tranNumbers[k]);
                    }
                }
            }
            nlapiLogExecution('DEBUG', 'custid of ' + j + ' - records =' + pdfArr.length);




            nlapiLogExecution("DEBUG", "recepientEmail", JSON.stringify(recepientEmail));

            if (pdfArr.length > 0 && recepientEmail != null && recepientEmail != '') {

                var invoiceNumberList = tranNumbers;
                var replaceString = 'Invoice(s) attached: ' + invoiceNumberList;

                // if pdf count is more then 20. split the pdfs into email slots of 20 pdfs.

                var i1, j1;
                var recipChunk = 10;

                for (var i1 = 0, j1 = pdfArr.length; i1 < j1; i1 += chunk) {

                    tempArrayPDFs = pdfArr.slice(i1, i1 + chunk);
                    tempEmailTranIds = emailTranIds.slice(i1, i1 + chunk);
                    //BA-34 added handling for more than 10 invoice contacts
                    var tempBody = body.replace('####--####', tempEmailTranIds) + '.';
                    var records = {};
                    records['entity'] = String(custIds[j]);
                    for (var x1 = 0, y1 = recepientEmail.length; x1 < y1; x1 += recipChunk) {
                        var tempRecipients = recepientEmail.slice(x1, x1 + recipChunk);
                        try {
                            nlapiSendEmail(SENDER_EMAIL, tempRecipients, 'Customer: ' + custNames[j] + '. ' + subject, tempBody, null, null, records, tempArrayPDFs, true);
                        } catch (e) {
                            nlapiLogExecution("ERROR", "customer email not sent for tran ids", JSON.stringify(tempEmailTranIds) + " with error " + e.toString());
                        }
                        nlapiLogExecution("AUDIT", "ar email sent with count pdfs " + tempArrayPDFs.length, JSON.stringify(tempRecipients));
                    }
                }

                for (var k = 0; k < tranIds.length; k++) {
                   nlapiSubmitField(submitType, tranIds[k], 'custbody_to_be_emailed', 'F');
                }
            }
        }
        nlapiLogExecution("DEBUG", "agilityPdfArr.length", agilityPdfArr.length);
        //BA-34 moved agility emails outside of pdf loop - check for invoice that have vat lang


        checkGovernance();
    }
    //if vat lang exists for invoices, send a copy of email to LSBIINVOICES@AGILITY.COM
    if (emailType == 'CustInvc') {
        for (var a = 0, a1 = agilityPdfArr.length; a < a1; a += chunk) {
            checkGovernance();
            //BA-34 - moved vat field lookups to pdf generation as for the splicing we have to create a separate array of only vat invoices

            tempArrayPDFs = agilityPdfArr.slice(a, a + chunk);
            tempEmailTranIds = emailTranIdsAgility.slice(a, a + chunk);
            var tempBody = body.replace('####--####', tempEmailTranIds) + '.';
            //BA-34 send invoices to agility email instead of ar
            if (sendToOverride == 'T') {
            		invEmail = DEFAULT_RECEPIENT_EMAIL;
            } else {
            		invEmail = 'lsbiinvoices@agility.com';
            }
           
            /*
            if(!DEFAULT_RECEPIENT_EMAIL){

            	invEmail = 'lsbiinvoices@agility.com';
            }
            else{
            	invEmail = DEFAULT_RECEPIENT_EMAIL;
            }
            */
            try {
                nlapiSendEmail(SENDER_EMAIL, invEmail, 'Agility Copy of lifesize Invoices', tempBody, null, null, null, tempArrayPDFs, true);
            } catch (e) {
                nlapiLogExecution("ERROR", "agility email not sent for tran ids", JSON.stringify(tempEmailTranIds) + " with error " + e.toString());

            }

            nlapiLogExecution("AUDIT", "agility email sent with count pdfs ", tempArrayPDFs.length);

        }
    }

    nlapiLogExecution('DEBUG', 'total email count ' + emailType, recCount);

}


function getIds(recType, task, cID) {

    var returnObj = null;
    //invoice emails
    var rscnt = 1000;
    var nextStartIndex = 0;
    var nextEndIndex = 1000;

    var newSearch = nlapiLoadSearch('transaction', 'customsearch_inv_cr_auto_email');
    newSearch.addFilter(new nlobjSearchFilter('type', null, 'is', recType));
    newSearch.addFilter(new nlobjSearchFilter('custbody_to_be_emailed', null, 'is', 'T'));

    //used for fetching invoice ids and credit memo ids with respect to customers
    if (cID != null && cID != '') {

        newSearch.addFilter(new nlobjSearchFilter('internalid', 'customer', 'is', cID));
    }

    var custCol = new nlobjSearchColumn('internalid', 'customer');
    newSearch.addColumn(custCol);
    var custCompany = new nlobjSearchColumn('companyname', 'customer');
    newSearch.addColumn(custCompany);
    var tranIdCol = new nlobjSearchColumn('tranid');
	var vatRegionColumn = new nlobjSearchColumn('custbody14');
	var noVatLangColumn = new nlobjSearchColumn('custbody_no_vat_lang');
    newSearch.addColumn(tranIdCol);
    newSearch.addColumn(vatRegionColumn);
	newSearch.addColumn(noVatLangColumn);
    var searchResultSet = newSearch.runSearch();
    var customerIdsArray = [];
    var customerNamesArray = [];
    var inv_crmemo_ids_array = [];
	var vatFieldsArray = [];
    var tranIdsInvCrMEMO = [];


    if (task == 'group') {
        if (newSearch) {
            while (rscnt == 1000) {
                var rs = searchResultSet.getResults(nextStartIndex, nextEndIndex);

                for (var i = 0; i < rs.length; i++) {
                    if (customerIdsArray.indexOf(rs[i].getValue(custCol)) == -1) {
                        customerIdsArray.push(rs[i].getValue(custCol));
                        customerNamesArray.push(rs[i].getValue(custCompany));

                    }
                }

                rscnt = rs.length;
                nextStartIndex = nextEndIndex;
                nextEndIndex = nextEndIndex + 1000;
            }
        }


        returnObj = {
            'custIds': customerIdsArray,
            'custNames': customerNamesArray
        }
    } else {
        if (newSearch) {
            while (rscnt == 1000) {
                var rs = searchResultSet.getResults(nextStartIndex, nextEndIndex);


                for (var i = 0; i < rs.length; i++) {
                    if (recType == 'CustInvc') {

                        inv_crmemo_ids_array.push(rs[i].getId());
                        tranIdsInvCrMEMO.push(rs[i].getValue(tranIdCol));
						vatFieldsArray.push({custbody_no_vat_lang : rs[i].getValue(noVatLangColumn), custbody14 : rs[i].getValue(vatRegionColumn)})

                    } else {
                        var creditMemo = nlapiLoadRecord('creditmemo', rs[i].getId());
                        var crMemoTranID = creditMemo.getFieldValue('tranid');
                        var crMemoLineCount = creditMemo.getLineItemCount('item');
                        var itemNotFoundFlag = true;
                        // send email only when credit memo does not have a line item 1000-0000-0882 id:10974
                        for (var cIn = 1; cIn <= crMemoLineCount; cIn++) {

                            var item = creditMemo.getLineItemValue('item', 'item', cIn);
                            if (item == 10974) //id for item 1000-0000-0882
                                itemNotFoundFlag = false;

                        }

                        if (itemNotFoundFlag) {
                            inv_crmemo_ids_array.push(rs[i].getId());
                            tranIdsInvCrMEMO.push(crMemoTranID);
                        }

                    }
                }


                rscnt = rs.length;
                nextStartIndex = nextEndIndex;
                nextEndIndex = nextEndIndex + 1000;
            }
        }


        returnObj = {
            'inv_crmemo_ids_array': inv_crmemo_ids_array,
            'tranIdsInvCrMEMO': tranIdsInvCrMEMO,
			'vatFieldsArray' : vatFieldsArray
        }

    }
    return returnObj;
}

function getRecipient(custId) {
    var contEmail = new Array();
    if (custId) {
        //category any of Invoice(id:5)
        //company anyof custId
        var fils = new Array();
        fils.push(new nlobjSearchFilter('category', null, 'anyof', '5'));
        fils.push(new nlobjSearchFilter('company', null, 'anyof', custId));
        var cols = new nlobjSearchColumn('email');
        var contSearch = nlapiSearchRecord('contact', null, fils, cols);

        if (contSearch) {
            for (var ci = 0; ci < contSearch.length; ci++) {
                var email = contSearch[ci].getValue('email');
                if (contEmail.indexOf(email) == -1)
                    contEmail.push(email);
            }

        }

        return contEmail;
    }



}

function checkGovernance() {
    var usage = nlapiGetContext().getRemainingUsage();
    if (usage < 1000)
        nlapiYieldScript();

}