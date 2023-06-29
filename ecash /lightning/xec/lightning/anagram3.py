


import " ../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";


    c1 = [0]*26
    c2 = [0]*26

    for i in range(len(s1)):
        pos = ord(s1[i])-ord('a')
        c1[pos] = c1[pos] + 1

    for i in range(len(s2)):
        pos = ord(s2[i])-ord('a')
        c2[pos] = c2[pos] + 1

    j = 0
    stillOK = True
    while j<26 and stillOK:
        if c1[j]==c2[j]:
            j = j + 1
        else:
            stillOK = False

done;
done;
.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);def anagram(s1,s2):

    return stillOK

print(anagram('pide','epid'))
