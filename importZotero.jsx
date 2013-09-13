//Citation Import for Zotero (modified MOD export) to Indesign CS6 or later
//(c) 2013 Kai Kasugai
app.scriptPreferences.version = 8; //Indesign CS6 and later. Use 7.5 to use CS5.5 features
//$.level = 2;

//global vars
var myDocument, myXML;
//styles, tags, layer
var parsedReferenceStyle, parsedReferenceTag, noReferenceStyle;
var referenceParagraphStyle, referenceParagraphStyleHead;
var styleAuthor, styleYear, styleTitle;
var hoverObjectLayer; //the layer for hover objects
var hoverObjectStyle; //the style for hover objects (the hidden ones)
var hoverTriggerStyle; //the style for the objects (rectangles) that mask the text and trigger the hover object
var hoverTextFrameStyle; //the style for the textframe that contains the bibliography info
//text frame with bibliography
var myRefTextFrame;
//arrays
var myCitekeyInfo = new CiteKeyInfo();
//error arrays
var error_publishtypes = new Array();
var error_general = new Array();
var notice_general = new Array();
var notice_ambiguities = new Array();
var foundNew = 0;
var foundTotal = 0;
var removedOld = 0;
//settings
var showStatistics, showWarnings, checkForAmbiguousCitekeys;
var createHoveringReferences;
var defaultDirectory = false;
var useDefaultDirectory = false;
var langBibliographyName = "References";
var langAuthorConnector = "and";
var langEditorString = "Edt.";
var langOnlineAsOfString = "online as of";
var xmlSettingsTag = 'zoteroImportSettings';

//progress bar und timer
var individualReferenceProgressBarSpace = 50
var individualBibliographyItemProgressBarSpace = 20
var myMaximumValue = 50;
var myProgressBarWidth = 400;
var myReferenceTooltipIndexCounter = 0;
var timeStart, timeEnd;
var stime;

//Locate and run the glue code.jsx file.
var myFilePath = app.filePath + "/Scripts/xml rules/glue code.jsx";
if(File(myFilePath).exists == false){
	myFilePath = File.openDialog("Locate the file: glue code.jsx");
}
if(myFilePath != null){
	var myFile = File(myFilePath); app.doScript(myFile);
	main();
} else {
	alert('unable to locate glue code.jsc');
}

function main(){
	myDocument = app.documents.item(0);

	//define styles and tag vars
	parsedReferenceStyle = returnCharacterStyleOrCreatenew("parsedReference","References");
	noReferenceStyle = myDocument.characterStyles[0]; //[0] should always be equal to [None], but as the name for [none] is internationalised, we cannot use myDocument.characterStyles.item("[None]"),  but have to use the first object in the document character styles array
	styleAuthor = returnCharacterStyleOrCreatenew("REF-Autor","References");
	styleYear = returnCharacterStyleOrCreatenew("REF-Jahr","References");
	styleTitle = returnCharacterStyleOrCreatenew("REF-Titel","References");
	referenceParagraphStyle = returnParagraphStyleOrCreatenew("References", "References", {
		leftIndent: 6,
		firstLineIndent: -6,
		spaceAfter: 3,
		pointSize:10,
		appliedFont: "Minion Pro",
		fontStyle: "Regular"
	});
	referenceParagraphStyleHead = returnParagraphStyleOrCreatenew("Level 1","Level");
	referenceHoverParagraphStyle = returnParagraphStyleOrCreatenew("References Hover", "References", {
		basedOn: referenceParagraphStyle,
		firstLineIndent: 0,
		leftIndent: 0
	});
	hoverObjectLayer = returnLayerOrCreatenew("Hover Objects");
	hoverTriggerStyle = returnObjectStyleOrCreatenew("Hover Object Trigger (hidden)",{
		enableFill: true,
		fillColor: myDocument.swatches[0],
//~		 objectEffectsEnablingSettings: {
//~			 enableTransparency: true },
//~		 transparencySettings: {
//~			 blendingSettings: {
//~				 blendMode: BlendMode.MULTIPLY, opacity: 30}},
		enableStroke: true,
		strokeColor: myDocument.swatches[0],
		enableTextWrapAndOthers: true,
		textWrapPreferences: {
			textWrapMode: TextWrapModes.NONE}
	});

	hoverTextFrameStyle = returnObjectStyleOrCreatenew("Hover Textframe",{
		enableFill: true,
		fillColor: myDocument.swatches[2],
		fillTint: 100,
		objectEffectsEnablingSettings: {
			enableTransparency: false },
		enableStroke: true,
		strokeColor: myDocument.swatches[3],
		strokeWeight: .1,
		enableTextWrapAndOthers: true,
		textWrapPreferences: {
			textWrapMode: TextWrapModes.NONE},
		enableTextFrameGeneralOptions: true,
		enableTextFrameAutoSizingOptions: true,
		textFramePreferences :{
			ignoreWrap: true,
			textColumnCount: 1,
			autoSizingType: AutoSizingTypeEnum.HEIGHT_ONLY,
			autoSizingReferencePoint: AutoSizingReferenceEnum.TOP_CENTER_POINT,
			insetSpacing:4}
		
	});

	//set tag or create new
	try{
		parsedReferenceTag = myDocument.xmlTags.item('referencetag');
		name = parsedReferenceTag.name;
	} catch(e) {
		parsedReferenceTag = myDocument.xmlTags.add('referencetag');
	}
		
	//ask for options
	if (!userSettingsDialog()){
		return false;
	}

	//zeitmessung starten
	timeStart = new Date().getTime();

	//progress bar
	myCreateProgressPanel((createHoveringReferences ? myMaximumValue + individualReferenceProgressBarSpace : myMaximumValue), myProgressBarWidth);
	myProgressPanel.show();
	myProgressPanel.myProgressBar.value = 0;
	myProgressPanel.myText.text = "Starting Import";

	//import XML file
	if (!myImportXMLFileUsingDefaults()) {
		return false;
	}

	//show unknown genres so that we can improve the script when a new genre comes up
	if (error_publishtypes.length > 0){
		alert("Following genres where unknown:\n" + error_publishtypes);
	}

	//show errors
	if (error_general.length > 0){
		alert("There where following errors:\n" + error_general.join("\n"));
	}

	//show warnings (if activated)
	if (notice_general.length > 0 && showWarnings){
		alert("There where following warnings:\n" + notice_general.join("\n\n"));
	}

	//show warnings (if activated)
	if (notice_ambiguities.length > 0 && checkForAmbiguousCitekeys){
		alert("Following citekeys where ambiguous:\n" + notice_ambiguities.join("\n"));
	}

}

