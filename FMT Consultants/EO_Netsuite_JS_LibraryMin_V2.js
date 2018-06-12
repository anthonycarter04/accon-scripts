/************************************************************************
 * The following javascript code was created by Elean Olguin, and it is intented
 * for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": Elean Olguin shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Author: elean.olguin@gmail.com, elean.olguin@skwebapps.com
 * File: EO_NS_JS_Library_min.js
 * Date: Thursday June 26 2014
 * Version 2.0
 *
 * Based on EO_NS_JS_Library.js, which contains XML-to-PDF formatting
 * methods. This library file has been compressed to include only Javascript
 * functions.
 *
 ***********************************************************************/
var NS_MAX_SEARCH_RESULT = 1000;
var eo = eo || {};
/*
 * NetSuite SuiteScript Functions
 * @author: elean.olguin@gmail.com
 */

eo.ns = {
    /**
     * Deletes a nlobjRecord
     * @param {nlobjRecord} rec
     * @return null
     * @author elean.olguin@gmail.com
     */
    deleteRecord : function(type, id) {
        try {
            nlapiDeleteRecord(type, id);
            nlapiLogExecution('debug', 'Record Deleted. ID #' + id);
        } catch (e) {
            nlapiLogExecution('ERROR', 'DELETE_RECORD_ERROR', e);
        }
    },
    /**
     * Submits a nlobjRecord
     * @param {nlobjRecord} rec
     * @return null
     * @author elean.olguin@gmail.com
     */
    submitRecord : function(rec) {
        var id = null;
        try {
            id = nlapiSubmitRecord(rec);
            nlapiLogExecution('debug', 'Record Submited. ID #' + rec.getId());
        } catch (e) {
            nlapiLogExecution('ERROR', 'SUBMIT_RECORD_ERROR', e);
        }
        return id;
    },
    /**
     * Loads a nlobjRecord
     * @param {String} type, {String} id
     * @return null
     * @author elean.olguin@gmail.com
     */
    loadRecord : function(type, id) {
        var rec = null;
        try {
            rec = nlapiLoadRecord(type, id);
            nlapiLogExecution('debug', 'Record Loaded. ID #' + id);
            if (!eo.js.isNull(rec)) {
                return rec;
            }
        } catch (e) {
            nlapiLogExecution('ERROR', 'LOAD_RECORD_ERROR', e);
            throw nlapiCreateError('LOAD_RECORD_ERROR', e);
        }
    },
    /**
     * Sends an email using the built-in NS feature
     * @param {String} str, {String} name, {String} type, {String} ext, {String} folder, {String} encoding
     * @return null
     * @author elean.olguin@gmail.com
     */
    sendEmail : function(obj) {
        //Verify if email is to be sent to a group
        var recc = '';
        var recipient = '';
        var cc = '';
        if (obj.hasOwnProperty('GROUP')) {
            var emailResults = nlapiSearchRecord('entitygroup', null, new nlobjSearchFilter('internalid', null, 'is', obj.GROUP), new nlobjSearchColumn('email', 'groupmember'));
            var recipients = [];
            for (var int = 0; int < emailResults.length; int++) {
                recipients[int] = emailResults[int].getValue('email', 'groupmember');
                if (recipients[int] != null || recipients[int] != '') {
                    recipients[int] = recipients[int].toString();
                }
            }
            recc = recipients.toString();
        } else {
            recc = obj.RECIPIENT;
        }
        try {
            nlapiSendEmail(obj.AUTHOR, recc, obj.SUBJECT, obj.BODY, (obj.hasOwnProperty('CC') ? obj.CC : null), null, (obj.hasOwnProperty('RECORDS') ? obj.RECORDS : null), (obj.hasOwnProperty('ATTACH') ? obj.ATTACH : null), (obj.hasOwnProperty('NOTIFY_SENDER_ON_BOUNCE') ? obj.NOTIFY_SENDER_ON_BOUNCE : false), (obj.hasOwnProperty('INTERNAL_ONLY') ? obj.INTERNAL_ONLY : false));
            emailSent = true;
        } catch(e) {
            nlapiLogExecution('ERROR', 'EMAIL_ERROR', 'Could not send email. See error details.' + e);
        }
    },
    /**
     * Saves a file into the file cabinet
     * @param {String} str, {String} name, {String} type, {String} ext, {String} folder, {String} encoding
     * @return null
     * @author elean.olguin@gmail.com
     */
    saveFile : function(str, name, type, ext, folder, encoding) {
        var id = null;
        try {
            var file = nlapiCreateFile((name + ext), type, str);
            file.setFolder(folder);
            if ( typeof encoding != 'undefined' && encoding != null) {
                file.setEncoding(encoding);
            }
            id = nlapiSubmitFile(file);
            nlapiLogExecution('debug', 'File Submitted. ID #' + id);
        } catch (e) {
            nlapiLogExecution('ERROR', 'SAVE_FILE_ERROR', e);
        }
        return id;
    },
    /**
     * Saves a file into the file cabinet and returns it
     * @param {String} str, {String} name, {String} type, {String} ext, {String} folder
     * @return null
     * @author elean.olguin@gmail.com
     */
    saveAndGetFile : function(str, name, type, ext, folder) {
        var file = null;
        try {
            file = nlapiCreateFile((name + ext), type, str);
            file.setFolder(folder);
            var i = nlapiSubmitFile(file);
            nlapiLogExecution('debug', 'File Submitted. ID #' + i);
        } catch (e) {
            nlapiLogExecution('ERROR', 'SAVE_FILE_ERROR', e);
        }
        return file;
    },
    /**
     * Saves a file into the file cabinet and returns the internal id
     * @param {String} str, {String} name, {String} type, {String} ext, {String} folder
     * @return null
     * @author elean.olguin@gmail.com
     */
    saveAndGetFileId : function(str, name, type, ext, folder) {
        var file = null;
        var fileId = null;
        try {
            file = nlapiCreateFile((name + ext), type, str);
            file.setFolder(folder);
            fileId = nlapiSubmitFile(file);
            nlapiLogExecution('debug', 'File Submitted. ID #' + fileId);
        } catch (e) {
            nlapiLogExecution('ERROR', 'SAVE_FILE_ERROR', e);
        }
        return fileId;
    },
    /**
     * Loads an nlobjFile object
     * @param {String} id
     * @return null
     * @author elean.olguin@gmail.com
     */
    loadFile : function(id) {
        var f = null;
        try {
            f = nlapiLoadFile(id);
            if (!eo.js.isNull(f)) {
                return f;
            }
        } catch (e) {
            nlapiLogExecution('ERROR', 'LOAD_FILE_ERROR', 'File # ' + id);
            throw nlapiCreateError('LOAD_FILE_ERROR', e);
        }
    },
    getTranSearchResults : function(type, filters, columns) {
        var pageMax = 0;
        var stopper = 10;
        var srResults = [];
        // Prevents infinite loops, and provides headroom for 10,000 results.
        filters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', pageMax));
        do {
            // Execute Search
            var results = nlapiSearchRecord('transaction', null, filters.concat(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', pageMax)), columns);
            // Check for results
            if (results != null) {
                // Get the internalId of the last element in previus search
                pageMax = parseInt(results[results.length - 1].getId());
                // Merge the results array with previous results
                srResults = srResults.concat(results);
                // Decrease stop counter
                stopper--;
            }
        } while (results != null && stopper);
        return srResults;
    },
    /**
     * Retrieves ALL search results from a saved search
     * Returns an Array of nlobjSearchResults
     * @param {String} type, {nlobjFilters} filters, {nlobjSearchColumns} columns
     * @return {Object} nlobjSearchResults
     */
    getSearchResults : function(type, filters, columns) {
        var results = [];
        if (type != null && type != '' && typeof type !== 'undefined') {
            var searchObject = nlapiCreateSearch(type, filters, columns);
            var searchResultsSets = searchObject.runSearch();
            var allResultsFound = false;
            var resultsSetsCounter = 0;
            while (!allResultsFound) {
                var resultsSet = searchResultsSets.getResults(resultsSetsCounter * NS_MAX_SEARCH_RESULT, NS_MAX_SEARCH_RESULT + NS_MAX_SEARCH_RESULT * resultsSetsCounter);
                if (resultsSet == null || resultsSet == '') {
                    allResultsFound = true;
                } else {
                    if (resultsSet.length < NS_MAX_SEARCH_RESULT) {
                        results = results.concat(resultsSet);
                        allResultsFound = true;
                    } else {
                        results = results.concat(resultsSet);
                        resultsSetsCounter++;
                    }
                }
            }
        } else {
            throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'Missing a required argument : type');
        }
        return results;
    },
    /**
     * Retrieves ALL search results from a saved search
     * Returns an Array of nlobjSearchResults
     * @param {String} type, {nlobjFilters} filters, {nlobjSearchColumns} columns
     * @return {Object} nlobjSearchResults
     */
    getSearchResultsFromId : function(type, id, srchObj) {
        var results = [];
        var searchObject = null;
        if ( typeof srchObj != 'undefined' && srchObj != null) {
            searchObject = srchObj;
        } else if ( typeof srchObj == 'undefined' && type != null && type != '' && id != null && id != '') {
            searchObject = nlapiLoadSearch(type, id);
        } else {
            throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'Missing a required argument : type');
        }
        var searchResultsSets = searchObject.runSearch();
        var allResultsFound = false;
        var resultsSetsCounter = 0;
        while (!allResultsFound) {
            var resultsSet = searchResultsSets.getResults(resultsSetsCounter * NS_MAX_SEARCH_RESULT, NS_MAX_SEARCH_RESULT + NS_MAX_SEARCH_RESULT * resultsSetsCounter);
            if (resultsSet == null || resultsSet == '') {
                allResultsFound = true;
            } else {
                if (resultsSet.length < NS_MAX_SEARCH_RESULT) {
                    results = results.concat(resultsSet);
                    allResultsFound = true;
                } else {
                    results = results.concat(resultsSet);
                    resultsSetsCounter++;
                }
            }
        }

        return results;
    },
    /**
     * Returns a formatted object array containing all nlobjSearchResults
     * Update : Retrieve all columns from an nlobjSearchResult and extract
     * the values by matching the label with the custom column object.
     * @param {nlobjSearchResult} searchResults, {Object} columns, {Boolean}
     * @return {Object} searchResults
     * @author : elean.olguin@gmail.com
     */
    getSearchResultArray : function(searchResults, columns, setId) {
        var searchResultArray = [];
        if (searchResults.length > 0) {
            var cols = searchResults[0].getAllColumns();
            if (cols != null) {
                for (var k = 0; k < searchResults.length; k++) {
                    searchResultArray[k] = {};
                    if ( typeof setId != 'undefined') {
                        searchResultArray[k].internalid = searchResults[k].getId();
                    }
                    for (var m = 0; m < cols.length; m++) {
                        var colLabel = cols[m].getLabel();
                        if (columns.hasOwnProperty(colLabel)) {
                            searchResultArray[k][colLabel] = searchResults[k].getValue(cols[m]);
                            if (cols[m].getSummary() == "SUM" && !isFinite(parseFloat(searchResultArray[k][colLabel]))) {
                                searchResultArray[k][colLabel] = 0;
                            }
                        }
                    }
                }
            }
        }
        return searchResultArray;
    }
};
/**
 * Data parsing and object manipulation javascript functions.
 * @author: elean.olguin@gmail.com
 */
