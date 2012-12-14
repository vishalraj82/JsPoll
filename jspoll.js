
/**
 *  JsPoll contains an object which results from execution of the
 *  anonymous function. The object contains functions with public
 *  visibility.
 *
 *  shortPoll allows user to ping a URL every 10 second for a
 *  maximum of 360 times
 *
 *  longPoll allows user to ping a URL every 30 second for a
 *  maximum of 120 times
 *
 *
 *  @author Vishal Raj
 *  @todo   If current ping request takes more than the interval
	    specified in configuration input, it's automatically
	    aborted and a fresh request initiates. With this
	    the ping process comes to halt.
 *
 */

var JsPoll = 
	( function () {

		var 
			  cfg            = {}	// object to hold ping configuration parameters
			,lastRequestStat = {};	// object to hold status of last successful ping request

		var
			  requestTime      = null	// Timestamp of initiation of current ping requst
			, responseTime     = null	// Timestamp of completion of current ping request
			, startreqThreadId = null;	// Thread id assigned to ping request by system	



		/**
		 *  Function to merge the configuration parameters input from user
		 *  and configuration parameters input from system
		 *
		 *  @param config object configuration parameters for ping request
		 *
		 *  @return object
		 */

		var mergeConfig =
			function ( config ) {
				var cfg = {
					  debug:        		false
					, log2Console:  		true
				};

				if ( typeof config.debug == 'undefined' ) {
					config.debug = cfg.debug;
				}
				if ( typeof config.log2Console == 'undefined' ) {
					config.log2Console = cfg.log2Console;
				};
				config.requestCount         = 0;
				config.abortedRequestCount  = 0;
				config.maxRequestAbortCount = 5;
				config.requestAbortSrc = '';

				return config;
			};


		/**
		 *  Function to validate the configuration for ping process
		 *
		 *  @param config object configuration parameters for ping request
		 *
		 *  @return boolean
		 */

		var validateConfig = 
			function ( config ) {
				if ( typeof config.URL != "string" || config.URL.length == 0 ) {
					return false;
				}
				return true;
			};


		/**
		 *  Function to return current timestamp
		 *  in format yyyy-mm-dd hh:mm:ss:ms
		 *  left padded with 0
		 *
		 *  @return sting
		 */

		var getCurrentTimestamp = function () {
			var date = new Date();

			/**
			 *  Function to pad input string until given length
			 *
			 *  @input str       String  string to be left padded with 0
			 *  @input padLength Integer length to which string must be padded
			 *
			 *  @return string
			 */

			var pad = 
				function ( str, padLength) {
					str = str + '';
					while ( str.length < padLength ) {
						str = '0' + str;
					}
					return str;
				}

			return date.getFullYear()
				+ '-' + pad(date.getMonth(),        2)
				+ '-' + pad(date.getDate(),         2)
				+ ' ' + pad(date.getHours(),        2)
				+ ':' + pad(date.getMinutes(),      2)
				+ ':' + pad(date.getSeconds(),      2)
				+ ':' + pad(date.getMilliseconds(), 3);
		}

		/**
		 *  Function to create xml http request object based
		 *  on user's browser capability
		 *
		 *  @return object
		 */

		var getXhr = 
			function () {
				try { return new XMLHttpRequest(); } catch ( e ) {}
				try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch ( e ) { }
				return null;
			}


		/**
		 *  Function to initiate url ping request at specified intervals
		 *
		 *  @param extObj object Ojbect sent to client for making calls to public functions
		 *
		 *  @return boolean
		 */

		var makeRequests = 
			function (extObj) {
				var xhr = getXhr();
				if ( xhr == null && extObj.config.log2Console == true ) {
					try { console.log("Ajax not supported in browser"); } catch ( e ) { }
					return false;
				}
 
				/**
				 *  Function to monitor the change in state and status of xmlhttp request object
				 *  If the ping url doest not reports http status code 200, abort immediately
				 *  and no further requests will be made
				 */

				xhr.onreadystatechange = 
					function () {
						if ( 4 == this.readyState && 200 == this.status ) {
							responseTime = getCurrentTimestamp();
							setLastRequestStat ({ 
								  requestTime:  requestTime
								, responseTime: responseTime
								, responseText: this.responseText
								, status:       'COMPLETED'
							});
							if ( cfg.requestCount++ >= cfg.maxRequests ) {
								extObj.stop();
							}
							try { window.clearTimeout(cfg.abortReqThreadId); } catch ( e ) { }
						}
						// Abort polling process if the URL was not found 
						// or else if maximum number of allowed aborted poll
						// requests have been done.
						if ( (200 != this.status  && 'JSPOLL' != cfg.requestAbortSrc) 
							|| cfg.abortedRequestCount >= cfg.maxRequestAbortCount ) {
							extObj.stop();
						}
					};

				/**
				 *  Function to set timer to create new xmlhttp request at interval
				 *  specified in the ping configuratio parameter object
				 *
				 *  @param anonymouse function pointer to anonymous function which will be called at fixed interval
				 *
				 *  @return integer 
				 */

				cfg.startReqThreadId = window.setInterval (
							function () {
								// Create a timeout function which will abort
								// the current poll request, just one second
								// before another poll request thread starts
								cfg.abortReqThreadId = window.setTimeout (
									function () {
										try {
											if ( 4 != xhr.readyState || 200 != xhr.status ) {
												cfg.requestAbortSrc = 'JSPOLL';
												cfg.abortedRequestCount++;
												xhr.abort();
												setLastRequestStat ({ 
													  requestTime:  null
													, responseTime: null
													, responseText: null
													, status:       'ABORTED'
												});
											};
										} catch ( e ) { }
									}, ( cfg.PingInterval - 1 ) * 1000 );
									
								requestTime = getCurrentTimestamp ();
								xhr.open("GET", cfg.URL, true);
								xhr.send(null);
								cfg.requestAbortSrc = '';
							}, (cfg.PingInterval * 1000 ) );

				return cfg.startReqThreadId ? true : false;
			};


		/**
		 *  Function to validate input configuration parameters
		 *  and start ping process if all is OK
		 *
		 *  @param objExt object reference to object returned to client for external usage
		 *  @param config object configuration parameters for ping request
		 *
		 *  @return boolean
		 */

		var startPing = 
			function(objExt, config) {
				if ( false == validateConfig(config)) {
					try { console.log("Invalid configuration input") } catch ( e ) { }
					return false;
				}
				cfg = mergeConfig(config);
				return makeRequests(objExt);
			}

		/**
		 *  Function to set the status for last ping request
		 *  Returns an object containing request start time,
		 *  request complete time and the output from the ping
		 *  URL
		 *
		 *  @param requestStat object contains details about last ping request
		 *
		 *  @return void
		 */

		var setLastRequestStat = 
			function (requestStat) {
				lastRequestStat = requestStat;
				if ( true == cfg.debug || true == cfg.log2Console ) {
					var logTxt = "Request: " + requestStat.requestTime
						+ " Response: " + requestStat.responseTime
						+ " Output: " + requestStat.responseText;
					if ( true == cfg.debug ) {
						var p = document.createElement("P");
						p.innerHTML = logTxt;
						try { document.getElementById('jsp_output').appendChild(p); } catch ( e ) { }		
					} else if ( true == cfg.log2Console ) { 
						try { console.log(logTxt); } catch ( e ) { }
					}
				} 
			}


		/**
		 *  Return an object which contains functions
		 *  which are availble for public usage
		 */

		return {
			/**
			 *  Function to begin short polling a server.
			 *  The URL will be polled every 10 seconds,
			 *  with a maximum of 360 requests
			 *  If a previous thread is already running
			 *  it will automatically be aborted and a
			 *  new ping thread will start
			 *
			 *  @param pingURL String URL to be pinged
			 *
			 *  @return void
			 */
			  shortPoll:
				function ( pingURL ) {
					var t = this;
					this.stop();
					startPing(t, {
						  URL:          pingURL
						, PingInterval: 5
						, maxRequests:  360
					});
				}

			/**
			 *  Function to begin long polling a server.
			 *  The URL will be polled every 30 seconds,
			 *  with a maximum of 120 requests
			 *  If a previous thread is already running
			 *  it will automatically be aborted and a
			 *  new ping thread will start
			 *
			 *  @param pingURL String URL to be pinged
			 *
			 *  @return void
			 */
			, longPoll:
				function ( pingURL ) {
					var t = this;
					this.stop();
					startPing(t, {
						  URL:          pingURL
						, PingInterval: 30
						, maxRequests:  120
					});
				}

			/**
			 *  Function to stop the poll process
			 *
			 *  @return boolean
			 */

			, stop:
				function () {
					if ( 'undefined' != typeof cfg.startReqThreadId ) {
						try { 
							window.clearInterval( cfg.startReqThreadId ); 
						} catch ( e ) { }
					}
					if ( 'undefined' != typeof cfg.abortReqThreadId ) {
						try {
							window.clearTimeout ( cfg.abortReqThreadId );
						} catch ( e ) { }
					}
				}

			/**
			 *  Function to fetch the status of last ping request
			 *  contains request start time, request end time and
			 *  output from the ping URL
			 *
			 *  @return Object
			 */

			, getLastRequestStat:
				function () {
					return lastRequestStat;
				}

			/**
			 *  Function to return number of successfully completed ping requests
			 *
			 *  @return integer
			 */

			, getCompletedRequestCount:
				function () {
					return cfg.requestCount;
				}

			/**
			 *  Function to return max number of pings that will be initiated
			 *
			 *  @return integer
			 */

			, getMaxRequestCount:
				function () {
					return cfg.maxRequests;
				}
		}
	})();