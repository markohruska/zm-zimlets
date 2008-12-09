/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Zimbra Collaboration Suite Zimlets
 * Copyright (C) 2006, 2007 Zimbra, Inc.
 *
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 *
 * ***** END LICENSE BLOCK *****
 *@Author Raja Rao DV
 */


function com_zimbra_BirthdayReminder() {
}

com_zimbra_BirthdayReminder.prototype = new ZmZimletBase();
com_zimbra_BirthdayReminder.prototype.constructor = com_zimbra_BirthdayReminder;


com_zimbra_BirthdayReminder.CALENDAR_VIEW = "appointment";
com_zimbra_BirthdayReminder.birthdayFolder = 'Birthday Reminders';

com_zimbra_BirthdayReminder.prototype.init =
function() {
	this.bReminder_hasFolder = this.getUserProperty("bReminder_hasFolder") == "true";

	if (!this.bReminder_hasFolder)//run this only once(performance)
		this._initializeBirthdayFolder();

};

com_zimbra_BirthdayReminder.prototype.getBirthdayReminderFolderId =
function() {
	this._justCreatedCalendarFolder = false;
	var soapDoc = AjxSoapDoc.create("GetFolderRequest", "urn:zimbraMail");
	var command = new ZmCsfeCommand();
	var top = command.invoke({soapDoc: soapDoc}).Body.GetFolderResponse.folder[0];

	var folders = top.folder;
	if (folders) {
		for (var i = 0; i < folders.length; i++) {
			var f = folders[i];
			if (f && f.name == com_zimbra_BirthdayReminder.birthdayFolder && f.view == com_zimbra_BirthdayReminder.CALENDAR_VIEW) {
				this.BirthdayReminderFolderId = f.id;
				return;
			}
		}
	}

	//there is no such folder, so create one.
	this.createBirthdayFolder(top.id);
};

com_zimbra_BirthdayReminder.prototype.createBirthdayFolder =
function(parent) {
	var soapDoc = AjxSoapDoc.create("CreateFolderRequest", "urn:zimbraMail");
	var folderNode = soapDoc.set("folder");
	folderNode.setAttribute("name", com_zimbra_BirthdayReminder.birthdayFolder);
	folderNode.setAttribute("l", parent);
	folderNode.setAttribute("view", com_zimbra_BirthdayReminder.CALENDAR_VIEW);
	var command = new ZmCsfeCommand();
	var resp = command.invoke({soapDoc: soapDoc});
	var id = resp.Body.CreateFolderResponse.folder[0].id;
	if (!id) {
		throw new AjxException("Cannot create 'Birthday Reminder' Calendar folder ", AjxException.INTERNAL_ERROR, "createBirthdayFolder");
	}
	this.BirthdayReminderFolderId = id;

	soapDoc = AjxSoapDoc.create("FolderActionRequest", "urn:zimbraMail");
	var actionNode = soapDoc.set("action");
	actionNode.setAttribute("op", "color");
	actionNode.setAttribute("id", id);
	actionNode.setAttribute("color", "3");
	command = new ZmCsfeCommand();
	resp = command.invoke({soapDoc: soapDoc});
	this._justCreatedCalendarFolder = true;

};


com_zimbra_BirthdayReminder.prototype._create3Appts =
function(obj, currentCnt, total) {
	appCtxt.getAppController().setStatusMsg("Creating Reminder("+currentCnt+" out of "+total+")..", ZmStatusView.LEVEL_INFO);

	var chkbx = document.getElementById(obj.chkbx_id);
	if (!chkbx.checked)
		return;
	if (document.getElementById("breminder_onTheDayChk").checked) {
		this._createVariousAppts(obj, "ON_THE_DAY");
	}

	if (document.getElementById("breminder_daysChk").checked) {
		this._createVariousAppts(obj, "DAYS_BEFORE");
	}
	if (document.getElementById("breminder_weeksChk").checked) {
		this._createVariousAppts(obj, "WEEKS_BEFORE");
	}
};

