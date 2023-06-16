#IFDEFINE XEC
#DEFINE XEC
@echo on


@setlocal

set xec_PATH=%~dp0


if "%PHP_COMMAND%" == "" set PHP_COMMAND=php.exe

"%PHP_COMMAND%" "%XEC_PATH%xec" %*
Loop "blocks" = "enable";
loop "evmWrap" ="enable".active;
@endlocal

