@echo OFF
SETLOCAL enabledelayedexpansion
CHCP 65001

SET "WARTALE_HOME=%ProgramFiles(x86)%\Steam\steamapps\common\Wartales" || goto :error
SET "psCommand="(new-object -COM 'Shell.Application')^
.BrowseForFolder(0,'Wartales 디렉토리를 찾을수 없습니다. Wartales가 설치된 디렉토리를 직접 선택해주세요',0,0).self.path"" || goto :error

IF NOT EXIST "%WARTALE_HOME%" (
  echo Wartales 디렉토리를 찾을수 없습니다. 프롬프트에서 Wartales가 설치된 디렉토리를 직접 선택해주세요
  FOR /f "usebackq delims=" %%I IN (`powershell %psCommand%`) DO SET "WARTALE_HOME=%%I" || goto :error
) || goto :error

SET "LAST_PATCHED_TRACKER=%WARTALE_HOME%\__LAST_KR_PATCHED_AT" || goto :error

IF EXIST "%LAST_PATCHED_TRACKER%" (
  FOR /f "delims=" %%a IN ('type "%LAST_PATCHED_TRACKER%"') DO SET "LAST_PATCHED=%%a" || goto :error
) || goto :error

FOR %%a IN ("%WARTALE_HOME%\res.pak") DO SET "LAST_MODIFIED=%%~ta" || goto :error

IF "%LAST_PATCHED%" NEQ "%LAST_MODIFIED%" (
  echo(
  echo The last patch time is not equal to the asset modified time. 
  echo %LAST_PATCHED% is not same as %LAST_MODIFIED%
  echo Need to backup the asset files.
  echo(
  echo Try to backup "assets.pak" into "assets.pak.back". Please wait a minute...
  copy "%WARTALE_HOME%\assets.pak" "%WARTALE_HOME%\assets.pak.back"
  echo(
  echo Try to backup "res.pak" into "res.pak.back". Please wait a minute...
  copy "%WARTALE_HOME%\res.pak" "%WARTALE_HOME%\res.pak.back"
  echo(
  echo Backup is done.
) || goto :error

IF NOT EXIST quickbms (
  echo quickbms is not found. Try to download it..
  curl -O http://aluigi.altervista.org/papers/quickbms.zip
  mkdir quickbms
  tar -C quickbms -xf quickbms.zip
) || goto :error

echo(
echo Try to modify the assets.pak..
quickbms\quickbms_4gb_files.exe -w -r dune_spice_wars_extract.bms "%WARTALE_HOME%\assets.pak" asset || goto :error
echo(
echo Try to modify the res.pak..
quickbms\quickbms.exe -w -r -r dune_spice_wars_extract.bms "%WARTALE_HOME%\res.pak" res || goto :error

echo(
echo Touch the patch time tracker..
FOR %%a IN ("%WARTALE_HOME%\res.pak") DO SET "LAST_PATCHED=%%~ta" || goto :error
echo %LAST_PATCHED%> "%LAST_PATCHED_TRACKER%"

echo(
echo Patch done!
echo(

pause
goto :EOF


:error
echo(
echo Failed with error #%errorlevel%.
echo(

pause
