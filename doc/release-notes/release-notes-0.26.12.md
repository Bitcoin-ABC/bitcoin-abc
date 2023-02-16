# Bitcoin ABC 0.26.12 Release Notes

Bitcoin ABC version 0.26.12 is now available from:

  <https://download.bitcoinabc.org/0.26.12/>

 - Removed 10-block rolling finalization. This only affects configurations
   where Avalanche is explicitly disabled. This removal includes associated
   command-line parameters `-finalizationdelay` and `-maxreorgdepth`.
