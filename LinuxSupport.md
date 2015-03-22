## About Linux Support ##
Current version of Switchy! supports Linux platform in general, but there are some limitations which make Switchy! not work as expected in some cases.

## Supported Linux Distributions ##
Currently, only Gnome and KDE based distributions are supported, though, I hope other distributions will be supported in future (if it's at all possible).

## Error Diagnostics ##
Follow these steps to diagnose the problem that prevents Switchy from working well:

1. Open Switchy Options page and click `Error Log` button, the Error Log page will open.

2. At the top of the page you'll see the test summary, which summarizes the results of 3 tests done by Switchy.
To work well, Switchy should pass all these tests.
  * **Loading Switchy Plugin**
> Failure means that the Switchy plugin wasn't loaded successfully for some reason.<br>
<blockquote>To help us diagnose the problem, please do the following:<br>
<ol><li><a href='http://dev.chromium.org/for-testers/enable-logging'>Enable Chrome logging</a>.<br>
</li><li>File an issue in the <a href='http://code.google.com/p/switchy/issues/list'>issue tracker</a> and attach the output log file.</li></ol></blockquote>

<ul><li><b>Plugin Functionality</b>
</li></ul><blockquote>Failure means that Switchy doesn't work properly, you will see a description of the problem beside this item.<br>
To solve this problem try the solution described bellow for the third test.</blockquote>

<ul><li><b>System Environment</b>
</li></ul><blockquote>Failure means that the system environment isn't supported (e.g. the desktop environment isn't a Gnome nor KDE).<br>
To solve this problem try the following:<br>
If you think your system is KDE based:<br>
<ol><li>Install <code>kreadconfig</code> and <code>kwriteconfig</code>.<br>
</li><li>Set this system environment variable: <code>KDE_FULL_SESSION=true</code>, and restart the computer.<br>
</li><li>Run this command [<code>echo $KDE_HOME</code>], if it returns "~/.kde4", then run this command: [<code>ln -s ~/.kde4 ~/.kde</code>] and restart Chrome.<br>
</li></ol>Otherwise:<br>
<ol><li>Install <code>gconftool-2</code>.<br>
</li><li>Set this system environment variable: <code>GNOME_DESKTOP_SESSION_ID=Default</code>, and restart the computer.<br>
</li></ol>If the problem isn't solved, please do the Extra Tests <i>(see below)</i> and file an issue in the <a href='http://code.google.com/p/switchy/issues/list'>issue tracker</a> and send the test results.</blockquote>

<h2>Extra Tests</h2>
To help us diagnosing your problem, please run the following commands and send the result with your error report:<br>
<pre><code>&gt; echo $DESKTOP_SESSION + $GNOME_DESKTOP_SESSION_ID + $KDE_FULL_SESSION<br>
&gt; gconftool-2 -g /system/http_proxy/host<br>
&gt; kreadconfig --file kioslaverc --group 'Proxy Settings' --key httpProxy<br>
</code></pre>