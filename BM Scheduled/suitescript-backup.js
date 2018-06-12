/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Oct 2014     anthony.carter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */


function execSearch(type) {
	
	var docName;
	var currDate;
	var folderId = '-15'; //
	
	
	var filters = [
					new nlobjSearchFilter( 'folder', null, 'anyof', folderId )
				];
	var columns = [
					new nlobjSearchColumn( 'internalid').setSort(true),
					new nlobjSearchColumn( 'name'),
					new nlobjSearchColumn( 'folder'),
					//new nlobjSearchColumn( 'type')
				];
	var currDate = getFullDate();
	var docSearchResults  = nlapiSearchRecord( 'file', 'customsearch_ss_backups', filters, columns );
	
	if (docSearchResults && docSearchResults[0] != '' ) {
		Util.console.log(docSearchResults[0]);
		
		for (var i=0;   i< docSearchResults.length; i++) {
			
			docName = docSearchResults[i].getValue('name');
			Util.console.log(docName, 'docName');
			folderName = docName;
			docNameDate = docName + '-' + currDate;
			
			
			var ssFolderId = findFolder(docName);
			Util.console.log(ssFolderId);
			
			if (!ssFolderId || ssFolderId == '') {
				ssFolderId = createFolder(docName);
			}
			
			var fileLoad = nlapiLoadFile(docSearchResults[i].getValue('internalid'));
			var ssFileType = fileLoad.getType();
			
			ssFileExt = fileTypes[ssFileType];
			var fileId = createFile(fileLoad, docNameDate, ssFolderId, ssFileType, ssFileExt);
			
			Util.console.log('File successfully created. File ID = ' + fileId);
			
			var usage = nlapiGetContext().getRemainingUsage();
			if (usage && usage < 500) {
				nlapiYieldScript();
				break;
			}
			
		} 
		
		
	}
	
}

function findFolder(name) {
	
	var backupFolder = nlapiGetContext().getSetting('SCRIPT', 'custscript_ss_backup_folder');
	
	var folderFilter = [
					new nlobjSearchFilter( 'name', null, 'is', name ),
					new nlobjSearchFilter( 'parent', null, 'anyof', backupFolder)
				];
	var folderColumn = [
					new nlobjSearchColumn( 'internalid').setSort(true),
					new nlobjSearchColumn( 'name'),
					//new nlobjSearchColumn( 'type')
				];
	
	var folderSearch = nlapiSearchRecord('folder', null, folderFilter, folderColumn);
	
	if (folderSearch && folderSearch[0] != '') {
		Util.console.log(folderSearch[0].getValue('internalid'));
		return folderSearch[0].getValue('internalid');
	} else {
		return '';
	}
	
}

function createFolder(folderName) {
	var backupFolder = nlapiGetContext().getSetting('SCRIPT', 'custscript_ss_backup_folder');
	var folder = nlapiCreateRecord('folder');
	folder.setFieldValue('name', folderName);
	folder.setFieldValue('parent', backupFolder);
	var folderId = nlapiSubmitRecord(folder);
	return folderId;
}

function createFile(fileLoad, docNameDate, folderId, ssFileType, ssFileExt) {
	
	var fileVal = fileLoad.getValue();
	Util.console.log(fileVal, 'file contents');
	Util.console.log(folderId, 'folderId');
	Util.console.log(docNameDate, 'docNameDate');
	
	if (fileVal && fileVal != '') {
		var theFile = nlapiCreateFile(docNameDate + ssFileExt,ssFileType , fileVal);
		theFile.setFolder(folderId);
		//Util.console.log(theFile, 'theFile');
		var fileId = nlapiSubmitFile(theFile);
		return fileId;
	}
	
}

function getFullDate() {
	
	var d = new Date();
	
	var yyyy = d.getFullYear().toString();
	var mm = d.getMonth() + 1;
	mm = mm.toString();
	var dd = d.getDate().toString();
	
	return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]); // padding
	
}

var fileTypes = {
		'AUTOCAD': '.dwg',
		'BMPIMAGE': '.bmp',
		'CSV': '.csv',
		'EXCEL': '.xls',
		'FLASH': '.swf',
		'GIFIMAGE': '.gif',
		'GZIP': '.gz',
		'HTMLDOC': '.htm',
		'ICON': '.ico',
		'JAVASCRIPT': '.js',
		'JPGIMAGE': '.jpg',
		'MESSAGERFC': '.eml',
		'MP3': '.mp3',
		'MPEGMOVIE': '.mpg',
		'MSPROJECT': '.mpp',
		'PDF': '.pdf',
		'PJPGIMAGE': '.pjpeg',
		'PLAINTEXT': '.txt',
		'PNGIMAGE': '.png',
		'POSTSCRIPT': '.ps',
		'POWERPOINT': '.ppt',
		'QUICKTIME': '.mov',
		'RTF': '.rtf',
		'SMS': '.sms',
		'STYLESHEET': '.css',
		'TIFFIMAGE': '.tiff',
		'VISIO': '.vsd',
		'WORD': '.doc',
		'XMLDOC': '.xml',
		'ZIP': '.zip',
};

