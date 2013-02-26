zot2indd
========
Zotero to InDesign export library by Kai
----------------------------------------
Import your Zotero Citations to InDesign and use Latex like syntax (ie. "\cite{author1998}" ) to create a linked reference list.

This is meant to give some inspiration and starting point to Indesign + Zotero users. It's nowhere near bug free. Comments are welcome, however I cannot promise the implementation of feature requests or modifications.
Also, the reference style is customized to my personal demands, but should be customizable given some knowledge of Indesigns javascript.

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

To mark all your (unparsed) citations, add a grep style to your paragraph style and assign a colorful character style to "\\cite(r|a|y)?\{[^{}]*\}".

Usage:
- Export an XML File from your Zotero Library with all the citations you want to use, using the exporter (MODS mod by Kai) in this package.
- Cite using one of the two methods:
-- To cite a reference, select the reference in Zotero and push CMD-SHIFT-C (quick copy). Make sure you selected the exporter (BibTex CiteKey-Only Exporter, modified by Kai) in this package as the quick copy exporter.
--- Paste the quickcopied string into your indesign text where you want the reference to appear. It should look something like \cite{einstein1905}. If you have assigned the grep style as mentioned above, it should appear in the character style that was assigned to the grep style.
-- Alternatively, search the reference in the XML file and copy the citekey string into the clipboard.
--- Paste the copied citekey into your indesign and enclose the citekey by the \cite{citekey} syntax. It should then also look something like \cite{einstein1905}. If you have assigned the grep style as mentioned above, it should appear in the character style that was assigned to the grep style.
- Continue to add your citations until you want to create a reference list. To do so, run the script, confirm the settings dialog and select the XML file you exported from zotero.
- All your \cite{...} references will be replaced by a reference containing author and year. This text will be (invisibly) enclosed by XML tags. Also, a hyperlink will be created to the item in the reference list. The reference list will be created at the end of the document or in the textframe that you labeled "references" (this textframe is automatically created if it does not exist).
- Continue to add citations. If you want to change existing citations, do not edit the text itself, but change the citekey attribute in the Indesign document structure (View / Structure / Show Structure).
- You can run the script over and over again. It will always replace the reference list by a updated reference list. It will parse new \cite{...} citations and also rewrite all parsed references (updating the author and year if you have changed either the citekey or the content of the Zotero XML file).
- See the character and paragraph styles that the script created. You can edit them to change the appearance of the reference list and of the references. The styles will not be overwritten by the script.
- The script will remember your settings (and your last XML file). The setting are saved in the Indesign document structure in the attributes of an element called zoteroImportSettings.
- Options: Use \cite{...} to have a full author and year reference. Use \citer{...} to not enclose the reference in brackets. Use \citea{...} to cite author only and \citey{...} to cite year only.