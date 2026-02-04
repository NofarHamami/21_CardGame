@echo off
echo Compiling 21 Card Game...
"C:\Program Files\Java\jdk-11.0.1\bin\javac.exe" -d out -sourcepath src src/Main.java src/model/*.java src/engine/*.java src/gui/*.java
if %ERRORLEVEL% EQU 0 (
    echo Compilation successful!
) else (
    echo Compilation failed!
    pause
)
