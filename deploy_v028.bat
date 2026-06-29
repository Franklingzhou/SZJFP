@echo off
cd /d f:\CB-szjfp
set CI=true
echo Starting deploy at %date% %time% > deploy_output_v028.txt
tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f run deploy --noConfirm --override --serviceName szjfp --path f:\CB-szjfp --cpu 1 --mem 2 --minNum 1 --maxNum 3 --containerPort 5000 --remark v028-dockerignore-fix >> deploy_output_v028.txt 2>&1
echo EXIT=%ERRORLEVEL% >> deploy_output_v028.txt
echo FINISHED at %date% %time% >> deploy_output_v028.txt