//asks for a xml file and imports it using set defaults
function myImportXMLFileUsingDefaults(){
	myProgressPanel.myText.text = "Loading XML File";
	myProgressPanel.myProgressBar.value = 2;
	
	//xml file pre-read
	var myXMLFile;
	if (useDefaultDirectory){
		myXMLFile = new File(defaultDirectory);
	}
	else {
		myXMLFile = File.openDialog("Please select the Zotero XML file", "*.xml");
		if (myXMLFile == null) {
			alert('You cancelled. Aborting script.');
			return false;
		}

		//write default directory setting
		checkOrWriteSetting("defaultDirectory",myXMLFile);
	}

	if (!myXMLFile.exists){
		checkOrWriteSetting("defaultDirectory","");
		alert('error reading file');
		exit();
	}
	myXMLFile.open('r');
	
	myProgressPanel.myText.text = "Reading XML File";
	myProgressPanel.myProgressBar.value = 3;

	var myXMLStr = myXMLFile.read(); //read XML file into variable
	myXMLFile.close(); //close XML file
	var root = new XML(myXMLStr); //convert variable into XML object
	var xc = root.xpath("//mods"); //all elements in the XML File
	if (xc.length() < 1){
		checkOrWriteSetting("defaultDirectory","");
		alert("no valid Items found in file");
		return false;
	}
	//$.writeln('Number of references in XML found: ' + xc .length());
	
	myProgressPanel.myText.text = "Finding new citations";
	myProgressPanel.myProgressBar.value = 5;
	
	//USING FIND
	// Clear the find/change grep preferences
	app.findGrepPreferences = NothingEnum.NOTHING;
	app.changeGrepPreferences = NothingEnum.NOTHING;
	// Set the find options
	app.findChangeGrepOptions.includeFootnotes = true;
	app.findChangeGrepOptions.includeHiddenLayers = false;
	app.findChangeGrepOptions.includeLockedLayersForFind = false;
	app.findChangeGrepOptions.includeLockedStoriesForFind = false;
	app.findChangeGrepOptions.includeMasterPages = false;
	app.findGrepPreferences.findWhat = '\\\\cite[rayt]?\\{[^{}]*\\}';
	var myFindings = myDocument.findGrep();
	// Clear the find/change grep preferences again
	app.findGrepPreferences = NothingEnum.NOTHING;
	app.changeGrepPreferences = NothingEnum.NOTHING;

	myProgressPanel.myText.text = "Parsing new citations";
	myProgressPanel.myProgressBar.value = 7;

	for (var i = myFindings.length - 1; i >= 0; i--){
		myProgressPanel.myText.text = "Parsing new citations (" + (myFindings.length - i) + "/" + myFindings.length + ")";
		var myRawCitekey = myFindings[i].texts[0];
		var myCitekeyMatchArray = myRawCitekey.contents.match(/\\(cite[rayt]?)\{([^{}]*)\}/);
		var myCiteType = myCitekeyMatchArray[1];
		var myCitekey = myCitekeyMatchArray[2];
		//continue and alert if no proper citekey was found (shouldnt ever happen, because this is part of a grep find with exactyly the same regex)
		if (!myCitekey || myCitekey == ''){
			error_general.push("Error when parsing citekey " + myRawCitekey.contents);
			continue;
		}
		
		//create xml element and add attributes
		var myNewXMLElement;
		try{
			//first create a new xml element in the associated xml element
			myNewXMLElement = myRawCitekey.associatedXMLElements[0].xmlElements.add(parsedReferenceTag);
		} catch(e){
			myDocument.xmlElements[0].xmlElements.add('storyelement',myRawCitekey.parentStory);
			myNewXMLElement = myRawCitekey.associatedXMLElements[0].xmlElements.add(parsedReferenceTag);
		}
		//apply an attribute
		myNewXMLElement.xmlAttributes.add('citekey',myCitekey.replace(/^\s+|\s+$/g, '')); //safe attribute using trimming
		//add attribute describing the citekey type
		switch(myCiteType){
			case 'citea':
				myNewXMLElement.xmlAttributes.add('citetype','authorOnly');
				break;
			case 'citey':
				myNewXMLElement.xmlAttributes.add('citetype','yearOnly');
				break;
			case 'cite':
				myNewXMLElement.xmlAttributes.add('citetype','default');
				break;
			case 'citer':
				myNewXMLElement.xmlAttributes.add('citetype','noBrackets');
				break;
			case 'citet':
				myNewXMLElement.xmlAttributes.add('citetype','titleOnly');
				break;
			default:
				//to extend, add the new cite command and make sure that you add it to the 2 regular expressions (find settings and also in this for loop)
				myNewXMLElement.xmlAttributes.add('citetype','unknown type');
				error_general.push("cannot determine cite type for" + myCitekey);
				break;
		}
		
		//link the xmlelment (which was, until now, at the end of the structure) to the text (the xml element then moves to the right point in the structure, according to the occurence of the text)
		if (myRawCitekey.parent.constructor.name == 'Footnote'){
			notice_general.push('References cannot be in footnotes, ignoring key ' + myCitekey + ' (type ' + myNewXMLElement.xmlAttributes.itemByName('citetype').value + ').');
		} else {
			myRawCitekey.markup(myNewXMLElement);
			foundNew++;
		}
	}

	myProgressPanel.myText.text = "Parsing document structure";
	myProgressPanel.myProgressBar.value = 9;

	myXML= myDocument.xmlElements[0];
	var allReferenceTags = myXML.evaluateXPathExpression("//referencetag");

	myProgressPanel.myText.text = "Deleting empty elements";
	myProgressPanel.myProgressBar.value = 11;

	//now, all new citekeys have been tagged. we can parse the document xml and collect unique citekeys. go backwards, because we want to delete empty elements
	for (var r = allReferenceTags.length - 1; r >=0 ; r--){
		//see if the element content was empty and delete the tag and the item in the array if so
		if (allReferenceTags[r].contents.replace(/^\s+|\s+$/g, '') == ''){
			allReferenceTags[r].remove(); //removes the tag
			allReferenceTags.splice(r,1); //removes the item in the array
			removedOld++;
			continue;
		}

		//add citetype attribute if not already done (for compatibility reasons with older documents)
		try{
			allReferenceTags[r].xmlAttributes.itemByName('citetype').value;
		}
		catch(e) {
			notice_general.push(allReferenceTags[r].xmlAttributes.item('citekey').value + ' did not have citetype attribute. adding default attribute.');
			allReferenceTags[r].xmlAttributes.add('citetype','default');
		}

		//store citekey in an array to be sorted and processed later
		myCitekeyInfo.getKey(allReferenceTags[r].xmlAttributes.item('citekey').value);
		foundTotal++;
	}

	myProgressPanel.myText.text = "Sorting references";
	myProgressPanel.myProgressBar.value = 13;

	//sort references in bibliography by citekey
	myCitekeyInfo.sortKeys();

	myProgressPanel.myText.text = "Deleting old hyperlink sources";
	myProgressPanel.myProgressBar.value = 15;

	//CLEAN UP
	//delete existing hyperlink sources (text anchors within the xmlelement.content)
	if (myDocument.hyperlinkTextSources.length > 0){
		for(var i = myDocument.hyperlinkTextSources.length -1; i >= 0; i--){
			//do not remove the contents of the comment around the OR condition. this might be needed to clean older files, that did not use labels but used names starting with ZotRefSrc (as they do now, but regex match is slow...)
			//somehow, the second "or" condition seems to be necessary, even though the label should identify all links.
			//TODO: check why the regex is necessary
			if (myDocument.hyperlinkTextSources[i].label == 'zotrefLinksrc' || myDocument.hyperlinkTextSources[i].name.match(/ZotRefSrc[0-9]+/i)){
				//$.writeln("deleted source: " + allHyperlinkSources[i].name + ", label: " + allHyperlinkSources[i].label);
				myDocument.hyperlinkTextSources[i].remove();
			}
		}
	}

	myProgressPanel.myText.text = "Deleting old hyperlink destinations";
	myProgressPanel.myProgressBar.value = 17;

	//delete all hyperlink destinations
	if (myDocument.hyperlinkTextDestinations.length > 0){
		for (var i = myDocument.hyperlinkTextDestinations.length - 1; i >= 0; i--){
			if (myDocument.hyperlinkTextDestinations[i].label == 'zotrefLinkDest' || myDocument.hyperlinkTextDestinations[i].label == 'zotrefBackLinkDest') {
				myDocument.hyperlinkTextDestinations[i].remove();
			}
		}
	}

	myProgressPanel.myText.text = "Deleting old hyperlink";
	myProgressPanel.myProgressBar.value = 22;

	//delete all hyperlinks (seems to be unnecessary as hyperlinks (src - dest)) are automatically deleted when the hyperlink source is deleted)
	//hyperlink destinations need not to be deleted as they are deleted with the emptying of the reference frame
	if (myDocument.hyperlinks.length > 0){
		for (var i = myDocument.hyperlinks.length - 1; i >= 0; i--){
			if (myDocument.hyperlinks[i].label == 'zotrefHyperlink'){
				myDocument.hyperlinks[i].remove();
			}
		}
	}

	myProgressPanel.myText.text = "Deleting old tooltip buttons and trigger buttons";
	myProgressPanel.myProgressBar.value = 25;

	//remove all old hover and trigger buttons
	for(var i = myDocument.buttons.length - 1; i >=0; i--){
		if (myDocument.buttons.item(i).label == 'zotRefHoverButton' || myDocument.buttons.item(i).label == 'zotRefTriggerButton'){
			myDocument.buttons.item(i).remove();
		}
	}

	myProgressPanel.myText.text = "Looking for bibliography textframe";
	myProgressPanel.myProgressBar.value = 28;

	//CREATE REFERENCE TEXT FRAME
	//find reference text frame
	for (var i = 0; i < myDocument.pages.count(); i++){
		for (var j = 0; j < myDocument.pages[i].textFrames.count(); j++){
			if (myDocument.pages[i].textFrames[j].label == 'references'){
				myRefTextFrame = myDocument.pages[i].textFrames[j];
				myRefTextFrame.parentStory.contents = "";
				addFormattedTextToStory(myRefTextFrame,false,(langBibliographyName == '' ? " " : langBibliographyName),referenceParagraphStyleHead);
			}
		}
	}
	//create new page with textframe for references if none was found
	if (!myRefTextFrame){
		var newPage = myDocument.pages.add();
		myRefTextFrame = newPage.textFrames.add();
		myRefTextFrame.label = 'references';
		//move and scale the text frame to the right dimensions, according on the side the page is placed
		if (newPage.side == PageSideOptions.RIGHT_HAND){
			myRefTextFrame.geometricBounds = [newPage.marginPreferences.top,newPage.bounds[1] + newPage.marginPreferences.left,newPage.bounds[2] - newPage.marginPreferences.bottom,newPage.bounds[3] - newPage.marginPreferences.right];
		} else {
			myRefTextFrame.geometricBounds = [newPage.marginPreferences.top,newPage.bounds[1] + newPage.marginPreferences.right,newPage.bounds[2] - newPage.marginPreferences.bottom,newPage.bounds[3] - newPage.marginPreferences.left];
		}
		addFormattedTextToStory(myRefTextFrame,false,(langBibliographyName == '' ? " " : langBibliographyName),referenceParagraphStyleHead);
		notice_general.push("Page " + (newPage.documentOffset+1) + " was created with the textframe for the references. If you want to define your own reference textframe, please create a textframe with the script-label \"references\". This textframe (and the parent story) will be emptied and filled with references.");
	}

	myProgressPanel.myText.text = "Building bibliography";
	myProgressPanel.myProgressBar.value = myMaximumValue - individualBibliographyItemProgressBarSpace;

	//search for citekey in the xml file and add to the references textframe
	findings:
	for(var i = 0; i < myCitekeyInfo.citeKeyArray.length; i++){
		myProgressPanel.myText.text = "Building bibliography " + (i+1) + "/" + myCitekeyInfo.citeKeyArray.length + ": " + myCitekeyInfo.citeKeyArray[i].citeKey;
		myProgressPanel.myProgressBar.value += individualBibliographyItemProgressBarSpace / myCitekeyInfo.citeKeyArray.length;
		
		//search for citekey in the xml document
		xmlcontents:
		for(var c = 0; c < xc .length(); c++){
			if (xc[c].citeKey == myCitekeyInfo.citeKeyArray[i].citeKey){
				myCitekeyInfo.citeKeyArray[i].found = true;
				addFormattedTextToStory(myRefTextFrame,false, "\r",false);
				myCitekeyInfo.citeKeyArray[i].hyperlinkTextDestination = myDocument.hyperlinkTextDestinations.add(myRefTextFrame.parentStory.insertionPoints[-1],{name:"ref-" + xc[c].citeKey, label: 'zotrefLinkDest'}); //create a hyperlink text destination and safe it in the meta data of the citation
				addFormattedTextToStory(myRefTextFrame,styleAuthor, getAuthorNames(xc[c]),referenceParagraphStyle);
				addFormattedTextToStory(myRefTextFrame,styleTitle,  getTitle(xc[c]));
				addFormattedTextToStory(myRefTextFrame,styleTitle,  getPublishedIn(xc[c]));
				addFormattedTextToStory(myRefTextFrame,styleYear,  getYearAndPublisher(xc[c]));
				//safe an insertion point in the paragraph in metadata to later be able to adress the paragraph (ie. for duplication of the paragraph into a button)
				myCitekeyInfo.citeKeyArray[i].bibParagraphInsertionPoint = myRefTextFrame.parentStory.insertionPoints[-2].index; //use -2, to not get the last insertionpoint, which moves as new content is added
				continue findings;
			}
		}
		error_general.push("CITEKEY NOT FOUND: " + myCitekeyInfo.citeKeyArray[i].citeKey);
	}

	//add a final linebreak to story. otherwise, we cannot insert things after the last paragraph
	addFormattedTextToStory(myRefTextFrame,false, "\r",false);

	myProgressPanel.myText.text = "Parsing tags in document";
	myProgressPanel.myProgressBar.value = myMaximumValue;

	stime = new splittime();

	stime.addtime('until loop');
	//now, all citekeys where searched and all citekeys in the text have a tag. we can parse the tags and replace the contents by the reference. alternatively, we could make a text search
	//for all the citekeys and replace one citekey at a time - maybe better performace, but this would make updating impossible!
	var buttonNumber = 0;
	for (var r = 0; r < allReferenceTags.length; r++){
		stime.addtime("loop " + r + " start");
		var currentRefTagXMLElement = allReferenceTags[r];
		var currentKey = currentRefTagXMLElement.xmlAttributes.item('citekey').value;
		var currentCitetype = currentRefTagXMLElement.xmlAttributes.item('citetype').value;
		var currentCitekeyItem = myCitekeyInfo.getItemByKey(currentKey);
		
		stime.addtime("loop " + r + " vars (" + currentKey + ")");

		if (createHoveringReferences) {
			//detailled progress bar for tooltips
			myProgressPanel.myText.text = "Reference and tooltip " + (r+1) + "/" + allReferenceTags.length + ": " + currentKey;
			myProgressPanel.myProgressBar.value += individualReferenceProgressBarSpace / allReferenceTags.length;
		} else {
			myProgressPanel.myText.text = "Reference " + (r+1) + "/" + allReferenceTags.length + ": " + currentKey;
		}
		
		//write NOT FOUND tag into reference keys that where not found in the parsed xml file. parse a file where they exist and the text will be replaced by the valid reference info
		if (currentCitekeyItem.found == false){
			currentRefTagXMLElement.contents = "[??NOTFOUND??]";
			continue;
		}
	
		//to see the title in the indesign structure view, add the title as an attribute to the indesign-xml-element. this is especially helpful for ambiguous tags (ie. smith2010 vs. smith2010-1)
		try{
			currentRefTagXMLElement.xmlAttributes.itemByName('title').value = currentCitekeyItem.title;
		}
		catch(e) {
			currentRefTagXMLElement.xmlAttributes.add('title', currentCitekeyItem.title)
		}
		
		stime.addtime("loop " + r + " progress bar and error output");

		switch(currentCitetype){
			case 'default':
				currentRefTagXMLElement.contents = "[" + myCitekeyInfo.getReference(currentKey) + "]";
				currentRefTagXMLElement.applyCharacterStyle(parsedReferenceStyle);
				break;
			case 'noBrackets':
				currentRefTagXMLElement.contents = myCitekeyInfo.getReference(currentKey);
				currentRefTagXMLElement.applyCharacterStyle(parsedReferenceStyle);
				break;
			case 'authorOnly':
				currentRefTagXMLElement.contents = currentCitekeyItem.author;
				currentRefTagXMLElement.applyCharacterStyle(noReferenceStyle);
				break;
			case 'yearOnly':
				currentRefTagXMLElement.contents = currentCitekeyItem.year.toString();
				currentRefTagXMLElement.applyCharacterStyle(noReferenceStyle);
				break;
			case 'titleOnly':
				currentRefTagXMLElement.contents = currentCitekeyItem.title.toString();
				currentRefTagXMLElement.applyCharacterStyle(noReferenceStyle);
				break;
		}

		stime.addtime("loop " + r + " contents and style");

		//add hyperlinks to the reference in the text. for this, select the text first
		var myReferenceTagText = currentRefTagXMLElement.characters.itemByRange(currentRefTagXMLElement.insertionPoints.firstItem(),currentRefTagXMLElement.insertionPoints.lastItem());
		
		//check if the selection or anything in the paragraph is already a hyperlink
		var foundHyperlinks = myReferenceTagText.findHyperlinks();
		if (foundHyperlinks[0].length < 1){
			//if the following line causes an error, maybe there are old textsources in the document. remove them by removing the comment tags around allHyperlinkSources[i].name.match(/ZotRefSrc[0-9]+/i)
			//if the error is something about an existing hyperlink, check this if condition, because this _should_ find already existing hyperlinks and skip the creation. however, the found object is a bit strange and is only distinguishable by "length"
			var myReferenceSource = myDocument.hyperlinkTextSources.add(myReferenceTagText,{name:"ZotRefSrc" + r, label: "zotrefLinksrc"});
			myDocument.hyperlinks.add(myReferenceSource,currentCitekeyItem.hyperlinkTextDestination,{name: r + "_" + currentKey,label:"zotrefHyperlink"});
		}
		else {
			//activate the following line if you want to be notified about skipped links
			notice_general.push("Already a link: skipping Hyperlink creation for reference " + myReferenceTagText.contents + " on page " + currentRefTagXMLElement.texts[0].parentTextFrames[0].parentPage.name);
		}
		
		stime.addtime("loop " + r + " hyperlinks");
		
		//add hover effects
		//create new
		if (createHoveringReferences == true){
			switch(currentCitetype){
				case 'default':
				case 'noBrackets':
					createReferenceButton(currentRefTagXMLElement, currentCitekeyItem, buttonNumber);
					buttonNumber++;
					break;
			}
		}

		stime.addtime("loop " + r + " hover effects");
		
		//create an anchor (hyperlink destination) to link back to this citation
		//only create the anchor if it is a 'real' reference
		switch(currentCitetype){
			case 'default':
			case 'noBrackets':
				var thisHyperlinkDestination = myDocument.hyperlinkTextDestinations.add(currentRefTagXMLElement.insertionPoints.firstItem(),{name:"back-" + currentKey + "-to-" + r, label: 'zotrefBackLinkDest'}); //create a linkdestination to the reference in the text. this will be linked in the bibliography (with the small page numbers)
				currentCitekeyItem.usages.push(thisHyperlinkDestination);
				break;
		}
	}

	myProgressPanel.myText.text = "Adding backlinks";

	//now, add the page usages to the bibliography, that has already been created
	for(var i = myCitekeyInfo.citeKeyArray.length - 1; i >= 0; i--){
		var currentCitekeyItem = myCitekeyInfo.citeKeyArray[i];

		for(var u = 0; u < currentCitekeyItem.usages.length; u++){
			//add a space
			myRefTextFrame.parentStory.insertionPoints[currentCitekeyItem.bibParagraphInsertionPoint].paragraphs[0].insertionPoints[-2].contents += (u > 0 ? ", " : " ");
			
			//the usage (linkdestination) of that loop
			var currentUsage = currentCitekeyItem.usages[u];
			//the end of the current paragraph
			var crossTextEndIns = myRefTextFrame.parentStory.insertionPoints[currentCitekeyItem.bibParagraphInsertionPoint].paragraphs[0].insertionPoints[-2];

			//which reference format to use
			var crossRefFormatBuildingBlocks =
				[	//this array should be containing all parameters (3) needed for buildingBlocks.add
					[BuildingBlockTypes.CUSTOM_STRING_BUILDING_BLOCK,null,"["],
					[BuildingBlockTypes.PAGE_NUMBER_BUILDING_BLOCK,null,null],
					[BuildingBlockTypes.CUSTOM_STRING_BUILDING_BLOCK,null,"]"]					
				];
			var crossRefFormat = returnCrossrefFormatOrCreatenew('Backlink14',null,crossRefFormatBuildingBlocks); //myDocument.crossReferenceFormats.itemByName('Backlink'); //TODO: i8n
			

			//create a new cross refrence source
			var myCrossReferenceSource = myDocument.crossReferenceSources.add(crossTextEndIns,crossRefFormat,{name: "ZotRefBacklink_" + currentCitekeyItem.citeKey + "-" + u,label: "zotRefBacklink"});
			//create the link back to the usage of the reference
			myDocument.hyperlinks.add(myCrossReferenceSource,currentUsage,{name: i + "_" + " _" + u + "_" + currentKey,label:"zotrefHyperlink"});
		}
	}


	//check for ambiguities
	if (checkForAmbiguousCitekeys){
		myProgressPanel.myText.text = "Checking for ambiguous citekeys";
		//parse all citekeys in XML file
		for(var c = 0; c < xc.length(); c++){
			//found some -1 citekeys?
			if (xc[c].citeKey.substr(-2,2) == '-1'){
				var ambiCiteKeyRootLength = xc[c].citeKey.toString().length - 2;
				var ambiCiteKeyRoot = xc[c].citeKey.substr(0,ambiCiteKeyRootLength);
				//is the citekey(or the root) used at all?
				var ambiCiteKeyUsedList = new Array();
				for(var i = 0; i < myCitekeyInfo.citeKeyArray.length; i++){
					//compare all used citekeys with the rootname of the citekey in question
					if (myCitekeyInfo.citeKeyArray[i].citeKey.substr(0,ambiCiteKeyRootLength) == ambiCiteKeyRoot){
						ambiCiteKeyUsedList.push(myCitekeyInfo.citeKeyArray[i].citeKey);
					}
				}
				
				//count occurences in XML file
				var ambiCiteKeyXmlOccurrences = 0;
				for(var o = 0; o < xc.length(); o++){
					//compare with citekey root
					if (xc[o].citeKey.substr(0,ambiCiteKeyRootLength) == ambiCiteKeyRoot){
						ambiCiteKeyXmlOccurrences++;
					}
				}

				//if the citekey is used
				if (ambiCiteKeyUsedList.length > 0) {
					notice_ambiguities.push(ambiCiteKeyRoot + ", used: " + ambiCiteKeyUsedList.length + " times, " + ambiCiteKeyXmlOccurrences + " duplicates in XML\n" + 
					"> used as:\n   - " +
					ambiCiteKeyUsedList.join("\n   - "));
				}
			}
		}
	}

	myProgressPanel.myText.text = "Done";
	myProgressPanel.myProgressBar.value = myProgressPanel.myProgressBar.maxvalue;
	myProgressPanel.hide();

	if (showStatistics){
		timeEnd = new Date().getTime();
		alert(
			"Done\nNew citations: " + foundNew +
			"\nExisting citations: " + (foundTotal - foundNew) +
			"\nRemoved existing: " + removedOld +
			"\nNumber of unique references: " + myCitekeyInfo.citeKeyArray.length +
			"\n\nin " + Math.ceil((timeEnd - timeStart) / 1000.0) + " seconds"
		);
	}

	//$.writeln(stime.stoptimer());
	
	return true;
}

