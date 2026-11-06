# 已推08ffd4c的真CI：不是全綠，也不只golden

https://github.com/lalagrass/earth-ascension/actions/runs/42264044113

head08ffd4c9a833f9e4e3d7692c8895b535d5b68f30，台北時間2026-11-07 01:42開始。5個其他job成功；山門紀Quick失敗，629 tests /551 pass /78 fail，後續獨立golden步未完成。不能用舊N54綠燈或本地smoke代替。

失敗包含N14前搖/架勢/看破、N15/N28近戰、N16/N27截擊、N31b、golden quick/舊檔、現行版本遷移、新出身替換舊固定角色後的狩獵/角色卡/門派/名俠fixture、資源不變式等。例：N14還期待空架勢後立即回一半（N37已改真回正）、化境前搖不同（N33手熟與下限改了起點解讀）、N50招募不能再只設名聲床位便當成功。**不能直接把78個全部稱預期fixture差異**：需逐一判斷真規則缺陷或與新規格不符的舊fixture，保留有效不變式；不得刪測試/降門檻湊全綠。

本輪改了出生/招募/教學/所有交手/存檔資料，這些失敗涉及所改共同通路，目前沒有證據是『沒改到地方的CI/基建壞掉』，不援用停止條件3，不停工。CI完整failed log已存box /workspace/specs/t200u-live/r9-ci-08ffd4c-failed.log、failed-names.txt供後續逐項定位。新2b7da38後未冒稱此舊head結果代表新head，後續push新CI仍須核實。3.4/MIGRATIONS/golden尚未收尾。
