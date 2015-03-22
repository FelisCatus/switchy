## Introduction ##
A Rule List is a collection of Switch Rules distributed as a text file.

## Format ##
The Rule List file is a normal text file contains the rules grouped by their type (Wildcard or RegExp),<br>
and enclosed by <code>#BEGIN</code> and <code>#END</code> marks.<br>
The file format is similar to <a href='http://en.wikipedia.org/wiki/INI_file'>ini files format</a>.<br>
<br>
<h2>Example</h2>
<pre><code>; Summary: Example Rule List<br>
; Author: Mhd Hejazi (my@email)<br>
; Date: 2010-01-20<br>
; URL: http://samabox.com/projects/chrome/switchy/switchyrules.txt<br>
<br>
#BEGIN<br>
<br>
[Wildcard]<br>
*://chrome.google.com/*<br>
*://*.samabox.com/*<br>
<br>
[RegExp]<br>
^http://code\.google\.com/.*<br>
youtube<br>
<br>
#END<br>
</code></pre>

<h2>Notes</h2>
If the rule pattern is preceded by <b>!</b> (<i>exclamation mark</i>), then the rule is considered an exclusive rule,<br>
which means that every URL matches this rule pattern will be requested using the default proxy not the rule list proxy.