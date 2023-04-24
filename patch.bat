IF NOT EXIST "C:\Program Files (x86)\Steam\steamapps\common\Wartales\assets.pak.back" (
  copy "C:\Program Files (x86)\Steam\steamapps\common\Wartales\assets.pak" "C:\Program Files (x86)\Steam\steamapps\common\Wartales\assets.pak.back"
)
IF NOT EXIST "C:\Program Files (x86)\Steam\steamapps\common\Wartales\res.pak.back" (
  copy "C:\Program Files (x86)\Steam\steamapps\common\Wartales\res.pak" "C:\Program Files (x86)\Steam\steamapps\common\Wartales\res.pak.back"
)
IF NOT EXIST quickbms (
  curl -O http://aluigi.altervista.org/papers/quickbms.zip
  mkdir quickbms
  tar -C quickbms -xf quickbms.zip
)

quickbms\quickbms_4gb_files.exe -w -r -r dune_spice_wars_extract.bms "C:\Program Files (x86)\Steam\steamapps\common\Wartales\assets.pak" asset
quickbms\quickbms.exe -w -r -r dune_spice_wars_extract.bms "C:\Program Files (x86)\Steam\steamapps\common\Wartales\res.pak" res
