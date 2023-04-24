@echo off

SET WARTALE_HOME=C:\Program Files (x86)\Steam\steamapps\common\Wartales
SET LAST_PATCHED_TRACKER="./LAST_PATCHED_AT"

SET LAST_PATCHED=null
SET /p LAST_PATCHED=<%LAST_PATCHED_TRACKER%

FOR %%a IN ("%WARTALE_HOME%\res.pak") do set LAST_MODIFIED=%%~ta || EXIT /B 1

IF "%LAST_PATCHED%" NEQ "%LAST_MODIFIED%" (
  echo last patched at %LAST_PATCHED%, but target file is updated at %LAST_MODIFIED%
  echo It might first time patch or new update arrived
  copy "%WARTALE_HOME%\assets.pak" "%WARTALE_HOME%\assets.pak.back"
  copy "%WARTALE_HOME%\res.pak" "%WARTALE_HOME%\res.pak.back"
) || EXIT /B 1

IF NOT EXIST quickbms (
  curl -O http://aluigi.altervista.org/papers/quickbms.zip
  mkdir quickbms
  tar -C quickbms -xf quickbms.zip
) || EXIT /B 1

quickbms\quickbms_4gb_files.exe -w -r -r dune_spice_wars_extract.bms "%WARTALE_HOME%\assets.pak" asset || EXIT /B 1
quickbms\quickbms.exe -w -r -r dune_spice_wars_extract.bms "%WARTALE_HOME%\res.pak" res || EXIT /B 1

FOR %%a IN ("%WARTALE_HOME%\res.pak") do set LAST_PATCHED=%%~ta
echo %LAST_PATCHED% > %LAST_PATCHED_TRACKER%
