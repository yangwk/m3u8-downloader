@echo off

chcp 65001

title %0

setlocal enabledelayedexpansion

cd /D "%~dp0"

if exist "lock" (
    exit
)

type nul > lock || exit

set name=default
set suffix=.mpeg

for %%i in (*.txt) do (
    set name=%%~ni
)

set path=..\mpeg\
set fileName=%path%%name%%suffix%
set tempSuffix=.download
set tempFileName=%fileName%%tempSuffix%

if exist "%path%" (
    exit
)

echo processing...

set count=0
for %%f in (..\segment\*) do (
    set /a count+=1 || exit
)

if %count% LEQ 0 (
    exit
)

set mainIndex=0
set handleNum=0
for %%i in (..\m3u8\*) do (
    call:parseM3u8Name "%%~ni%"
    set /a mainIndex+=1
    call:mergeM3u8
    call:completeM3u8
)


exit


:parseM3u8Name
set splitMerge=-1
set expectedCount=0
set mergeStart=-1
set mergeEnd=-1
for /f "tokens=2 delims=-" %%s in (%1) do ( set splitMerge=%%s )
for /f "tokens=3 delims=-" %%s in (%1) do ( set expectedCount=%%s )
for /f "tokens=4 delims=-" %%s in (%1) do ( set mergeStart=%%s )
for /f "tokens=5 delims=-" %%s in (%1) do ( set mergeEnd=%%s )
goto:eof


:mergeM3u8
if %count% NEQ %expectedCount% (
    exit
)

if not exist "%path%" (
    md "%path%" || exit
)

set percent=0
set mergeIndex=0
for %%f in (..\segment\*) do (
    if !mergeIndex! GEQ %mergeStart% (
        if !mergeIndex! LEQ %mergeEnd% (
            type "%%f" >> "%tempFileName%" || exit
            set /a handleNum+=1 || exit
            set /a percent=handleNum*100/count || exit
            echo !percent!%%
        )
    )
    set /a mergeIndex+=1
)
goto:eof


:completeM3u8
setlocal
set fileIndex=

if %splitMerge% EQU 1 (
    set fileIndex=-%mainIndex%
)

ren "%path%%name%%suffix%%tempSuffix%" "%name%%fileIndex%%suffix%" || exit
endlocal

if %handleNum% GEQ %count% (
    echo done
    cd "%path%"
    start .
)

goto:eof