eo.js = {
    /**
     * Formats dollar amounts
     * @author : elean.olguin@gmail.com
     * @param : {String} val
     * @return : {String} val
     */
    isVal : function(val) {
        return ( typeof val == 'undefined') || (val == null) || (val == '') || (val == 'null') ? false : true;
    },
    /**
     * Formats dollar amounts
     * @author : elean.olguin@gmail.com
     * @param : {String} val
     * @return : {String} val
     */
    isNumber : function(val) {
        return !isNaN(parseFloat(val)) ? true : false;
    },
    /**
     * Formats dollar amounts
     * @author : elean.olguin@gmail.com
     * @param : {String} val
     * @return : {String} val
     */
    toDollarCurrency : function(val) {
        var valStr = String(val);
        if (valStr.indexOf('%') != -1) {
            return val;
        } else {
            if (eo.js.isNumber(val) && typeof ceil != 'undefined') {
                if (ceil) {
                    val = eo.js.toFixed(val, 1);
                }
            }
            val = !isNaN(parseFloat(val)) ? parseFloat(val) : 0;
            return val < 0 ? '-$' + nlapiFormatCurrency(Math.abs(val)) : '$' + nlapiFormatCurrency(Math.abs(val));
        }
    },
    /**
     * Formats percentage amounts
     * @author : elean.olguin@gmail.com
     * @param : {Float} number, {Float} precision
     * @return : {String} val
     */
    toFixed : function(number, precision) {
        var multiplier = Math.pow(10, precision + 1), wholeNumber = Math.floor(number * multiplier);
        return Math.round(wholeNumber / 10) * 10 / multiplier;
    },
    /**
     * Formats percentage amounts
     * @author : elean.olguin@gmail.com
     * @param : {Float} top, {Float} btm
     * @return : {String} val
     */
    toPercent : function(top, btm) {
        top = !eo.js.isNumber(top) ? 0 : parseFloat(top);
        btm = !eo.js.isNumber(btm) ? 0 : parseFloat(btm);

        if (top == 0 || btm == 0) {
            return '0%';
        } else {
            var div = top / btm;
            return (div * 100).toFixed(2) + '%';
        }
    },
    /**
     * Returns a system date time stamp
     * @author : elean.olguin@gmail.com
     * @param : null
     * @return : {String} sysdate
     */
    getSysDate : function() {
        var now = new Date();
        var year = "" + now.getFullYear();
        var month = "" + (now.getMonth() + 1);
        if (month.length == 1) {
            month = "0" + month;
        }
        var day = "" + now.getDate();
        if (day.length == 1) {
            day = "0" + day;
        }
        return year + month + day;
    },
    /**
     * Returns a system  time stamp
     * @author : elean.olguin@gmail.com
     * @param : null
     * @return : {String} sysdate
     */
    getSysDateWithTimeStamp : function() {
        var time = new Date();
        var now = new Date();
        var year = "" + now.getFullYear();
        var month = "" + (now.getMonth() + 1);
        if (month.length == 1) {
            month = "0" + month;
        }
        var day = "" + now.getDate();
        if (day.length == 1) {
            day = "0" + day;
        }
        return year + '/' + month + '/' + day + ' ' + time.getHours().toString() + ':' + time.getMinutes().toString() + ' ' + this.calculate_time_zone();
    },
    /**
     * Calculates the UTC Time Zone format '(GMT+/-hh:mm)'.
     * @author ibudimir@fmtconsultants.com
     * @returns {string} convertedTime
     */
    calculate_time_zone : function() {
        var rightNow = new Date();
        var jan1 = new Date(rightNow.getFullYear(), 0, 1, 0, 0, 0, 0);
        // jan 1st
        var june1 = new Date(rightNow.getFullYear(), 6, 1, 0, 0, 0, 0);
        // june 1st
        var temp = jan1.toGMTString();
        var jan2 = new Date(temp.substring(0, temp.lastIndexOf(" ") - 1));
        temp = june1.toGMTString();
        var june2 = new Date(temp.substring(0, temp.lastIndexOf(" ") - 1));
        var std_time_offset = (jan1 - jan2) / (1000 * 60 * 60);
        var daylight_time_offset = (june1 - june2) / (1000 * 60 * 60);
        var dst;
        if (std_time_offset == daylight_time_offset) {
            dst = "0";
        } else {
            var hemisphere = std_time_offset - daylight_time_offset;
            if (hemisphere >= 0)
                std_time_offset = daylight_time_offset;
            dst = "1";
        }
        var i;

        var convertedTime = this.convert_date_smitcky(std_time_offset);
        return convertedTime;
    },
    /**
     * Accepts the time zone offset integer passed by 'calculate_time_zone' transforms the integer into
     * a string. Returns the string, format '(GMT+/-hh:mm)'.
     * @author ibudimir@fmtconsultants.com
     * @param {integer} value
     * @returns {String} timeZoneValue
     */
    convert_date_smitcky : function(value) {
        var hours = parseInt(value);
        value -= parseInt(value);
        value *= 60;
        var mins = parseInt(value);
        value -= parseInt(value);
        value *= 60;
        var secs = parseInt(value);
        var display_hours = hours;
        if (hours == 0) {
            display_hours = "00";
        } else if (hours > 0) {
            display_hours = (hours < 10) ? "+0" + hours : "+" + hours;
        } else {
            display_hours = (hours > -10) ? "-0" + Math.abs(hours) : hours;
        }
        mins = +(mins < 10) ? "0" + mins + ")" : mins + ")";
        var gmt_val = "(GMT";
        var timeZoneValue = gmt_val + parseInt(display_hours, 10) + ":" + mins;
        return timeZoneValue;
    },
    /**
     * Returns a formatted system  time stamp
     * @author : elean.olguin@gmail.com
     * @param : null
     * @return : {String} sysdate
     */
    getFormattedSysDateWithTimeStamp : function() {
        var time = new Date();
        var now = new Date();
        var year = "" + now.getFullYear();
        var month = "" + (now.getMonth() + 1);
        if (month.length == 1) {
            month = "0" + month;
        }
        var day = "" + now.getDate();
        if (day.length == 1) {
            day = "0" + day;
        }
        return year + '/' + month + '/' + day + ' at ' + time.getHours().toString() + ':' + time.getMinutes().toString();
    },
    /**
     * Returns a system time stamp
     * @author : elean.olguin@gmail.com
     * @param : null
     * @return : {String} sysdate
     */
    getSysTime : function() {
        var time = new Date();
        return time.getHours().toString() + time.getMinutes().toString();
    },
    /**
     * Returns a system  time stamp in military time format
     * @author : elean.olguin@gmail.com
     * @param : null
     * @return : {String} sysdate
     */
    dateToMilitaryWithTime : function() {
        var d = new Date();
        var hours = d.getHours();
        var min = d.getMinutes();
        hours = parseInt(hours) < 10 ? '0' + hours : hours;
        min = parseInt(min) < 10 ? '0' + min : min;
        var yyyy = d.getFullYear();
        var mm = d.getMonth() + 1;
        var dd = d.getDate();
        var date = (10000 * yyyy + 100 * mm + dd).toString();
        return date.toString() + hours.toString() + min.toString();
    },
    /**
     * Returns an Object from an Array
     * @param {Object} object
     * @return {Object} arrayToReturn
     * @author elean.olguin@gmail.com
     */
    getArrayFromObject : function(object) {
        var arrayToReturn = [];
        for (var property in object) {
            if (object.hasOwnProperty(property)) {
                arrayToReturn.push(object[property]);
            }
        }
        return arrayToReturn;
    },
    /**
     * Pads a string
     * @author : elean.olguin@gmail.com
     * @param : {String} str, {Float} max
     * @return : {String} str
     */
    pad : function(str, max) {
        str = str.toString();
        return str.length < max ? this.pad("0" + str, max) : str;
    },
    /**
     * Pads a number, if a negative value is found, - is counted
     * as a zero space
     * @author : elean.olguin@gmail.com
     * @param : {String} str, {Float} max
     * @return : {String} str
     */
    padInt : function(str, max) {
        var pad = '';
        var no = parseFloat(str);
        if (!isNaN(no)) {
            if (no <= 0) {
                no = Math.abs(no);
                str = no.toString();
                pad = '-' + this.pad("0" + str, max - 1);
            } else {
                str = str.toString();
                pad = this.pad(str, max);
            }
            return pad;
        }
    },
    /**
     * @author : elean.olguin@gmail.com
     * @param : {String} v
     * @return :{Boolean} T/F
     */
    isNull : function(v) {
        return (v == null && v == '') ? true : false;
    },
    /**
     * Parses a null value into an empty string
     * @author : elean.olguin@gmail.com
     * @param : {String} val
     * @return : {String} val
     */
    parseNull : function(val) {
        return (val == null || val == '' || val == 'null') ? '' : val;
    },
    /**
     * @author : elean.olguin@gmail.com
     * @param : {String} v
     * @return :{Boolean} T/F
     */
    isEmpty : function(v) {
        return (v == null || v == '') ? true : false;
    },
    /**
     * Return true/false if value is found
     * @author : elean.olguin@gmail.com
     * @param : {String} a, {String} v
     * @return : {Boolean} t/f
     */
    inIndex : function(a, v) {
        return (this.isNull(a)) ? false : (a.indexOf(v) != -1) ? true : false;
    },
    /**
     * Finds and returns a conditional array of values
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} id, {Object} value
     * @return : {Object} array
     */
    getArrayWithout : function(arr, key, id, value) {
        var array = [];
        for (var k = 0; k < arr.length; k++) {
            if (arr[k].hasOwnProperty(id)) {
                if (arr[k][id] != value) {
                    array.push(arr[k][key]);
                }
            }
        }
        return array;
    },
    /**
     * Returns an array of object ids
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} id, {Object} value
     * @return : {Object} array
     */
    getArrayOfObjectIds : function(arr) {
        var array = [];
        for (var id in arr) {
            if (arr.hasOwnProperty(id)) {
                array.push(id);
            }
        }
        return array;
    },
    /**
     * Extracts an id from an array of objects
     * and returns a single array of that id
     * @author : elean.olguin@gmail.com
     * @param : {Object} objArr, {String} idToGet
     * @return : {Object} arr
     */
    getArrayFromObjArray : function(objArr, idToGet) {
        var arr = [];
        for (var k = 0; k < objArr.length; k++) {
            if (objArr[k].hasOwnProperty(idToGet)) {
                arr.push(objArr[k][idToGet]);
            }
        }
        return arr;
    },
    /**
     * Returns an object that matches the value specified
     * @author : elean.olguin@gmail.com
     * @param : {Object} a, {String} id, {String} v
     * @return :{Object}/Null
     */
    findObj : function(a, id, v) {
        for (var k = 0; k < a.length; k++) {
            if (a[k].hasOwnProperty(id)) {
                if (a[k][id] == v) {
                    return a[k];
                }
            }
        }
        return null;
    },
    /**
     * Returns an object that matches the value specified
     * uses js search function to find the closest match
     * @author : elean.olguin@gmail.com
     * @param : {Object} a, {String} id, {String} v
     * @return :{Object}/Null
     */
    objContains : function(a, id, v) {
        for (var k = 0; k < a.length; k++) {
            if (a[k].hasOwnProperty(id) && v != null && typeof v != 'undefined') {
                var toSrch = v.search(a[k][id]);
                if (toSrch != -1) {
                    return a[k];
                } else {
                    v = (String(v).toLowerCase()).replace(/\s/g, '', '');
                    toSrch = v.search(String(a[k][id]).toLowerCase().replace(/\s/g, '', ''));
                    if (toSrch != -1) {
                        return a[k];
                    } else {
                        v = (String(v).toLowerCase()).replace(/\s/g, '', '').replace(/\[\d+\]/g, '');
                        toSrch = v.search(String(a[k][id]).toLowerCase().replace(/\s/g, '', '').replace(/[0-9]/g, ''));
                        if (toSrch != -1) {
                            return a[k];
                        } else {
                            v = (String(v).toLowerCase()).replace(/\s/g, '', '').replace(/[\W_]+/g, '');
                            toSrch = v.search(String(a[k][id]).toLowerCase().replace(/\s/g, '', '').replace(/[\W_]+/g, ''));
                            // v = (String(v).toLowerCase()).replace(/\s/g, '', '').replace(/\[\d+\]/g, '').replace(/[\W_]+/g, '');
                            //  toSrch = v.search(String(a[k][id]).toLowerCase().replace(/\s/g, '', '').replace(/[0-9]/g, '').replace(/[\W_]+/g, ''));
                            if (toSrch != -1) {
                                return a[k];
                            } else {
                                continue;
                            }
                        }
                    }
                }
            }
        }
    },
    /**
     * Loops through an array and verifies if all values
     * are not empty
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr
     * @return :{Boolean} notNull
     */
    arrayHasValues : function(arr) {
        var notNull = false;
        if ( typeof arr == 'undefined' || arr == null || arr.length <= 0) {
            return false;
        }
        for (var k = 0; k < arr.length; k++) {
            if (!eo.js.isEmpty(arr[k])) {
                if (/\S/.test(String(arr[k]))) {
                    notNull = true;
                }
            }
        }
        return notNull;
    },
    /**
     * Returns an object that matches the value specified
     * @author : elean.olguin@gmail.com
     * @param : {Object} a, {String} id, {String} v
     * @return :{Object}/Null
     */
    findObjIndex : function(a, id, v) {
        for (var k = 0; k < a.length; k++) {
            if (a[k].hasOwnProperty(id)) {
                if (a[k][id] == v) {
                    return k;
                }
            }
        }
        return -1;
    },
    /**
     * Finds and returns an array of values
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} id, {Object} value
     * @return : {Object} array
     */
    findArray : function(arr, id, value) {
        var array = [];
        for (var k = 0; k < arr.length; k++) {
            if (arr[k].hasOwnProperty(id)) {
                if (arr[k][id] == value) {
                    array.push(arr[k]);
                }
            }
        }
        return array;
    },
    /**
     * Finds and returns an array index
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} id, {Object} value
     * @return : {Object} array
     */
    findMatchIndex : function(a, id, v, id2, v2) {
        for (var k = 0; k < a.length; k++) {
            if (a[k].hasOwnProperty(id) && a[k].hasOwnProperty(id2)) {
                if (a[k][id] == v && a[k][id2] == v2) {
                    return k;
                }
            }
        }
        return -1;
    },
    /**
     * Append Object 1 (obj - Parameter 1) properties
     * into Object 2 (obj2 - Parameter 2).
     * @author : elean.olguin@gmail.com
     * @param : {Object} obj, {Object} obj2
     * @return : null
     **/
    appendProperties : function(obj, obj2) {
        for (var id in obj) {
            if (!obj2.hasOwnProperty(id)) {
                obj2[id] = obj[id];
            }
        }
    },
    /**
     * Based on array.prototype insert
     * Inserts an element into an array position
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} index, {Object} item
     * @return : {Object} array
     */
    arrayInsert : function(arr, index, item) {
        arr.splice(index, 0, item);
    },
    /**
     * Finds and returns an array of values
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} id, {Object} value
     * @return : {Object} array
     */
    sumArrayBySign : function(arr, id, sign) {
        var ts = 0;
        for (var k = 0; k < arr.length; k++) {
            if (arr[k].hasOwnProperty(id)) {
                var val = parseFloat(arr[k][id]);
                if (sign == '+') {
                    if (val >= 0) {
                        ts += isNaN(val) ? 0 : val;
                    }
                } else if (sign == '-') {
                    if (val < 0) {
                        ts += isNaN(val) ? 0 : val;
                    }
                }
            }
        }
        return ts;
    },
    /**
     * Finds and returns an array of values
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} id, {String} sign, {String} match
     * @return : {Object} array
     */
    countArrayBySign : function(arr, id, sign) {
        var count = 0;
        for (var k = 0; k < arr.length; k++) {
            if (arr[k].hasOwnProperty(id)) {
                var val = parseFloat(arr[k][id]);
                if (sign == '+') {
                    if (val >= 0) {
                        count += 1;
                    }
                } else if (sign == '-') {
                    if (val < 0) {
                        count += 1;
                    }
                }
            }
        }
        return count;
    },
    /**
     *Performs a sum of an array of objects
     * @author : elean.olguin@gmail.com
     * @param : {Object} arr, {String} groupId, {String} idToSum
     * @return : {Object} ts
     */
    getConditionalArraySum : function(arr, groupId, idToSum) {
        var ts = 0;
        for (var k = 0; k < arr.length; k++) {
            if (arr[k].hasOwnProperty(groupId)) {
                if (arr[k][groupId] == idToSum) {
                    var val = parseFloat(arr[k][idToSum]);
                    ts += isNaN(val) ? 0 : val;
                }
            }
        }
        return ts;
    },
    /**
     *Returns an array of unique objects
     * @author : elean.olguin@gmail.com
     * @param :{Object} arr, {String} id
     * @return : {Object} u
     */
    getUniqueArray : function(arr, id) {
        var r = [];
        var object = {};
        var u = [];
        for (var k = 0, arrayLen = arr.length; k < arrayLen; k++) {
            if (arr[k].hasOwnProperty(id)) {
                r.push(arr[k][id]);
            }
        }
        //Filter for unique values and return the unique array
        for (var i = 0, remain = r.length; i < remain; ++i) {
            if (r[i] in object) {
                continue;
            }
            u.push(r[i]);
            object[r[i]] = 1;
        }
        return u;
    },
    /**
     * Turns every element of an array into an array
     * and returns a single array as a result
     * @author : elean.olguin@gmail.com
     * @param :{Object} arr
     * @return : {Object} res
     */
    arrayToArray : function(arr) {
        var res = [];
        for (var k = 0; k < arr.length; k++) {
            res.push([arr[k]]);
        }
        return res;
    },
    /**
     * Sums an Array of objects
     * @author : elean.olguin@gmail.com
     * @param :{Object} arr, {String} id
     * @return : {Object} u
     */
    sumArray : function(a, v) {
        var t = 0;
        for (var k = 0; k < a.length; k++) {
            if (a[k].hasOwnProperty(v)) {
                if (String(a[k][v]).indexOf('$') != -1) {
                    t += isNaN(parseFloat(a[k][v].replace('$', ''))) ? 0 : parseFloat(a[k][v].replace('$', ''));
                } else {
                    t += isNaN(parseFloat(a[k][v])) ? 0 : parseFloat(a[k][v]);
                }
            }
        }
        return t;
    },
    /**
     * Original Author Bergi
     * Reference: http://stackoverflow.com/questions/11827781/values-between-range-in-javascript-array
     * Renamed function and removed Array.prototype dependencies
     * @author : Bergi
     * @param :{Object} arr, {Float} min, {Float} max
     * @return : {Object} range
     */
    findRange : function(arr, min, max) {
        if (min > max)
            return eo.js.findRange(arr, max, min);
        var l = 0, c = arr.length, r = c;
        // get first position of items in range (l == c)
        while (l < c) {
            var m = Math.floor(l + (c - l) / 2);
            if (arr[m] < min)
                l = m + 1;
            else
                c = m;
        }
        // get last position of items in range (c == r)
        while (c < r) {
            var m = Math.floor(c + (r - c) / 2);
            if (arr[m] > max)
                r = m;
            else
                c = m + 1;
        }
        // return the items in range
        return arr.slice(l, r);
    },
    /**
     * Original Author Bergi
     * Reference: http://stackoverflow.com/questions/11827781/values-between-range-in-javascript-array
     * Renamed function and removed Array.prototype dependencies and modified function slightly to
     * return an object instead of an array
     * @author : Bergi
     * @param :{Object} arr, {Float} min, {Float} max
     * @return : {Object} range
     */
    findRangeObj : function(arr, min, max) {
        var range = {
            min : null,
            max : null
        };
        if (min > max)
            return eo.js.findRange(arr, max, min);
        var l = 0, c = arr.length, r = c;
        // get first position of items in range (l == c)
        while (l < c) {
            var m = Math.floor(l + (c - l) / 2);
            if (arr[m] < min)
                l = m + 1;
            else
                c = m;
        }
        // get last position of items in range (c == r)
        while (c < r) {
            var m = Math.floor(c + (r - c) / 2);
            if (arr[m] > max)
                r = m;
            else
                c = m + 1;
        }
        var res = arr.slice(l, r);
        if (res.length == 2) {
            res = res.sort();
            range.min = res[0];
            range.max = res[1];
        }
        // return the items in range
        return range;
    },
    /**
     * Ungroups an array of values
     * @author : elean.olguin@gmail.com
     * @param :{Object} arr, {String} id
     * @return : {Object} u
     */
    ungroupArray : function(arr) {
        var array = [];
        for (var k = 0; k < arr.length; k++) {
            if (arr[k] != null && arr[k].hasOwnProperty('values')) {
                for (var m = 0; m < arr[k].values.length; m++) {
                    array.push(arr[k].values[m]);
                }
            }
        }
        return array;
    },
    /**
     * Function that groups by the elements of an array given a property as a parameter.
     * Deep copy of objects used. Please note that this solution is of polynomial time
     * @param: {String} property
     * @return: {Array} arrayToReturn
     * @author : riship89 / stackoverflow.com
     * @modified by: elean.olguin@gmail.com
     */
    groupArray : function(arr, property, secProperty, thirdProperty) {
        "use strict";
        //Function performs a copy of either an array or object
        function deepCopy(objectToCopy) {
            var copy = {};
            for (var i in objectToCopy) {
                if ( typeof objectToCopy[i] === 'object') {
                    //Set the constructor values depending on the type
                    copy[i] = (objectToCopy[i].constructor === Array) ? [] : {};
                    //Call function to perform a copy of the constructor
                    deepCopy(objectToCopy[i], copy[i]);
                } else {
                    copy[i] = objectToCopy[i];
                }
            }
            //Return copied object
            return copy;
        }

        //Create an empty array
        var arrayToReturn = [];
        var len = arr.length;
        for (var i = 0; i < len; i++) {
            var groupedlen = arrayToReturn.length;
            var found = false;
            //Loop through the "groupped" array and verify if the key/identifier is the same as an existing group
            for (var j = 0; j < groupedlen; j++) {
                //If the keys are equal, perform a copy of these and push them into the object with that key
                if (arr[i][property] === arrayToReturn[j].key) {
                    arrayToReturn[j].values.push(deepCopy(arr[i]));
                    found = true;
                    break;
                }
            }
            //IF the key/identifier wasnt found, then create a new object to hold these values
            if (found === false) {
                arrayToReturn.push({
                    key : arr[i][property],
                    altKey : arr[i][secProperty],
                    secKey : arr[i][thirdProperty],
                    values : []
                });
                arrayToReturn[arrayToReturn.length - 1].values.push(deepCopy(arr[i]));
            }
        }
        return arrayToReturn;
    }
};
/**
 * Date prototype to display short month days
 * @author : elean.olguin@gmail.com
 */
Date.prototype.getMonthNameShort = function(lang) {
    lang = lang && ( lang in Date.locale) ? lang : 'en';
    return Date.locale[lang].month_names_short[this.getMonth()];
};
/**
 * Date prototype to display day names
 * @author : elean.olguin@gmail.com
 */
Date.prototype.getDayName = function(lang) {
    lang = lang && ( lang in Date.locale) ? lang : 'en';
    return Date.locale[lang].day_names[this.getDay()];
};
/**
 * Date prototype to display short month days
 * @author : elean.olguin@gmail.com
 */
Date.locale = {
    en : {
        month_names_short : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
        day_names : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    }
};
/**
 * Date prototype to display day names
 * @author : http://www.jslab.dk/library/Date.getDaysInMonth
 */
Date.prototype.getDaysInMonth = function(utc) {
    var m = utc ? this.getUTCMonth() : this.getMonth();
    if (m == 1)
        return this.isLeapYear() ? 29 : 28;
    // If m % 2 == 0 then if m < 8 then 31 else 30
    // If m % 2 != 0 then if m > 6 then 31 else 30
    return m % 2 ? m > 6 ? 31 : 30 : m < 8 ? 31 : 30;

};
//Seal Object to prevent Extensions
Object.freeze(eo);
