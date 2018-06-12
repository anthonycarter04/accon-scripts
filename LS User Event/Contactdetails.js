var CONTACT_CATEGORY;
var EMAILTEMPLATE1;
var EMAILTEMPLATE2;
var FORM_STANDARD_SO;
var FORM_RMA_SO;
var SEND_EMAIL_EMPLOYEE;

var env = nlapiGetContext().getEnvironment();
var account = nlapiGetContext().getCompany();
Util.console.log(env, 'environment');
switch(env){
  case 'PRODUCTION':
  
		FORM_STANDARD_SO='101';
		FORM_RMA_SO='102';
		SEND_EMAIL_EMPLOYEE='92928';
		
		EMAILTEMPLATE1='3';
		EMAILTEMPLATE2='2';
		CONTACT_CATEGORY = '8';
		break;
		
	default:
		if(account.match(/_SB2/)){//uat sandbox 2
		
			FORM_STANDARD_SO='101';
			FORM_RMA_SO='102';
			SEND_EMAIL_EMPLOYEE='11';
			
			EMAILTEMPLATE1='3';
			EMAILTEMPLATE2='4';
			CONTACT_CATEGORY = '8'
		}
		else{
			
			FORM_STANDARD_SO='101';
			FORM_RMA_SO='102';
			SEND_EMAIL_EMPLOYEE='11';
			
			EMAILTEMPLATE1='3';
			EMAILTEMPLATE2='4';
			CONTACT_CATEGORY = '8'
		}
		break;
}

function afterSubmit_SearchContact(){ 
    var intSoId = nlapiGetRecordId();
	var salesOrder = nlapiLoadRecord('salesorder', intSoId);
	nlapiLogExecution('DEBUG','afterSubmit_SearchContact', 'SO internal Id : '+intSoId);
	var strCustomForm = nlapiGetFieldValue('customform');
	nlapiLogExecution('DEBUG','afterSubmit_SearchContact', 'Custom Form : '+strCustomForm);
	var strRegion = nlapiGetFieldValue('custbody14');
	nlapiLogExecution('DEBUG','afterSubmit_SearchContact', 'strRegion: '+strRegion);
    var cust_id = nlapiGetFieldValue('entity');
	nlapiLogExecution('DEBUG','afterSubmit_SearchContact', 'Customer internal Id : '+cust_id);
   // var objCustomer = nlapiLoadRecord('customer', cust_id);
	var EmailRecList = new Array();
	var filters = new Array();
	var columns = new Array();
	filters.push(new nlobjSearchFilter('internalid',null,'anyof',cust_id));    
    columns.push(new nlobjSearchColumn('email','contact'));
	columns.push(new nlobjSearchColumn('category','contact'));
	var contactemail = nlapiSearchRecord('customer', null, filters, columns);
	nlapiLogExecution('DEBUG', 'contactEmail length is', contactemail.length);
    for (i=1;i<contactemail.length;i++) {	
	var contactEmail = contactemail[i].getValue('email','contact');
	nlapiLogExecution('DEBUG', 'contactEmail is', i + ' ' +contactEmail);
	//EmailRecList.push(contactEmail);
	var contactCategory = contactemail[i].getValue('category','contact');
	nlapiLogExecution('DEBUG', 'contactCategory is', i + ' ' +contactCategory);
       if(contactCategory ==CONTACT_CATEGORY) {
         EmailRecList.push(contactEmail);
       }
    }
	if(strRegion){
	var senderEmailId = findNotificationEmail(strRegion);		
	nlapiLogExecution('DEBUG', 'senderEmailId is', senderEmailId);
	EmailRecList.push(senderEmailId);
	nlapiLogExecution('DEBUG', 'contactEmail List is', EmailRecList);
	}
    nlapiLogExecution('DEBUG', 'contactEmail List length is', EmailRecList.length);
	if(EmailRecList.length>=1) {
		if(strCustomForm == FORM_STANDARD_SO) {
			var emailTempId = EMAILTEMPLATE1; // internal id of the email template
		     var emailTemp = nlapiLoadRecord('emailtemplate',emailTempId); 
		     var emailSubj = emailTemp.getFieldValue('subject');
		     var emailBody = emailTemp.getFieldValue('content');
		     var records = new Object();
		     records['transaction'] = intSoId; //internal id of Transaction
			
			var renderer = nlapiCreateTemplateRenderer();
			renderer.addRecord('transaction', salesOrder );
			renderer.setTemplate(emailSubj);
			renderSubj = renderer.renderToString();
			renderer.setTemplate(emailBody);
			renderBody = renderer.renderToString();
			//var emailRec = ['sandeep.netsuite@gmail.com','sandeep-saxena@hotmail.com'];	
			nlapiSendEmail(SEND_EMAIL_EMPLOYEE, EmailRecList, renderSubj, renderBody , null, null, records);    
		}
		if(strCustomForm == FORM_RMA_SO) {
			 var emailTempId = EMAILTEMPLATE2; // internal id of the email template
		     var emailTemp = nlapiLoadRecord('emailtemplate',emailTempId); 
		     var emailSubj = emailTemp.getFieldValue('subject');
		     var emailBody = emailTemp.getFieldValue('content');
		     var records = new Object();
		     records['transaction'] = intSoId; //internal id of Transaction
			//var salesOrder = nlapiLoadRecord('salesorder', intSoId);
			var renderer = nlapiCreateTemplateRenderer();
			renderer.addRecord('transaction', salesOrder );
			renderer.setTemplate(emailSubj);
			renderSubj = renderer.renderToString();
			renderer.setTemplate(emailBody);
			renderBody = renderer.renderToString();
			//var emailRec = ['sandeep.netsuite@gmail.com','suyash.netsuite@gmail.com'];
			nlapiSendEmail(SEND_EMAIL_EMPLOYEE, EmailRecList, renderSubj, renderBody , null, null, records); 
		}  
  }	
}
//This function will look up to the Notification Look-Up record and filter by the Notification Region and Order Acknowledgement to get Notification Email.
function findNotificationEmail(strRegion){

	var filters = [new nlobjSearchFilter('custrecord_notification_region', null, 'is', strRegion),new nlobjSearchFilter('custrecord_order_ack', null, 'is', 'T')];
	var columns = [new nlobjSearchColumn('custrecord_notification_email')];
	var res = nlapiSearchRecord('customrecord_notification_lookup', null, filters, columns);

	var notificationEmail = res[0].getValue('custrecord_notification_email');	
	nlapiLogExecution('DEBUG', 'notificationEmail is'+notificationEmail);
	return notificationEmail;
}