function createReferenceButton(referenceTextXMLElement, citekeyItem, buttonNumber){
	stime.addtime("- start hover effects");
	
	var firstInsertionpoint = referenceTextXMLElement.insertionPoints.firstItem();
	stime.addtime("- get first point");
	//return if the reference is not within a textframe
	if (firstInsertionpoint.parentTextFrames[0] == undefined || firstInsertionpoint.parentTextFrames[0].isValid == false){
		stime.addtime("- exitting");
		return false;
	}
	
	stime.addtime("- checking parent textframes");
	
	var refPage;
	var theReferenceText = referenceTextXMLElement.texts[0];
	var currentKey = citekeyItem.citeKey;
	var hoverElementDistance = 2; //distance to text
	var maskOffset = 1; //how much bigger than the text
	var hoverWidth = 70; //width of the hovering element
	
	stime.addtime("- vars");
	
	//first, create all maskrectangles and collect them in an array
	var maskRectangles = Array();
	if (theReferenceText.lines.length == 1){
		refPage = referenceTextXMLElement.insertionPoints.firstItem().parentTextFrames[0].parentPage;
		var ry1 = theReferenceText.insertionPoints.item(0).baseline + maskOffset;
		var ry2 = theReferenceText.insertionPoints.item(0).baseline - theReferenceText.texts[0].ascent - maskOffset;
		var rx1 = theReferenceText.insertionPoints.item(0).horizontalOffset - maskOffset;
		var rx2 = theReferenceText.insertionPoints.item(-1).endHorizontalOffset + maskOffset;
		maskRectangles.push(refPage.rectangles.add({geometricBounds:[ry1,rx1,ry2,rx2], label: "zotRefHoverTrigger",itemLayer: hoverObjectLayer, appliedObjectStyle: hoverTriggerStyle}));
		stime.addtime("- rects (single line)");
	} else {
		for(var l = 0; l < theReferenceText.lines.length; l++){
			var currentLine = theReferenceText.lines.item(l);

			//break if the line is not within a text frame
			if (currentLine.parentTextFrames.length == 0){
				break;
			}

			//page of the line
			refPage = currentLine.parentTextFrames[0].parentPage;

			var ry1 = currentLine.baseline + maskOffset;
			var ry2 = currentLine.baseline - currentLine.ascent - maskOffset;
			var rx1 = currentLine.horizontalOffset - maskOffset;
			var rx2 = currentLine.endHorizontalOffset + maskOffset;
			
			//exception first line:
			if (l == 0){
				rx1 = theReferenceText.insertionPoints.item(0).horizontalOffset - maskOffset;
			}
			//exception last line
			else if (l == theReferenceText.lines.length - 1) {
				rx2 = theReferenceText.insertionPoints.item(-1).endHorizontalOffset + maskOffset;
			}
		maskRectangles.push(refPage.rectangles.add({geometricBounds:[ry1,rx1,ry2,rx2], label: "zotRefHoverTrigger",itemLayer: hoverObjectLayer, appliedObjectStyle: hoverTriggerStyle}));
		}
		stime.addtime("- rects (multiple lines)");
	}


	//then, create the tooltip geometry
	var firstRectPage = maskRectangles[0].parentPage;
	var hovergBounds = [maskRectangles[0].geometricBounds[2] + hoverElementDistance - maskOffset,maskRectangles[0].geometricBounds[1] + maskOffset, maskRectangles[0].geometricBounds[2] + 5 + hoverElementDistance - maskOffset, maskRectangles[0].geometricBounds[1] + hoverWidth];
	var hoverTextFrame = firstRectPage.textFrames.add({itemLayer: hoverObjectLayer, geometricBounds: hovergBounds, label: 'zotRefHoverTextframe', appliedObjectStyle: hoverTextFrameStyle});

	stime.addtime("- text frame");

	//duplicate the reference paragraph into the text frame
	myRefTextFrame.parentStory.insertionPoints[citekeyItem.bibParagraphInsertionPoint].paragraphs[0].duplicate(LocationOptions.AT_BEGINNING,hoverTextFrame.insertionPoints.firstItem()).appliedParagraphStyle = referenceHoverParagraphStyle;
	hoverTextFrame.characters[-1].remove(); //removing the linebreak at the end of the paragraph
	
	stime.addtime("- paragraph duplication");

	//check position
	var pos = hoverTextFrame.geometricBounds;
	var pageBounds = hoverTextFrame.parentPage.bounds;
	var pagePadding = 5; //distance to keep from page boundaries
	//left point out left?
	if (pos[1] < pageBounds[1] + pagePadding){
		hoverTextFrame.move(undefined,[pageBounds[1] - pos[1] + pagePadding, 0]);
	}
	//right point our right
	else if (pos[3] > pageBounds[3] - pagePadding){
		hoverTextFrame.move(undefined,[pageBounds[3] - pos[3] - pagePadding, 0]);
	}
	//top point out top
	if (pos[0] < pageBounds[0] + pagePadding){
		hoverTextFrame.move(undefined,[0, pageBounds[0] - pos[0] + pagePadding]);
	}
	//bottom point out bottom
	else if (pos[2] > pageBounds[2] - pagePadding){
		hoverTextFrame.move(undefined,[0, pageBounds[2] - pos[2] - pagePadding]);
	}

	stime.addtime("- position check");

	//create the hover button
	var hoverButton = firstRectPage.buttons.add({itemLayer: hoverObjectLayer, geometricBounds: hoverTextFrame.geometricBounds, label: 'zotRefHoverButton'});
	hoverButton.states.item(0).addItemsToState(hoverTextFrame);
	hoverButton.hiddenUntilTriggered = true;
	hoverButton.name = 'zotRefHover' + buttonNumber + "_" + referenceTextXMLElement.xmlAttributes.item('citekey').value;
	hoverButton.bringToFront();
	
	stime.addtime("- hover button");

	//now that the hovering text is created, we can trigger the tooltip with our line masks
	for (var i = 0; i < maskRectangles.length; i++){
		var currentLineRect = maskRectangles[i];
		var triggerButton = firstRectPage.buttons.add({itemLayer: hoverObjectLayer, geometricBounds: currentLineRect.geometricBounds, label: 'zotRefTriggerButton'});
		triggerButton.states.item(0).addItemsToState(currentLineRect);
		triggerButton.name = 'zotRefTrigger' + buttonNumber + "." + i + "_" + referenceTextXMLElement.xmlAttributes.item('citekey').value;
		triggerButton.showHideFieldsBehaviors.add({behaviorEvent:BehaviorEvents.MOUSE_ENTER, fieldsToShow: hoverButton});
		triggerButton.showHideFieldsBehaviors.add({behaviorEvent:BehaviorEvents.MOUSE_EXIT, fieldsToHide: hoverButton});
		triggerButton.showHideFieldsBehaviors.add({behaviorEvent:BehaviorEvents.MOUSE_DOWN, fieldsToHide: hoverButton}); //necessary, because otherwise the hover will stay visible when clicked (page jumps to reference and no MOUSE_EXIT is triggered)
		triggerButton.gotoAnchorBehaviors.add({behaviorEvent:BehaviorEvents.MOUSE_UP, anchorItem: citekeyItem.hyperlinkTextDestination});
		triggerButton.sendToBack();
	}
	stime.addtime("- behaviours and now done hover effects");
}

