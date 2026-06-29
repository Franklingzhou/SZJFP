@echo off
cd /d f:\CB-szjfp
set CI=true
tcb run deploy --noConfirm --override --serviceName szjfp --path f:\CB-szjfp --cpu 1 --mem 2 --minNum 1 --maxNum 3 --containerPort 5000 --remark "N04-fix-detail-API" > deploy_output.txt 2>&1
echo DEPLOY_EXIT_CODE=%ERRORLEVEL% >> deploy_output.txt
echo DEPLOY_FINISHED >> deploy_output.txt