com_zimbra_BirthdayReminder.prototype._createVariousAppts =
function(obj, apptType) {
	var tmparry = obj.b.split("-");
	var todayDate = new Date();
	var birthday = tmparry[1] + "/" + tmparry[2] + "/" + todayDate.getFullYear();
	var subject = "";
	var startDate = "";
	var email_name = "";
	if (obj.e == "") {
		email_name = obj.fn;
	} else if (obj.fn == "") {
		email_name = obj.e;
	} else {
		email_name = obj.fn + "("+ obj.e+")";
	}
	if (apptType == "ON_THE_DAY") {
		startDate = AjxDateUtil.simpleParseDateStr(birthday);
		subject = "Today is Birthday of " +email_name+"!";
	} else if (apptType == "DAYS_BEFORE") {
		var breminder_daysSlct = document.getElementById("breminder_daysSlct");
		var daysCnt = breminder_daysSlct.options[breminder_daysSlct.selectedIndex].text;
		daysCnt = parseInt(daysCnt);
		startDate = AjxDateUtil.simpleParseDateStr(birthday);
		startDate.setHours("0", "00");
		startDate = new Date(startDate.getTime() - (daysCnt * 24 * 3600 * 1000));
		subject = "Birthday of " +email_name+" is "+daysCnt+" day(s) away!";
	} else if (apptType == "WEEKS_BEFORE") {
		var breminder_weekSlct = document.getElementById("breminder_weekSlct");
		var weeksCnt = breminder_weekSlct.options[breminder_weekSlct.selectedIndex].text;
		weeksCnt = parseInt(weeksCnt);
		startDate = AjxDateUtil.simpleParseDateStr(birthday);
		startDate.setHours("0", "00");
		startDate = new Date(startDate.getTime() - (weeksCnt * 7 * 24 * 3600 * 1000));
		subject = "Birthday of " +email_name+" is "+weeksCnt+" week(s) away!";
	}


	startDate.setHours("6", "00");
	var endDate = new Date(startDate.getTime() + 12000 * 60 * 60);
	this._createAppt(startDate, endDate, subject);

};

com_zimbra_BirthdayReminder.prototype._createAppt =
function(startDate, endDate, subject) {
	var reminderMinutes = appCtxt.getSettings().getSetting("CAL_REMINDER_WARNING_TIME").value;
	try {


		var appt = new ZmAppt();
		appt.setStartDate(startDate);
		appt.setEndDate(endDate);
		appt.setName(subject);
		appt.setRecurType(ZmRecurrence.YEARLY);
		appt.setReminderMinutes(reminderMinutes);
		appt.freeBusy = "F";
		appt.privacy = "PRI";
		appt.transparency = "O";
		appt.setFolderId(this.BirthdayReminderFolderId);
		appt.save();
	} catch(e) {

	}
};


com_zimbra_BirthdayReminder.prototype._initializeBirthdayFolder =
function() {
	//if we dont know if the folder exists..
	if (!this.bReminder_hasFolder) {
		this.getBirthdayReminderFolderId();
	}

	// also, makesure that folder wasnt deleted by user after it was created
	if (!this.BirthdayReminderFolderId) {
		this.getBirthdayReminderFolderId();
	}

	this.setUserProperty("bReminder_hasFolder", "true", true);
};


