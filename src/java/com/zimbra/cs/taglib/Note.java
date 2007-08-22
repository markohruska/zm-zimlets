/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.taglib;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.Mailbox.OperationContext;

public class Note extends ZimbraTag {
    private static final long serialVersionUID = -3525900802675257570L;

    private String mId;

    @Override
    public void setId(String val) {
        mId = val;
    }

    @Override
    public String getId() {
        return mId;
    }

    @Override
    public String getContentStart(Account acct, OperationContext octxt) throws ZimbraTagException, ServiceException {
        if (mId == null) {
            throw ZimbraTagException.MISSING_ATTR("id");
        }
        int mid = Integer.parseInt(mId);
//        String id = acct.getId();
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccountId(id);
        com.zimbra.cs.mailbox.Note note = mbox.getNoteById(octxt, mid);

        return note.getText();
    }
}
