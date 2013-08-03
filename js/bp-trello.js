/*
AUTHOR
	Cycododge

UPDATED
	8/3/2013
*/

(function($){
	/* "GLOBAL" VARS */
	function resetVars(){
		return {
			math:{ //the current board status with demo structure
				totalCards:0,
				totalComplete:0
			},
			user:{ //default user settings
				progressOfCards:true, //
				progressOfScrum:false, //count scrum points instead of cards/checklists
				countCheckLists:true, //if card checklists should be counted towards total
				rememberGlobally:false //if selected list should be appended to title
			},
			sys:{ //default system settings
				lastSelectedList:'', //id of the selected list
				refreshTime:750, //how often to loop and re-check data (milliseconds)
				lastBoardURL:'' //board shortURL element
			},
			percentageComplete:0,
			backupKeywords:['{bp-done}','done','live','complete','finished','closed'], //in order of priority
			lastDoneList:[] //contains current drop list data to compare against
		}
	}
	//grab the setup
	bp = resetVars();


	/* EVENTS */

	//check that the UI still exists
		//and load the data continuously (can't figure out how to inject working listeners!)
	injectUI(); //initial call
	setInterval(injectUI,bp.sys.refreshTime);

	//reload when the done list setting is changed
	$('body').on('change','.bp-doneList select',function(){
		//save the newly selected list
		bp.sys.lastSelectedList = $(this).find('option:selected').val();

		//update the progress
		loadData();
	});


	/* FUNCTIONS */

	//push the progress bar to the UI if it doesn't exist
	function injectUI(){
		//check if on the same board and reset variables
		var newBoardURL = window.location.pathname.split(/\//gi)[2];
		if(newBoardURL != bp.sys.lastBoardURL){ bp = resetVars(); bp.sys.lastBoardURL = newBoardURL; }

		//if the UI doesn't exist
		if(!document.getElementsByClassName('ext-bp').length){
			//add it to the page
			$('#board-header').after('<div class="ext-bp"><div class="bp-barContainer"><div class="bp-progress"><span class="bp-pc">0</span>%</div></div><div class="bp-doneList"><select></select></div></div>');

			//show the progress bar
			$('.ext-bp').slideDown();
		}

		//reload the data
		loadData();
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
					//if this keyword exists in this list title
					if(nextDoneList[x].title.toLowerCase().indexOf(bp.backupKeywords[i].toLowerCase()) >= 0){
						bp.sys.lastSelectedList = nextDoneList[x].id; //set this list as selected
						ii = xx = 0; //selection found, break out of loops
					}
				}
			}

			//set the first list as selected
			if(!bp.sys.lastSelectedList){ bp.sys.lastSelectedList = nextDoneList[0].id; }
		}

		//compare the nextDoneList with lastDoneList
		if(JSON.stringify(nextDoneList) != JSON.stringify(bp.lastDoneList)){
			//update lastDoneList with nextDoneList
			bp.lastDoneList = JSON.parse(JSON.stringify(nextDoneList));

			//loop through nextDoneList
			for(var i = 0, ii = nextDoneList.length; i < ii; i++){
				//create the option lists AND set selected
				listOptions.push('<option value="'+nextDoneList[i].id+'"'+(nextDoneList[i].id == bp.sys.lastSelectedList ? ' selected':'')+'>'+nextDoneList[i].title+'</option>');
			}

			//output the list to the page
			$('.ext-bp .bp-doneList select').html(listOptions.join(''));
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
		//determine percentage
		var newPercent = Math.round((bp.math.totalComplete / bp.math.totalCards) * 100);

		//don't update if nothing changed
		if(bp.percentageComplete == newPercent){ return; }

		//update the global var
		bp.percentageComplete = newPercent;

		//adjust the progress bar
		$('.bp-progress').width(bp.percentageComplete+'%').find('.bp-pc').text(bp.percentageComplete);
	}
})(jQuery);