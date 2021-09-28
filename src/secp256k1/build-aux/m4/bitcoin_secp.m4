dnl escape "$0x" below using the m4 quadrigaph @S|@, and escape it again with a \ for the shell.
AC_DEFUN([SECP_64BIT_ASM_CHECK],[
AC_MSG_CHECKING(for x86_64 assembly availability)
AC_COMPILE_IFELSE([AC_LANG_PROGRAM([[
  #include <stdint.h>]],[[
  uint64_t a = 11, tmp;
  __asm__ __volatile__("movq \@S|@0x100000000,%1; mulq %%rsi" : "+a"(a) : "S"(tmp) : "cc", "%rdx");
  ]])],[has_64bit_asm=yes],[has_64bit_asm=no])
AC_MSG_RESULT([$has_64bit_asm])
])

AC_DEFUN([SECP_VALGRIND_CHECK],[
if test x"$has_valgrind" != x"yes"; then
  CPPFLAGS_TEMP="$CPPFLAGS"
  CPPFLAGS="$VALGRIND_CPPFLAGS $CPPFLAGS"
  AC_CHECK_HEADER([valgrind/memcheck.h], [has_valgrind=yes; AC_DEFINE(HAVE_VALGRIND,1,[Define this symbol if valgrind is installed])])
fi
])