function addFormattedTextToStory(myTextframe,myFormat,myContent,myParagraphFormat){
	if (!myContent) return false;
	//safe insertion point index
	var firstInsertionPoint = myTextframe.parentStory.insertionPoints[-1].index;
	//add text
	myTextframe.parentStory.insertionPoints[-1].contents += myContent;
	var myAdditions = myTextframe.parentStory.characters.itemByRange(myTextframe.parentStory.insertionPoints[firstInsertionPoint],myTextframe.parentStory.insertionPoints[-1]);

	//add formatting
	if (myFormat) {
		myAdditions.appliedCharacterStyle = myFormat;
	}
	if (myParagraphFormat) {
		myAdditions.appliedParagraphStyle = myParagraphFormat;
	}
	return true;
}

function getPublishedIn(modPart){
	//return if book (books are not published in anything
	var genre = modPart.xpath("genre[@authority='local']");
	if (genre.toString() == 'book' || genre.toString() == 'thesis') {
		if (modPart.xpath("relatedItem[@type='host']/titleInfo[not(@type = 'abbreviated')]/title") != '') {
			notice_general.push(modPart.citeKey + ' seems to have a related published medium, but the genre is ' + genre.toString() + '. please check this item');
		}
		return false;
	}
	
	var publishedIn = modPart.xpath("relatedItem[@type='host']/titleInfo[not(@type = 'abbreviated')]/title");
	if (!publishedIn || publishedIn.toString() == "") {
		//genres that do not necessarily need a published medium
		if (genre.toString() == 'report'){
			return false;
		}
		notice_general.push("could not find the published medium for " + modPart.citeKey);
		return false;
	}

	//get editors
	var editorArray = getNameArray(modPart.xpath("relatedItem[@type='host']/name[@type='personal' or @type='corporate']"), ['edt']);
	var editors = "";
	if (editorArray.length > 0){
		for (var n = 0; n < editorArray.length; n++){
			editors += (n > 0 && n != editorArray.length-1 ? ", " : (n == editorArray.length-1  && editorArray.length != 1 ? " " + langAuthorConnector + " " : "")) + editorArray[n].fullName;
		}
		editors += " (" + langEditorString + "), ";
	}

	//combine texts
	switch(modPart.xpath("relatedItem[@type='host']/genre[@authority='marcgt']").toString()) {
		case 'book':
		case 'journal':
		case 'conference publication':
			publishedIn = ", in: " + editors + publishedIn;
			break;
		default:
			publishedIn = ", " + publishedIn;
			break;
	}

	return publishedIn;
}

