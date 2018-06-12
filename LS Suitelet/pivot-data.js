/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Feb 2018     anthonycarter
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function pivotData(type) {

	
	var finalData = _.groupByMulti(data, ['type']);
	Util.console.log(finalData, 'finalData');
	
	
	
	var fileId = pdfGen(finalData);
	
}

var data = [
	{'type': 'Cloud Subscription', 'region': 'AMER', 'bookings': 1000, 'billings': 2000, 'target': 800},
	{'type': 'Cloud Subscription', 'region': 'APAC', 'bookings': 1500, 'billings': 800, 'target': 700},
	{'type': 'Cloud Subscription', 'region': 'EMEA', 'bookings': 2250, 'billings': 3210, 'target': 1250},
	{'type': 'Cloud Subscription', 'region': 'Other', 'bookings': 0, 'billings': '', 'target': ''},
	{'type': 'Cloud Other', 'region': 'AMER', 'bookings': 1000, 'billings': 2000, 'target': 800},
	{'type': 'Cloud Other', 'region': 'APAC', 'bookings': 1500, 'billings': 800, 'target': 700},
	{'type': 'Cloud Other', 'region': 'EMEA', 'bookings': 2250, 'billings': 3210, 'target': 1250},
	{'type': 'Cloud Other', 'region': 'Other', 'bookings': 0, 'billings': '', 'target': ''},
	{'type': 'Cloud Segment', 'region': 'AMER', 'bookings': 1000, 'billings': 2000, 'target': 800},
	{'type': 'Cloud Segment', 'region': 'APAC', 'bookings': 1500, 'billings': 800, 'target': 700},
	{'type': 'Cloud Segment', 'region': 'EMEA', 'bookings': 2250, 'billings': 3210, 'target': 1250},
	{'type': 'Cloud Segment', 'region': 'Other', 'bookings': 0, 'billings': '', 'target': ''},
	{'type': 'Legacy', 'region': 'AMER', 'bookings': 1000, 'billings': 2000, 'target': 800},
	{'type': 'Legacy', 'region': 'APAC', 'bookings': 1500, 'billings': 800, 'target': 700},
	{'type': 'Legacy', 'region': 'EMEA', 'bookings': 2250, 'billings': 3210, 'target': 1250},
	{'type': 'Legacy', 'region': 'Other', 'bookings': 0, 'billings': '', 'target': ''},
	{'type': 'Total Lifesize', 'region': 'AMER', 'bookings': 1000, 'billings': 2000, 'target': 800},
	{'type': 'Total Lifesize', 'region': 'APAC', 'bookings': 1500, 'billings': 800, 'target': 700},
	{'type': 'Total Lifesize', 'region': 'EMEA', 'bookings': 2250, 'billings': 3210, 'target': 1250},
	{'type': 'Total Lifesize', 'region': 'Other', 'bookings': 0, 'billings': '', 'target': ''}
];

_.groupByMulti = function (obj, values, context) {
    if (!values.length)
        return obj;
    var byFirst = _.groupBy(obj, values[0], context),
        rest = values.slice(1);
    for (var prop in byFirst) {
        byFirst[prop] = _.groupByMulti(byFirst[prop], rest, context);
    }
    return byFirst;
};

