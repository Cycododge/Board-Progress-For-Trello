/*
AUTHOR
	Cycododge

UPDATED
	8/8/2013
*/

(function($){
	/* "GLOBAL" VARS */

	//initialize variables.
	var _lists = [], _cards = [], browser = {}, bp = {}, curBoard = '', firstVisit = false,
		injectedHTML = '<div class="ext-bp"><div class="bp-optionsIcon icon-sm icon-checklist bp-button"></div><div class="bp-barContainer"><div class="bp-progress" style="width:20%;"><span class="bp-pc">0%</span></div></div><div class="bp-settings"><div class="bp-column"><select class="bp-doneList"></select></div><div class="bp-column"><div class="bp-inputContainer"><input data-setting="countCheckLists" type="checkbox" />Track Checklists</div></div><div class="bp-saveSettings bp-button">Close</div></div></div>';

	//get the current board, then fire the script
	var curBoardInterval = setInterval(function(){
		curBoard = getBoard(); //set as current board to avoid additional loop

		//if something was returned, exit loop and continue script
		if(curBoard.hasOwnProperty('id')){
			curBoard = curBoard.id; //reset itself to the
			clearInterval(curBoardInterval); //exit the loop
			initScript(); //start the script
		}
	},50);

	//start running the rest of the script and init events
	function initScript(){
		//grab the setup
		browser = loadLocal(); //load user saved
		bp = resetVars(); //create script vars
		initEvents(); //attach listeners and start loop
	}

	//reset everything
	function resetVars(){
		//check to see if this board exists in browser{}
		if(!browser[curBoard]){ browser[curBoard] = {}; firstVisit = true; }

		//give back the refreshed settings
		return {
			math:{ //the current board status with demo structure
				totalCards:0,
				totalComplete:0
			},
			user:{ //default user settings
				progressOfCards:true, //
				progressOfScrum:false, //count scrum points instead of cards/checklists
				countCheckLists:(typeof browser[curBoard].countCheckLists == 'boolean' ? browser[curBoard].countCheckLists : false), //if card checklists should be counted towards total
				rememberGlobally:false //if selected list should be appended to title
			},
			sys:{ //default system settings
				lastSelectedList:browser[curBoard].lastSelectedList || '', //id of the selected list
				refreshTime:500, //how often to loop and re-check data (milliseconds)
				lastMenuOpen:'', //if the right menu is open
				settingsOpen:(typeof browser[curBoard].settingsOpen == 'boolean' ? browser[curBoard].settingsOpen : true), //if the settings are visible
				lastBoardURL:curBoard //board shortURL element
			},
			percentageComplete:0,
			backupKeywords:['{bp-done}','done','live','complete','finished','closed'], //in order of priority
			lastDoneList:[] //contains current drop list data to compare against
		};
	}

	//setup the events
	function initEvents(){
		//check that the UI still exists
			//and load the data continuously (can't figure out how to inject working listeners!)
		injectUI(); //initial call
		setInterval(injectUI,bp.sys.refreshTime);

		//update settings as they are checked
		$('body').on('change','.ext-bp .bp-settings input[type="checkbox"]',function(){
			//save the new status
			var setting = $(this).data('setting');
			bp.user[setting] = $(this).prop('checked');
			saveLocal(setting,bp.user[setting]); //save to the browser
		});

		//reload when the done list setting is changed
		$('body').on('change','.ext-bp .bp-doneList',function(){
			//save the newly selected list
			bp.sys.lastSelectedList = $(this).find('option:selected').val(); //update in script
			saveLocal('lastSelectedList',bp.sys.lastSelectedList); //save to the browser

			//update the progress
			loadData();
		});

		//listen for the window to be resized and update bar width
		$(window).on('resize',function(){
			$('.ext-bp .bp-barContainer,.ext-bp .bp-settings').animate({width:$('#header').width()-30});
		});

		//open/close settings
		$('body').on('click','.ext-bp .bp-optionsIcon',function(){
			var $this = $(this);

			//if not open, open it
			if(!$this.hasClass('bp-active')){
				bp.sys.settingsOpen = true; //update script
				$this.addClass('bp-active'); //mark as open
				$('.ext-bp .bp-settings').slideDown(); //open the menu
			}else{
				bp.sys.settingsOpen = false; //update script
				$this.removeClass('bp-active'); //remove mark
				$('.ext-bp .bp-settings').slideUp(); //close the menu
			}

			//save the new setting
			saveLocal('settingsOpen',bp.sys.settingsOpen);
		});

		//close settings
		$('body').on('click','.ext-bp .bp-saveSettings',function(){
			$('.ext-bp .bp-optionsIcon').trigger('click'); });
	}

	//get the board data
	function getBoard(){
		//grab the first card and return the board
		for(var cardID in ModelCache._cache.Card){
			if(!ModelCache._cache.Card.hasOwnProperty(cardID)){ continue; }
			return ModelCache._cache.Card[cardID].getBoard(); //send back the board
		}

		//if the function made it here, the board was not retrieved.
		return '';
	}

	//save the settings back to the browser
	function saveLocal(key,val){
		browser[curBoard][key] = val;
		localStorage.setItem('ext-bp',JSON.stringify(browser));
	}

	//load settings from the browser
	function loadLocal(){
		//load the settings from localStorage
		var local = JSON.parse(localStorage.getItem('ext-bp') || '{}');

		//check that the current board has saved settings
		if(!local[curBoard]){ local[curBoard] = {}; }

		//send it back up top
		return local;
	}

	//push the progress bar to the UI if it doesn't exist
	function injectUI(){
		//check if on the same board and reset variables
		curBoard = getBoard().id;
		if(curBoard != bp.sys.lastBoardURL){ bp = resetVars(); bp.sys.lastBoardURL = curBoard; }

		//if the UI doesn't exist
		if(!document.getElementsByClassName('ext-bp').length){
			$('#board-header').after(injectedHTML); //add html to the page

			//create the initial settings
			$('.ext-bp input[data-setting="countCheckLists"]').prop('checked',browser[curBoard].countCheckLists);

			//open the progress bar
			$('.ext-bp').slideDown(continueLoad);
		}else{ continueLoad(); }

		//allows for inject animation to complete
		function continueLoad(){
			//detect width changes
			var curMenuOpen = !$('.board-wrapper').hasClass('disabled-all-widgets');
			if(bp.sys.lastMenuOpen !== curMenuOpen){
				//save for next check
				bp.sys.lastMenuOpen = curMenuOpen;

				//if menu open
				var newWidth = $('#header').width() - 30;
				if(curMenuOpen){
					//set width to header
					newWidth = $('#board-header').width();
				}

				//set the UI width
				$('.ext-bp .bp-barContainer,.ext-bp .bp-settings').delay(100).animate({width:newWidth}).find('.bp-pc').slideDown();
			}

			//if supposed to be open, but not
			if(bp.sys.settingsOpen && !$('.ext-bp .bp-optionsIcon').hasClass('bp-active')){ $('.ext-bp .bp-optionsIcon').trigger('click'); }

			//reload the data
			loadData();
		}
	}

	//update the list of cards
	function updateDoneOptions(_lists){
		var nextDoneList = [], listOptions = [];

		//loop through the current lists on the board
		for(var listID in _lists){
			if(!_lists.hasOwnProperty(listID)){ continue; }
			if(_lists[listID].attributes.closed){ continue; } //skip if the list is closed

			//add to new array
			nextDoneList.push({id:listID,title:_lists[listID].attributes.name});
		}

		//if there are no lists, exit
		if(!nextDoneList.length){ return false; }

		//if a selected list hasn't been specified
		if(!bp.sys.lastSelectedList){
			//loop through list of keywords to check titles against
			for(var i = 0, ii = bp.backupKeywords.length; i < ii; i++){
				//loop through each list title
				for(var x = 0, xx = nextDoneList.length; x < xx; x++){
					//if this keyword exists in this lists title
					if(nextDoneList[x].title.toLowerCase().indexOf(bp.backupKeywords[i].toLowerCase()) >= 0){
						bp.sys.lastSelectedList = nextDoneList[x].id; //set this list as selected
						ii = xx = 0; //selection found, break out of all loops
					}
				}
			}

			//set the first list as selected if still not set
			if(!bp.sys.lastSelectedList){ bp.sys.lastSelectedList = nextDoneList[0].id; }
		}

		//compare the nextDoneList with lastDoneList
		if(JSON.stringify(nextDoneList) != JSON.stringify(bp.lastDoneList)){
			//update lastDoneList with nextDoneList
			bp.lastDoneList = JSON.parse(JSON.stringify(nextDoneList));

			//loop through nextDoneList
			for(var n = 0, nn = nextDoneList.length; n < nn; n++){
				//create the option lists AND set selected
				listOptions.push('<option value="'+nextDoneList[n].id+'"'+(nextDoneList[n].id == bp.sys.lastSelectedList ? ' selected':'')+'>'+nextDoneList[n].title+'</option>');
			}

			//output the list to the page
			$('.ext-bp .bp-doneList').html(listOptions.join(''));
		}

		return true; //let the parent know to continue
	}

	//refresh the data from the board
	function loadData(){
		//reset
		bp.math.totalCards = 0;
		bp.math.totalComplete = 0;
		_lists = ModelCache._cache.List;
		_cards = ModelCache._cache.Card;

		//try updating the drop down. If there are no lists, try again (with buffer).
		if(!updateDoneOptions(_lists)){ setTimeout(loadData,100); return; }

		//for each list
		for(var listID in _lists){
			if(!_lists.hasOwnProperty(listID)){ continue; } //skip if not a list
			if(_lists[listID].attributes.closed){ continue; } //skip if the list is closed

			//loop through each card
			for(var cardID in _cards){
				if(!_cards.hasOwnProperty(cardID)){ continue; } //skip if not a card
				if(_cards[cardID].attributes.closed){ continue; } //skip if the card is closed
				if(_cards[cardID].attributes.idList != listID){ continue; } //skip if the card doesn't belong to this list
				if(_cards[cardID].view.el.className.indexOf('hide') >= 0){ continue; } //skip if hidden

				//if allowed count checklists for this card
				var numCheckLists = 0;
				if(bp.user.countCheckLists){
					//loops through available checklists
					for(var i = 0, ii = _cards[cardID].checklistList.length; i < ii; i++){
						//count the number of checklist items towards total
						numCheckLists += _cards[cardID].checklistList.models[i].attributes.checkItems.length;
					}
				}

				//add this card to the total
				bp.math.totalCards += numCheckLists || 1;

				//if this card is in the "done" list
				if(listID == bp.sys.lastSelectedList){
					bp.math.totalComplete += numCheckLists || 1; //count towards complete
				}
			}
		}

		//update the progress on the board
		updateProgress();
	}

	//update the progress bar
	function updateProgress(){
		//check if there are any cards
		var newPercent = 0;
		if(bp.math.totalCards){
			//determine percentage
			newPercent = Math.round((bp.math.totalComplete / bp.math.totalCards) * 100);
		}

		//don't update if nothing changed
		if(bp.percentageComplete == newPercent){ return; }

		//update the global var
		bp.percentageComplete = newPercent;

		//adjust the progress bar
		$('.bp-progress').animate({width:bp.percentageComplete+'%'}).find('.bp-pc').text(bp.percentageComplete+'%');
	}
})(jQuery);