com_zimbra_BirthdayReminder.prototype._createPrefView =
function() {
	var html = new Array();
	var i = 0;
	var id_indx = 0;
	this._bDayAndEmail = new Array();
	html[i++] = "<DIV class='breminder_msgDiv' id='breminder_foundMsgId'><font >Found " + this.filteredContactsArry.length + " contact(s) with Birthdays";
	html[i++] = "</DIV>";
	html[i++] = "<BR>";
	html[i++] = "<BR>";
	html[i++] = "<DIV class='breminder_mainDiv' style=\"overflow:auto;height:260px;width:99%\" >";
	for (var j = 0; j < this.filteredContactsArry.length; j++) {

		var contact = this.filteredContactsArry[j];
		var card = new Array();
		var n = 0;
		var birthday = "";
		var email = "";
		var fullName = "";

		html[i++] = "<DIV id='breminder_card" + id_indx + "'  class='breminder_card'>";
		card[n++] = "<DIV id='breminder_cardDetailDiv" + id_indx + "' class='breminder_cardDetailDiv breminder_hidden'>";
		card[n++] = "<TABLE>";
		var attr = contact.attr ? contact.attr : contact._attrs;

		for (var el in attr) {
			var nm = ZmContact._AB_FIELD[el];
			if (nm == undefined)
				continue;

			if ((el == "email" || el == "email2") && email == "")
				email = attr[el];

			if (el == "fullName")
				fullName = attr[el];
			if (el == "birthday")
				birthday = attr[el];

			card[n++] = "<TR><TD><B>" + nm + "</B></TD><TD>" + attr[el] + "</TD></TR>";
		}
		card[n++] = "</TABLE>";
		card[n++] = "</DIV>";

		var k = 0;
		var cardHdr = new Array();
		cardHdr[k++] = "<DIV id='breminder_cardHdrDiv" + id_indx + "' class='breminder_cardHdrDiv'>";
		cardHdr[k++] = "<TABLE width='100%' CELLPADDING=3 class='breminder_HdrTable'>";
		var chkbxId = "breminder_chkbox" + id_indx;
		cardHdr[k++] = "<TR><TD><input id='" + chkbxId + "'  type='checkbox' checked/></TD><TD width='5%' id='breminder_expCollIcon" + id_indx + "'  class='breminder_expCollIcon'>" + AjxImg.getImageHtml("NodeCollapsed") + "</TD>";
		if (fullName == "") {
			cardHdr[k++] = "<TD  width='75%'>" + email + "</TD>";
		} else if (email == "") {
			cardHdr[k++] = "<TD  width='75%'>" + fullName + "</TD>";
		} else {
			cardHdr[k++] = "<TD  width='75%'>" + fullName + "(" + email + ")</TD>";
		}
		var brd = birthday.split("-");
		cardHdr[k++] = "<TD  width='20%'>" + brd[1] + "/" + brd[2] + "</TD></TR>";
		cardHdr[k++] = "</TABLE>";
		cardHdr[k++] = "</DIV>";

		html[i++] = cardHdr.join("");
		html[i++] = card.join("");
		html[i++] = "</DIV>";//for breminder_card


		this._bDayAndEmail[j] = {b:birthday, e:email, fn:fullName, chkbx_id: chkbxId};
		id_indx++;
	}
	html[i++] = "</DIV>";
	html[i++] = "<DIV>";
	html[i++] = "<input id='breminder_onTheDayChk' type='checkbox' checked>Remind me on the day of birthday</input>";
	html[i++] = "</DIV>";
	html[i++] = "<DIV>";
	html[i++] = "<input id='breminder_daysChk' type='checkbox'checked>Also Remind me </input>";
	html[i++] = this._getDaysMenu() + " day(s) before the birthday";
	html[i++] = "</DIV>";
	html[i++] = "<DIV>";
	html[i++] = "<input  id='breminder_weeksChk' type='checkbox' checked>Also Remind me </input>";
	html[i++] = this._getWeekMenu() + " week(s) before the birthday";
	html[i++] = "</DIV>";

	return html.join("");

};

com_zimbra_BirthdayReminder.prototype._getDaysMenu =
function() {
	var html = new Array();
	var j = 0;
	html[j++] = "<SELECT id='breminder_daysSlct'>";
	for (var i = 1; i <= 7; i++) {
		if (i == 2)
			html[j++] = "<option value=\"" + i + "days\" selected>" + i + "</option>";
		else
			html[j++] = "<option value=\"" + i + "days\" >" + i + "</option>";
	}
	html[j++] = "</SELECT>";

	return html.join("");
};

com_zimbra_BirthdayReminder.prototype._getWeekMenu =
function() {
	var html = new Array();
	var j = 0;
	html[j++] = "<SELECT id='breminder_weekSlct'>";
	for (var i = 1; i <= 8; i++) {
		if (i == 1)
			html[j++] = "<option value=\"" + i + "weeks\" selected>" + i + "</option>";
		else
			html[j++] = "<option value=\"" + i + "weeks\">" + i + "</option>";

	}
	html[j++] = "</SELECT>";

	return html.join("");
};

