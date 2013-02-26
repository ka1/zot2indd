zot2indd
========
Zotero to InDesign export library by Kai
----------------------------------------
Import your Zotero Citations to InDesign and use Latex like syntax (ie. "\cite{author1998}" ) to create a linked reference list.

Use at your own risk ;)

________________________________________

The JS files ("BibTexCiteKeyOnly.js" and "MODS modified by Kai.js") need to be copied into the translators directory of zotero. This can be in two different locations, depending on the version (stand alone or firefox browser plugin) of zotero:
- ~/Library/Application Support/Firefox/Profiles/[random]/zotero/translators
- ~/Library/Application Support/Zotero/Profiles/[random]/translators
Copy the files into the one directory that exists.

In Zotero, you should see two new exporters:

-	"BibTex CiteKey-Only Exporter, modified by Kai"
	This export plugin is meant to be used with the CMD-SHIFT-C export (quick copy)
	and will export the city key together with the necessary syntax for latex or
	indesign.
	BUT: the script does not export unique keys, so if there are two documents from
	the same author in the same year, both will export as "author2013", not
	"author2013" and "author2013-1", as they will appear in the exported XML file.
	Make sure that you search for "-1" and correct the links before you publish.
-	"MODS mod by Kai"
	This export plugin is used to export the file to indesign. Collect all your
	documents in one directory (without subfolders) and than export that directory.
	In case of very large amounts, zotero will pause one or more times, asking if you want
	to continue. Confirm that.
	
Finally, the .jsx file (importZotero.jsx) needs to be copied into the user scripts directory of indesign. Select "show in finder"/"show in explorer" (or something like that) in the script panel of Indesign to locate the directory.