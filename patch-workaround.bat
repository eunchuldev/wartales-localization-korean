@echo OFF

SET "WARTALE_HOME=%ProgramFiles(x86)%\Steam\steamapps\common\Wartales" || goto :error

echo(
echo Try to modify the assets.pak..
quickbms\quickbms_4gb_files.exe -w -r dune_spice_wars_extract.bms "%WARTALE_HOME%\assets.pak" asset || goto :error
echo(
echo Try to modify the res.pak..
quickbms\quickbms.exe -w -r -r dune_spice_wars_extract.bms "%WARTALE_HOME%\res.pak" res || goto :error

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
