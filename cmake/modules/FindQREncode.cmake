# Locates the qrencode library
# This module defines
# QRENCODE_LIBRARY, the name of the library to link against
# QRENCODE_FOUND, if false, do not try to link to SDL
# QRENCODE_INCLUDE_DIR, where to find SDL.h
#
# QRENCODE_DIR: specify optional search dir

FIND_PATH(QREncode_INCLUDE_DIR qrencode.h
  HINTS
  $ENV{QRENCODE_DIR}
  PATH_SUFFIXES include/qrencode include
  PATHS
  ~/Library/Frameworks
  /Library/Frameworks
  /usr/local
  /usr
  /opt/local
  /opt
)

FIND_LIBRARY(QREncode_LIBRARY 
  NAMES qrencode
  HINTS
  $ENV{QRENCODE_DIR}
  PATH_SUFFIXES lib64 lib
  PATHS
  /sw
  /opt/local
  /opt
)

IF(QREncode_LIBRARY AND QREncode_INCLUDE_DIR)
	SET(QREncode_FOUND "YES")
ENDIF(QREncode_LIBRARY AND QREncode_INCLUDE_DIR)