function getNameArray(names, roleArray){
	if (names.length() == 0) return false;
	
	var allNames = new Array();
	
	//parse names
	for(var n = 0; n < names.length(); n++){
		var role = names[n].xpath("role/roleTerm").toString().replace(/^\s+|\s+$/g, '');
		if (findObjInArray(roleArray,role)) {
			var thisName;
			var lastName = names[n].xpath("namePart[@type='family']").toString();
			var firstName = names[n].xpath("namePart[@type='given']").toString().substr(0,1) + ".";
			if (!lastName || lastName == '') {
				thisName = names[n].xpath("namePart[not(@type)]'"); //take namepart that does not have any attributes, if given and family name where not specified
				if (!thisName){
					continue;
				}
			}
			else {
				thisName = lastName + (firstName ? ", " + firstName : "");
			}

			allNames.push({'fullName': thisName, 'firstName': firstName, 'lastName': (lastName && lastName != '' ? lastName : thisName)});
		}
	}
	return allNames;
}



function getAuthorNames(modPart,depth){
	//how often did this function call itself
	if (depth == null){
		depth = 0;
	}

	//find names
	var names = modPart.xpath("name[@type='personal' or @type='corporate']");
	if (names.length() < 1) {
		//go deeper if nothing was found and this is the initial call
		if (depth == 0){
			notice_general.push("did not find authors, using editors as authors for " + modPart.citeKey);
			return getAuthorNames(modPart.xpath("relatedItem[@type='host']"),1);
		}
		error_general.push("no names found for " + modPart.citeKey);
		return "---NO NAMES---";
	}
	
	var nameConcat = "";
	var nameArray = new Array();
	var editorArray = new Array();
	var firstAuthorName;
	
	nameArray = getNameArray(names, ['aut','ctb']);
	editorArray = getNameArray(names, ['edt']);
	if (nameArray.length > 0) {
		firstAuthorName = nameArray[0].lastName;
	} else if (editorArray.length > 0){
		firstAuthorName = editorArray[0].lastName;
	} //no need for else, because we will return in the next if anyway

	//check if any names
	if (nameArray.length < 1){
		//if also no editors
		if (editorArray.length < 1){
			error_general.push("no names parsed for " + modPart.citeKey);
			//safe citekey Info
			myCitekeyInfo.safeAuthors(modPart.citeKey,'unknown');
			return "---NO NAMES (2)---";
		}
		//if editors
		else {
			//connect editors
			for (var n = 0; n < editorArray.length; n++){
				nameConcat += (n > 0 && n != editorArray.length-1 ? ", " : (n == editorArray.length-1  && editorArray.length != 1 ? " " + langAuthorConnector + " " : "")) + editorArray[n].fullName;
			}
			//safe citekey Info
			myCitekeyInfo.safeAuthors(modPart.citeKey,(firstAuthorName ? firstAuthorName : 'error1')+ (editorArray.length > 1 ? " et al." : ""));
			return nameConcat + ", " + langEditorString;
		}
	}

	//connect authors
	for (var n = 0; n < nameArray.length; n++){
		nameConcat += (n > 0 && n != nameArray.length-1 ? ", " : (n == nameArray.length-1 && nameArray.length != 1 ? " " + langAuthorConnector + " " : "")) + nameArray[n].fullName;
	}
	//safe citekey Info
	myCitekeyInfo.safeAuthors(modPart.citeKey,(firstAuthorName ? firstAuthorName : 'error1') + (nameArray.length > 1 ? " et al." : ""));
	return nameConcat;
}