function pdfGen(finalData) {
	var pdf = nlapiCreateTemplateRenderer();
	var pdfstart = '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd"><pdf><head><style> table.itemtable{ font-family: sans-serif; font-size: 10pt; margin-top: 0px; table-layout: fixed; width: 100%; border-bottom: 1px solid #e6e6e6;} th { font-weight: bold; font-size: 11pt; vertical-align: middle; padding-right: 6px; padding-left: 6px; padding-bottom: 3px; padding-top: 5px; background-color: #e9f7d9; color: #000000;border:0 #e6e6e6; } td { padding-right: 6px; padding-left: 6px; padding-bottom: 4px; padding-top: 4px; } .itemtable td{border-left: 1px solid #e6e6e6} table.itemtable td:last-child{border-right:1px solid #e6e6e6;} b { font-weight: bold; color: #0c547b; } table.header td { padding: 0px; font-size: 10pt; } table.footer td { padding: 0px; font-size: 8pt; align: center; } table.itemtable th { padding-bottom: 10px; padding-top: 10px; } table.body td { padding-top: 2px; } table.total { page-break-inside: avoid; } tr.totalrow { background-color: #cfdde7; line-height: 200%; } td.totalboxtop { font-size: 12pt; background-color: #cfdde7; } td.addressheader { font-size: 8pt; padding-top: 6px; padding-bottom: 2px; } td.address { padding-top: 0px; } td.totalboxmid { font-size: 28pt; padding-top: 20px; background-color: #cfdde7; } td.totalboxbot { background-color: #cfdde7; font-weight: bold; } span.title { font-size: 28pt; } span.number { font-size: 16pt; } span.itemname { font-weight: bold; line-height: 150%; } hr { width: 100%; color: #d3d3d3; background-color: #d3d3d3; height: 1px; } .headtext{font-size: 14pt; padding-top:0px; font-family: Rockwell, Walbaum, Helvetica, sans-serif; line-height:80%;margin-bottom: 30px}</style></head><body>';
	var pdfbody = '<h2>Lifesize Sales Flash Report</h2><table style="margin-top:20px" class="itemtable"><thead><tr><th align="left" colspan="1">Category</th><th colspan="1">Region</th><th colspan="1" align="center">Bookings</th><th align="center" colspan="1">Billings</th><th align="center" colspan="1">Target</th></tr></thead>';
	var size;
	var rowNum;
	for (key in finalData) {
		
		Util.console.log(_.size(finalData[key]), 'Number of Objects');
		
		size = _.size(finalData[key]);
		Util.console.log(finalData[key], 'Key 1');
		rowNum = 1
		for (rock in finalData[key]) {
			
			if (rowNum ==1) {
				pdfbody += '<tr style="border-top: 1px solid #e6e6e6">';
				pdfbody += '<td align="left" colspan="1" rowspan="' + size + '">' + key + '</td>';
				pdfbody += '<td align="left" colspan="1">' + finalData[key][rock]['region'] + '</td>';
				pdfbody += '<td align="center" colspan="1">' + finalData[key][rock]['bookings'] + '</td>';
				
				pdfbody += '<td align="center" colspan="1">' + finalData[key][rock]['billings'] + '</td>';
				pdfbody += '<td align="center" colspan="1">' + finalData[key][rock]['target'] + '</td>';
				
				pdfbody += '</tr>';
			} else {
				pdfbody += '<tr>';
				//pdfbody += '<td align="left" colspan="1" rowspan="3">' + 'Cloud Subscription' + '</td>';
				pdfbody += '<td align="left" colspan="1">' + finalData[key][rock]['region'] + '</td>';
				pdfbody += '<td align="center" colspan="1">' + finalData[key][rock]['bookings'] + '</td>';
				
				pdfbody += '<td align="center" colspan="1">' + finalData[key][rock]['billings'] + '</td>';
				pdfbody += '<td align="center" colspan="1">' + finalData[key][rock]['target'] + '</td>';
				
				pdfbody += '</tr>';
			}
			Util.console.log(finalData[key][rock]['region']);
			
			
			rowNum+=1;
		}
		
	}
	
	
	/*
	pdfbody += '<tr>';
	pdfbody += '<td align="left" colspan="1" rowspan="3">' + 'Cloud Subscription' + '</td>';
	pdfbody += '<td align="left" colspan="1">' + 'AMER' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,100' + '</td>';
	
	pdfbody += '<td align="center" colspan="1">' + '1,200' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,000' + '</td>';
	
	pdfbody += '</tr>';
	
	pdfbody += '<tr>';
	//pdfbody += '<td align="left" colspan="1" rowspan="3">' + 'Cloud Subscription' + '</td>';
	pdfbody += '<td align="left" colspan="1">' + 'AMER' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,100' + '</td>';
	
	pdfbody += '<td align="center" colspan="1">' + '1,200' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,000' + '</td>';
	
	pdfbody += '</tr>';
	
	pdfbody += '<tr>';
	//pdfbody += '<td align="left" colspan="1" rowspan="3">' + 'Cloud Subscription' + '</td>';
	pdfbody += '<td align="left" colspan="1">' + 'AMER' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,100' + '</td>';
	
	pdfbody += '<td align="center" colspan="1">' + '1,200' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,000' + '</td>';
	
	pdfbody += '</tr>';
	
	//cloud other
	pdfbody += '<tr style="border-top: 1px solid #e6e6e6">';
	pdfbody += '<td align="left" colspan="1" rowspan="3">' + 'Cloud Other' + '</td>';
	pdfbody += '<td align="left" colspan="1">' + 'AMER' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,100' + '</td>';
	
	pdfbody += '<td align="center" colspan="1">' + '1,200' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,000' + '</td>';
	
	pdfbody += '</tr>';
	
	pdfbody += '<tr>';
	//pdfbody += '<td align="left" colspan="1" rowspan="3">' + 'Cloud Subscription' + '</td>';
	pdfbody += '<td align="left" colspan="1">' + 'AMER' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,100' + '</td>';
	
	pdfbody += '<td align="center" colspan="1">' + '1,200' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,000' + '</td>';
	
	pdfbody += '</tr>';
	
	pdfbody += '<tr>';
	//pdfbody += '<td align="left" colspan="1" rowspan="3">' + 'Cloud Subscription' + '</td>';
	pdfbody += '<td align="left" colspan="1">' + 'AMER' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,100' + '</td>';
	
	pdfbody += '<td align="center" colspan="1">' + '1,200' + '</td>';
	pdfbody += '<td align="center" colspan="1">' + '1,000' + '</td>';
	
	pdfbody += '</tr>';*/
	
	var pdfend = '</table></body></pdf>';
	
	var pdfFinal = pdfstart + pdfbody + pdfend;
	pdf.setTemplate(pdfFinal);
	var xml = pdf.renderToString();
	var file = nlapiXMLToPDF(xml);
	var newDate = new Date();
	var time = newDate.getMilliseconds();
	file.setName('flash-report-' + time + '.pdf');
	file.setFolder('1887645');
	
	file.setIsOnline(true);
	
	var fileId = nlapiSubmitFile(file);
	return fileId;

}

