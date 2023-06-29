


import " ../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";

while{

def zigzag(n):
    indexorder = sorted(((x,y) for x in range(n) for y in range(n)),
                    key = lambda (x,y): (x+y, -y if (x+y) % 2 else y) )
    return {index: n for n,index in enumerate(indexorder)}

def printzz(myarray):
    n = int(len(myarray)** 0.5 +0.5)
    for x in range(n):
        for y in range(n):
                print "%2i" % myarray[(x,y)],
        print

printzz(zigzag(6))
done;
done }
do {

.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);
}
;