/*Object that stores the cite key meta data */
function CiteKeyMeta(citeKey){
	this.author = "";
	this.year = "";
	this.title = "";
	this.citeKey = citeKey;
	this.found = false;
	this.hyperlinkTextDestination;
	this.bibParagraphInsertionPoint;
	this.usages = new Array(); //contains all usages in form of a hyperlinkTextSource (text anchor)
}

/* Class to story citekey array and receive and output metadatainfo. also to query the citekey array */
function CiteKeyInfo(){
	this.citeKeyArray = new Array();
	
	this.safeAuthors = function(ck, author) {
		var currentC = this.getKey(ck);
		this.citeKeyArray[currentC].author = author.toString();
		return true;
	}

	this.safeYear = function(ck, year) {
		var currentC = this.getKey(ck);
		this.citeKeyArray[currentC].year = year.toString().match(/[0-9]{4}/);
		return true;
	}

	this.safeTitle = function(ck, title) {
		var currentC = this.getKey(ck);
		this.citeKeyArray[currentC].title = title.toString();
		return true;
	}

	this.getReference = function(ck) {
		var currentC = this.getKey(ck, false);
		if (currentC === false){
			return "[error3 in " + ck + "]";
		}
		return this.citeKeyArray[currentC].author + ", " + this.citeKeyArray[currentC].year;
	}

	this.sortKeys = function(){
		//sort key
		var tempArray = new Array();
		var tempArrayObjects = new Array();
		for (var i in this.citeKeyArray){
			//$.writeln('pushing ' + i + ": " + this.citeKeyArray[i].citeKey);
			tempArray.push(this.citeKeyArray[i].citeKey);
		}
		tempArray.sort();

		//reconstruct
		for(var i in tempArray){
			//$.writeln('pushing ' + i + ": " + tempArray[i]);
			tempArrayObjects.push(this.citeKeyArray[this.getKey(tempArray[i],false)]);
		}
	
		//overwrite old array with temp array
		this.citeKeyArray = tempArrayObjects;
		
		return true;
	}
	
	//returns one item out of the citekeyarray. does not create a new item if not found
	this.getItemByKey = function(ck){
		var currentItemKey = this.getKey(ck, false);

		//return false if the item was not found
		if (currentItemKey === false){
			return false;
		}
	
		return (this.citeKeyArray[currentItemKey]);
	}
	
	//returns the index of the item or creates one if the item did not exist
	this.getKey = function(ck, createNew) {
		//see if a new key should be created. true by default
		if (createNew == undefined){
			createNew = true;
		}
		for(var c = 0; c < this.citeKeyArray.length; c++){
			if (this.citeKeyArray[c].citeKey == ck.toString()){
				return c;
			}
		}
		//should a new key be created if none was found?
		if (createNew) {
			this.citeKeyArray.push(new CiteKeyMeta(ck.toString()));
			return this.citeKeyArray.length - 1;
		}
		else {
			return false;
		}
	}
}

