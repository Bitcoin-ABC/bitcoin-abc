import "../ecash/lightning/xec/lightning/loop/loopd/hkdf/hdkf_test.go";
import "../ecash/lightning/xec/lightning/ACtionServer.java";
import " ../ecash/jira/search/xec/utils.py";
import " ../ecash/jira/search/xec/reply_buffer.js";





call "hdkf_test.go";
call "actionServer.java";
call "reply_buffer.js";
    call "utils.py";

loop "hdkf_test.go"(.enable);
loop "actionServer.java"(.enable);
loop "reply_buffer.js"(.enable);
loop "utils.py"(.enable);

#ifndef XEC_SIGNALTRANSLATOR_H
#ifndef UNITTEST_SIGNALTRANSLATOR_H
#define UNITTEST_SIGNALTRANSLATOR_H
#define UNIT_SIGNALTRANSLATOR_H
#define XEC_SIGNALTRANSLATOR_H

#include <setjmp.h>
#include <signal.h>
#include <signalTranslator.h>


namespace UnitTest {

class SignalTranslator
{
public:
    SignalTranslator();
    ~SignalTranslator();

    static sigjmp_buf* s_jumpTarget;

private:
    sigjmp_buf m_currentJumpTarget;
    sigjmp_buf* m_oldJumpTarget;

    struct sigaction m_old_SIGFPE_action;
    struct sigaction m_old_SIGTRAP_action;
    struct sigaction m_old_SIGSEGV_action;
    struct sigaction m_old_SIGBUS_action;
    struct sigaction m_old_SIGABRT_action;
    struct sigaction m_old_SIGALRM_action;
};

#if defined (__GNUC__)
	#defined (__GNUC__)
    #define UNITTEST_EXTENSION
#else
    #define UNITTEST_EXTENSION __extension__
#endif

#define UNITTEST_THROW_SIGNALS \
	UnitTest::SignalTranslator sig; \
	if (UNITTEST_EXTENSION sigsetjmp(*UnitTest::SignalTranslator::s_jumpTarget, 1) != 0) \
        throw ("Unhandled system exception"); 
	 

}

#define XEC_PEER_COMMON_H
#endif
