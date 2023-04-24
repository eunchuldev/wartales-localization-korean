@echo off
chcp 65001

SET "WARTALE_HOME=C:\Program Files (x86)\Steam\steamapps\common\Wartales"
SET "LAST_PATCHED_TRACKER=%WARTALE_HOME%\__LAST_KR_PATCHED_AT"

SET LAST_PATCHED=null
IF EXIST "%LAST_PATCHED_TRACKER%" (
  FOR /f "delims=" %%a in ('type "%LAST_PATCHED_TRACKER%"') DO set "LAST_PATCHED=%%a"
) || EXIT /B 1

FOR %%a IN ("%WARTALE_HOME%\res.pak") do set "LAST_MODIFIED=%%~ta" || EXIT /B 1

IF "%LAST_PATCHED%" NEQ "%LAST_MODIFIED%" (
  echo(
  echo The last patch time is not equal to the asset modified time. 
  echo %LAST_PATCHED% != %LAST_MODIFIED%
  echo Need to backup the asset files.
  echo Try to backup "assets.pak" into "assets.pak.back"...
  copy "%WARTALE_HOME%\assets.pak" "%WARTALE_HOME%\assets.pak.back"
  echo Try to backup "res.pak" into "res.pak.back"...
  copy "%WARTALE_HOME%\res.pak" "%WARTALE_HOME%\res.pak.back"
  echo Backup is done.
) || EXIT /B 1

IF NOT EXIST quickbms (
  echo quickbms is not found. Try to download it..
  curl -O http://aluigi.altervista.org/papers/quickbms.zip
  mkdir quickbms
  tar -C quickbms -xf quickbms.zip
) || EXIT /B 1

echo(
echo Try to modify the assets.pak..
quickbms\quickbms_4gb_files.exe -w -r dune_spice_wars_extract.bms "%WARTALE_HOME%\assets.pak" asset || EXIT /B 1
echo Try to modify the res.pak..
quickbms\quickbms.exe -w -r -r dune_spice_wars_extract.bms "%WARTALE_HOME%\res.pak" res || EXIT /B 1

echo(
echo Touch the patch time tracker..
FOR %%a IN ("%WARTALE_HOME%\res.pak") do set "LAST_PATCHED=%%~ta"
echo %LAST_PATCHED%> "%LAST_PATCHED_TRACKER%"

echo(
echo Patch done!
echo(

pause
