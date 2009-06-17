/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Zimlets
 * Copyright (C) 2007, 2008 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

function Com_Zimbra_YMEmoticons() {
	this.re = Com_Zimbra_YMEmoticons.REGEXP;
	this.hash = Com_Zimbra_YMEmoticons.SMILEYS;
	this._isEnabled = true;
};

Com_Zimbra_YMEmoticons.prototype = new ZmZimletBase;
Com_Zimbra_YMEmoticons.prototype.constructor = Com_Zimbra_YMEmoticons;

Com_Zimbra_YMEmoticons.prototype.createComposeButton = function(toolbar) {
		var htmlEditor = toolbar.parent;
		var button = new YMEmoticonsPickerButton({parent: toolbar, className: "ZToolbarButton"}, true);
		button.dontStealFocus();
		button.setToolTipContent(ZmMsg.emoticons);
		button.setEmoticon(":)");
		button.addSelectionListener(new AjxListener(this, this._composeToolbarSmileyListener, [htmlEditor]));
};

Com_Zimbra_YMEmoticons.prototype.on_htmlEditor_createToolbar2 =
function(app, toolbar) {
		this.createComposeButton(toolbar);
};

Com_Zimbra_YMEmoticons.prototype.onFindMsgObjects = function(msg, manager) {
	if(this.enableInMail == undefined)	{
		this.enableInMail =  this.getUserProperty("yemoticons_enableInMail") == "true";
	}

	if (msg.folderId == ZmOrganizer.ID_CHATS) {
				manager.addHandler(this);
				manager.sortHandlers();
				manager.__hasSmileysHandler = true;
	}else {//for other mail folders
		if (!manager.__hasSmileysHandler && this._isEnabled && this.enableInMail) {
				manager.addHandler(this);
				manager.sortHandlers();
				manager.__hasSmileysHandler = true;
		}

		if (manager.__hasSmileysHandler && (!this._isEnabled || !this.enableInMail)) {
				manager.removeHandler(this);
				manager.sortHandlers();
				manager.__hasSmileysHandler = false;
		}
	}
};

Com_Zimbra_YMEmoticons.prototype.match = function(line, startIndex) {
	this.re.lastIndex = startIndex;
	var m = this.re.exec(line);
	//var m = line.match(this.re);
	if (m) {
		m.context = this.hash[m[1].toLowerCase()];
		// preload
		var img = new Image();
		img.src = m.context.src;
		m.context.img = img;
	}
	return m;
};

Com_Zimbra_YMEmoticons.prototype.generateSpan = function(html, idx, obj, spanId, context) {

	var h = context.height / 2;
	var a = [ "<span style='height:",context.height,";width:",context.width,";padding:", h, "px ", context.width,
		  "px ", h, "px 0; background:url(", context.img.src, ") no-repeat 0 50%;'",
		  ' title="',
		  AjxStringUtil.xmlAttrEncode(context.text), ' - ',
		  AjxStringUtil.xmlAttrEncode(context.alt), '"',
		  "></span>" ];
	html[idx++] = a.join("");
	return idx;
};

Com_Zimbra_YMEmoticons.prototype.onNewChatWidget =
function(widget) {
	var manager = widget.getObjectManager();
	manager.addHandler(this);
	manager.sortHandlers();

	var toolBar = widget.getEditor().getBasicToolBar();
	var button = new YMEmoticonsPickerButton({parent: toolBar, className: "ZToolbarButton", index: 0});
	button.dontStealFocus();
	button.setToolTipContent(ZmMsg.emoticons);
	button.setData(ZmLiteHtmlEditor._VALUE, ZmLiteHtmlEditor.SMILEY);
	button.setEmoticon(":)");
	button.addSelectionListener(new AjxListener(this, this._smileyListener, [widget]));
	toolBar.addSeparator(null, 1);
};

Com_Zimbra_YMEmoticons.prototype._smileyListener =
function(widget, ev){
	this._composeToolbarSmileyListener(widget.getEditor(), ev);
};

Com_Zimbra_YMEmoticons.prototype._composeToolbarSmileyListener =
function(editor, ev){
	if(editor == null || editor == undefined)
		return;

	var obj = ev.item;
	var smiley = obj.getSelectedSmiley();
	if (smiley) {
		editor.insertText(smiley.text);
		editor.focus();
	}
};


Com_Zimbra_YMEmoticons.prototype.menuItemSelected = function(itemId) {
	switch (itemId) {
		case "YE_TEMP_DISABLE":
			this.temporarilyDisable();
			break;
		case "YE_PREFERENCES":
			this._showPreferenceDlg();
			break;
	}
};

Com_Zimbra_YMEmoticons.prototype.doubleClicked = function() {
	this.singleClicked();
};

Com_Zimbra_YMEmoticons.prototype.singleClicked = function() {
	this._showPreferenceDlg();
};

Com_Zimbra_YMEmoticons.prototype.temporarilyDisable = function() {
	this._isEnabled = false;
	var transitions = [ ZmToast.FADE_IN, ZmToast.PAUSE, ZmToast.FADE_OUT ];
	appCtxt.getAppController().setStatusMsg("Emoticons Temporarily Disabled", ZmStatusView.LEVEL_INFO, null, transitions);
};


Com_Zimbra_YMEmoticons.prototype._showPreferenceDlg = function() {
	//if zimlet dialog already exists...
	if (this._preferenceDialog) {
		this._preferenceDialog.popup();
		return;
	}
	this._preferenceView = new DwtComposite(this.getShell());
	this._preferenceView.getHtmlElement().style.overflow = "auto";
	this._preferenceView.getHtmlElement().innerHTML = this._createPrefView();
	this._preferenceDialog = this._createDialog({title:"Yahoo! Emoticons Preferences", view:this._preferenceView, standardButtons:[DwtDialog.OK_BUTTON]});
	this._preferenceDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._okPreferenceBtnListener));
	if(this.enableInMail == undefined)	{
		this.enableInMail =  this.getUserProperty("yemoticons_enableInMail") == "true";
	}
	document.getElementById("yemoticons_enableInMail_div").checked = this.enableInMail;
	this._preferenceDialog.popup();
};

Com_Zimbra_YMEmoticons.prototype._createPrefView =
function() {
	var html = new Array();
	var i = 0;
	html[i++] = "<DIV>";
	html[i++] = "<input id='yemoticons_enableInMail_div'  type='checkbox'/>Permanently Enable Emoticons In Mail";
	html[i++] = "</DIV>";
	return html.join("");
};

Com_Zimbra_YMEmoticons.prototype._okPreferenceBtnListener =
function() {
	this._preferenceDialog.popdown();
	var domVal = document.getElementById("yemoticons_enableInMail_div").checked;
	if (domVal != this.enableInMail) {
		this.setUserProperty("yemoticons_enableInMail", domVal, true);
		this.enableInMail = domVal;
		var ed = domVal ? "Enabled" : "Disabled";
		var transitions = [ ZmToast.FADE_IN, ZmToast.PAUSE, ZmToast.FADE_OUT ];
		appCtxt.getAppController().setStatusMsg(["Emoticons ",ed, " In Mail"].join(""), ZmStatusView.LEVEL_INFO, null, transitions);
	} 
};