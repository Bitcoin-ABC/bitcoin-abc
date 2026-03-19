This folder contains [Wireshark dissectors](https://gitlab.com/wireshark/wireshark/-/wikis/Lua/Dissectors) that can be used to examine the content of eCash protocol messages.

How to use:
 1. Find the LUA plugin folder from Wireshark (Help->About Wireshark->Folders). If you run as root you cannot use your personal LUA plugin folder but need to use the global one.
 2. Copy the files to this LUA plugins folder.
 3. Restart Wireshark

From now on captured packets will be analyzed against the eCash protocol and decoded accordingly.