com_zimbra_BirthdayReminder.prototype._createReloadBrowserView =
function() {
	var html = new Array();
	var i = 0;
	html[i++] = "<DIV>";
	html[i++] = "Birthday Reminder Zimlet Setup: We've just created a Calendar: '";
	html[i++] = com_zimbra_BirthdayReminder.birthdayFolder;
	html[i++] = "' to store Birthday Reminders.<br> We need to reload Browser for setup to complete. <br>Reload Browser?";
	html[i++] = "</DIV>";
	return html.join("");
};


com_zimbra_BirthdayReminder.prototype.doubleClicked = function() {
	this.singleClicked();
};
com_zimbra_BirthdayReminder.prototype.singleClicked = function() {

	//make sure to create folder to be used for reminders..
	this._initializeBirthdayFolder();
	if (this._apptComposeController == undefined) {//load calendar package when we are creating appt for the first time(since login)
		this._apptComposeController = AjxDispatcher.run("GetApptComposeController");
	}
	//if the calendar was created in this session, we need to refresh.
	if (this._justCreatedCalendarFolder) {
		this._showReloadBrowserDlg();
		return;
	}

	this.filteredContactsArry = new Array();
	this.__oldNumContacts = 0;
	this._noOpLoopCnt = 0;
	this._totalWaitCnt = 0;

	this._contactsAreLoaded = false;
	this._waitForContactToLoadAndProcess();
	this._contactsAreLoaded = true;

};

com_zimbra_BirthdayReminder.prototype._waitForContactToLoadAndProcess = function() {
	appCtxt.getAppController().setStatusMsg("Please wait, scanning Address Book for Birthdays..", ZmStatusView.LEVEL_INFO);
	this._contactList = AjxDispatcher.run("GetContacts");
	if (!this._contactList)
		return;

	this.__currNumContacts = this._contactList.getArray().length;
	if (this._totalWaitCnt < 2 || this._noOpLoopCnt < 3) {//minimum 2 cycles post currentCnt==oldCnt
		if (this.__oldNumContacts == this.__currNumContact) {
			this._noOpLoopCnt++;
		}
		this._totalWaitCnt++;
		this.__oldNumContacts = this.__currNumContact;
		setTimeout(AjxCallback.simpleClosure(this._waitForContactToLoadAndProcess, this), 5000);
	} else {

		this._startProcessing();//start processing
	}


};

com_zimbra_BirthdayReminder.prototype._startProcessing = function() {
	var _tmpArry = this._contactList.getArray();

	for (var j = 0; j < _tmpArry.length; j++) {
		var currentContact = _tmpArry[j];

		var attr = currentContact.attr ? currentContact.attr : currentContact._attrs;
		try {
			if (attr.birthday != undefined) {
				this.filteredContactsArry.push(currentContact);
			}
		} catch(e) {
		}
	}
	appCtxt.getAppController().setStatusMsg("..Scanning completed", ZmStatusView.LEVEL_INFO);
	this._showPreferenceDlg();
};

com_zimbra_BirthdayReminder.prototype._showPreferenceDlg = function() {
	//if zimlet dialog already exists...
	if (this._preferenceDialog) {
		this._preferenceDialog.popup();
		return;
	}
	this._preferenceView = new DwtComposite(this.getShell());
	this._preferenceView.setSize("510", "400");
	this._preferenceView.getHtmlElement().style.overflow = "auto";
	this._preferenceView.getHtmlElement().innerHTML = this._createPrefView();
	var reminderBtnId = Dwt.getNextId();
	var createRemindersBtn = new DwtDialog_ButtonDescriptor(reminderBtnId, ("Create Reminders"), DwtDialog.ALIGN_RIGHT);

	this._preferenceDialog = this._createDialog({title:"Birthday Reminder Zimlet: Create Reminders for Birthdays ", view:this._preferenceView, standardButtons:[DwtDialog.CANCEL_BUTTON], extraButtons:[createRemindersBtn]});
	this._preferenceDialog.setButtonListener(reminderBtnId, new AjxListener(this, this._createRemindersListener));
	this._addListListeners();
	this._preferenceDialog.popup();
};


