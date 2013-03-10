package com.mejon.contacts.plugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.DatabaseUtils;
import android.net.Uri;
import android.provider.Contacts;
import android.provider.ContactsContract;
import android.provider.ContactsContract.Data;
import android.util.Log;

/**
 * Most Cordova plugins have all their functionality in one file, therefore the same
 * pattern will be applied here. execute(...) method will be delegating to other
 * private methods, based on action.
 * Some ideas from this Stack Overflow post:
 * {@link http://stackoverflow.com/questions/5946262/read-only-specificonly-from-particular-number-inbox-messages-and-display-throu}
 */
public class ContactSearch extends CordovaPlugin {

	private static final String TAG = "Contact Search Plugin";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        Log.d(TAG, "Inside ReadSms plugin.");
        
        JSONObject result = new JSONObject();

        if (args.length() == 0) {
            result.put("error", "No id provided.");
            result.put("id", id);
            callbackContext.success(result);
            return false;
        }

        String id = args.getString(0);

        if (action.equals("") || action.equals("byId")) {
        	JSONObject resultContact = byId(id);
            callbackContext.success(resultContact);
            return true;
        } else {
            Log.e(TAG, "Unknown action provided.");
            result.put("error", "Unknown action provided.");
            result.put("id", id);
            callbackContext.success(result);
            return false;
        }
    }

 
    public JSONObject byId(String id) throws JSONException{
        ContentResolver contentResolver = cordova.getActivity().getContentResolver();
        String[] queryData = new String[] { id };
        String sortOrder = "date DESC";

    	String displayName = ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME;
    	String number = ContactsContract.CommonDataKinds.Phone.NUMBER;
    	
    	
    	String _id = ContactsContract.CommonDataKinds.Phone._ID;
    	String contactIdCol = ContactsContract.CommonDataKinds.Phone.CONTACT_ID;

    	Uri uri = Uri.withAppendedPath(ContactsContract.CommonDataKinds.Phone.CONTENT_URI, Uri.encode(id));

    	Cursor cursor = contentResolver.query(Data.CONTENT_URI, null, Data.CONTACT_ID + "=?", queryData, null);
    	
		JSONObject current = null;
		JSONArray phoneNumbers = null;
  
    	while (cursor.moveToNext()){

    		try{
	    		
	    		ContentValues values = new ContentValues();
	    		DatabaseUtils.cursorRowToContentValues(cursor, values);
	    		
	    		String contactId = cursor.getString(cursor.getColumnIndex(contactIdCol));
	    		
	    		if( current == null ){
	    			current = new JSONObject();
	    		}
	    		
	    		current.put("id", contactId);

	    		String mimeType = cursor.getString(cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.MIMETYPE));
	    		
	    		if(mimeType.contains("name")){
	    			current.put("displayName", cursor.getString(cursor.getColumnIndex(displayName)));
	    		}else if(mimeType.contains("phone")){
	    			
	    			if(current.has("phoneNumbers")){
	    				phoneNumbers = (JSONArray) current.get("phoneNumbers");
	    			}
	    			
	    			if(phoneNumbers == null){
	    				phoneNumbers = new JSONArray();
	    			}
	    			
	    			phoneNumbers.put(cursor.getString(cursor.getColumnIndex(number)).replaceAll("[^0-9]", ""));
	    			current.put("phoneNumbers", phoneNumbers);
	    		}
	    		
            } catch (JSONException e) {
                e.printStackTrace();
                Log.e(TAG, "Error reading text", e);
                try {
					current.put("error", new String("Error reading text(s)."));
				} catch (JSONException e1) {
					e1.printStackTrace();
				}
            }
    		
    		Log.e(TAG, current.toString());
    	}
    	
    	return current;
    }
}