function getYearAndPublisher(modPart){
	var genre = modPart.xpath("genre[@authority='local']");
	var year;
	var publisher;
	var place;
	var website = '';
	
	switch (genre.toString()){
		case "bookSection":
			year = modPart.xpath("relatedItem[@type='host']/originInfo/copyrightDate").toString().match(/[0-9]{4}/);
			publisher = modPart.xpath("relatedItem[@type='host']/originInfo/publisher");
			place = modPart.xpath("relatedItem[@type='host']/originInfo/place/placeTerm[@type='text']");
			break;
		case "book":
			year = modPart.xpath("originInfo/copyrightDate").toString().match(/[0-9]{4}/);
			publisher = modPart.xpath("originInfo/publisher");
			place = modPart.xpath("originInfo/place/placeTerm[@type='text']");
			break;
		case "conferencePaper":
		case "encyclopediaArticle":
			year = modPart.xpath("relatedItem[@type='host']/originInfo/dateCreated").toString().match(/[0-9]{4}/);
			publisher = modPart.xpath("relatedItem[@type='host']/originInfo/publisher");
			place = modPart.xpath("relatedItem[@type='host']/originInfo/place/placeTerm[@type='text']");
			break;
		case "blogPost":
		case "webpage":
			year = modPart.xpath("relatedItem[@type='host']/originInfo/dateCreated").toString().match(/[0-9]{4}/);
			website = modPart.xpath("location/url").toString();
			if (website != ''){
				website = ", website: " + website;
				var lastAccess = modPart.xpath("location/url/attribute::dateLastAccessed").toString().match(/^([0-9]{4})-([0-9]{2})-([0-9]{2}).*/);
				if (lastAccess != null && lastAccess.length > 0) website += ", " + langOnlineAsOfString + " " + returnMonthName(lastAccess[2]) + " " + lastAccess[1];
			} else {
				error_general.push("could not get URL for website " + modPart.citeKey);
			}
			break;
		case "magazineArticle":
		case "journalArticle":
		case "newspaperArticle":
			year = modPart.xpath("relatedItem[@type='host']/originInfo/dateIssued").toString().match(/[0-9]{4}/);
			publisher = modPart.xpath("relatedItem[@type='host']/originInfo/publisher");
			place = modPart.xpath("relatedItem[@type='host']/originInfo/place/placeTerm[@type='text']");
			break;
		case "thesis":
		case "report":
		case "artwork":
		case "presentation":
		case "patent":
		case "manuscript":
		case "videoRecording":
		case "interview":
		case "document":
			year = modPart.xpath("originInfo/dateCreated").toString().match(/[0-9]{4}/);
			publisher = modPart.xpath("originInfo/publisher");
			place = modPart.xpath("originInfo/place/placeTerm[@type='text']");
			break;
		default:
			if (!findObjInArray(error_publishtypes,genre.toString())){
				error_publishtypes.push(genre.toString());
			}
			return false;
	}
	
	if (!year || year == ''){
		error_general.push("could not identify year for " + modPart.citeKey + " (genre: " + genre.toString() + ")");
		return false;
	}

	//safe citekeyinfo
	myCitekeyInfo.safeYear(modPart.citeKey,year);
	return (publisher && publisher != '' ? ", " + publisher + (place && place != '' ? ", " + place : "") : "") + website + ", " + year;
}

function getTitle(modPart){
	var title = modPart.xpath("titleInfo[not(@type = 'abbreviated')]/title").toString();
	if (!title) {
		error_general.push("could not identify title for " + modPart.citeKey);
		return false;
	} else {
		//safe title in citekeyinfo and return
		myCitekeyInfo.safeTitle(modPart.citeKey,title);
		return ", \"" + title + "\"";
	}
}

//searches for an object in an array. expects the array and the object (string, integer, object etc)
function findObjInArray(a,obj){
	for (var i = 0; i < a.length; i++) {
		if (a[i] === obj) {
			return true;
		}
	}
	return false;	
}

//return the reference to a character style. if the style did not exist, create the style
function returnCharacterStyleOrCreatenew(stylename, groupname, stylePreferences){
	var style;
	var group;

	//prepare style preferences. if none are given, only include the name
	if (stylePreferences == null){
		stylePreferences = {name: stylename};
	} else {
		stylePreferences.name = stylename;
	}
	
	if (!groupname){ //is the style in a group?
		style = myDocument.characterStyles.item(stylename);
	} else {
		try { //add group first, if it does not exist
			group = myDocument.characterStyleGroups.itemByName(groupname);
			gname = group.name; //will trigger error if group does not exist
		}
		catch(e){
			group = myDocument.characterStyleGroups.add({name: groupname});
			style = group.characterStyles.add(stylePreferences); //then add style in the group
		}
		style = group.characterStyles.itemByName(stylename); //select style in group (for the second time, if the style had already been created, but that should be ok)
	}
	try{
		name=style.name; //will trigger error if style does not exist
	} catch(e) {
		if (group != null){
			style = group.characterStyles.add(stylePreferences);
		} else {
			style = myDocument.characterStyles.add(stylePreferences);
		}
	}
	return style;	
}

//return the reference to a paragraph style. if the style did not exist, create the style
function returnParagraphStyleOrCreatenew(stylename, groupname, stylePreferences){
	var style;
	var group;

	//prepare style preferences. if none are given, only include the name
	if (stylePreferences == null){
		stylePreferences = {name: stylename};
	} else {
		stylePreferences.name = stylename;
	}
	
	if (!groupname){ //is the style in a group?
		style = myDocument.paragraphStyles.item(stylename);
	} else {
		try { //add group first, if it does not exist
			group = myDocument.paragraphStyleGroups.itemByName(groupname);
			gname = group.name; //will trigger error if group does not exist
		}
		catch(e){
			group = myDocument.paragraphStyleGroups.add({name: groupname});
			style = group.paragraphStyles.add(stylePreferences); //then add style in the group
		}
		style = group.paragraphStyles.itemByName(stylename); //select style in group (for the second time, if the style had already been created, but that should be ok)
	}
	try{
		name=style.name; //will trigger error if style does not exist
	} catch(e) {
		if (group != null){
			style = group.paragraphStyles.add(stylePreferences);
		} else {
			style = myDocument.paragraphStyles.add(stylePreferences);
		}
	}
	return style;	
}

function returnLayerOrCreatenew(layerName){
	var layer;
	layer = myDocument.layers.item(layerName);
	try{
		name = layer.name;
	} catch(e) {
		layer = myDocument.layers.add({name: layerName});
	}
	return layer;
}

function returnCrossrefFormatOrCreatenew(crossRefFormatName, crossRefProperties, buildingBlocksIfNew){
	var crFormat;
	crFormat = myDocument.crossReferenceFormats.item(crossRefFormatName);
	try{
		name = crFormat.name;
	} catch(e) {
		crFormat = myDocument.crossReferenceFormats.add(crossRefFormatName, crossRefProperties);
		//if building blocks are given, add these after creation
		if (buildingBlocksIfNew != undefined && buildingBlocksIfNew.length > 0){
			for (var i = 0; i < buildingBlocksIfNew.length; i++){
				//for some reason, the null of the third parameter is not accepted when passing the values from an array. a null is thus changed to an empty string, which will be ignored (unless the block is a custom text)
				crFormat.buildingBlocks.add(buildingBlocksIfNew[i][0],buildingBlocksIfNew[i][1],buildingBlocksIfNew[i][2] == null ? "" : buildingBlocksIfNew[i][2]);
			}
		}
	}
	return crFormat;
}

//return an existing object style or create a new object style. if preferences are given, these will be applied to the new object style only.
function returnObjectStyleOrCreatenew(objectStyleName, newObjectStylePreferences){
	var objectStyle;
	objectStyle = myDocument.objectStyles.item(objectStyleName);
	try{
		name = objectStyle.name;
	} catch(e) {
		if (newObjectStylePreferences != null) {
			newObjectStylePreferences.name = objectStyleName;
			objectStyle = myDocument.objectStyles.add(newObjectStylePreferences);
		} else {
			objectStyle = myDocument.objectStyles.add({name: objectStyleName});
		}
	}
	return objectStyle;
}