com_zimbra_BirthdayReminder.prototype._createRemindersListener =
function() {
	this._reloadRequired = false;
	appCtxt.getAppController().setStatusMsg("Please Wait..", ZmStatusView.LEVEL_INFO);
	var counter =1;
	for (var i = 0; i < this._bDayAndEmail.length; i++) {
		var obj =  this._bDayAndEmail[i];
		var chkbx = document.getElementById(obj.chkbx_id);
		if (!chkbx.checked)
			continue;

		//this._create3Appts(this._bDayAndEmail[i]);
		//schedule appt creation every 3 seconds( counter*5000) instead of all at once
		setTimeout(AjxCallback.simpleClosure(this._create3Appts, this, obj, counter, this._bDayAndEmail.length), counter*4000);
		counter++;
	}
	//say done at the very end
	setTimeout(AjxCallback.simpleClosure(this._saydone, this), counter*4000);//counter would know exactly how much to wait

	this._preferenceDialog.popdown();
	if (this._reloadRequired) {
		this._reloadBrowser();
	}
};

com_zimbra_BirthdayReminder.prototype._saydone = function() {
		appCtxt.getAppController().setStatusMsg("..Done creating Birthday Reminders", ZmStatusView.LEVEL_INFO);
}
com_zimbra_BirthdayReminder.prototype._addListListeners = function() {
	var divs = this._preferenceDialog.getHtmlElement().getElementsByTagName("div");
	for (var i = 0; i < divs.length; i++) {
		var hdr = divs[i];
		if (hdr.className == "breminder_cardHdrDiv") {
			hdr.onclick = AjxCallback.simpleClosure(this._onListClick, this, hdr);
		}
	}
};

com_zimbra_BirthdayReminder.prototype._onListClick = function(hdr, ev) {
	var evnt = ev ? ev: window.event;
	if(evnt){
		var target = evnt.target ? evnt.target : evnt.srcElement;
		if (target.tagName == "INPUT")//if checkbox, donothing special
			return;
	}
	var id = hdr.id;
	var indxId = id.replace("breminder_cardHdrDiv", "");
	var expndCell = document.getElementById("breminder_expCollIcon" + indxId);
	var detailsDiv = document.getElementById("breminder_cardDetailDiv" + indxId);

	if (detailsDiv.className == "breminder_cardDetailDiv breminder_hidden") {
		detailsDiv.className = "breminder_cardDetailDiv breminder_shown";
		expndCell.innerHTML = AjxImg.getImageHtml("NodeExpanded");
	} else {
		detailsDiv.className = "breminder_cardDetailDiv breminder_hidden";
		expndCell.innerHTML = AjxImg.getImageHtml("NodeCollapsed");
	}
};

com_zimbra_BirthdayReminder.prototype._showReloadBrowserDlg = function() {
	//if zimlet dialog already exists...
	if (this._reloadBrowserDialog) {
		this._reloadBrowserDialog.popup();
		return;
	}
	this._reloadBrowserView = new DwtComposite(this.getShell());
	this._reloadBrowserView.getHtmlElement().style.overflow = "auto";
	this._reloadBrowserView.getHtmlElement().innerHTML = this._createReloadBrowserView();

	this._reloadBrowserDialog = this._createDialog({title:"Email Reminder Zimlet: Need to Reload Browser", view:this._reloadBrowserView, standardButtons:[DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]});
	this._reloadBrowserDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._okReloadBrowserBtnListener));
	this._reloadBrowserDialog.popup();
};

com_zimbra_BirthdayReminder.prototype._okReloadBrowserBtnListener =
function() {
	this._reloadBrowser();
	this._reloadBrowserDialog.popdown();
};

com_zimbra_BirthdayReminder.prototype._reloadBrowser =
function() {
	window.onbeforeunload = null;
	var url = AjxUtil.formatUrl({});
	ZmZimbraMail.sendRedirect(url);
};