module.exports = {
    telegramHtmlStrings: {
        dangerous: '<b>Try to hack the format</b> ${true && <i>yes</i>}',
        safe: '&lt;b&gt;Try to hack the format&lt;/b&gt; ${true &amp;&amp; &lt;i&gt;yes&lt;/i&gt;}',
        noChangeExpected:
            'Just a normal sentence with punctuation and things, but none of the forbidden characters.',
    },
};
