@echo off

SET WARTALE_HOME=C:\Program Files (x86)\Steam\steamapps\common\Wartales
SET LAST_PATCHED_TRACKER="./LAST_PATCHED_AT"

MOVE /Y "%WARTALE_HOME%\assets.pak.back" "%WARTALE_HOME%\assets.pak"
MOVE /Y "%WARTALE_HOME%\res.pak.back" "%WARTALE_HOME%\res.pak"

DEL %LAST_PATCHED_TRACKER%
