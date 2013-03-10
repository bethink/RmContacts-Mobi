/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
 
 var DBConfig = {

	dbInst: window.openDatabase("rmContactDB", "1.0", "Rm Contact", 1000000),

	setUpDB: function(){

		this.dbInst.transaction(function(tx){ 
		
			tx.executeSql('CREATE TABLE IF NOT EXISTS APP_SETTINGS (email, password)');
			//tx.executeSql('DROP TABLE IF EXISTS CONTACT_REFERENCES');
			tx.executeSql('CREATE TABLE IF NOT EXISTS CONTACT_REFERENCES (id unique, created_at DATETIME)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS MESSAGE_SYNC (id unique, created_at DATETIME)');
		
		});
		
	}
	
};


var app = {

    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },

    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        //app.receivedEvent('deviceready');
        DBConfig.setUpDB();
        
        DBConfig.dbInst.transaction(function(tx){
			tx.executeSql('SELECT * FROM APP_SETTINGS', [], app.openHomePage, function(){alert('Error in app setting query');});
		});
        
    },


    // Update DOM on a Received Event
    receivedEvent: function(id) {
        console.log('Received Event: ' + id);
    },

	email: null,
	password: null,
	syncData: null,

	openHomePage: function(tx, appSettings){

		console.log(appSettings.rows);
		console.log(appSettings.rows.length);
        if(appSettings.rows.length <= 0){
        	app.showSignupPage();
        }else{
        	app.checkConnection();
        	app.getContacts();
        	app.syncMessages();
        }

	},

   checkConnection: function() {
        var networkState = navigator.connection.type;

        var states = {};
        states[Connection.UNKNOWN]  = 'Unknown connection';
        states[Connection.ETHERNET] = 'Ethernet connection';
        states[Connection.WIFI]     = 'WiFi connection';
        states[Connection.CELL_2G]  = 'Cell 2G connection';
        states[Connection.CELL_3G]  = 'Cell 3G connection';
        states[Connection.CELL_4G]  = 'Cell 4G connection';
        states[Connection.NONE]     = 'No network connection';

        alert('Connection type: ' + states[networkState]);
        
        alert(!(states[networkState] == states[Connection.NONE]));
        
    },
    
	syncMessages: function(){
		
		DBConfig.dbInst.transaction(function(tx){
			tx.executeSql('SELECT * FROM APP_SETTINGS', [], function(tx1, appSettings){

				console.log('fetching app settings');
				console.log('length: ' + appSettings.rows.length);
				
				var settings = appSettings.rows.item(0);
				
				console.log(settings.email);
				console.log(settings.password);
				console.log('in sync message');
				
				app.email = settings.email
				app.password = settings.password

				
			}, function(){});
		});
		
		console.log('in sync message - after transaction');
		console.log(app.email)
		console.log(app.password)
		
		var syncData = {}; //JSON.stringify(syncData)
		
		syncData['email'] = app.email;
		syncData['password'] = app.password;
		
		var jsonContacts = []; 
		var jsonContact = {};
				
		DBConfig.dbInst.transaction(function(tx){
			tx.executeSql('SELECT * FROM CONTACT_REFERENCES', [], function(tx, dbcontacts){
				
				console.log('in sync transaction');
				
				for (var i=0; i<dbcontacts.rows.length; i++){

					var dbcontact = dbcontacts.rows.item(i);
					console.log( JSON.stringify(dbcontacts.rows.item(i)));
					
					mobileContact = cordova.exec(function(winParam) { console.log(JSON.stringify(winParam));  }, function(error) { alert('error'); }, "ContactSearch", "byId", [dbcontact.id]);

					results = cordova.exec(function(winParam) {  console.log(JSON.stringify(winParam)); }, function(error) {}, "ReadSms", "GetTexts", [mobileContact.phoneNumbers, -1]);					
					mobileContact["messages_attributes"] = results.texts;
					jsonContacts[i] = mobileContact;

					console.log( JSON.stringify(mobileContact) );
					alert( JSON.stringify(mobileContact) );
				}
				
			}, function(){alert('Error in sync query');});
		});
		
		alert(jsonContacts);
		console.log(jsonContacts);
	},

	onSuccess: function(contacts) {
			
	    	console.log('Found ' + contacts.length + ' contacts.');

			var contactLis = "";
	
			$('#signup').hide();
			$('#rm-contacts').show();
			
			for (var i=0; i<contacts.length; i++) {
				var addButton = "<span><input type='checkbox' class='addContact' title='Add Contact'/></span>";
	            contactLis += "<li class='contact' id='" + contacts[i].id + "'><a href='#'>" + contacts[i].name.formatted + "</a>" + addButton + "</li>";
	        }
			
			$('#rm-contacts').html(contactLis);
			console.log(contactLis);	
			$('#rm-contacts').listview('refresh'); // To reset the jquery mobile list design
			app.registerAddContacts();
	
	},


	onError: function(contactError) {
    	alert('onError!');
	},	


	getContacts: function(){
		console.log(' -------- In getContacts -------- ');

	    var options = new ContactFindOptions();
        options.filter="";          // empty search string returns all contacts
        options.multiple=true;      // return multiple results

        var filter = ["displayName", "name"];   // return contact.displayName field
		navigator.contacts.find(filter, app.onSuccess, app.onError, options);		
		
		DBConfig.dbInst.transaction(function(tx){
			tx.executeSql('SELECT * FROM CONTACT_REFERENCES', [], app.showDBContacts, function(){});
		});
		
	},

	showDBContacts: function(tx, contacts){
	
		var contactLis = "";
	
		var len = contacts.rows.length;

		console.log('==============' + contacts.rows.length + '===============');
		
		for (var i=0; i < len; i++) {
			var contact = contacts.rows.item(i);
			//var contactName = $('#' + contact.id ).find('a').html();
			
			var options = new ContactFindOptions();
			options.filter=contact.id; 
			var fields = ["id", "displayName"];
			navigator.contacts.find(fields, app.addDBContactLi, app.onError, options);
	    }
		
		$('#rm-dbcontacts').listview('refresh');
	
	},

	addDBContactLi:function(contact){
		contact = contact[0];
        $('#rm-dbcontacts').append( "<li class='contact' id='db-" + contact.id + "'><a href='#'>" + contact.displayName + "</a><span></span></li>" );
		$('#rm-dbcontacts').listview('refresh');		
	},

	showDBContactLi: function(tx, contacts){
	
		var contactLis = "";
	
		console.log('==============' + contacts.rows.length + '===============');
		
		var contact = contacts.rows.item(0);
		
		console.log('#' + contact.id);
		
		var contactName = $('#' + contact.id ).find('a').html();
		var addButton = "";
        contactLis += "<li class='dbcontact' id='db-" + contact.id + "'><a href='#'>" + contactName + "</a>" + addButton + "</li>";
		
		$('#rm-dbcontacts').append(contactLis);
		console.log(contactLis);	
		$('#rm-dbcontacts').listview('refresh');
	
	},
	
	showSignupPage: function(){
		console.log(' -------- In showSignupPage -------- ');
		$('#rm-contacts').hide();
		this.registerSignupClick();	
	},

	registerSignupClick: function(){
			
		$('#signup-button').click(function(){

			console.log('============ click signup =============');
			
			var email = $('#email-field').val();
			var password = $('#password-field').val();
			var confirmPassword = $('#confirm-password-field').val();
			
			if( app.validateEmail(email) && app.validatePassword(password, confirmPassword) ){
				
				DBConfig.dbInst.transaction(function(tx){
					tx.executeSql('INSERT INTO APP_SETTINGS (email, password) VALUES (?, ?)', [email, password], app.getContacts(), function(){});
				});				
				
			}
			
		});
	
	},	
	
	registerAddContacts: function(){

		$('.contact .addContact').click(function(){
			var contactId = $(this).closest('li').attr('id');
			console.log(contactId);
			ContactModel.AddContact(contactId);
		});

		console.log('end register');
	},
	
	validateEmail: function(email){
		var regex = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
		var status;
  		if( regex.test(email) ){
  			status = true
  		}else{
  			$('#email-field').closest('div').attr('class', 'error');
  			status = false
  		}
  		
  		return status;
	},
	
	validatePassword: function(password, confirmPassword){
	
		var status = true;
	
		if(password.trim().length == 0 || confirmPassword.trim().length == 0){
			$('#password-field').closest('div').attr('class', 'error');
			status = false;
		}else if(password != confirmPassword){
			$('#password-field').closest('div').attr('class', 'error');
			$('#confirm-password-field').closest('div').attr('class', 'error');
			status = false;
		}else if(password.length < 4){
			$('#password-field').closest('div').attr('class', 'control-group error');
			$('#confirm-password-field').closest('div').attr('class', 'error');
			status = false;
		}else{
			$('#password-field').closest('div').attr('class', '');
			$('#confirm-password-field').closest('div').attr('class', '');
		}
		
		return status;
	}

};

