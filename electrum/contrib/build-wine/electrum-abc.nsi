;--------------------------------
;Settings

  ; ANSI is deprecated
  Unicode True

;--------------------------------
;Variables

  !define PRODUCT_NAME "Electrum ABC"
  !define INTERNAL_NAME "ElectrumABC"
  !define PRODUCT_WEB_SITE "https://www.bitcoinabc.org/electrum/"
  !define PRODUCT_PUBLISHER "Bitcoin ABC"
  !define INSTDIR_REG_ROOT "HKCU"
  !define INSTDIR_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

;--------------------------------
;Includes
  !include "LogicLib.nsh"
  !include "TextFunc.nsh" ;Needed for the $GetSize function. I know, doesn't sound logical, it isn't.
  !include "MUI2.nsh"
  !include "AdvUninstLog.nsh"

;--------------------------------
;General

  ;Name and file
  Name "${PRODUCT_NAME}"
  OutFile "dist/${INTERNAL_NAME}-setup.exe"

  ;Default installation folder
  InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"

  ;Get installation folder from registry if available
  InstallDirRegKey ${INSTDIR_REG_ROOT} "Software\${PRODUCT_NAME}" ""

  ;Request application privileges for Windows Vista
  RequestExecutionLevel admin

  ;Specifies whether or not the installer will perform a CRC on itself before allowing an install
  CRCCheck on

  ;Sets whether or not the details of the install are shown. Can be 'hide' (the default) to hide the details by default, allowing the user to view them, or 'show' to show them by default, or 'nevershow', to prevent the user from ever seeing them.
  ShowInstDetails show

  ;Sets whether or not the details of the uninstall  are shown. Can be 'hide' (the default) to hide the details by default, allowing the user to view them, or 'show' to show them by default, or 'nevershow', to prevent the user from ever seeing them.
  ShowUninstDetails show

  ;Sets the colors to use for the install info screen (the default is 00FF00 000000. Use the form RRGGBB (in hexadecimal, as in HTML, only minus the leading '#', since # can be used for comments). Note that if "/windows" is specified as the only parameter, the default windows colors will be used.
  InstallColors /windows

  ;This command sets the compression algorithm used to compress files/data in the installer. (http://nsis.sourceforge.net/Reference/SetCompressor)
  SetCompressor /SOLID lzma

  ;Sets the dictionary size in megabytes (MB) used by the LZMA compressor (default is 8 MB).
  SetCompressorDictSize 64

  ;Sets the text that is shown (by default it is 'Nullsoft Install System vX.XX') in the bottom of the install window. Setting this to an empty string ("") uses the default; to set the string to blank, use " " (a space).
  BrandingText "${PRODUCT_NAME} Installer v${PRODUCT_VERSION}"

  ;Sets what the titlebars of the installer will display. By default, it is 'Name Setup', where Name is specified with the Name command. You can, however, override it with 'MyApp Installer' or whatever. If you specify an empty string (""), the default will be used (you can however specify " " to achieve a blank string)
  Caption "${PRODUCT_NAME}"

  ;Adds the Product Version on top of the Version Tab in the Properties of the file.
  VIProductVersion 1.0.0.0

  ;VIAddVersionKey - Adds a field in the Version Tab of the File Properties. This can either be a field provided by the system or a user defined field.
  VIAddVersionKey ProductName "${PRODUCT_NAME} Installer"
  VIAddVersionKey Comments "The installer for ${PRODUCT_NAME}"
  VIAddVersionKey CompanyName "${PRODUCT_NAME}"
  VIAddVersionKey LegalCopyright "2013-2022 ${PRODUCT_PUBLISHER}, Electron Cash LLC and Electrum Technologies GmbH"
  VIAddVersionKey FileDescription "${PRODUCT_NAME} Installer"
  VIAddVersionKey FileVersion ${PRODUCT_VERSION}
  VIAddVersionKey ProductVersion ${PRODUCT_VERSION}
  VIAddVersionKey InternalName "${PRODUCT_NAME} Installer"
  VIAddVersionKey LegalTrademarks "${PRODUCT_NAME} is a trademark of ${PRODUCT_PUBLISHER}"
  VIAddVersionKey OriginalFilename "${PRODUCT_NAME}.exe"

;--------------------------------
;Uninstall Settings

  !insertmacro UNATTENDED_UNINSTALL

;--------------------------------
;Interface Settings

  !define MUI_ABORTWARNING
  !define MUI_ABORTWARNING_TEXT "Are you sure you wish to abort the installation of ${PRODUCT_NAME}?"

  !define MUI_ICON "\electrumabc\icons\electrumABC.ico"

;--------------------------------
;Pages

  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES

;--------------------------------
;Languages

  !insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Functions

!macro CreateEnsureNotRunning prefix operation

Function ${prefix}EnsureNotRunning
  Pop $R0
  IfFileExists "$R0\${INTERNAL_NAME}.exe" 0 noexe
    ; Check if we can append to the .exe file. If we can't that means it is still running.
    retryopen:
    FileOpen $0 "$R0\${INTERNAL_NAME}.exe" a
    IfErrors 0 closeexe
      MessageBox MB_RETRYCANCEL "Can not ${operation} because ${PRODUCT_NAME} is still running. Close it and retry." /SD IDCANCEL IDRETRY retryopen
      Abort
    closeexe:
    FileClose $0
  noexe:
FunctionEnd

!macroend

; The function has to be created twice, once for the installer and once for the uninstaller
!insertmacro CreateEnsureNotRunning "" "install"
!insertmacro CreateEnsureNotRunning "un." "uninstall"

;--------------------------------
;Installer Sections

;Check if we have Administrator rights
Function .onInit
  !insertmacro UNINSTALL.LOG_PREPARE_INSTALL

  ; Check if already installed and ensure the process is not running if it is
  ReadRegStr $R0 ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "UninstallDirectory"
  IfErrors noinstdir 0
    Push $R0
    Call EnsureNotRunning
  noinstdir:
  ClearErrors

  ; Request uninstallation of an old installation

  ReadRegStr $R0 ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" UninstallString
  ReadRegStr $R1 ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" DisplayName
  ${If} $R0 != ""
  ${AndIf} ${Cmd} ${|} MessageBox MB_YESNO|MB_ICONEXCLAMATION "$R1 has already been installed. $\nDo you want to remove the previous version before installing $(^Name)?" /SD IDNO IDYES ${|}
    GetFullPathName $R1 "$R0\.."
    ExecWait '$R0 _?=$R1'
    IfErrors 0 +2
      Abort
  ${EndIf}

  ; Check for administrator rights
  UserInfo::GetAccountType
  pop $0
  ${If} $0 != "admin" ;Require admin rights on NT4+
    MessageBox mb_iconstop "Administrator rights required!"
    SetErrorLevel 740 ;ERROR_ELEVATION_REQUIRED
    Quit
  ${EndIf}
FunctionEnd

Section
  SetOutPath $INSTDIR ; side-effect is it creates dir if not exist

  !insertmacro UNINSTALL.LOG_OPEN_INSTALL

  ;Files to pack into the installer
  File /r "dist\electrumabc\*.*"
  File "..\..\icons\electrumABC.ico"

  !insertmacro UNINSTALL.LOG_CLOSE_INSTALL

  ;Store installation folder
  WriteRegStr ${INSTDIR_REG_ROOT} "Software\${PRODUCT_NAME}" "" $INSTDIR

  ;Create uninstaller
  DetailPrint "Creating uninstaller..."
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ;Create desktop shortcut
  DetailPrint "Creating desktop shortcut..."
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${INTERNAL_NAME}.exe" ""

  ;Create start-menu items
  DetailPrint "Creating start-menu items..."
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "${UNINST_EXE}" "" "${UNINST_EXE}" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${INTERNAL_NAME}.exe" "" "$INSTDIR\${INTERNAL_NAME}.exe" 0
  ;See #1255 where some users have bad opengl drivers and need to use software-only rendering. Requires we package openglsw32.dll with the app.
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME} (Software OpenGL).lnk" "$INSTDIR\${INTERNAL_NAME}.exe" "--qt_opengl software" "$INSTDIR\${INTERNAL_NAME}.exe" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME} Testnet.lnk" "$INSTDIR\${INTERNAL_NAME}.exe" "--testnet" "$INSTDIR\${INTERNAL_NAME}.exe" 0

  ;Links ecash: URI's to Electrum ABC
  WriteRegStr ${INSTDIR_REG_ROOT} "Software\Classes\ecash" "" "URL:ecash Protocol"
  WriteRegStr ${INSTDIR_REG_ROOT} "Software\Classes\ecash" "URL Protocol" ""
  WriteRegStr ${INSTDIR_REG_ROOT} "Software\Classes\ecash" "DefaultIcon" "$\"$INSTDIR\electrumABC.ico, 0$\""
  WriteRegStr ${INSTDIR_REG_ROOT} "Software\Classes\ecash\shell\open\command" "" "$\"$INSTDIR\${INTERNAL_NAME}.exe$\" $\"%1$\""

  ;Adds an uninstaller possibilty to Windows Uninstall or change a program section
  WriteRegStr ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "UninstallString" "${UNINST_EXE}"
  WriteRegStr ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "DisplayIcon" "$INSTDIR\electrumABC.ico"

  ;Fixes Windows broken size estimates
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}" "EstimatedSize" "$0"
SectionEnd

Section -FinalizeInstallation ; Hidden, writes Uninstall.dat
  DetailPrint "Finalizing installation"

  !insertmacro UNINSTALL.LOG_UPDATE_INSTALL
SectionEnd

;--------------------------------
;Descriptions

;--------------------------------
;Uninstaller Section

Section "Uninstall"
  !insertmacro UNINSTALL.LOG_UNINSTALL "$INSTDIR"

  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\*.*"
  RMDir  "$SMPROGRAMS\${PRODUCT_NAME}"

  DeleteRegKey ${INSTDIR_REG_ROOT} "Software\Classes\ecash"
  DeleteRegKey ${INSTDIR_REG_ROOT} "Software\${PRODUCT_NAME}"
  DeleteRegKey ${INSTDIR_REG_ROOT} "${INSTDIR_REG_KEY}"
SectionEnd

Function UN.onInit
  ; Ensure the process is not running in the uninstallation directory
  Push $INSTDIR
  Call un.EnsureNotRunning

  !insertmacro UNINSTALL.LOG_BEGIN_UNINSTALL
FunctionEnd
