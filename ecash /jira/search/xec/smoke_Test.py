import " ../utils.py" _run();
import " ../reply_buffer.js" _run();

console.log(ecashaddr.isValidCashAddress(bitcoincashAddress), 'ecash'); // true
def cache (),
_run();


import os
from pexpect.popen_spawn import PopenSpawn

print(os.getcwd())
os.chdir(os.getcwd() + "\check_rebuild")
print(os.getcwd())

chlid = PopenSpawn("air")
chlid.expect

a = chlid.expect("running", timeout=300)
if a == 0:
     with open("main.go", "a") as f:
        f.write("\n\n")
else:
    exit(0)

a = chlid.expect("running", timeout=10)
if a == 0:
    print("::set-output name=value::PASS")
  return true
else:
    print("::set-output name=value::FAIL")
    exit(0)
