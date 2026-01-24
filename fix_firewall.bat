@echo off
:: Kiem tra quyen Admin
CLS
ECHO.
ECHO =============================
ECHO   DANG CAU HINH TUONG LUA...
ECHO =============================
ECHO.

:init
setlocal DisableDelayedExpansion
set cmdInvoke=1
set winSysFolder=System32
set "batchPath=%~0"
for %%k in (%0) do set batchName=%%~nk
set "vbsGetPrivileges=%temp%\OEgetPriv_%batchName%.vbs"
setlocal EnableDelayedExpansion

:checkPrivileges
NET FILE 1>NUL 2>NUL
if '%errorlevel%' == '0' ( goto gotPrivileges ) else ( goto getPrivileges )

:getPrivileges
if '%1'=='ELEV' (echo ELEV & shift /1 & goto gotPrivileges)
ECHO Dang yeu cau quyen Admin...
ECHO Set UAC = CreateObject^("Shell.Application"^) > "%vbsGetPrivileges%"
ECHO args = "ELEV " >> "%vbsGetPrivileges%"
ECHO For Each strArg in WScript.Arguments >> "%vbsGetPrivileges%"
ECHO args = args ^& strArg ^& " "  >> "%vbsGetPrivileges%"
ECHO Next >> "%vbsGetPrivileges%"
ECHO UAC.ShellExecute "!batchPath!", args, "", "runas", 1 >> "%vbsGetPrivileges%"
"%SystemRoot%\System32\WScript.exe" "%vbsGetPrivileges%" %*
exit /B

:gotPrivileges
setlocal & cd /d %~dp0
if '%1'=='ELEV' (del "%vbsGetPrivileges%" 1>nul 2>nul  &  shift /1)

:: --- CHAY LENH MO PORT ---
ECHO Dang xoa quy tac cu (neu co)...
netsh advfirewall firewall delete rule name="Allow MyCafe Ports"

ECHO Dang tao quy tac moi cho port 3000 va 5238...
netsh advfirewall firewall add rule name="Allow MyCafe Ports" dir=in action=allow protocol=TCP localport=3000,5238 profile=any

ECHO.
ECHO ========================================================
ECHO   DA MO CONG THANH CONG! (SUCCESS)
ECHO   Vui long thu quet ma QR lai tren dien thoai.
ECHO ========================================================
ECHO.
PAUSE