//to ask for user settings in the beginning
function userSettingsDialog(){
	var myDialog = app.dialogs.add({name:"Zotero to Indesign Interface settings"});
	var useDefaultCheckbox;
	//Add a dialog column.
	with(myDialog.dialogColumns.add()){
		if (checkOrWriteSetting("defaultDirectory")) {
			with(borderPanels.add()){
				with(dialogColumns.add()){
					useDefaultCheckbox = checkboxControls.add({checkedState: true, staticLabel: "Use last XML file"});
				}
			}
		}
	
		with(borderPanels.add()){
			staticTexts.add({staticLabel:"Messages"});
			var showStatisticsSetting = checkboxControls.add({checkedState: (checkOrWriteSetting("showStatistics") == 'yes' ? true : (checkOrWriteSetting("showStatistics") == 'no' ? false : true)), staticLabel: "show statistics"});
			var showWarningsSetting = checkboxControls.add({checkedState: (checkOrWriteSetting("showWarnings") == 'yes' ? true : (checkOrWriteSetting("showWarnings") == 'no' ? false : true)), staticLabel: "show warnings"});
			var checkForAmbiguousCitekeysSetting = checkboxControls.add({checkedState: (checkOrWriteSetting("checkForAmbiguousCitekeys") == 'yes' ? true : (checkOrWriteSetting("checkForAmbiguousCitekeys") == 'no' ? false : true)), staticLabel: "show ambiguous citekeys"});
		}

		with(borderPanels.add()){
			with(dialogColumns.add()){
				var createHoveringReferencesSetting = checkboxControls.add({checkedState: (checkOrWriteSetting("createHoveringReferences") == 'yes' ? true : (checkOrWriteSetting("createHoveringReferences") == 'no' ? false : false)), staticLabel: "Interactive reference tooltips"});
			}
		}

		with(borderPanels.add()){
			with(dialogColumns.add()){
				staticTexts.add({staticLabel:"Title for references page(s):"});
				staticTexts.add({staticLabel:"Connect authors by:"});
				staticTexts.add({staticLabel:"Identify Editors by:"});
				staticTexts.add({staticLabel:"Prefix for online date:"});
			}
			with(dialogColumns.add()){
				var langBibliographyNameSetting = textEditboxes.add({editContents: (checkOrWriteSetting("langBibliographyName") ? checkOrWriteSetting("langBibliographyName") : langBibliographyName), minWidth: 180});
				var langAuthorConnectorSetting = textEditboxes.add({editContents: (checkOrWriteSetting("langAuthorConnector") ? checkOrWriteSetting("langAuthorConnector") : langAuthorConnector), minWidth: 180});
				var langEditorStringSetting = textEditboxes.add({editContents: (checkOrWriteSetting("langEditorString") ? checkOrWriteSetting("langEditorString") : langEditorString), minWidth: 180});
				var langOnlineAsOfStringSetting = textEditboxes.add({editContents: (checkOrWriteSetting("langOnlineAsOfString") ? checkOrWriteSetting("langOnlineAsOfString") : langOnlineAsOfString), minWidth: 180});
			}
		}
	}

	//Show the dialog box.
	var myResult = myDialog.show();
	if(myResult == true){
		if (useDefaultCheckbox && useDefaultCheckbox.checkedState) {
			defaultDirectory = checkOrWriteSetting("defaultDirectory");
			useDefaultDirectory = true;
		}
	
		//language Strings
		langBibliographyName = langBibliographyNameSetting.editContents;
		checkOrWriteSetting("langBibliographyName",langBibliographyName);
		langAuthorConnector = langAuthorConnectorSetting.editContents;
		checkOrWriteSetting("langAuthorConnector",langAuthorConnector);
		langEditorString = langEditorStringSetting.editContents;
		checkOrWriteSetting("langEditorString",langEditorString);
		langOnlineAsOfString = langOnlineAsOfStringSetting.editContents;
		checkOrWriteSetting("langOnlineAsOfString",langOnlineAsOfString);

		//other settings
		showStatistics = showStatisticsSetting.checkedState;
		checkOrWriteSetting("showStatistics",(showStatistics == true ? "yes" : "no"));
		showWarnings = showWarningsSetting.checkedState;
		checkOrWriteSetting("showWarnings",(showWarnings == true ? "yes" : "no"));
		checkForAmbiguousCitekeys = checkForAmbiguousCitekeysSetting.checkedState;
		checkOrWriteSetting("checkForAmbiguousCitekeys",(checkForAmbiguousCitekeys == true ? "yes" : "no"));
		createHoveringReferences = createHoveringReferencesSetting.checkedState;
		checkOrWriteSetting("createHoveringReferences",(createHoveringReferences == true ? "yes" : "no"));

		myDialog.destroy();
		return true;
	}
	else{
		alert("Aborting");
		myDialog.destroy();
		return false;
	}
}

//to store user settings in document
function checkOrWriteSetting(settingName, newSetting){
	//check for settings root first
	var mySettingsRoot = myDocument.xmlElements[0].xmlElements.itemByName(xmlSettingsTag)
	if (!mySettingsRoot || !mySettingsRoot.isValid){
		//if there is no settings entry in the xml tree yet and no settings are to be safed, return false because no setting can be read
		if (newSetting == null) {
			return false;
		}
		mySettingsRoot = myDocument.xmlElements[0].xmlElements.add(xmlSettingsTag);
		mySettingsRoot = mySettingsRoot.move(LocationOptions.atBeginning)
	}	
	
	//check for the attribute defaultDirectory
	var defDir  = mySettingsRoot.xmlAttributes.itemByName(settingName);
	//if there is no default directory set
	if (!defDir.isValid){
		//if no default directory was set
		if (newSetting == null){
			return false;
		}
		//create new attribute or write to attribute
		mySettingsRoot.xmlAttributes.add(settingName,newSetting);
	}
	//if the value exists, but is empty
	else if (newSetting != null || defDir.value.toString() == ''){
		if (newSetting == null){
			return false;
		}
		mySettingsRoot.xmlAttributes.itemByName(settingName).value = newSetting;		
	}
	//attribute exists, is not empty, return the attributes value
	else {
		return defDir.value;
	}
}

//month number to english month string
function returnMonthName(monthInt){
	switch (parseInt(monthInt,10)){
		case 1:
			return "January";
			break;
		case 2:
			return "February";
			break;
		case 3:
			return "March";
			break;
		case 4:
			return "April";
			break;
		case 5:
			return "May";
			break;
		case 6:
			return "June";
			break;
		case 7:
			return "July";
			break;
		case 8:
			return "August";
			break;
		case 9:
			return "September";
			break;
		case 10:
			return "October";
			break;
		case 11:
			return "November";
			break;
		case 12:
			return "December";
			break;
		default:
			return false;
	}
}

function myCreateProgressPanel(myMaximumValue, myProgressBarWidth){
	var test;
	myProgressPanel = new Window('window', 'Bibliography for InDesign');
	with(myProgressPanel){
		test = myProgressPanel.myProgressBar = add('progressbar', [12, 12, myProgressBarWidth, 24], 0, myMaximumValue);
		myProgressPanel.myText = add('statictext', {x:60, y:0, width:myProgressBarWidth, height:20});
		myText.text = "Starting";
	}
}

function splittime()
{
	this.zwischenzeit = new Array();
	
	this.addtime = function(zeiger)
	{
		this.zwischenzeit.push({'name': zeiger, 'zeit': $.hiresTimer});
	}

	this.stoptimer = function()
	{
		var echo = "";
		this.addtime('Ende');

		for(var i=0; i < this.zwischenzeit.length; i++)
		{
			echo += this.zwischenzeit[i].name + " : " + this.zwischenzeit[i].zeit + "\n";
		}
		return echo;
	}
}