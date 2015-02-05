/*

 bbcore.js v1.0

 BombBomb's App Core API JS Implementation
 Copyright 2013 BombBomb, Inc.

 */

// TODO; append script tag to load jQuery as required, replace with require?
function jQLoader()
{
    var jqTag = document.createElement('script');
    jQTag.setAttribute('src','//ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js');
    document.getElementsByTagName('body').appendChild(jQTag);
}

//typeof jQuery == "undefined" && jQLoader();


(function (bb,$)
{

    // define some constants
    bb.CONFIG =
    {
        VERSION:            "1.0",
        API_END_POINT: 		"/app/api/api.php",
        SERVER_API_URL:		"https://app.bombbomb.com"
    };


    // private methods ??
    bb.prototype.__updateSession = function(respObj,done)
    {
        if (respObj.status == "success")
        {
            this.userId = respObj.info.user_id;
            this.clientId = respObj.info.client_id;
            this.accessToken = respObj.info.api_key;
            this.hasContext = true;
            this.authenticated = true;

            this.storeKey(this.accessToken);

            // TODO; send request to fetch and update user details

            console.log('bbcore: __updateSession session updated.');

            // if the authentication was successful, set the
            if (done) done.call(this,respObj);
        }
        else
        {
            //
            alert(respObj.status + ' occurred while trying to login.');
        }
    };




    // public methods
    bb.prototype.onError = function(func_or_deet,xhr)
    {
        typeof func_or_deet == "function" ? this.onerror = func_or_deet : (this.onerror && this.onerror.call(this,func_or_deet));
    };

    bb.prototype.login = function(uid,pwd,success)
    {
        if (typeof uid == "function")
        {
            success = uid;
            uid = this.storage.getItem('b2-uid');
            pwd = this.storage.getItem('b2-pwd');
        }
        if (!uid) return;
        this.userEmail = uid;

        var inst = this;
        updateInst = function(respObj)
        {
            if (respObj.status == "success")
            {
                inst.userId = respObj.info.user_id;
                inst.clientId = respObj.info.client_id;
                inst.accessToken = respObj.info.api_key;
                inst.hasContext = true;
                inst.authenticated = true;

                inst.storeKey(this.accessToken);

                // if the authentication was successful, set the
                success.call(this,respObj);
            }
            else
            {
                //
                alert(respObj.status + 'occurred while trying to login.');
            }
        };
        this.sendRequest({ method: "ValidateSession", email: uid, pw: pwd }, function(respObj) { inst.__updateSession(respObj,success); } );
    };

    bb.prototype.logout = function()
    {
        this.storage.removeItem('b2-uid');
        this.storage.removeItem('b2-pwd');
        this.storage.removeItem('access_token');
        this.hasContext = false;
        this.authenticated = false;
    };

    bb.prototype.credentialsSaved = function ()
    {
        return null != this.storage.getItem("b2-uid") || null != this.storage.getItem("access_token");
    };

    bb.prototype.saveCredentials = function (uid, pwd)
    {
        this.storage.setItem("b2-uid",uid);
        this.storage.setItem("b2-pwd",pwd);
    };

    bb.prototype.resumeStoredSession = function (succ,err)
    {
        this.accessToken = window.storage.getItem("access_token");
        if (this.accessToken)
            this.validateAccessToken(succ);
        else if (window.storage.getItem("b2-uid"))
        {
            this.login(succ);
        }
        else
        {
            err() && console.log('bbcore: unable to resume session.');
        }
        //return null != this.storage.getItem("b2-uid") || null != this.storage.getItem("access_token");
    };

    bb.prototype.validateAccessToken = function(done)
    {
        var inst = this;
        this.sendRequest({ method: "ValidateSession", api_key: this.accessToken, async: false }, function(respObj) { inst.__updateSession(respObj,done); });
    };


    bb.prototype.isAuthenticated = function()
    {

        if (!this.authenticated) console.log('You must authenticate a BombBomb session before making additional calls.');
        return this.authenticated;
    };

    // TODO; sends the persistant key to the application
    bb.prototype.invalidateSession = function()
    {
        that = this;
        this.sendRequest({ method: "invalidateKey" }, function(){
            // TODO; that.clearKey();
            that.accessToken = "";
            that.authenticated = false;
            that.hasContext = false;
        });
    };

    bb.prototype.getServerUrl = function()
    {
        return this.apiServer || bb.CONFIG.SERVER_API_URL;
    };

    bb.prototype.getRequestUrl = function()
    {
        return this.getServerUrl() + bb.CONFIG.API_END_POINT;
    };

    bb.prototype.sendRequest = function(metho,params,success,error)
    {
        if (typeof params == "function") success = params;
        if (typeof metho == "object") params = metho;
        if (typeof metho == "object" && params.method) metho = params.method;

        if (metho != "IsValidLogin" && !params.api_key) params.api_key = this.accessToken;

        var inst = this;
        return $.ajax({
            url: params.url ? params.url : this.getRequestUrl(), //bb.CONFIG.SERVER_API_URL + bb.CONFIG.API_END_POINT,
            async: typeof params.async != 'undefined' ? params.async : true,
            type: "post",
            dataType: "json",
            /*
             xhrFields: {
             withCredentials: true
             },
             */
            /*
             Nu victorians of the post-industrial aesthetic era
             Nu post-industrial anti-steam punk
             */
            crossDomain: true,
            data: params,
            success: function(result) {
                // set state of bb instance
                // ?? could evaluate the two last statuses and
                inst.lastresponse = result.status;
                if (result.status == "success")
                {
                    // if the result returned a
                    if (metho == "GetVideoGuid" && result.info && result.info.video_id) this.currentVideoId = result.info.video_id;
                    if (success) success.call(inst,result);
                }
                else
                {
                    inst.onError.call(inst,result);
                }
            },
            error: function (jqXHR) {
                resp = jqXHR.responseJSON || { status: 'unknown', jqXHR: jqXHR };
                inst.lastresponse = resp.status;
                "success" == resp.status ? success.call(inst,resp,jqXHR) : inst.onError.call(inst,resp,jqXHR);
            }
        });
    };

    // tests a key with the existing
    bb.prototype.verifyKey = function(key,complete)
    {
        //ValidateSession
        this.sendRequest({ method: "GetEmails", api_key:key },function(resp){
            if (!complete) complete({isValid:(resp.status == "success")});
        });
    };

    // stores the local filestore or cookie
    bb.prototype.storeKey = function(key)
    {
        this.accessToken || (this.accessToken = key);
        if (!this.accessToken) return;
        // currently this will use the API Key, in the future this should be updated to use a key which can be expired
        this.storage.setItem("access_token",this.accessToken);
    };

    bb.prototype.getKey = function()
    {
        return this.accessToken;
    };

    bb.prototype.log = function(messg,deets,pcall)
    {
        this.sendRequest({method:"bbLog",message:messg,details:deets},pcall);
    };

    bb.prototype.saveRecording = function(opts)
    {
        pVals = opts;
        if (!pVals.vid_id) return;

        this.sendRequest({method:"VideoRecordedLive"},pVals,function(){ return; });

    };

    bb.prototype.setVideoId = function(vid_id)
    {
        this.currentVideoId = vid_id;
    }

    bb.prototype.getVideoId = function(pcall)
    {
        if (!this.currentVideoId)
            this.getNewVideoGuid(pcall);
        else
        if (pcall) pcall.call(this,this.currentVideoId);
    }

    bb.prototype.hasVideoId = function()
    {
        return (this.currentVideoId);
    };

    bb.prototype.getNewVideoGuid = function(pcall)
    {
        var inst = this;
        this.sendRequest({method:"GetVideoGuid"},function(data){ inst.currentVideoId = data.info.video_id; if (pcall) pcall.call(this,inst.currentVideoId); });
    }


    /*
     @@quickSendVideo
     opts -


     */
    bb.prototype.videoQuickSend = function(opts,pcall)
    {
        // TODO; this should be calling the api
        var reqDetails = {
                method: 'VideoQuickSend',
                subject: 'QuickSend from BombBomb',
                mobile_message: '',
                email_address: null,
                videoId: null

            },
            sendErrors = [];

        for (var op in reqDetails)
            if (!opts[op]) opts[op] = reqDetails[op];

        if (opts.message && !opts.mobile_message) opts.mobile_message = opts.message;
        if (opts.email && !opts.email_address) opts.email_address = opts.email;
        if (opts.email_address && !opts.email_addresses) opts.email_addresses = opts.email_address;
        if (!opts.video_id && this.currentVideoId) opts.video_id = this.currentVideoId;

        // check options
        if (!opts.video_id)
            sendErrors.push('quickSendVideo Error: no video_id defined.');
        if (!opts.subject)
            sendErrors.push('quickSendVideo Error: no subject defined.');
        if (!opts.email_addresses)
            sendErrors.push('quickSendVideo Error: no email_address defined.');

        if (sendErrors.length>0 && !opts.video_id)
        {
            this.getVideoId(function(guid){
                if (guid)
                {
                    opts.video_id = guid;
                    this.sendRequest(opts,pcall);
                }
                else
                {
                    sendErrors.push('quickSendVideo: Terminal Error: Unable to set video_id');
                    this.onError({ info: { errmsg: sendErrors } });
                }
            });
        }
        else
        {
            this.sendRequest(opts,pcall);
        }

    };

    // returns the url for the embedded video recorder, typically used for iframes
    bb.prototype.getEmbeddedRecorderUrl = function(opts,comp)
    {
        if (typeof opts == "function") comp = opts, opts = null;
        var defOpts = { height: 240, width: 340, force_ssl: false };
        opts = opts || defOpts;

        var reqParams = $.extend({},opts,{module:'videos',page:'EmbeddedRecorder',popup:1,nohtml:1,api_key:this.getKey()});
        var inst = this;
        this.getVideoId(function(vidId){
            //var fda = inst.getRequestUrl()+'?method=GetEmbeddedRecorder&api_key='+inst.getKey()+'&width='+opts.width+'&height='+opts.height+'&force_ssl='+opts.force_ssl+(vidId?'&vguid='+vidId:'');
            var fda = inst.getServerUrl()+'/app/?module=login&actn=login&api_key='+inst.getKey()+'&redir='+btoa(inst.getServerUrl()+'/app/?'+ $.param(reqParams)+(vidId?'&vguid='+vidId:''));
            comp.call(this,{url:fda,video_id: vidId});
        });

    };

    bb.prototype.getVideoRecorder = function(opts,comp)
    {
        if (typeof opts == "function")
        {
            comp = opts;
            opts = null;
        }
        var defOpts = { height: 240, width: 340, force_ssl: false, start: null, stop: null, recorded: null };
        opts = opts || {};
        $.extend(opts,defOpts);
        if (!this.isAuthenticated())
        {
            this.onError({message:"Must authenticate session before invoking methods."});
            return;
        }
        opts.method = "GetVideoRecorder";

        // TODO; might be good to set the video id before passing to success execution
        // TODO; may need to inject the recorder event calls binding back to the API

        this.sendRequest(opts,function(response){
            console.log('GetVideoRecorder returned, calling callback');
            console.log(comp);
            if (comp) comp.call(this,response);
        });

    };

    // TODO; COULD MERGE with getVideoRecorder if the default options included, stop, start, recorded parameters
    bb.prototype.startVideoRecorder = function(opts,recordComplete)
    {
        if (typeof opts == "function") recordComplete = opts, opts = null;
        var defOpts = { type: 'embedded', target:null, height: 240, width: 340, force_ssl: false, recorderLoaded: null, recordComplete:recordComplete };
        //for (var op in defOpts) opts[op] = defOpts[op];
        opts = opts || defOpts;

        if (opts.recordComplete && !recordComplete) recordComplete = opts.recordComplete;
        this.__vidRecHndl = opts.target ? $(opts.target) : $('body').append('<div id="b2recorder"></div>');

        var rec_opts = opts;
        delete rec_opts.type, delete rec_opts.target, delete rec_opts.recordComplete, delete rec_opts.recorderLoaded;

        var inst = this;
        // get recorder and inject into target
        this.getVideoRecorder(rec_opts,function(data){
            if (!inst.currentVideoId && data.info.vid_id) inst.currentVideoId = data.info.vid_id;
            console.log('startVideoRecorder :'+inst.currentVideoId);
            inst.__vidRecHndl.html(data.info.content);
            if (opts.recorderLoaded) opts.recorderLoaded.call(inst,data.info);
        });


        // add the callbacks for the recorder to this instance calls.
        window.bbStreamStartRecord = function(strname,flname){ console.log('bbStreamStartRecord triggered'); inst.liveStreamStartRecord.call(inst,strname,flname); };
        window.bbStreamStopRecord = function(strname){ console.log('bbStreamStopRecord triggered'); inst.liveStreamStopRecord.call(inst,strname); };

        window.reportVideoRecorded = function(flname,log){ console.log('reportVideoRecorded triggered'); recordComplete({videoId:inst.currentVideoId,filename:flname,log:log}); };

    };

    bb.prototype.destroyVideoRecorder = function()
    {
        this.__vidRecHndl && this.__vidRecHndl.remove();
        window.bbStreamStartRecord = null;
        window.bbStreamStopRecord = null;
        window.reportVideoRecorded = null;
        // anything else??
    };

    bb.prototype.liveStreamStartRecord = function(streamname,filename)
    {
        this.__vidRecording = true;
        this.sendRequest({method:'liveStreamStartRecord',streamname:streamname,filename:filename});
    };

    bb.prototype.liveStreamStopRecord = function(streamname)
    {
        this.__vidRecording = false;
        this.sendRequest({method:'liveStreamStopRecord',streamname:streamname});
    };


    bb.prototype.getVideoDeliveryUrl = function(opts)
    {
        opts = $.extend({ video_id: '', autoplay: 1 },opts);
        var sPrefix = (this.getServerUrl().indexOf('dev')>0?'dev.':(this.getServerUrl().indexOf('local')>0?'local.':''));
        return 'http://'+sPrefix+'bbemaildelivery.com/bbext/?p=video_land&id='+opts.video_id+'&autoplay='+opts.autoplay;
    };

    bb.prototype.saveRecordedVideo = function(title,video_id,vfilename,success)
    {
        var vidId = video_id || this.currentVideoId;
        var inst = this;
        this.sendRequest({method:'VideoRecordedLive',title:title, filename:vfilename, vid_id:vidId},function(data) { success.call(inst,data);  });
    };



    bb.prototype.uploadVideo = function(opts,success)
    {
        // implement this
    };

    bb.prototype.getVideo = function(vidId,success)
    {
        if (!vidId) return;
        this.sendRequest({method:"GetVideos",video_id:vidId},success);
    };

    bb.prototype.getVideos = function(options,success)
    {
        var defaults = {
            updatedSince: '',
            page: '',
            pageSize: ''
        };
        var parameters = $.extend({}, defaults, options);
        parameters.method = "GetVideos";
        if (parameters.page.length || parameters.page > 0)
        {
            parameters.method = "GetVideosPaged";
        }
        this.sendRequest(parameters,success);
    };

    bb.prototype.getVideoStatus = function(vidId,success)
    {
        if (!vidId) return;
        this.sendRequest({method:"getVideoStatus",id:vidId},success);
    };

    bb.prototype.getEncodingReport = function(vidId,success)
    {
        if (!vidId) return;
        this.sendRequest({method:"getEncodingReport",id:vidId},success);
    };

    bb.prototype.deleteVideo = function(videoId,success)
    {
        this.sendRequest({method:"DeleteVideo", video_id: videoId},success);
    };

    bb.prototype.getLists = function(success)
    {
        this.sendRequest({method:"GetLists"},success);
    };

    bb.prototype.createList = function(listName,success)
    {
        this.sendRequest({method:"createList",name:listName},success);
    };

    bb.prototype.getEmails = function(success)
    {
        this.sendRequest({method:"GetEmails"},success);
    };

    bb.prototype.getContact = function(contactId,success)
    {
        if (!contactId) return;
        var defOpts = { method: 'GetContact', contact_id: contactId, width: 340, force_ssl: false };
        if (!this.isAuthenticated() && !opts.api_key) return;
        //for (var op in defOpts) opts[op] = defOpts[op];
        opts.method = "getContact";

        // if the contact list is loaded
        if (true == false)
        {
        }
        else
        {
            this.sendRequest({method:"GetContact",contact_id:contactId},success);
        }
    };

    bb.prototype.getListContacts = function(listid,success)
    {
        // implement this
        if (!listid) return;
        if (typeof listid != "object") opts = listid;

        this.sendRequest({method:"GetListContacts",list_id:listid},success);
    };

    bb.prototype.addContact = function(contact,success)
    {
        if (typeof contact == "object")
            this.sendRequest({method:"AddContact",contact:contact},success);
    };

    bb.prototype.bulkAddContacts = function(opts,success)
    {
        opts = opts || {};
        opts.method = "BulkAddContacts";
        if (typeof opts.contacts == "object")
            opts.contacts = JSON.stringify(opts.contacts);
        this.sendRequest(opts,success);
    };

    bb.prototype.updateContact = function(opts,success)
    {
        // implement this
        opts = opts || {};
        opts.method = "UpdateContact";
        this.sendRequest(opts,success);
    };

    bb.prototype.getDrips = function(opts,success)
    {
        opts = opts || {};
        opts.method = "GetDrips";
        this.sendRequest(opts,success);
    };

    bb.prototype.getForms = function(opts,success)
    {
        // implement this
        opts = opts || {};
        opts.method = "GetForms";
        // need to extend the getForms to the api end-point
        this.sendRequest(opts,success);
    };

    bb.prototype.getImportAddressesByType = function(opts,success)
    {
        opts = $.extend({ method: 'getImportAddressesByType' },opts);
        if (!opts.type) this.onError({ info: { errmsg: ['A Type must be provided.'] } });
        this.sendRequest(opts,success);
    };

    bb.prototype.addContactImportAddress = function(opts,success)
    {
        opts = $.extend({ method: 'addContactImportAddress' },opts);
        if (!opts.importAddrCode || !opts.importAddrName) this.onError({ info: { errmsg: ['An Import Address Code and Import Address Name must be provided.'] } });
        this.sendRequest(opts,success);
    };

    bb.prototype.deleteContactImportAddress = function(opts,success)
    {
        opts = $.extend({ importAddrCode: 1, method: 'deleteContactImportAddress' },opts);
        if (!opts.importAddrCode) this.onError({ info: { errmsg: ['Invalid Import Address Code'] } });
        this.sendRequest(opts,success);
    };

    bb.prototype.getClientRecentInteractions = function(opts,success)
    {
        opts = opts || {};
        opts.activitySince = opts.activitySince || '';
        opts.method = "GetClientRecentInteractions";
        this.sendRequest(opts,success);
    };

    bb.prototype.getClientIntegrations = function(success)
    {
        this.sendRequest({ method: "getClientIntegrations" },success);
    };

    bb.prototype.sendCustomVideoEmail = function(opts,success)
    {
        opts = opts || { html_content: null, subject: '', email: '', email_id: '', from_name: '' };
        opts.activitySince = opts.activitySince || '';
        opts.method = "SendCustomVideoEmail";
        this.sendRequest(opts,success);
    };

    bb.prototype.ver = function()
    {
        return bb.CONFIG.VERSION;
    }


    window.BBCore = bb;

})(function(opts){

    // this basically performs the initialization of the class

    this.userEmail = "";
    this.userId = "";
    this.clientId = "";
    this.accessToken = "";
    this.currentVideoId = null;
    this.email = null;
    this.apiServer = null;
    this.onerror = null;

    for (var opn in opts)
        this[opn] = opts[opn];

    // private properties
    this.authenticated = false;
    this.hasContext = false;
    this.storage = localStorage || window.storage;
    this.CONTENT = { QUICKSEND: '' };
    this.lastresponse = "";
    this.__vidRecording = false;
    this.__vidRecHndl = null;

    // main object types
    this.recording = function(opts)
    {
        this.vid_id = "";
        this.title = "";
        this.filename = "";

        // combine options
        for (var opt in opts) this[opt] = opts[opt];
    };

    //this.contact.prototype = array;
    this.contact = function(props)
    {
        this.email = "";
        this.firstname = "";
        this.lastname = "";
        this.phone = "";
        this.phone_number = "";
        this.address_line_1 = "";
        this.address_line_2 = "";
        this.city = "";
        this.state = "";
        this.country = "";
        this.postal_code = "";
        this.company = "";
        this.position = "";
        this.comments = "";
        for (var name in props) this[name] = props[name];
        this.eml = this.email;
    };

    // d
    this.contacts = function() {};
    this.contacts.prototype = new Array();
    this.contacts.constructor = this.contact;

    // d
    this.recordings = function() {};
    this.recordings.prototype = new Array();
    this.recordings.constructor = this.recording;

    // run initial methods
    if (this.accessToken) this.validateAccessToken();
    if (this.email && this.password) this.login(this.email,this.password);

},jQuery);