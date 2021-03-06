/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Apr 2018     anthonycarter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function updateRecWithCase(type) {
	for (key in caseTranUpdate) {
		
		var recId = key;
		var type = caseTranUpdate[key]['type'];
		var caseId = caseTranUpdate[key]['case'];
		
		Util.console.log(recId, 'recId');
		//Util.console.log(type, 'recId');
		//Util.console.log(caseId, 'recId');
		try {
			var recLoad = nlapiLoadRecord(type, recId);
			recLoad.setFieldValue('custbody_transaction_case', caseId);
			nlapiSubmitRecord(recLoad);
		} catch (e) {
			Util.console.log(e.message, 'Error Saving');
		}
		
		
	}
}

var caseTranUpdate = {
		/*10962815: { 'type': 'itemreceipt','case':886902}
		10961999: { 'type': 'itemreceipt','case':893802},
		10983630: { 'type': 'itemreceipt','case':903702},
		10968940: { 'type': 'itemreceipt','case':910502},
		10967625: { 'type': 'itemreceipt','case':911002},
		10983631: { 'type': 'itemreceipt','case':911302},
		10979364: { 'type': 'itemreceipt','case':912402},
		10962818: { 'type': 'itemreceipt','case':912802},
		10960999: { 'type': 'itemreceipt','case':913602},
		10961000: { 'type': 'itemreceipt','case':913603},
		10945283: { 'type': 'itemreceipt','case':915102},
		10945284: { 'type': 'itemreceipt','case':915603},
		10979365: { 'type': 'itemreceipt','case':916202},
		10951097: { 'type': 'itemreceipt','case':916302},
		10962816: { 'type': 'itemreceipt','case':916502},
		10967626: { 'type': 'itemreceipt','case':918402}
		10960899: { 'type': 'itemreceipt','case':919302},
		10981739: { 'type': 'itemreceipt','case':919502},
		10985859: { 'type': 'itemreceipt','case':919602},
		10938210: { 'type': 'itemreceipt','case':922502},
		10945593: { 'type': 'itemreceipt','case':922302},
		10961099: { 'type': 'itemreceipt','case':923202},
		10961100: { 'type': 'itemreceipt','case':923302},
		10950184: { 'type': 'itemreceipt','case':923402},
		10951098: { 'type': 'itemreceipt','case':924103},
		10947021: { 'type': 'itemreceipt','case':924502},
		10967627: { 'type': 'itemreceipt','case':924702},
		10956539: { 'type': 'itemreceipt','case':924703},
		10962819: { 'type': 'itemreceipt','case':924903},
		10945285: { 'type': 'itemreceipt','case':925002},
		10947022: { 'type': 'itemreceipt','case':925103},
		10945286: { 'type': 'itemreceipt','case':925003},
		10945594: { 'type': 'itemreceipt','case':925602},
		10962820: { 'type': 'itemreceipt','case':925702},
		10956540: { 'type': 'itemreceipt','case':926502},
		10979264: { 'type': 'itemreceipt','case':926602},
		10967628: { 'type': 'itemreceipt','case':926802},
		10969045: { 'type': 'itemreceipt','case':926902},
		10945595: { 'type': 'itemreceipt','case':927002},
		10956537: { 'type': 'itemreceipt','case':927202},
		10967629: { 'type': 'itemreceipt','case':927402},
		10956541: { 'type': 'itemreceipt','case':927504},
		10968633: { 'type': 'itemreceipt','case':927702},
		10956543: { 'type': 'itemreceipt','case':927705},
		10967927: { 'type': 'itemreceipt','case':927802},
		10962821: { 'type': 'itemreceipt','case':927803},
		10963627: { 'type': 'itemreceipt','case':928002},
		10962302: { 'type': 'itemreceipt','case':928003},
		10985259: { 'type': 'itemreceipt','case':927902},
		10945287: { 'type': 'itemreceipt','case':928502},
		10956538: { 'type': 'itemreceipt','case':928602},
		10951099: { 'type': 'itemreceipt','case':929002},
		10962817: { 'type': 'itemreceipt','case':929502},
		10983518: { 'type': 'itemreceipt','case':929202},
		10983632: { 'type': 'itemreceipt','case':929302},
		10962000: { 'type': 'itemreceipt','case':929602},
		10967825: { 'type': 'itemreceipt','case':930102},
		10962002: { 'type': 'itemreceipt','case':930402},
		10983633: { 'type': 'itemreceipt','case':931104},
		10965924: { 'type': 'itemreceipt','case':931202},
		10967928: { 'type': 'itemreceipt','case':931603},
		10983634: { 'type': 'itemreceipt','case':931902},
		10930533: { 'type': 'itemfulfillment','case':929802}
		10930535: { 'type': 'itemfulfillment','case':929902},
		10935410: { 'type': 'itemfulfillment','case':930002},
		10935810: { 'type': 'itemfulfillment','case':930102},
		10936810: { 'type': 'itemfulfillment','case':930402},
		10937010: { 'type': 'itemfulfillment','case':930303},
		10937310: { 'type': 'itemfulfillment','case':930502},
		10937312: { 'type': 'itemfulfillment','case':930503},
		10937314: { 'type': 'itemfulfillment','case':930202},
		10938113: { 'type': 'itemfulfillment','case':930603},
		10938611: { 'type': 'itemfulfillment','case':930802},
		10939145: { 'type': 'itemfulfillment','case':930902},
		10939440: { 'type': 'itemfulfillment','case':930903},
		10939442: { 'type': 'itemfulfillment','case':930905},
		10939645: { 'type': 'itemfulfillment','case':931002},
		10939650: { 'type': 'itemfulfillment','case':931102},
		10946516: { 'type': 'itemfulfillment','case':931103},
		10940483: { 'type': 'itemfulfillment','case':931104},
		10940485: { 'type': 'itemfulfillment','case':931105},
		10940487: { 'type': 'itemfulfillment','case':931106},
		10940489: { 'type': 'itemfulfillment','case':931107},
		10941085: { 'type': 'itemfulfillment','case':931202},
		10942117: { 'type': 'itemfulfillment','case':930302},
		10942119: { 'type': 'itemfulfillment','case':930702},
		10942123: { 'type': 'itemfulfillment','case':930904},
		10941814: { 'type': 'itemfulfillment','case':931108},
		10943973: { 'type': 'itemfulfillment','case':931302},
		10944273: { 'type': 'itemfulfillment','case':931402},
		10945713: { 'type': 'itemfulfillment','case':931502},
		10946310: { 'type': 'itemfulfillment','case':931602},
		10946920: { 'type': 'itemfulfillment','case':931702},
		10946922: { 'type': 'itemfulfillment','case':931603},
		10947224: { 'type': 'itemfulfillment','case':931802},
		10947624: { 'type': 'itemfulfillment','case':931803},
		10947627: { 'type': 'itemfulfillment','case':931902},
		10947632: { 'type': 'itemfulfillment','case':931903},
		10949888: { 'type': 'itemfulfillment','case':932002},
		10950585: { 'type': 'itemfulfillment','case':932102},
		10951602: { 'type': 'itemfulfillment','case':932202},
		10951604: { 'type': 'itemfulfillment','case':932203},
		10952654: { 'type': 'itemfulfillment','case':932302},
		10952960: { 'type': 'itemfulfillment','case':932402},
		10953262: { 'type': 'itemfulfillment','case':932403},
		10953468: { 'type': 'itemfulfillment','case':932502},
		10953470: { 'type': 'itemfulfillment','case':932503},
		10956323: { 'type': 'itemfulfillment','case':932602},
		10957346: { 'type': 'itemfulfillment','case':932702},
		10957350: { 'type': 'itemfulfillment','case':932703},
		10957352: { 'type': 'itemfulfillment','case':932802},
		10957612: { 'type': 'itemfulfillment','case':932704},
		10958669: { 'type': 'itemfulfillment','case':932902},
		10961300: { 'type': 'itemfulfillment','case':933002},
		10961600: { 'type': 'itemfulfillment','case':933102},
		10961800: { 'type': 'itemfulfillment','case':933202},
		10961802: { 'type': 'itemfulfillment','case':933203},
		10967128: { 'type': 'itemfulfillment','case':933302},
		10968426: { 'type': 'itemfulfillment','case':933502},
		10969869: { 'type': 'itemfulfillment','case':933602},
		10969671: { 'type': 'itemfulfillment','case':933603},
		10969771: { 'type': 'itemfulfillment','case':933604},
		10969773: { 'type': 'itemfulfillment','case':933605},
		10969775: { 'type': 'itemfulfillment','case':933606},
		10969777: { 'type': 'itemfulfillment','case':933607},
		10969779: { 'type': 'itemfulfillment','case':933608},
		10969877: { 'type': 'itemfulfillment','case':933702},
		10970278: { 'type': 'itemfulfillment','case':933803},
		10970411: { 'type': 'itemfulfillment','case':933902},
		10970418: { 'type': 'itemfulfillment','case':933904},
		10971206: { 'type': 'itemfulfillment','case':934002},
		10973968: { 'type': 'itemfulfillment','case':933402},
		10973970: { 'type': 'itemfulfillment','case':933802},
		10973972: { 'type': 'itemfulfillment','case':933703},
		10975269: { 'type': 'itemfulfillment','case':933903},
		10975271: { 'type': 'itemfulfillment','case':934003},
		10973834: { 'type': 'itemfulfillment','case':934102},
		10975171: { 'type': 'itemfulfillment','case':934202},
		10975273: { 'type': 'itemfulfillment','case':934204},
		10976194: { 'type': 'itemfulfillment','case':934303},
		10976192: { 'type': 'itemfulfillment','case':934402},
		10976196: { 'type': 'itemfulfillment','case':934503},
		10976198: { 'type': 'itemfulfillment','case':934504},
		10976200: { 'type': 'itemfulfillment','case':934505},
		10976202: { 'type': 'itemfulfillment','case':934602},
		10977201: { 'type': 'itemfulfillment','case':934302},
		10977405: { 'type': 'itemfulfillment','case':934502},
		10977606: { 'type': 'itemfulfillment','case':934702},
		10977608: { 'type': 'itemfulfillment','case':934203},
		10977610: { 'type': 'itemfulfillment','case':934703},
		10979765: { 'type': 'itemfulfillment','case':934803},
		10980267: { 'type': 'itemfulfillment','case':935002},
		10980796: { 'type': 'itemfulfillment','case':934802},
		10980799: { 'type': 'itemfulfillment','case':934902},
		10981008: { 'type': 'itemfulfillment','case':935102},
		10981738: { 'type': 'itemfulfillment','case':935202},
		10982043: { 'type': 'itemfulfillment','case':935302},
		10982041: { 'type': 'itemfulfillment','case':935203},
		10983101: { 'type': 'itemfulfillment','case':935402},
		10983731: { 'type': 'itemfulfillment','case':935502},
		10984253: { 'type': 'itemfulfillment','case':935602},
		10984251: { 'type': 'itemfulfillment','case':935702},
		10984255: { 'type': 'itemfulfillment','case':935802},
		10989664: { 'type': 'itemfulfillment','case':936102},
		10990491: { 'type': 'itemfulfillment','case':936202},
		10990595: { 'type': 'itemfulfillment','case':936203},
		10990903: { 'type': 'itemfulfillment','case':936204},
		10991008: { 'type': 'itemfulfillment','case':936002},
		10991410: { 'type': 'itemfulfillment','case':936302},
		10991412: { 'type': 'itemfulfillment','case':936303},
		10992317: { 'type': 'itemfulfillment','case':936402},*/
		//10939340: { 'type': 'assemblybuild','case':929802}
		10939341: { 'type': 'assemblybuild','case':929902},
		10936009: { 'type': 'assemblybuild','case':930002},
		10938310: { 'type': 'assemblybuild','case':930102},
		10937409: { 'type': 'assemblybuild','case':930402},
		10937410: { 'type': 'assemblybuild','case':930303},
		10937509: { 'type': 'assemblybuild','case':930502},
		10937510: { 'type': 'assemblybuild','case':930503},
		10938410: { 'type': 'assemblybuild','case':930202},
		10938717: { 'type': 'assemblybuild','case':930603},
		10939344: { 'type': 'assemblybuild','case':930802},
		10949792: { 'type': 'assemblybuild','case':930902},
		10944906: { 'type': 'assemblybuild','case':930903},
		10944907: { 'type': 'assemblybuild','case':930905},
		10944908: { 'type': 'assemblybuild','case':931002},
		10944909: { 'type': 'assemblybuild','case':931102},
		10940682: { 'type': 'assemblybuild','case':931104},
		10944910: { 'type': 'assemblybuild','case':931105},
		10949793: { 'type': 'assemblybuild','case':931106},
		10944911: { 'type': 'assemblybuild','case':931107},
		10942431: { 'type': 'assemblybuild','case':931202},
		10942218: { 'type': 'assemblybuild','case':930302},
		10942219: { 'type': 'assemblybuild','case':930702},
		10944915: { 'type': 'assemblybuild','case':930904},
		10944916: { 'type': 'assemblybuild','case':931108},
		10944917: { 'type': 'assemblybuild','case':931302},
		10949788: { 'type': 'assemblybuild','case':931402},
		10951400: { 'type': 'assemblybuild','case':931502},
		10951401: { 'type': 'assemblybuild','case':931602},
		10949794: { 'type': 'assemblybuild','case':931103},
		10951402: { 'type': 'assemblybuild','case':931702},
		10951403: { 'type': 'assemblybuild','case':931603},
		10949791: { 'type': 'assemblybuild','case':931802},
		10947629: { 'type': 'assemblybuild','case':931803},
		10947724: { 'type': 'assemblybuild','case':931902},
		10947725: { 'type': 'assemblybuild','case':931903},
		10955816: { 'type': 'assemblybuild','case':932002},
		10955817: { 'type': 'assemblybuild','case':932102},
		10956846: { 'type': 'assemblybuild','case':932202},
		10956847: { 'type': 'assemblybuild','case':932203},
		10955814: { 'type': 'assemblybuild','case':932302},
		10953161: { 'type': 'assemblybuild','case':932402},
		10956850: { 'type': 'assemblybuild','case':932403},
		10956852: { 'type': 'assemblybuild','case':932502},
		10955815: { 'type': 'assemblybuild','case':932503},
		10962611: { 'type': 'assemblybuild','case':932602},
		10962506: { 'type': 'assemblybuild','case':932702},
		10957951: { 'type': 'assemblybuild','case':932703},
		10962613: { 'type': 'assemblybuild','case':932802},
		10957954: { 'type': 'assemblybuild','case':932704},
		10958964: { 'type': 'assemblybuild','case':932902},
		10967925: { 'type': 'assemblybuild','case':933002},
		10967926: { 'type': 'assemblybuild','case':933102},
		10968025: { 'type': 'assemblybuild','case':933202},
		10967525: { 'type': 'assemblybuild','case':933203},
		10968026: { 'type': 'assemblybuild','case':933302},
		10979664: { 'type': 'assemblybuild','case':933502},
		10969874: { 'type': 'assemblybuild','case':933603},
		10975274: { 'type': 'assemblybuild','case':933602},
		10975275: { 'type': 'assemblybuild','case':933604},
		10975276: { 'type': 'assemblybuild','case':933605},
		10975277: { 'type': 'assemblybuild','case':933606},
		10975278: { 'type': 'assemblybuild','case':933607},
		10969875: { 'type': 'assemblybuild','case':933608},
		10975279: { 'type': 'assemblybuild','case':933702},
		10975280: { 'type': 'assemblybuild','case':933803},
		10970889: { 'type': 'assemblybuild','case':933902},
		10970419: { 'type': 'assemblybuild','case':933904},
		10971593: { 'type': 'assemblybuild','case':934002},
		10979665: { 'type': 'assemblybuild','case':934102},
		10975283: { 'type': 'assemblybuild','case':933402},
		10975284: { 'type': 'assemblybuild','case':933802},
		10975285: { 'type': 'assemblybuild','case':933703},
		10975286: { 'type': 'assemblybuild','case':933903},
		10975287: { 'type': 'assemblybuild','case':934003},
		10975394: { 'type': 'assemblybuild','case':934204},
		10981234: { 'type': 'assemblybuild','case':934202},
		10976692: { 'type': 'assemblybuild','case':934402},
		10976492: { 'type': 'assemblybuild','case':934303},
		10981235: { 'type': 'assemblybuild','case':934503},
		10981236: { 'type': 'assemblybuild','case':934504},
		10981237: { 'type': 'assemblybuild','case':934505},
		10980380: { 'type': 'assemblybuild','case':934602},
		10977304: { 'type': 'assemblybuild','case':934302},
		10980381: { 'type': 'assemblybuild','case':934502},
		10981238: { 'type': 'assemblybuild','case':934702},
		10977811: { 'type': 'assemblybuild','case':934203},
		10977912: { 'type': 'assemblybuild','case':934703},
		10981239: { 'type': 'assemblybuild','case':934803},
		10987787: { 'type': 'assemblybuild','case':935002},
		10987788: { 'type': 'assemblybuild','case':934802},
		10987789: { 'type': 'assemblybuild','case':934902},
		10980831: { 'type': 'assemblybuild','case':935102},
		10987794: { 'type': 'assemblybuild','case':935202},
		10982666: { 'type': 'assemblybuild','case':935203},
		10982668: { 'type': 'assemblybuild','case':935302},
		10983517: { 'type': 'assemblybuild','case':935402},
		10984042: { 'type': 'assemblybuild','case':935502},
		10986463: { 'type': 'assemblybuild','case':935702},
		10986770: { 'type': 'assemblybuild','case':935602},
		10986771: { 'type': 'assemblybuild','case':935802},
		10990802: { 'type': 'assemblybuild','case':936203},
		10991309: { 'type': 'assemblybuild','case':936204},
		10991617: { 'type': 'assemblybuild','case':936002}
}