var AppSettingModel = {

	AddEmail: function(email, password){
		
		DBConfig.dbInst.transaction(function(tx){
			console.log('in addemail');
			tx.executeSql('SELECT * FROM APP_SETTINGS WHERE email = ?', [email], function(tx, results){
			
				console.log("Returned rows = " + results.rows.length);

				if(results.rows.length == 0){
					var sqlStr = 'INSERT INTO APP_SETTINGS (email, password) VALUES (?, ?, ?)'
					tx.executeSql(sqlStr, [email, password, new Date()]);
					console.log(sqlStr)
				}

			});
			
			console.log('in -- end -- addemail');
		}, this.errorCB, this.successCB);
		
	},
	
	errorCB: function(err) {
	    alert("Error processing SQL: "+err.code);
	},
	
	successCB: function() {
	    alert("success!");
	}	

};

var ContactModel = {

	AddContact: function(contactId){
		console.log('in add');
		DBConfig.dbInst.transaction(function(tx){
			console.log('in addcontactdb');
			
			tx.executeSql('CREATE TABLE IF NOT EXISTS CONTACT_REFERENCES (id unique)');
			tx.executeSql('SELECT * FROM CONTACT_REFERENCES WHERE id = ?', [contactId], function(tx, results){
			
				console.log("Returned rows = " + results.rows.length);

				if(results.rows.length == 0){
					console.log('inside if condition');
					var sqlStr = 'INSERT INTO CONTACT_REFERENCES (id, created_at) VALUES (?, ?)';
					tx.executeSql(sqlStr, [contactId, new Date()]);
					console.log(sqlStr);
				}
				
				console.log('out of if');

			});


			DBConfig.dbInst.transaction(function(tx){
				tx.executeSql('SELECT * FROM CONTACT_REFERENCES where id = ?', [contactId], app.showDBContactLi, function(){});
			});			
			
			console.log('in -- end -- addcontactdb');
		}, this.errorCB, this.successCB);
		console.log('end add');
	},

	RemoveContact: function(contactId){
		alert('in remove');
	},
	
	UpdateContact: function(contactId, data){
		alert('in udpate');
	},
	
	AddContactDB: function(tx, contactId) {
	},
	
	errorCB: function(err) {
	    alert("Error processing SQL: "+err.code);
	},
	
	successCB: function() {
	    alert("success!");
	}	
	

};
